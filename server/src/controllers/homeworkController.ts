import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';

// --- Homework Management ---

export const createHomework = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, dueDate, classId, subject } = req.body;
        const teacherId = req.user?.id;

        let fileUrl = null;
        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
        }

        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });

        const id = crypto.randomUUID();
        const homeworkRes = await db.query(
            `INSERT INTO "Homework" (id, title, description, subject, "dueDate", "classId", "teacherId", "fileUrl") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [id, title, description, subject || null, new Date(dueDate), classId, teacherId, fileUrl]
        );

        res.status(201).json(homeworkRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating homework' });
    }
};

export const getHomeworks = async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.query;
        let query = `
            SELECT h.*, 
                   row_to_json(t.*) as teacher, 
                   row_to_json(c.*) as class 
            FROM "Homework" h
            LEFT JOIN "Teacher" t ON h."teacherId" = t.id
            LEFT JOIN "Class" c ON h."classId" = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (classId) {
            query += ` AND h."classId" = $${paramCount++}`;
            params.push(classId);
        }

        if (req.user?.role === 'STUDENT') {
            const studentRes = await db.query(`SELECT "classId" FROM "Student" WHERE id = $1`, [req.user.id]);
            if (studentRes.rows.length > 0) {
                query += ` AND h."classId" = $${paramCount++}`;
                params.push(studentRes.rows[0].classId);
            }
        }

        query += ` ORDER BY h."createdAt" DESC`;
        const homeworksRes = await db.query(query, params);

        res.json(homeworksRes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching homeworks' });
    }
};

// --- Submissions Management ---

export const submitHomework = async (req: AuthRequest, res: Response) => {
    try {
        const { homeworkId, content } = req.body;
        const studentId = req.user?.id;

        if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

        let fileUrl = null;
        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
        }

        // Upsert submission (allow student to resubmit until graded)
        const existingRes = await db.query(
            `SELECT id FROM "Submission" WHERE "studentId" = $1 AND "homeworkId" = $2 LIMIT 1`,
            [studentId, homeworkId]
        );

        if (existingRes.rows.length > 0) {
            const existingId = existingRes.rows[0].id;
            const updatedRes = await db.query(
                `UPDATE "Submission" 
                 SET content = $1, "fileUrl" = COALESCE($2, "fileUrl"), status = 'SUBMITTED', "submittedAt" = CURRENT_TIMESTAMP 
                 WHERE id = $3 RETURNING *`,
                [content, fileUrl, existingId]
            );
            return res.json(updatedRes.rows[0]);
        }

        const subId = crypto.randomUUID();
        const submissionRes = await db.query(
            `INSERT INTO "Submission" (id, "homeworkId", "studentId", content, "fileUrl", status) 
             VALUES ($1, $2, $3, $4, $5, 'SUBMITTED') RETURNING *`,
            [subId, homeworkId, studentId, content, fileUrl]
        );

        res.status(201).json(submissionRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting homework' });
    }
};

export const getSubmissions = async (req: Request, res: Response) => {
    try {
        const { homeworkId, studentId } = req.query;
        let query = `
            SELECT s.*, 
                   row_to_json(st.*) as student, 
                   row_to_json(h.*) as homework 
            FROM "Submission" s
            LEFT JOIN "Student" st ON s."studentId" = st.id
            LEFT JOIN "Homework" h ON s."homeworkId" = h.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (homeworkId) {
            query += ` AND s."homeworkId" = $${paramCount++}`;
            params.push(homeworkId);
        }
        if (studentId) {
            query += ` AND s."studentId" = $${paramCount++}`;
            params.push(studentId);
        }

        query += ` ORDER BY s."submittedAt" DESC`;
        const submissionsRes = await db.query(query, params);

        res.json(submissionsRes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching submissions' });
    }
};

export const gradeSubmission = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body; // should be 'GRADED' etc.

        const submissionRes = await db.query(
            `UPDATE "Submission" SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );

        res.json(submissionRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error grading submission' });
    }
};
