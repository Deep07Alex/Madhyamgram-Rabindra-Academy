import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import { broadcast, sendToRole } from '../lib/sseManager.js';

export const createNotice = async (req: Request, res: Response) => {
    try {
        const { title, content, type, targetAudience, targetClassId, targetStudentId, expiresAt } = req.body;

        if (!title || !content || !type) {
            return res.status(400).json({ message: 'Title, content, and type are required' });
        }

        const id = uuidv4();
        
        await db.query(
            `INSERT INTO "Notice" 
            ("id", "title", "content", "type", "targetAudience", "targetClassId", "targetStudentId", "expiresAt") 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, title, content, type, targetAudience || 'ALL', targetClassId || null, targetStudentId || null, expiresAt || null]
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

export const getNotices = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        if (!user) {
            // Unauthenticated user -> Public notices only, not expired
            const result = await db.query(
                `SELECT * FROM "Notice" 
                 WHERE "type" = 'PUBLIC' 
                 AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
                 ORDER BY "createdAt" DESC`
            );
            return res.json(result.rows);
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
            // Teacher -> Public OR (Internal and (ALL or TEACHER)) AND not expired
            const result = await db.query(
                `SELECT * FROM "Notice" 
                 WHERE ("type" = 'PUBLIC' OR ("type" = 'INTERNAL' AND "targetAudience" IN ('ALL', 'TEACHER')))
                 AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
                 ORDER BY "createdAt" DESC`
            );
            return res.json(result.rows);
        }

        if (user.role === 'STUDENT') {
            // Student -> Public OR (Internal and (ALL or STUDENT and matches class/id))
            const studentResult = await db.query(`SELECT "classId" FROM "Student" WHERE id = $1`, [user.id]);
            const student = studentResult.rows[0];
            
            if (!student) {
                 return res.json([]);
            }
            
            const classId = student.classId;

            const result = await db.query(
                `SELECT * FROM "Notice" 
                 WHERE (
                    "type" = 'PUBLIC' 
                    OR (
                        "type" = 'INTERNAL' 
                        AND "targetAudience" IN ('ALL', 'STUDENT')
                        AND ("targetClassId" IS NULL OR "targetClassId" = $1)
                        AND ("targetStudentId" IS NULL OR "targetStudentId" = $2)
                    )
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
