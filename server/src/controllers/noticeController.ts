import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

export const createNotice = async (req: Request, res: Response) => {
    try {
        const { title, content, type, targetAudience, targetClassId, targetStudentId } = req.body;

        if (!title || !content || !type) {
            return res.status(400).json({ message: 'Title, content, and type are required' });
        }

        const id = uuidv4();
        
        await db.query(
            `INSERT INTO "Notice" 
            ("id", "title", "content", "type", "targetAudience", "targetClassId", "targetStudentId") 
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, title, content, type, targetAudience || 'ALL', targetClassId || null, targetStudentId || null]
        );

        const result = await db.query('SELECT * FROM "Notice" WHERE id = $1', [id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getNotices = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        if (!user) {
            // Unauthenticated user -> Public notices only
            const result = await db.query(
                `SELECT * FROM "Notice" WHERE "type" = 'PUBLIC' ORDER BY "createdAt" DESC`
            );
            return res.json(result.rows);
        }

        if (user.role === 'ADMIN') {
            // Admin -> All notices
            const result = await db.query(`SELECT * FROM "Notice" ORDER BY "createdAt" DESC`);
            return res.json(result.rows);
        }

        if (user.role === 'TEACHER') {
            // Teacher -> Public OR (Internal and (ALL or TEACHER))
            const result = await db.query(
                `SELECT * FROM "Notice" 
                 WHERE "type" = 'PUBLIC' 
                 OR ("type" = 'INTERNAL' AND "targetAudience" IN ('ALL', 'TEACHER')) 
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
                 WHERE "type" = 'PUBLIC' 
                 OR (
                    "type" = 'INTERNAL' 
                    AND "targetAudience" IN ('ALL', 'STUDENT')
                    AND ("targetClassId" IS NULL OR "targetClassId" = $1)
                    AND ("targetStudentId" IS NULL OR "targetStudentId" = $2)
                 ) 
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

        res.json({ message: 'Notice deleted successfully' });
    } catch (error) {
        console.error('Error deleting notice:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
