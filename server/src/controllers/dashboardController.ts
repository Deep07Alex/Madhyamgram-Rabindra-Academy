import { Request, Response } from 'express';
import { db } from '../lib/db.js';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const studentRes = await db.query(`SELECT COUNT(*) FROM "Student"`);
        const teacherRes = await db.query(`SELECT COUNT(*) FROM "Teacher"`);
        const classRes = await db.query(`SELECT COUNT(*) FROM "Class"`);

        // Sum of all pending offline fees, for example
        const feeRes = await db.query(`SELECT COUNT(*) FROM "Fee" WHERE status = 'PENDING'`);

        res.json({
            students: parseInt(studentRes.rows[0].count, 10),
            teachers: parseInt(teacherRes.rows[0].count, 10),
            classes: parseInt(classRes.rows[0].count, 10),
            pendingFees: parseInt(feeRes.rows[0].count, 10)
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};
