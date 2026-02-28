import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';

// --- Student Attendance ---

export const markStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { date, status, studentId, classId, subject } = req.body;
    const teacherId = req.user?.id;

    if (!teacherId || req.user?.role !== 'TEACHER') {
        return res.status(403).json({ message: 'Only teachers can mark attendance' });
    }

    try {
        const id = crypto.randomUUID();
        const attendanceRes = await db.query(
            `INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId", subject) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [id, new Date(date), status, studentId, teacherId, classId, subject || null]
        );
        res.status(201).json(attendanceRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error marking student attendance' });
    }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { studentId, classId, startDate, endDate } = req.query;

    try {
        let query = `
            SELECT a.*, 
                   row_to_json(s.*) as student, 
                   row_to_json(c.*) as class
            FROM "Attendance" a
            LEFT JOIN "Student" s ON a."studentId" = s.id
            LEFT JOIN "Class" c ON a."classId" = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (studentId) {
            query += ` AND a."studentId" = $${paramCount++}`;
            params.push(studentId);
        }
        if (classId) {
            query += ` AND a."classId" = $${paramCount++}`;
            params.push(classId);
        }
        if (startDate && endDate) {
            query += ` AND a.date >= $${paramCount++} AND a.date <= $${paramCount++}`;
            params.push(new Date(startDate as string), new Date(endDate as string));
        }

        const attendanceRes = await db.query(query, params);
        res.json(attendanceRes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student attendance' });
    }
};

// --- Teacher Attendance ---

export const markTeacherAttendance = async (req: AuthRequest, res: Response) => {
    const { date, status } = req.body;
    const teacherId = req.user?.id;

    if (!teacherId || req.user?.role !== 'TEACHER') {
        return res.status(403).json({ message: 'Only teachers can mark their own attendance' });
    }

    try {
        const id = crypto.randomUUID();
        const attendanceRes = await db.query(
            `INSERT INTO "TeacherAttendance" (id, date, status, "teacherId") 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, new Date(date), status, teacherId]
        );
        res.status(201).json(attendanceRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error marking teacher attendance' });
    }
};

export const getTeacherAttendance = async (req: Request, res: Response) => {
    const { teacherId, startDate, endDate } = req.query;

    try {
        let query = `
            SELECT ta.*, row_to_json(t.*) as teacher
            FROM "TeacherAttendance" ta
            LEFT JOIN "Teacher" t ON ta."teacherId" = t.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (teacherId) {
            query += ` AND ta."teacherId" = $${paramCount++}`;
            params.push(teacherId);
        }

        if (startDate && endDate) {
            query += ` AND ta.date >= $${paramCount++} AND ta.date <= $${paramCount++}`;
            params.push(new Date(startDate as string), new Date(endDate as string));
        }

        const attendanceRes = await db.query(query, params);
        res.json(attendanceRes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teacher attendance' });
    }
};
