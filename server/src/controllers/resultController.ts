/**
 * Result Controller
 * 
 * Manages academic results/marks for students across different semesters and subjects.
 */
import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { broadcast, sendToRole, sendToUser } from '../lib/sseManager.js';
import { emitEvent } from '../lib/socket.js';

/**
 * Records a new academic result for a student.
 */
export const createResult = async (req: Request, res: Response) => {
    try {
        const { semester, subject, marks, totalMarks, grade, studentId } = req.body;

        const id = crypto.randomUUID();
        const resultRes = await db.query(
            `INSERT INTO "Result" (id, semester, subject, marks, "totalMarks", grade, "studentId") 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [id, semester, subject, parseFloat(marks as string), parseFloat(totalMarks as string), grade || null, studentId]
        );

        broadcast('result_published', { studentId: resultRes.rows[0].studentId });
        sendToUser(studentId, 'result_published', resultRes.rows[0]);
        
        res.status(201).json(resultRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating result' });
    }
};

/**
 * Retrieves academic results, optionally filtered by student and semester.
 */
export const getResults = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, semester } = req.query;
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

        query += ` ORDER BY r."createdAt" DESC`;
        const resultsRes = await db.query(query, params);

        res.json(resultsRes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching results' });
    }
};
