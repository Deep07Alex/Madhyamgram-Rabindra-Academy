/**
 * Result Controller
 * 
 * Manages academic results/marks for students across different semesters and subjects.
 * Supports bulk Excel uploads and consolidated yearly reporting.
 */
import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { broadcast, sendToUser } from '../lib/sseManager.js';
import * as XLSX from 'xlsx';

/**
 * Records a new academic result for a student.
 */
export const createResult = async (req: Request, res: Response) => {
    try {
        const { semester, subject, marks, totalMarks, academicYear, grade, studentId } = req.body;

        const id = crypto.randomUUID();
        const resultRes = await db.query(
            `INSERT INTO "Result" (id, semester, subject, marks, "totalMarks", "academicYear", grade, "studentId") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             ON CONFLICT ON CONSTRAINT "result_unique_entry" 
             DO UPDATE SET marks = EXCLUDED.marks, "totalMarks" = EXCLUDED."totalMarks", grade = EXCLUDED.grade
             RETURNING *`,
            [id, semester, subject, parseFloat(marks as string), parseFloat(totalMarks as string), parseInt(academicYear as string || new Date().getFullYear().toString()), grade || null, studentId]
        );

        broadcast('result_published', { studentId: resultRes.rows[0].studentId });
        sendToUser(studentId, 'result_published', resultRes.rows[0]);
        
        res.status(201).json(resultRes.rows[0]);
    } catch (error) {
        console.error('Error creating result:', error);
        res.status(500).json({ message: 'Error creating result' });
    }
};

/**
 * Bulk Upload Results via Excel
 * Matches students by studentId (Admission Number)
 */
