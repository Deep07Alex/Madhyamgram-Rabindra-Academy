import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { broadcast } from '../lib/sseManager.js';

export const createFee = async (req: Request, res: Response) => {
    try {
        const { amount, dueDate, type, studentId } = req.body;

        const id = crypto.randomUUID();
        const feeRes = await db.query(
            `INSERT INTO "Fee" (id, "studentId", amount, "dueDate", type, status) 
             VALUES ($1, $2, $3, $4, $5, 'PENDING') RETURNING *`,
            [id, studentId, parseFloat(amount as string), new Date(dueDate), type]
        );

        broadcast('fee:created', { studentId: feeRes.rows[0].studentId });
        res.status(201).json(feeRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating fee' });
    }
};

export const createFeesForClass = async (req: Request, res: Response) => {
    try {
        const { amount, dueDate, type, classId } = req.body;

        const studentsRes = await db.query(`SELECT id FROM "Student" WHERE "classId" = $1`, [classId]);

        let count = 0;
        for (const student of studentsRes.rows) {
            const id = crypto.randomUUID();
            await db.query(
                `INSERT INTO "Fee" (id, "studentId", amount, "dueDate", type, status) 
                 VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
                [id, student.id, parseFloat(amount as string), new Date(dueDate), type]
            );
            count++;
        }

        broadcast('fee:created', { classId });
        res.status(201).json({ message: `${count} fees created` });
    } catch (error) {
        res.status(500).json({ message: 'Error creating fees for class' });
    }
};

export const recordPayment = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { amountPaid, paymentMethod, remark, status } = req.body;

        const updateRes = await db.query(
            `UPDATE "Fee" 
             SET status = $1, "paymentMethod" = $2, remark = $3, "paidAt" = CASE WHEN $1 = 'PAID' THEN CURRENT_TIMESTAMP ELSE "paidAt" END
             WHERE id = $4 RETURNING *`,
            [status || 'PAID', paymentMethod, remark, id]
        );

        res.json(updateRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error recording payment' });
    }
};

export const getFees = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, classId, status } = req.query;
        let whereClause: any = {};

        let query = `
            SELECT f.*, 
                   row_to_json(s.*) as student,
                   row_to_json(c.*) as class
            FROM "Fee" f
            LEFT JOIN "Student" s ON f."studentId" = s.id
            LEFT JOIN "Class" c ON s."classId" = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (req.user?.role === 'STUDENT') {
            query += ` AND f."studentId" = $${paramCount++}`;
            params.push(req.user.id);
        } else {
            if (studentId) {
                query += ` AND f."studentId" = $${paramCount++}`;
                params.push(studentId);
            }
            if (classId) {
                query += ` AND s."classId" = $${paramCount++}`;
                params.push(classId);
            }
        }

        if (status) {
            query += ` AND f.status = $${paramCount++}`;
            params.push(status);
        }

        query += ` ORDER BY f."dueDate" DESC`;
        const feesRes = await db.query(query, params);

        res.json(feesRes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fees' });
    }
};
