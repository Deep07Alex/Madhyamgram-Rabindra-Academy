/**
 * Attendance Controller
 * 
 * Manages attendance for both Students and Teachers.
 * Supports marking attendance, retrieving history, and virtual session generation.
 */
import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import { broadcast, sendToUser, sendToRole } from '../lib/sseManager.js';
import { emitEvent } from '../lib/socket.js';

// --- Student Attendance ---

/**
 * Marks attendance for a specific student on a specific date.
 * Logic: Checks if a record exists for the date, updates it if so, otherwise creates a new one.
 */
export const markStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { date, status, studentId, classId, subject } = req.body;
    const userRole = req.user?.role;
    if (!req.user?.id || (userRole !== 'TEACHER' && userRole !== 'ADMIN')) {
        return res.status(403).json({ message: 'Only teachers and admins can mark attendance' });
    }

    let markerId = req.user.id;
    // Admins (Principal/HM) can now mark attendance directly using their Admin ID
    // The foreign key constraint has been relaxed in the database setup

    try {
        const attendanceDateStr = new Date(date).toLocaleDateString('en-CA');

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

        broadcast('attendance:updated', { studentId, date: attendanceDateStr, status });
        sendToUser(studentId, 'attendance:updated', { date: attendanceDateStr, status });
        sendToRole('ADMIN', 'attendance:updated', { studentId, date: attendanceDateStr, status });
        
        // Live Update - Mirroring the "Force Open/Close" Technique (Dual-stack Sockets + SSE)
        broadcast('attendance:updated', { studentId, date: attendanceDateStr, status });

        res.status(200).json(attendanceRes.rows[0]);
    } catch (error) {
        console.error('Error marking student attendance:', error);
        res.status(500).json({ message: 'Error marking student attendance' });
    }
};

/**
 * Retrieves attendance records for students.
 * Features "Virtual Presence": If a student has no record for a known school session date, 
 * the system virtually assumes they were PRESENT unless an explicit record states otherwise.
 */
export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { studentId, studentIds, classId, startDate, endDate } = req.query;
    const targetStudentId = studentId || (req.user?.role === 'STUDENT' ? req.user.id : null);

    // Normalize studentIds if it's a string or array
    let targetStudentIds: string[] | null = null;
    if (studentIds) {
        const rawIds = Array.isArray(studentIds) ? studentIds : [studentIds];
        targetStudentIds = rawIds.filter((id): id is string => typeof id === 'string');
    }

    try {
        // 1. Get all unique school session dates in the requested range
        // This makes the history grow "one by one" as requested while staying performant
        let sessionQuery = `
            SELECT DISTINCT date::date as session_date 
            FROM (
                SELECT date::date FROM "Attendance"
                UNION
                SELECT date::date FROM "TeacherAttendance"
            ) as session_union
        `;
        const sessionParams: any[] = [];
        sessionQuery += ` WHERE EXTRACT(DOW FROM date) != 0 `;
        if (startDate && endDate) {
            sessionQuery += ` AND date >= $1 AND date <= $2 `;
            sessionParams.push(new Date(startDate as string).toLocaleDateString('en-CA'));
            sessionParams.push(new Date(endDate as string).toLocaleDateString('en-CA'));
        }
        sessionQuery += ` ORDER BY session_date DESC`;

        const allSessionsRes = await db.query(sessionQuery, sessionParams);
        const sessionDates = allSessionsRes.rows.map(r => new Date(r.session_date).toLocaleDateString('en-CA'));

        // 2. Add today's date if not already in session dates (Virtual Presence for Today)
        // 2. Add today's date if not Sunday and not already in session dates
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-CA');
        if (today.getDay() !== 0 && !sessionDates.includes(todayStr)) {
            sessionDates.unshift(todayStr); // Add today as a potential session date
        }
        const totalSessions = sessionDates.length;

        // 2. Get explicit records for this student
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
        } else if (targetStudentIds && targetStudentIds.length > 0) {
            query += ` AND a."studentId" = ANY($${paramCount++})`;
            params.push(targetStudentIds);
        }

        if (classId) {
            query += ` AND a."classId" = $${paramCount++}`;
            params.push(classId);
        }
        if (startDate && endDate) {
            query += ` AND a.date >= $${paramCount++} AND a.date <= $${paramCount++}`;
            params.push(new Date(startDate as string).toLocaleDateString('en-CA'), new Date(endDate as string).toLocaleDateString('en-CA'));
        }
        query += ` ORDER BY a.date DESC`;

        const attendanceRes = await db.query(query, params);
        const realRecords = attendanceRes.rows;

        // 3. Merge real records with virtual PRESENT records for all sessions (for single student history)
        if (!targetStudentId && (!targetStudentIds || targetStudentIds.length === 0)) {
            return res.json({
                records: realRecords,
                totalSessions: totalSessions
            });
        }

        const recordMap = new Map();
        realRecords.forEach(r => {
            const dateStr = new Date(r.date).toLocaleDateString('en-CA');
            recordMap.set(dateStr, r);
        });

        // Construct final list from session dates
        const finalRecords = sessionDates.map(dateStr => {
            // Filter by date range if provided (to optimize response)
            if (startDate && dateStr < (startDate as string)) return null;
            if (endDate && dateStr > (endDate as string)) return null;

            if (recordMap.has(dateStr)) {
                return recordMap.get(dateStr);
            }

            // Generate virtual ABSENT record
            return {
                id: `virtual-${dateStr}`,
                date: dateStr,
                status: 'ABSENT',
                studentId: targetStudentId,
                subject: 'No Record',
                isVirtual: true // Flag for debugging if needed
            };
        }).filter(Boolean);

        res.json({
            records: finalRecords,
            totalSessions
        });
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ message: 'Error fetching student attendance' });
    }
};