export const bulkUploadResults = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { semester, academicYear, classId } = req.body;
        if (!semester || !academicYear || !classId) {
            return res.status(400).json({ message: 'Missing semester, year, or classId' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = sheetName ? workbook.Sheets[sheetName] : null;
        if (!worksheet) return res.status(400).json({ message: 'Workbook contains no valid sheets' });
        
        const dataRows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (dataRows.length === 0) {
            return res.status(400).json({ message: 'Excel sheet is empty' });
        }

        // Fetch all students in the class for matching
        const studentsRes = await db.query('SELECT id, "studentId" FROM "Student" WHERE "classId" = $1', [classId]);
        const studentMap = new Map<string, string>(studentsRes.rows.map(s => [String(s.studentId).trim(), s.id]));

        const resultsToInsert = [];
        const ignoredColumns = ['Admission No', 'Roll', 'Name', 'Admission Regn. No.', 'Admission Register No'];

        // Determine if first row is "Full Marks" row
        let fullMarksRow = dataRows[0];
        const isFullMarksRow = String(fullMarksRow['Name'] || fullMarksRow['Roll']).includes('Full Marks');
        
        if (!isFullMarksRow) {
            return res.status(400).json({ message: 'Validation Failed: Could not find the required "Full Marks" row in the uploaded Excel template.' });
        }

        const uploadedSubjects = Object.keys(dataRows[0]).filter(k => !ignoredColumns.includes(k));
        
        // Strict Validation: Compare with database configuration for this class
        const classSubjectsRes = await db.query('SELECT name, "fullMarks" FROM "Subject" WHERE "classId" = $1', [classId]);
        const classSubjects = classSubjectsRes.rows;
        const configuredSubjectNames = classSubjects.map(s => s.name);

        // 1. Check for unassigned subjects in Excel
        for (const sub of uploadedSubjects) {
            if (!configuredSubjectNames.includes(sub)) {
                return res.status(400).json({ message: `Validation Failed: Subject "${sub}" found in Excel is NOT assigned to this class!` });
            }
        }

        // 2. Check for missing assigned subjects in Excel
        for (const sub of configuredSubjectNames) {
            if (!uploadedSubjects.includes(sub)) {
                return res.status(400).json({ message: `Validation Failed: Configured subject "${sub}" is MISSING from the Excel file!` });
            }
        }

        // 3. Check if all Full Marks are exactly matching
        for (const sub of uploadedSubjects) {
            const uploadedMarks = parseFloat(fullMarksRow[sub]);
            const configuredMarks = classSubjects.find(s => s.name === sub)?.fullMarks;
            
            if (uploadedMarks !== configuredMarks) {
                return res.status(400).json({ 
                    message: `Validation Failed: Full marks mismatch for "${sub}". Excel says ${uploadedMarks}, but system is configured for ${configuredMarks}. Please fix Excel or Admin configuration.` 
                });
            }
        }

        console.log('Strict Validation Passed: Excel exactly matches Class Configuration.');

        // Process in a single transaction for efficiency using Bulk INSERT
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Skip the full marks row which is at index 0
            for (let i = 1; i < dataRows.length; i++) {
                const row = dataRows[i];
                const rawAdmissionNo = row['Admission No'] || row['Admission Regn. No.'] || row['Admission Register No'];
                if (!rawAdmissionNo) continue;

                const admissionNo = String(rawAdmissionNo).trim();
                const studentDbId = studentMap.get(admissionNo);

                if (!studentDbId) {
                    console.warn(`Student not found for Admission No: ${admissionNo}`);
                    continue;
                }

                for (const key of uploadedSubjects) {
                    const marksValue = row[key];
                    if (marksValue === undefined || marksValue === null || marksValue === '') continue;
                    
                    const marks = parseFloat(marksValue);
                    if (isNaN(marks)) continue;

                    // Pull dynamic total marks directly from database matched class config
                    const totalMarks = classSubjects.find(s => s.name === key)?.fullMarks || 100;

                    resultsToInsert.push({
                        id: crypto.randomUUID(),
                        studentId: studentDbId,
                        subject: key,
                        semester,
                        academicYear: parseInt(academicYear),
                        marks: marks,
                        totalMarks: totalMarks,
                        grade: calculateGrade(marks, totalMarks)
                    });
                }
            }
            
            if (resultsToInsert.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({ message: 'No valid results found. Ensure "Admission No" matches student records.' });
            }
            
            const columns = '(id, "studentId", subject, semester, "academicYear", marks, "totalMarks", grade)';
            const values: any[] = [];
            const placeholders: string[] = [];

            resultsToInsert.forEach((r, idx) => {
                const base = idx * 8;
                placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`);
                values.push(r.id, r.studentId, r.subject, r.semester, r.academicYear, r.marks, r.totalMarks, r.grade);
            });

            const query = `
                INSERT INTO "Result" ${columns} 
                VALUES ${placeholders.join(', ')}
                ON CONFLICT ON CONSTRAINT "result_unique_entry"
                DO UPDATE SET marks = EXCLUDED.marks, "totalMarks" = EXCLUDED."totalMarks", grade = EXCLUDED.grade
            `;

            await client.query(query, values);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        res.json({ message: `Successfully matched and uploaded ${resultsToInsert.length} mark entries.` });
        
        // Broadcast that results for this class have changed
        broadcast('result_published', { classId, bulk: true });
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ message: 'Failed to process Excel file' });
    }
};

/**
 * Fetches consolidated yearly report for a student
 */
export const getConsolidatedReport = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.params.studentId || (req.query.studentId as string) || req.user?.id;
        const academicYear = parseInt(req.query.academicYear as string || new Date().getFullYear().toString());

        if (!studentId) return res.status(400).json({ message: 'Missing studentId' });

        const studentRes = await db.query(
            `SELECT s.*, c.name as "className", c.id as "classId" FROM "Student" s JOIN "Class" c ON s."classId" = c.id WHERE s.id = $1`, 
            [studentId]
        );
        if (studentRes.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
        const student = studentRes.rows[0];

        const resultsRes = await db.query(
            `SELECT * FROM "Result" WHERE "studentId" = $1 AND "academicYear" = $2`,
            [studentId, academicYear]
        );

        // Fetch Attendance Summary using Virtual Presence Logic
        // We count all unique school session dates in the system as expected presence
        const sessionsRes = await db.query(
            `SELECT date::date as session_date 
             FROM (
                SELECT date::date FROM "Attendance"
                UNION
                SELECT date::date FROM "TeacherAttendance"
             ) as session_union 
             WHERE (
                (EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) >= 1) OR 
                (EXTRACT(YEAR FROM date) = $1 + 1 AND EXTRACT(MONTH FROM date) <= 12)
             )`,
            [academicYear]
        );
        const sessionDates = new Set(sessionsRes.rows.map(r => new Date(r.session_date).toLocaleDateString('en-CA')));
        const totalSessions = sessionDates.size;

        // Count explicit ABSENT records for this student within these sessions
        const explicitAbsentRes = await db.query(
            `SELECT COUNT(DISTINCT date::date) as absent_count
             FROM "Attendance"
             WHERE "studentId" = $1 AND status = 'ABSENT' AND (
                (EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) >= 1) OR 
                (EXTRACT(YEAR FROM date) = $2 + 1 AND EXTRACT(MONTH FROM date) <= 12)
             )`,
            [studentId, academicYear]
        );
        const absentCount = parseInt(explicitAbsentRes.rows[0].absent_count || '0');
        const presentCount = Math.max(0, totalSessions - absentCount);

        const attendanceData = {
            total_days: totalSessions,
            present_days: presentCount,
            absent_days: absentCount
        };

        // Calculate Rank in Class (Only if student has all 3 units AND ranked against others with all 3 units)
        let myRank = '-';
        
        const rankRes = await db.query(
            `WITH StudentUnitCounts AS (
                SELECT 
                    "studentId",
                    SUM(marks) as grand_total,
                    COUNT(CASE WHEN semester = 'Unit-I' THEN 1 END) as u1_count,
                    COUNT(CASE WHEN semester = 'Unit-II' THEN 1 END) as u2_count,
                    COUNT(CASE WHEN semester = 'Unit-III' THEN 1 END) as u3_count
                FROM "Result"
                WHERE "academicYear" = $1 AND "studentId" IN (SELECT id FROM "Student" WHERE "classId" = $2)
                GROUP BY "studentId"
            ),
            QualifiedStudents AS (
                SELECT "studentId", grand_total,
                       rank() OVER (ORDER BY grand_total DESC) as rank
                FROM StudentUnitCounts
                WHERE u1_count > 0 AND u2_count > 0 AND u3_count > 0
            )
            SELECT rank FROM QualifiedStudents WHERE "studentId" = $3`,
            [academicYear, student.classId, studentId]
        );
        
        if (rankRes.rows.length > 0) {
            const rankValue = parseInt(rankRes.rows[0].rank);
            
            // Only show rank 1 to 5
            if (rankValue <= 5) {
                myRank = String(rankValue);
                // Add suffix like 1st, 2nd, etc.
                const suffixes = ["th", "st", "nd", "rd"];
                const v = rankValue % 100;
                myRank += (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
            }
        }

        // Fetch Highest Marks per Subject in Class for the year/semester
        const highestMarksRes = await db.query(
            `SELECT subject, semester, MAX(marks) as max_marks
             FROM "Result"
             WHERE "academicYear" = $1 AND "studentId" IN (SELECT id FROM "Student" WHERE "classId" = $2)
             GROUP BY subject, semester`,
            [academicYear, student.classId]
        );
        const highestMarks = highestMarksRes.rows;

        res.json({
            student,
            results: resultsRes.rows,
            attendance: attendanceData,
            rank: myRank,
            highestMarks,
            academicYear
        });
    } catch (error) {
        console.error('Report fetch error:', error);
        res.status(500).json({ message: 'Error generating consolidated report' });
    }
};

/**
 * Retrieves academic results, optionally filtered by student and semester.
 */
export const getResults = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, semester, academicYear, classId } = req.query;
        let query = `
            SELECT r.*, row_to_json(s.*) as student
            FROM "Result" r
            LEFT JOIN "Student" s ON r."studentId" = s.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (req.user?.role === 'STUDENT') {
            query += ` AND r."studentId" = $${paramCount++}`;
            params.push(req.user.id);
        } else {
            if (studentId) {
                query += ` AND r."studentId" = $${paramCount++}`;
                params.push(studentId);
            }
        }

        if (semester) {
            query += ` AND r.semester = $${paramCount++}`;
            params.push(semester);
        }

        if (academicYear) {
            query += ` AND r."academicYear" = $${paramCount++}`;
            params.push(parseInt(academicYear as string));
        }

        if (classId) {
            query += ` AND s."classId" = $${paramCount++}`;
            params.push(classId);
        }

        query += ` ORDER BY r."createdAt" DESC`;
        const resultsRes = await db.query(query, params);

        res.json(resultsRes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching results' });
    }
};

export const deleteResult = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM "Result" WHERE id = $1', [id]);
        res.json({ message: 'Result deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting result' });
    }
};

