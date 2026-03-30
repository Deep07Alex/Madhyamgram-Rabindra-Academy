/**
 * Notice Controller
 * 
 * Manages school-wide and targeted notices.
 * Handles role-based visibility, expiration dates, and real-time announcements.
 */
import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import { broadcast, sendToRole } from '../lib/sseManager.js';

/**
 * Creates a new notice.
 * Can be public or internal, and optionally targeted at specific audiences or classes.
 */
export const createNotice = async (req: Request, res: Response) => {
    try {
        const { title, content, type, targetAudience, targetClassId, targetStudentId, expiresAt } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }

        const id = uuidv4();
        
        // Derive Correct Postgres columns to satisfy CHECK constraints
        const noticeType = targetAudience === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL';
        const audience = targetAudience === 'PUBLIC' ? 'ALL' : targetAudience;

        await db.query(
            `INSERT INTO "Notice" 
            ("id", "title", "content", "type", "targetAudience", "targetClassId", "targetStudentId", "expiresAt") 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, title, content, noticeType, audience || 'ALL', targetClassId || null, targetStudentId || null, expiresAt || null]
        );

        const result = await db.query('SELECT * FROM "Notice" WHERE id = $1', [id]);
        const newNotice = result.rows[0];

        // Emit real-time events
        broadcast('new_notice', newNotice);
        sendToRole('ADMIN', 'new_notice', newNotice);

        res.status(201).json(newNotice);
    } catch (error) {
        console.error('Error creating notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Retrieves notices based on the current user's role and permissions.
 * 
 * Visibility Logic:
 * - Public: Visible to everyone.
 * - Admin: Visible to all administrators.
 * - Internal (Teacher): Visible only to faculty if not targeted specifically.
 * - Internal (Student): Visible to students if targeted at their class or their specific ID.
 */
export const getNotices = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        if (!user) {
            // Unauthenticated user -> No notices (Public landing page concept removed)
            return res.json([]);
        }

        if (user.role === 'ADMIN') {
            // Admin -> All notices (but filter expired if we want them "gone from everywhere")
            const result = await db.query(
                `SELECT * FROM "Notice" 
                 WHERE ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
                 ORDER BY "createdAt" DESC`
            );
            return res.json(result.rows);
        }

        if (user.role === 'TEACHER') {
            // Teacher -> Internal (ALL or TEACHER) AND not expired
            const result = await db.query(
                `SELECT * FROM "Notice" 
                 WHERE "targetAudience" IN ('ALL', 'TEACHER')
                 AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
                 ORDER BY "createdAt" DESC`
            );
            return res.json(result.rows);
        }

        if (user.role === 'STUDENT') {
            // Student -> Internal (ALL or STUDENT and matches class/id)
            const studentResult = await db.query(`SELECT "classId" FROM "Student" WHERE id = $1`, [user.id]);
            const student = studentResult.rows[0];

            if (!student) {
                return res.json([]);
            }

            const classId = student.classId;

            const result = await db.query(
                `SELECT * FROM "Notice" 
                 WHERE (
                    "targetAudience" IN ('ALL', 'STUDENT')
                    AND ("targetClassId" IS NULL OR "targetClassId" = $1)
                    AND ("targetStudentId" IS NULL OR "targetStudentId" = $2)
                 )
                 AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
                 ORDER BY "createdAt" DESC`,
                [classId, user.id]
            );
            return res.json(result.rows);
        }

        res.json([]);
    } catch (error) {
        console.error('Error fetching notices:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Deletes a notice.
 */
export const deleteNotice = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await db.query('DELETE FROM "Notice" WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        broadcast('notice_deleted', { id });
        res.json({ message: 'Notice deleted successfully' });
    } catch (error) {
        console.error('Error deleting notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Updates an existing notice.
 */
export const updateNotice = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content, targetAudience, targetClassId, targetStudentId, expiresAt } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }

        // Derive Correct Postgres columns
        const noticeType = targetAudience === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL';
        const audience = targetAudience === 'PUBLIC' ? 'ALL' : targetAudience;

        const result = await db.query(
            `UPDATE "Notice" 
             SET "title" = $1, "content" = $2, "type" = $3, "targetAudience" = $4, 
                 "targetClassId" = $5, "targetStudentId" = $6, "expiresAt" = $7
             WHERE "id" = $8 
             RETURNING *`,
            [title, content, noticeType, audience || 'ALL', targetClassId || null, targetStudentId || null, expiresAt || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        const updatedNotice = result.rows[0];
        broadcast('new_notice', updatedNotice); // Using new_notice to update ui states
        
        res.json(updatedNotice);
    } catch (error) {
        console.error('Error updating notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};