import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { broadcast, sendToUser, sendToRole } from '../lib/sseManager.js';
import { emitEvent } from '../lib/socket.js';

// --- Student Attendance ---

export const markStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { date, status, studentId, classId, subject } = req.body;
    const userRole = req.user?.role;
    if (!req.user?.id || (userRole !== 'TEACHER' && userRole !== 'ADMIN')) {
        return res.status(403).json({ message: 'Only teachers and admins can mark attendance' });
    }

    let markerId = req.user.id;
    // If admin is marking students, we need a valid teacherId for the foreign key
    if (userRole === 'ADMIN') {
        const sysMarker = await db.query('SELECT id FROM "Teacher" LIMIT 1');
        if (sysMarker.rows.length > 0) markerId = sysMarker.rows[0].id;
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
                [status, markerId, classId, subject || null, existingCheck.rows[0].id]
            );
        } else {
            // Insert new record
            const id = crypto.randomUUID();
            attendanceRes = await db.query(
                `INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId", subject) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [id, attendanceDateStr, status, studentId, markerId, classId, subject || null]
            );
        }

        broadcast('attendance:updated', { studentId, date: attendanceDateStr });
        sendToUser(studentId, 'attendance:updated', { date: attendanceDateStr });
        sendToRole('ADMIN', 'attendance:updated', { studentId, date: attendanceDateStr });
        
        res.status(200).json(attendanceRes.rows[0]);
    } catch (error) {
        console.error('Error marking student attendance:', error);
        res.status(500).json({ message: 'Error marking student attendance' });
    }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { studentId, classId, startDate, endDate } = req.query;
    const targetStudentId = studentId || (req.user?.role === 'STUDENT' ? req.user.id : null);

    try {
        // 1. Get total sessions (ALL DAYS)
        let sessionRes = await db.query(`
            SELECT COUNT(DISTINCT date::date) FROM "Attendance"
        `);
        const totalSessions = parseInt(sessionRes.rows[0].count, 10);

        // 2. Get explicit records
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

        if (targetStudentId) {
            query += ` AND a."studentId" = $${paramCount++}`;
            params.push(targetStudentId);
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
        
        // Return records and totalSessions
        res.json({
            records: attendanceRes.rows,
            totalSessions
        });
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ message: 'Error fetching student attendance' });
    }
};

// --- Teacher Attendance ---

export const markTeacherAttendance = async (req: AuthRequest, res: Response) => {
    const { date, status, reason, teacherId: bodyTeacherId } = req.body;
    const markerId = req.user?.id;
    const userRole = req.user?.role;

    if (!markerId || (userRole !== 'TEACHER' && userRole !== 'ADMIN')) {
        return res.status(403).json({ message: 'Unauthorized role' });
    }

    // Determine whose attendance we are marking
    // Admin marks bodyTeacherId, Teacher marks their own markerId
    const targetTeacherId = (userRole === 'ADMIN' && bodyTeacherId) ? bodyTeacherId : markerId;

    try {
        const attendanceDateStr = new Date(date || new Date()).toISOString().split('T')[0];

        // Ensure we only have one record per teacher per calendar date
        const existingCheck = await db.query(
            `SELECT id FROM "TeacherAttendance" 
             WHERE "teacherId" = $1 AND date::date = $2`,
            [targetTeacherId, attendanceDateStr]
        );

        let attendanceRes;

        if (existingCheck.rows.length > 0) {
            // Update existing record
            attendanceRes = await db.query(
                `UPDATE "TeacherAttendance"
                 SET status = $1, reason = $2
                 WHERE id = $3
                 RETURNING *`,
                [status, status === 'ABSENT' ? reason : null, existingCheck.rows[0].id]
            );
        } else {
            // Insert new record
            const id = crypto.randomUUID();
            attendanceRes = await db.query(
                `INSERT INTO "TeacherAttendance" (id, date, status, reason, "teacherId") 
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [id, attendanceDateStr, status, status === 'ABSENT' ? reason : null, targetTeacherId]
            );
        }

        broadcast('attendance:updated', { teacherId: targetTeacherId, date: attendanceDateStr });
        sendToUser(targetTeacherId, 'attendance:updated', { date: attendanceDateStr });
        sendToRole('ADMIN', 'attendance:updated', { teacherId: targetTeacherId, date: attendanceDateStr });
        
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

    if (!['PRESENT', 'ABSENT'].includes(status)) {
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

        const record = result.rows[0];
        
        // Broadcast updates asynchronously so they don't block the response or cause 500s
        try {
            const sid = record.studentId || record.studentid;
            const d = new Date(record.date);
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            if (sid) {
                broadcast('attendance:updated', { studentId: sid, date: dStr });
                sendToUser(sid, 'attendance:updated', { date: dStr });
            }
            sendToRole('ADMIN', 'attendance:updated', { date: dStr });
        } catch (err) {
            console.error('Live update broadcast failed (student):', err);
        }

        res.json(record);
    } catch (error) {
        console.error('Error updating student attendance:', error);
        res.status(500).json({ message: 'Error updating student attendance' });
    }
};

export const updateTeacherAttendance = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['PRESENT', 'ABSENT'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        const result = await db.query(
            `UPDATE "TeacherAttendance" SET status = $1, reason = $2 WHERE id = $3 RETURNING *`,
            [status, status === 'ABSENT' ? reason : null, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        const record = result.rows[0];

        // Broadcast updates asynchronously
        try {
            const tid = record.teacherId || record.teacherid;
            const d = new Date(record.date);
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            if (tid) {
                broadcast('attendance:updated', { teacherId: tid, date: dStr });
                sendToUser(tid, 'attendance:updated', { date: dStr });
            }
            sendToRole('ADMIN', 'attendance:updated', { date: dStr });
        } catch (err) {
            console.error('Live update broadcast failed (teacher):', err);
        }

        res.json(record);
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