/**
 * Deletes all result records for a specific student, semester, and academic year.
 */
export const deleteStudentResults = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const { semester, academicYear } = req.query;

        if (!studentId || !semester || !academicYear) {
            return res.status(400).json({ message: 'Missing studentId, semester, or academicYear' });
        }

        await db.query(
            'DELETE FROM "Result" WHERE "studentId" = $1 AND semester = $2 AND "academicYear" = $3',
            [studentId, semester, parseInt(academicYear as string)]
        );

        res.json({ message: 'All results for this student in the selected term have been deleted' });
    } catch (error) {
        console.error('Error deleting student results:', error);
        res.status(500).json({ message: 'Error deleting student results' });
    }
};

/**
 * Deletes all results for a specific class, semester, and academic year.
 */
export const deleteClassResults = async (req: Request, res: Response) => {
    try {
        const { classId } = req.params;
        const { semester, academicYear } = req.query;

        if (!classId || !semester || !academicYear) {
            return res.status(400).json({ message: 'Missing classId, semester, or academicYear' });
        }

        // Delete results for all students in the specific class
        await db.query(
            `DELETE FROM "Result" 
             WHERE semester = $1 
             AND "academicYear" = $2 
             AND "studentId" IN (SELECT id FROM "Student" WHERE "classId" = $3)`,
            [semester, parseInt(academicYear as string), classId]
        );

        res.json({ message: `All records for the selected class in ${semester} (${academicYear}) have been cleared.` });
        broadcast('result_published', { classId });
    } catch (error) {
        console.error('Error in bulk class result deletion:', error);
        res.status(500).json({ message: 'Error in bulk class result deletion' });
    }
};

