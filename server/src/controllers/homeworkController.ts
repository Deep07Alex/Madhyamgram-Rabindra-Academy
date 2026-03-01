import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { broadcast } from '../lib/sseManager.js';

// --- Homework Management ---

export const createHomework = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, dueDate, classId, subject, allowFileUpload } = req.body;
        const teacherId = req.user?.id;

        let fileUrl = null;
        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
        }

        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });

        const id = crypto.randomUUID();
        const homeworkRes = await db.query(
            `INSERT INTO "Homework" (id, title, description, subject, "dueDate", "classId", "teacherId", "fileUrl", "allowFileUpload") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [id, title, description, subject || null, new Date(dueDate), classId, teacherId, fileUrl, allowFileUpload === 'true' || allowFileUpload === true]
        );

        broadcast('homework:created', { classId: homeworkRes.rows[0].classId });
        res.status(201).json(homeworkRes.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating homework' });
    }
};

export const deleteHomework = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Remove submissions first to avoid FK violation
        await db.query(`DELETE FROM "Submission" WHERE "homeworkId" = $1`, [id]);
        const result = await db.query(`DELETE FROM "Homework" WHERE id = $1 RETURNING id`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Homework not found' });
        broadcast('homework:deleted', { id });
        res.json({ message: 'Homework deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting homework' });
    }
};

export const getHomeworks = async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.query;
        const userId = req.user?.id;
        const role = req.user?.role;

        // For students: include their own submissions in each homework row
        const submissionsSubquery = role === 'STUDENT'
            ? `(SELECT json_agg(json_build_object('id', s.id, 'status', s.status, 'content', s.content, 'fileUrl', s."fileUrl", 'submittedAt', s."submittedAt"))
               FROM "Submission" s WHERE s."homeworkId" = h.id AND s."studentId" = '${userId}') as submissions`
            : `'[]'::json as submissions`;

        let query = `
            SELECT h.*,
                   row_to_json(t.*) as teacher,
                   row_to_json(c.*) as class,
                   ${submissionsSubquery}
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

        if (role === 'STUDENT') {
            const studentRes = await db.query(`SELECT "classId" FROM "Student" WHERE id = $1`, [userId]);
            if (studentRes.rows.length > 0) {
                query += ` AND h."classId" = $${paramCount++}`;
                params.push(studentRes.rows[0].classId);
            }
        }

        query += ` ORDER BY h."createdAt" DESC`;
        const homeworksRes = await db.query(query, params);

        res.json(homeworksRes.rows);
    } catch (error) {
        console.error(error);
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
            broadcast('homework:submitted', { homeworkId, studentId });
            return res.json(updatedRes.rows[0]);
        }

        const subId = crypto.randomUUID();
        const submissionRes = await db.query(
            `INSERT INTO "Submission" (id, "homeworkId", "studentId", content, "fileUrl", status) 
             VALUES ($1, $2, $3, $4, $5, 'SUBMITTED') RETURNING *`,
            [subId, homeworkId, studentId, content, fileUrl]
        );

        broadcast('homework:submitted', { homeworkId, studentId });
        res.status(201).json(submissionRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting homework' });
    }
};

export const getSubmissions = async (req: Request, res: Response) => {
    try {
        // Support both /homework/:id/submissions (params.id) and /homework/submissions?homeworkId=...
        const homeworkId = (req.params as any).id || req.query.homeworkId;
        const { studentId } = req.query;
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
