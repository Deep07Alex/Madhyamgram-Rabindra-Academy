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
            [id, semester, subject, parseFloat(marks as string), parseFloat(totalMarks as string), parseInt(academicYear as string || '2025'), grade || null, studentId]
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
        let startIndex = 0;
        const isFullMarksRow = String(fullMarksRow['Name'] || fullMarksRow['Roll']).includes('Full Marks');
        
        if (isFullMarksRow) {
            startIndex = 1;
            console.log('Detected Full Marks row in Excel');
        } else {
            fullMarksRow = null;
        }

        for (let i = startIndex; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rawAdmissionNo = row['Admission No'] || row['Admission Regn. No.'] || row['Admission Register No'];
            if (!rawAdmissionNo) continue;

            const admissionNo = String(rawAdmissionNo).trim();
            const studentDbId = studentMap.get(admissionNo);

            if (!studentDbId) {
                console.warn(`Student not found for Admission No: ${admissionNo}`);
                continue;
            }

            for (const key of Object.keys(row)) {
                if (ignoredColumns.includes(key)) continue;

                const marksValue = row[key];
                if (marksValue === undefined || marksValue === null || marksValue === '') continue;
                
                const marks = parseFloat(marksValue);
                if (isNaN(marks)) continue;

                // Determine total marks for this subject
                let totalMarks = 100;
                if (fullMarksRow && fullMarksRow[key]) {
                    totalMarks = parseFloat(fullMarksRow[key]) || 100;
                } else {
                    // Fallback to 100 or term-based logic if row is missing
                    totalMarks = (semester === 'Unit-III') ? 100 : 50;
                    // Special case for computer if not in row
                    if (key.includes('Computer Oral') || key.includes('Computer Written')) totalMarks = (semester === 'Unit-III') ? 20 : 10;
                    if (key.includes('Computer Practical')) totalMarks = (semester === 'Unit-III') ? 80 : 40;
                }

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
            return res.status(400).json({ message: 'No valid results found. Ensure "Admission No" matches student records.' });
        }

        // Process in a single transaction for efficiency using Bulk INSERT
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
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
        const studentId = req.params.studentId || req.user?.id;
        const academicYear = parseInt(req.query.academicYear as string || '2025');

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

        // Calculate Rank in Class
        const rankRes = await db.query(
            `WITH StudentTotals AS (
                SELECT "studentId", SUM(marks) as grand_total
                FROM "Result"
                WHERE "academicYear" = $1 AND "studentId" IN (SELECT id FROM "Student" WHERE "classId" = $2)
                GROUP BY "studentId"
            )
            SELECT "studentId", rank() OVER (ORDER BY grand_total DESC) as rank
            FROM StudentTotals`,
            [academicYear, student.classId]
        );
        
        const rankInfo = rankRes.rows.find(r => r.studentId === studentId);
        const myRank = rankInfo ? String(rankInfo.rank) : '-';

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
            highestMarks
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
        const { studentId, semester, academicYear } = req.query;
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
    } catch (error) {
        console.error('Error in bulk class result deletion:', error);
        res.status(500).json({ message: 'Error in bulk class result deletion' });
    }
};

/**
 * Helper to calculate grade based on percentage
 */
function calculateGrade(marks: number, total: number) {
    const p = (marks / total) * 100;
    if (p >= 90) return 'AA';
    if (p >= 80) return 'A+';
    if (p >= 60) return 'A';
    if (p >= 50) return 'B+';
    if (p >= 30) return 'B';
    return 'C';
}