/**
 * Fetches class-wise rankings for admin dashboard.
 * Shows top 5 students for each class based on yearly aggregate.
 */
export const getClassRankings = async (req: Request, res: Response) => {
    try {
        const academicYear = parseInt(req.query.academicYear as string || new Date().getFullYear().toString());
        const showAll = req.query.all === 'true';
        const { classId } = req.query;

        let query = `
            WITH StudentTotals AS (
                SELECT 
                    s.id as "studentDbId", 
                    s.name, 
                    s."studentId" as "admissionId", 
                    s."rollNumber" as "roll", 
                    s."classId",
                    c.name as "className",
                    COUNT(CASE WHEN r.semester = 'Unit-I' THEN 1 END) as "unit1Count",
                    SUM(CASE WHEN r.semester = 'Unit-I' THEN r.marks ELSE 0 END) as "unit1TotalRaw",
                    SUM(CASE WHEN r.semester = 'Unit-I' THEN r."totalMarks" ELSE 0 END) as "unit1FMRaw",
                    
                    COUNT(CASE WHEN r.semester = 'Unit-II' THEN 1 END) as "unit2Count",
                    SUM(CASE WHEN r.semester = 'Unit-II' THEN r.marks ELSE 0 END) as "unit2TotalRaw",
                    SUM(CASE WHEN r.semester = 'Unit-II' THEN r."totalMarks" ELSE 0 END) as "unit2FMRaw",
                    
                    COUNT(CASE WHEN r.semester = 'Unit-III' THEN 1 END) as "unit3Count",
                    SUM(CASE WHEN r.semester = 'Unit-III' THEN r.marks ELSE 0 END) as "unit3TotalRaw",
                    SUM(CASE WHEN r.semester = 'Unit-III' THEN r."totalMarks" ELSE 0 END) as "unit3FMRaw",
                    
                    SUM(r.marks) as "rawGrandTotal",
                    SUM(r."totalMarks") as "rawMaxGrandTotal"
                FROM "Student" s
                JOIN "Class" c ON s."classId" = c.id
                LEFT JOIN "Result" r ON s.id = r."studentId" AND r."academicYear" = $1
                WHERE 1=1
                ${classId ? 'AND s."classId" = $2' : ''}
                GROUP BY s.id, c.id, c.name
            ),
            RankedStudents AS (
                SELECT 
                    st."studentDbId", st.name, st."admissionId", st.roll, st."classId", st."className",
                    -- Individual Unit Totals: Show as 0 only if results exist (count > 0)
                    CASE WHEN st."unit1Count" > 0 THEN st."unit1TotalRaw" ELSE NULL END as "unit1Total",
                    CASE WHEN st."unit1Count" > 0 THEN st."unit1FMRaw" ELSE NULL END as "unit1FM",
                    CASE WHEN st."unit2Count" > 0 THEN st."unit2TotalRaw" ELSE NULL END as "unit2Total",
                    CASE WHEN st."unit2Count" > 0 THEN st."unit2FMRaw" ELSE NULL END as "unit2FM",
                    CASE WHEN st."unit3Count" > 0 THEN st."unit3TotalRaw" ELSE NULL END as "unit3Total",
                    CASE WHEN st."unit3Count" > 0 THEN st."unit3FMRaw" ELSE NULL END as "unit3FM",
                    
                    -- Aggregate Rank and Totals: Null/0 if any unit is missing
                    CASE 
                        WHEN st."unit1Count" > 0 AND st."unit2Count" > 0 AND st."unit3Count" > 0 
                        THEN rank() OVER (PARTITION BY st."classId" ORDER BY st."rawGrandTotal" DESC) 
                        ELSE NULL 
                    END as "rank",
                    CASE 
                        WHEN st."unit1Count" > 0 AND st."unit2Count" > 0 AND st."unit3Count" > 0 
                        THEN st."rawGrandTotal" 
                        ELSE NULL 
                    END as "grandTotal",
                    CASE 
                        WHEN st."unit1Count" > 0 AND st."unit2Count" > 0 AND st."unit3Count" > 0 
                        THEN st."rawMaxGrandTotal" 
                        ELSE NULL 
                    END as "maxGrandTotal"
                FROM StudentTotals st
            )
            SELECT * FROM RankedStudents 
            WHERE ${showAll ? '1=1' : '"rank" IS NOT NULL AND "rank" <= 5'} 
            ORDER BY "className", "rank" NULLS LAST, "grandTotal" DESC
        `;
        
        const params: any[] = [academicYear];
        if (classId) {
            params.push(classId);
        }

        const result = await db.query(query, params);

        // Group by class
        const rankings: { [key: string]: any[] } = {};
        result.rows.forEach(row => {
            const className = row.className as string;
            if (!rankings[className]) {
                rankings[className] = [];
            }
            rankings[className]?.push(row);
        });

        res.json(rankings);
    } catch (error) {
        console.error('Error fetching class rankings:', error);
        res.status(500).json({ message: 'Error fetching class rankings' });
    }
};