// --- Teacher Attendance ---

/**
 * Marks attendance for a teacher.
 * Tracks arrival time, departure time, and reasons for absence or early leave.
 */
export const markTeacherAttendance = async (req: AuthRequest, res: Response) => {
    const { date, status, reason, arrivalTime, departureTime, earlyLeaveReason, teacherId: bodyTeacherId } = req.body;
    const markerId = req.user?.id;
    const userRole = req.user?.role;

    if (!markerId || (userRole !== 'TEACHER' && userRole !== 'ADMIN')) {
        return res.status(403).json({ message: 'Unauthorized role' });
    }

    const targetTeacherId = (userRole === 'ADMIN' && bodyTeacherId) ? bodyTeacherId : markerId;

    try {
        const attendanceDateStr = new Date(date || new Date()).toLocaleDateString('en-CA');

        const existingCheck = await db.query(
            `SELECT id, "arrivalTime", "departureTime" FROM "TeacherAttendance" 
             WHERE "teacherId" = $1 AND date::date = $2`,
            [targetTeacherId, attendanceDateStr]
        );

        let attendanceRes;

        if (existingCheck.rows.length > 0) {
            // Update existing record with coalesced values
            attendanceRes = await db.query(
                `UPDATE "TeacherAttendance"
                 SET status = COALESCE($1, status),
                     reason = COALESCE($2, reason),
                     "arrivalTime" = COALESCE($3, "arrivalTime"),
                     "departureTime" = COALESCE($4, "departureTime"),
                     "earlyLeaveReason" = COALESCE($5, "earlyLeaveReason")
                 WHERE id = $6
                 RETURNING *`,
                [
                    status || null,
                    status === 'ABSENT' ? reason : null,
                    arrivalTime || null,
                    departureTime || null,
                    earlyLeaveReason || null,
                    existingCheck.rows[0].id
                ]
            );
        } else {
            // Insert new record
            const id = crypto.randomUUID();
            attendanceRes = await db.query(
                `INSERT INTO "TeacherAttendance" (id, date, status, reason, "arrivalTime", "departureTime", "earlyLeaveReason", "teacherId") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    id,
                    attendanceDateStr,
                    status || 'PRESENT',
                    status === 'ABSENT' ? reason : null,
                    arrivalTime || null,
                    departureTime || null,
                    earlyLeaveReason || null,
                    targetTeacherId
                ]
            );
        }

        broadcast('attendance:updated', { teacherId: targetTeacherId, date: attendanceDateStr, status: status || 'PRESENT' });
        sendToUser(targetTeacherId, 'attendance:updated', { date: attendanceDateStr, status: status || 'PRESENT' });
        sendToRole('ADMIN', 'attendance:updated', { teacherId: targetTeacherId, date: attendanceDateStr, status: status || 'PRESENT' });

        // Live Update - Mirroring the "Force Open/Close" Technique (Dual-stack Sockets + SSE)
        broadcast('attendance:updated', { teacherId: targetTeacherId, date: attendanceDateStr, status: status || 'PRESENT' });

        res.status(200).json(attendanceRes.rows[0]);
    } catch (error) {
        console.error('Error marking teacher attendance:', error);
        res.status(500).json({ message: 'Error marking teacher attendance' });
    }
};

// --- Admin Update Attendance ---

/**
 * Admin utility to override/update a student's attendance status.
 */
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

            // Live Update - Mirroring the "Force Open/Close" Technique (Dual-stack Sockets + SSE)
            broadcast('attendance:updated', { studentId: sid, date: dStr, status });
        } catch (err) {
            console.error('Live update broadcast failed (student):', err);
        }

        res.json(record);
    } catch (error) {
        console.error('Error updating student attendance:', error);
        res.status(500).json({ message: 'Error updating student attendance' });
    }
};

/**
 * Admin utility to override/update a teacher's attendance status and reasons.
 */
export const updateTeacherAttendance = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason, arrivalTime, departureTime } = req.body;
    const reasonProvided = req.body.hasOwnProperty('reason');
    const arrivalProvided = req.body.hasOwnProperty('arrivalTime');
    const departureProvided = req.body.hasOwnProperty('departureTime');

    if (!['PRESENT', 'ABSENT'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        console.log(`Admin updating teacher attendance ${id}:`, req.body);

        const result = await db.query(
            `UPDATE "TeacherAttendance" 
             SET status = CAST($1 AS "AttendanceStatus"), 
                 reason = CASE 
                    WHEN $1 = 'ABSENT' THEN (CASE WHEN $6 = true THEN $2 ELSE reason END) 
                    ELSE NULL 
                 END,
                 "arrivalTime" = CASE 
                    WHEN $1 = 'ABSENT' THEN NULL 
                    ELSE (CASE WHEN $7 = true THEN $3 ELSE "arrivalTime" END) 
                 END,
                 "departureTime" = CASE 
                    WHEN $1 = 'ABSENT' THEN NULL 
                    ELSE (CASE WHEN $8 = true THEN $4 ELSE "departureTime" END) 
                 END
             WHERE id = $5 
             RETURNING *`,
            [
                status,
                reason || null,
                arrivalTime || null,
                departureTime || null,
                id,
                reasonProvided,
                arrivalProvided,
                departureProvided
            ]
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

            // Live Update - Mirroring the "Force Open/Close" Technique (Dual-stack Sockets + SSE)
            broadcast('attendance:updated', { teacherId: tid, date: dStr, status });
        } catch (err) {
            console.error('Live update broadcast failed (teacher):', err);
        }

        res.json(record);
    } catch (error) {
        console.error('Error updating teacher attendance:', error);
        res.status(500).json({ message: 'Error updating teacher attendance' });
    }
};

/**
 * Retrieves attendance history for teachers.
 */
export const getTeacherAttendance = async (req: Request, res: Response) => {
    const { teacherId, startDate, endDate } = req.query;

    try {
        let query = `
            SELECT ta.*, 
                   COALESCE(row_to_json(t.*), row_to_json(a.*)) as teacher
            FROM "TeacherAttendance" ta
            LEFT JOIN "Teacher" t ON ta."teacherId" = t.id
            LEFT JOIN "Admin" a ON ta."teacherId" = a.id
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
            params.push(new Date(startDate as string).toLocaleDateString('en-CA'), new Date(endDate as string).toLocaleDateString('en-CA'));
        }

        query += ` ORDER BY ta.date DESC`;

        const attendanceRes = await db.query(query, params);
        res.json(attendanceRes.rows);
    } catch (error) {
        console.error('Error fetching teacher attendance:', error);
    }
};

// --- Attendance Configuration ---

export const getAttendanceConfig = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT value FROM "SystemConfig" WHERE key = $1', ['attendance_override']);
        const value = result.rows.length > 0 ? result.rows[0].value : 'AUTO';
        res.json({ attendance_override: value });
    } catch (error) {
        console.error('Error fetching attendance config:', error);
        res.status(500).json({ message: 'Error fetching attendance config' });
    }
};

export const updateAttendanceConfig = async (req: AuthRequest, res: Response) => {
    const { attendance_override } = req.body; // Expecting 'AUTO', 'OPEN', or 'CLOSED'
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only admins can update system config' });
    }

    try {
        await db.query(
            'INSERT INTO "SystemConfig" (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, "updatedAt" = CURRENT_TIMESTAMP',
            ['attendance_override', attendance_override]
        );
        broadcast('system:config_updated', { key: 'attendance_override', value: attendance_override });
        emitEvent('system:config_updated', { key: 'attendance_override', value: attendance_override });
        res.json({ message: 'Configuration updated successfully', attendance_override });
    } catch (error) {
        console.error('Error updating attendance config:', error);
        res.status(500).json({ message: 'Error updating attendance config' });
    }
};