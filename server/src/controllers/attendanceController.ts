import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { broadcast } from '../lib/sseManager.js';

// --- Student Attendance ---

export const markStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { date, status, studentId, classId, subject } = req.body;
    const teacherId = req.user?.id;

    if (!teacherId || req.user?.role !== 'TEACHER') {
        return res.status(403).json({ message: 'Only teachers can mark attendance' });
    }

    try {
        const attendanceDateStr = new Date(date).toISOString().split('T')[0];

        // Ensure we only have one record per student per calendar date
        const existingCheck = await db.query(
            `SELECT id FROM "Attendance" 
             WHERE "studentId" = $1 AND date::date = $2`,
            [studentId, attendanceDateStr]
        );

        let attendanceRes;

        if (existingCheck.rows.length > 0) {
            // Update existing record for today
            attendanceRes = await db.query(
                `UPDATE "Attendance"
                 SET status = $1, "teacherId" = $2, "classId" = $3, subject = $4
                 WHERE id = $5
                 RETURNING *`,
                [status, teacherId, classId, subject || null, existingCheck.rows[0].id]
            );
        } else {
            // Insert new record
            const id = crypto.randomUUID();
            attendanceRes = await db.query(
                `INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId", subject) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [id, attendanceDateStr, status, studentId, teacherId, classId, subject || null]
            );
        }

        broadcast('attendance:updated', { studentId, date: attendanceDateStr });
        res.status(200).json(attendanceRes.rows[0]);
    } catch (error) {
        console.error('Error marking student attendance:', error);
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
        } else if (req.user?.role === 'STUDENT') {
            query += ` AND a."studentId" = $${paramCount++}`;
            params.push(req.user.id);
        }
        if (classId) {
            query += ` AND a."classId" = $${paramCount++}`;
            params.push(classId);
        }
        if (startDate && endDate) {
            query += ` AND a.date >= $${paramCount++} AND a.date <= $${paramCount++}`;
            params.push(new Date(startDate as string).toISOString().split('T')[0], new Date(endDate as string).toISOString().split('T')[0]);
        }

        query += ` ORDER BY a.date DESC`;

        const attendanceRes = await db.query(query, params);
        res.json(attendanceRes.rows);
    } catch (error) {
        console.error('Error fetching student attendance:', error);
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
        const attendanceDateStr = new Date(date || new Date()).toISOString().split('T')[0];

        // Ensure we only have one record per teacher per calendar date
        const existingCheck = await db.query(
            `SELECT id FROM "TeacherAttendance" 
             WHERE "teacherId" = $1 AND date::date = $2`,
            [teacherId, attendanceDateStr]
        );

        let attendanceRes;

        if (existingCheck.rows.length > 0) {
            // Update existing record
            attendanceRes = await db.query(
                `UPDATE "TeacherAttendance"
                 SET status = $1
                 WHERE id = $2
                 RETURNING *`,
                [status, existingCheck.rows[0].id]
            );
        } else {
            // Insert new record
            const id = crypto.randomUUID();
            attendanceRes = await db.query(
                `INSERT INTO "TeacherAttendance" (id, date, status, "teacherId") 
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [id, attendanceDateStr, status, teacherId]
            );
        }

        broadcast('attendance:updated', { teacherId, date: attendanceDateStr });
        res.status(200).json(attendanceRes.rows[0]);
    } catch (error) {
        console.error('Error marking teacher attendance:', error);
        res.status(500).json({ message: 'Error marking teacher attendance' });
    }
};

// --- Admin Update Attendance ---

export const updateStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        const result = await db.query(
            `UPDATE "Attendance" SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating student attendance:', error);
        res.status(500).json({ message: 'Error updating student attendance' });
    }
};

export const updateTeacherAttendance = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        const result = await db.query(
            `UPDATE "TeacherAttendance" SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating teacher attendance:', error);
        res.status(500).json({ message: 'Error updating teacher attendance' });
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
            params.push(new Date(startDate as string).toISOString().split('T')[0], new Date(endDate as string).toISOString().split('T')[0]);
        }

        query += ` ORDER BY ta.date DESC`;

        const attendanceRes = await db.query(query, params);
        res.json(attendanceRes.rows);
    } catch (error) {
        console.error('Error fetching teacher attendance:', error);
        res.status(500).json({ message: 'Error fetching teacher attendance' });
    }
};