/**
 * Helper to calculate grade based on percentage
 */
function calculateGrade(marks: number, total: number) {
    if (!total || total === 0) return 'C';
    const p = (marks / total) * 100;
    if (p >= 90) return 'AA';
    if (p >= 80) return 'A+';
    if (p >= 60) return 'A';
    if (p >= 50) return 'B+';
    if (p >= 30) return 'B';
    return 'C';
}

/**
 * STRICT SERVER RULEBOOK — exact subject name matching (switch/case).
 * Mirrors the client-side getFullMarks in constants.ts exactly.
 * No .includes() — prevents Mathematics Oral being matched as Mathematics.
 */
function getOfficialFullMarks(subject: string, className: string = ''): number {
    switch (subject.trim()) {
        // 50-mark subjects (all classes)
        case 'Bengali Literature':
        case 'Bengali Language':
        case 'English Literature':
        case 'English Language':
        case 'Mathematics':
            return 50;

        // Science / Social — 50 for STD-IV, 25 elsewhere
        case 'Science':
        case 'History':
        case 'Geography':
        case 'General Knowledge':
            return className === 'STD-IV' ? 50 : 25;

        // Fixed 25-mark subjects
        case 'Hindi':
        case 'HGS':
        case 'Physical Education':
        case 'Work Education':
            return 25;

        // Project — 20 for KG-II A/B, 25 elsewhere
        case 'Project':
            return (className === 'KG-II A' || className === 'KG-II B') ? 20 : 25;

        // Computer subjects
        case 'Computer Written':
            return 20;
        case 'Computer Practical':
            return 10;
        case 'Computer Oral':
            return 15;

        // Spoken English
        case 'Spoken English':
            return 20;

        // Handwriting — 10 for KG-I, 15 elsewhere
        case 'Bengali Handwriting':
        case 'Bengali Handwraiting': // typo variant
        case 'English Handwriting':
            return className === 'KG-I' ? 10 : 15;

        // Oral / Rhymes — 10 for KG-I, 15 elsewhere
        case 'Mathematics Oral':
        case 'Bengali Rhymes':
        case 'English Rhymes':
            return className === 'KG-I' ? 10 : 15;

        default:
            return 50;
    }
}
