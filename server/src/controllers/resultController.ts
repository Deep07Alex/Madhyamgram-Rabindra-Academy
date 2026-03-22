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
        const dataRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

        if (dataRows.length === 0) {
            return res.status(400).json({ message: 'Excel sheet is empty' });
        }

        // Fetch all students in the class for matching
        const studentsRes = await db.query('SELECT id, "studentId" FROM "Student" WHERE "classId" = $1', [classId]);
        const studentMap = new Map<string, string>(studentsRes.rows.map(s => [String(s.studentId).trim(), s.id]));

        const resultsToInsert = [];
        const ignoredColumns = ['Admission No', 'Roll', 'Name', 'Admission Regn. No.', 'Admission Register No'];

        for (const row of dataRows) {
            const rawAdmissionNo = row['Admission No'] || row['Admission Regn. No.'] || row['Admission Register No'];
            if (!rawAdmissionNo) continue;

            const admissionNo = String(rawAdmissionNo).trim();
            const studentDbId = studentMap.get(admissionNo);

            if (!studentDbId) continue;

            for (const key of Object.keys(row)) {
                if (ignoredColumns.includes(key)) continue;

                const marks = parseFloat(row[key]);
                if (isNaN(marks)) continue;

                resultsToInsert.push({
                    id: crypto.randomUUID(),
                    studentId: studentDbId,
                    subject: key,
                    semester,
                    academicYear: parseInt(academicYear),
                    marks: marks,
                    totalMarks: 100, // Default base
                    grade: calculateGrade(marks, 100)
                });
            }
        }

        if (resultsToInsert.length === 0) {
            return res.status(400).json({ message: 'No valid results found. Ensure "Admission No" matches student records.' });
        }

        // Process in a single transaction for efficiency
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            for (const r of resultsToInsert) {
                await client.query(
                    `INSERT INTO "Result" (id, "studentId", subject, semester, "academicYear", marks, "totalMarks", grade)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT ON CONSTRAINT "result_unique_entry"
                     DO UPDATE SET marks = EXCLUDED.marks, "totalMarks" = EXCLUDED."totalMarks", grade = EXCLUDED.grade`,
                    [r.id, r.studentId, r.subject, r.semester, r.academicYear, r.marks, r.totalMarks, r.grade]
                );
            }
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

        // Fetch Attendance Summary
        const attendanceRes = await db.query(
            `SELECT 
                COUNT(*) as total_days,
                COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present_days,
                COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent_days
             FROM "Attendance" 
             WHERE "studentId" = $1 AND EXTRACT(YEAR FROM date) = $2`,
            [studentId, academicYear]
        );

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

        res.json({
            student,
            results: resultsRes.rows,
            attendance: attendanceRes.rows[0] || { total_days: 0, present_days: 0, absent_days: 0 },
            rank: myRank
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

/**
 * Deletes a result record.
 */
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
