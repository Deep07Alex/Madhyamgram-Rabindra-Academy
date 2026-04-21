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

    if (!['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value (PRESENT, ABSENT, or LATE required)' });
    }

    let markerId = req.user.id;
    // Admins (Principal/HM) can now mark attendance directly using their Admin ID
    // The foreign key constraint has been relaxed in the database setup

    try {
        const attendanceDateStr = new Date(date).toLocaleDateString('en-CA');

        // REGISTRY SYNC: Ensure this date is marked as a valid school session
        await db.query(`INSERT INTO "SchoolSession" (date) VALUES ($1) ON CONFLICT DO NOTHING`, [attendanceDateStr]);

        // UPSERT: Handles both creation and update atomically to prevent race conditions
        const query = `
            INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId", subject)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT ("studentId", date) 
            DO UPDATE SET 
                status = EXCLUDED.status, 
                "teacherId" = EXCLUDED."teacherId", 
                "classId" = EXCLUDED."classId", 
                subject = EXCLUDED.subject
            RETURNING *
        `;

        const attendanceRes = await db.query(query, [
            crypto.randomUUID(), 
            attendanceDateStr, 
            status, 
            studentId, 
            markerId, 
            classId, 
            subject || 'FULL DAY SESSION'
        ]);

        const record = attendanceRes.rows[0];

        broadcast('attendance:updated', { 
            studentId, 
            date: attendanceDateStr, 
            status, 
            attendanceId: record.id 
        });
        
        sendToUser(studentId, 'attendance:updated', { 
            date: attendanceDateStr, 
            status,
            attendanceId: record.id
        });

        res.status(200).json(record);
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
        // Institutional Launch Lock: January 2026 Minimum
        const minLaunchDate = '2026-01-01';
        let finalStartDate = startDate ? (new Date(startDate as string).toLocaleDateString('en-CA')) : minLaunchDate;
        let finalEndDate = endDate ? (new Date(endDate as string).toLocaleDateString('en-CA')) : new Date().toLocaleDateString('en-CA');

        if (finalStartDate < minLaunchDate) finalStartDate = minLaunchDate;

        // 1. Get unique school session dates from the Registry (Blazing Fast compared to Scanning all Attendance)
        let sessionQuery = `SELECT date::date as session_date FROM "SchoolSession" WHERE date >= $1 AND date <= $2 `;
        const sessionParams: any[] = [finalStartDate, finalEndDate];
        
        sessionQuery += ` ORDER BY date DESC`;

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

            // Generate virtual PRESENT record (Institutional Default)
            return {
                id: `virtual-${dateStr}`,
                date: dateStr,
                status: 'PRESENT',
                studentId: targetStudentId,
                subject: 'FULL DAY SESSION',
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

        // REGISTRY SYNC: Ensure this date is marked as a valid school session
        await db.query(`INSERT INTO "SchoolSession" (date) VALUES ($1) ON CONFLICT DO NOTHING`, [attendanceDateStr]);

        // UPSERT: Atomic Teacher Attendance
        const query = `
            INSERT INTO "TeacherAttendance" (id, date, status, reason, "arrivalTime", "departureTime", "earlyLeaveReason", "teacherId")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT ("teacherId", date) 
            DO UPDATE SET 
                status = EXCLUDED.status,
                reason = EXCLUDED.reason,
                "arrivalTime" = EXCLUDED."arrivalTime",
                "departureTime" = EXCLUDED."departureTime",
                "earlyLeaveReason" = EXCLUDED."earlyLeaveReason"
            RETURNING *
        `;

        const attendanceRes = await db.query(query, [
            crypto.randomUUID(),
            attendanceDateStr,
            status || 'PRESENT',
            status === 'ABSENT' ? (reason || null) : null,
            arrivalTime || null,
            departureTime || null,
            earlyLeaveReason || null,
            targetTeacherId
        ]);

        const record = attendanceRes.rows[0];

        broadcast('attendance:updated', { 
            teacherId: targetTeacherId, 
            date: attendanceDateStr, 
            status: status || 'PRESENT',
            attendanceId: record.id
        });
        
        sendToUser(targetTeacherId, 'attendance:updated', { 
            date: attendanceDateStr, 
            status: status || 'PRESENT',
            attendanceId: record.id
        });

        res.status(200).json(record);
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

    if (!['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value (PRESENT, ABSENT, or LATE required)' });
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

    if (!['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value (PRESENT, ABSENT, or LATE required)' });
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
        // Institutional Launch Lock: January 2026 Minimum
        const minDate = '2026-01-01';
        let finalStartDate = startDate ? (new Date(startDate as string).toLocaleDateString('en-CA')) : minDate;
        let finalEndDate = endDate ? (new Date(endDate as string).toLocaleDateString('en-CA')) : new Date().toLocaleDateString('en-CA');

        if (finalStartDate < minDate) finalStartDate = minDate;

        let query = `
            SELECT ta.*, 
                   COALESCE(row_to_json(t.*), row_to_json(a.*)) as teacher
            FROM "TeacherAttendance" ta
            LEFT JOIN "Teacher" t ON ta."teacherId" = t.id
            LEFT JOIN "Admin" a ON ta."teacherId" = a.id
            WHERE ta.date >= $1 AND ta.date <= $2
        `;
        const params: any[] = [finalStartDate, finalEndDate];
        
        if (teacherId) {
            query += ` AND ta."teacherId" = $3`;
            params.push(teacherId);
        }
        query += ` ORDER BY ta.date DESC`;

        const { rows } = await db.query(query, params);
        res.status(200).json(rows);
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

export const bulkMarkStudentAbsent = async (req: AuthRequest, res: Response) => {
    const { date, classId } = req.body;
    if (!req.user?.id || req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only admins can perform bulk operations' });
    }

    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }

    try {
        const attendanceDateStr = new Date(date).toLocaleDateString('en-CA');
        const markerId = req.user.id;

        // Ensure date is in SchoolSession
        await db.query(`INSERT INTO "SchoolSession" (date) VALUES ($1) ON CONFLICT DO NOTHING`, [attendanceDateStr]);

        let query = '';
        const params: any[] = [attendanceDateStr, markerId, 'ABSENT', 'FULL DAY SESSION'];

        if (classId) {
            // Mark all students in a specific class
            query = `
                INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId", subject)
                SELECT 
                    gen_random_uuid(), 
                    $1, 
                    $3, 
                    id, 
                    $2, 
                    "classId", 
                    $4
                FROM "Student"
                WHERE "classId" = $5
                ON CONFLICT ("studentId", date) 
                DO UPDATE SET 
                    status = EXCLUDED.status, 
                    "teacherId" = EXCLUDED."teacherId", 
                    "classId" = EXCLUDED."classId", 
                    subject = EXCLUDED.subject
            `;
            params.push(classId);
        } else {
            // Mark ALL students
            query = `
                INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId", subject)
                SELECT 
                    gen_random_uuid(), 
                    $1, 
                    $3, 
                    id, 
                    $2, 
                    "classId", 
                    $4
                FROM "Student"
                ON CONFLICT ("studentId", date) 
                DO UPDATE SET 
                    status = EXCLUDED.status, 
                    "teacherId" = EXCLUDED."teacherId", 
                    "classId" = EXCLUDED."classId", 
                    subject = EXCLUDED.subject
            `;
        }

        await db.query(query, params);

        broadcast('attendance:bulk_updated', { date: attendanceDateStr, classId, status: 'ABSENT' });

        res.status(200).json({ message: `Successfully marked all students ${classId ? 'in class' : 'of all classes'} as absent` });
    } catch (error) {
        console.error('Error bulk marking attendance:', error);
        res.status(500).json({ message: 'Error bulk marking attendance' });
    }
};

/**
 * Administrative summary of attendance for all students.
 * Used to display individual stats (X of Y days, %) in the admin dashboard.
 */
export const getStudentStatsSummary = async (req: AuthRequest, res: Response) => {
    const { classId, academicYear } = req.query;
    
    try {
        const year = academicYear || new Date().getFullYear();
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        // 1. Get Total Sessions (School Days)
        const sessionCountRes = await db.query(
            `SELECT COUNT(*)::int as count FROM "SchoolSession" WHERE date >= $1 AND date <= $2`,
            [startDate, endDate]
        );
        let totalSessions = sessionCountRes.rows[0].count;

        // Add today if it's a valid session but not in Registry yet
        const today = new Date();
        if (year.toString() === today.getFullYear().toString() && today.getDay() !== 0) {
            const todayStr = today.toLocaleDateString('en-CA');
            const checkRegistry = await db.query(`SELECT 1 FROM "SchoolSession" WHERE date = $1`, [todayStr]);
            if (checkRegistry.rows.length === 0 && todayStr >= startDate && todayStr <= endDate) {
               totalSessions += 1;
            }
        }

        // 2. Get Absent Counts per student efficiently
        let absentQuery = `
            SELECT "studentId", COUNT(*)::int as absent_count
            FROM "Attendance"
            WHERE status = 'ABSENT' 
              AND date >= $1 AND date <= $2
        `;
        const params: any[] = [startDate, endDate];
        if (classId) {
            absentQuery += ` AND "classId" = $3`;
            params.push(classId);
        }
        absentQuery += ` GROUP BY "studentId"`;

        const absentRes = await db.query(absentQuery, params);
        
        // Map stats: Presence = Total Sessions - Absent Count
        const statsMap: Record<string, any> = {};
        absentRes.rows.forEach(row => {
            statsMap[row.studentId] = {
                absent: row.absent_count,
                present: Math.max(0, totalSessions - row.absent_count)
            };
        });

        res.json({
            stats: statsMap,
            totalSessions
        });
    } catch (error) {
        console.error('Error fetching student stats summary:', error);
        res.status(500).json({ message: 'Error fetching stats summary' });
    }
};