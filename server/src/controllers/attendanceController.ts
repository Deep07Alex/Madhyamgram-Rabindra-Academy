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

// --- Helpers ---

// Performance Cache for stats: key: period_classId -> data
const statsCache = new Map<string, { data: any, expires: number }>();
const STATS_TTL = 30000; // 30 seconds

const clearStatsCache = () => {
    statsCache.clear();
};

/**
 * Standardizes date formatting to YYYY-MM-DD.
 * Uses UTC components to ensure consistency across all timezones.
 */
const formatDate = (date: any): string => {
    if (!date) {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    
    // If it's already a string in YYYY-MM-DD format, return as is to avoid any parsing logic
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    const d = new Date(date);
    // Use UTC methods to avoid local timezone shifts
    // Date(string) with YYYY-MM-DD is interpreted as UTC 00:00 by JS engines
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
};

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
        const attendanceDateStr = formatDate(date);

        // REGISTRY SYNC: Ensure this date is marked as a valid school session
        await db.query(`INSERT INTO "SchoolSession" (date) VALUES ($1) ON CONFLICT DO NOTHING`, [attendanceDateStr]);

        // UPSERT: Handles both creation and update atomically to prevent race conditions
        clearStatsCache();
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
        const todayStr = formatDate(new Date());
        let finalStartDate: string = startDate ? formatDate(startDate) : minLaunchDate;
        let finalEndDate: string = endDate ? formatDate(endDate) : todayStr;

        if (finalStartDate < minLaunchDate) finalStartDate = minLaunchDate;

        // 1. Get student class info for precise session counting
        let classIdToUse = classId;
        if (targetStudentId && !classIdToUse) {
            const sRes = await db.query(`SELECT "classId" FROM "Student" WHERE id = $1`, [targetStudentId]);
            if (sRes.rows.length > 0) classIdToUse = sRes.rows[0].classId;
        }

        // 2. Get unique academic dates for THIS CLASS
        // Requirement: Academic Day = (Not Sunday) AND (Not Bulk Absent)
        // Manual attendance (even if everyone is absent) = Academic Day.
        // No attendance = Academic Day (shows as "No Record").
        // Only explicit 'BULK_ABSENT' subject excludes the day.
        
        // We use AT TIME ZONE 'UTC' to ensure EXTRACT(DOW) is consistent regardless of server TZ
        let sessionQuery = `
            SELECT TO_CHAR(($1::date + n), 'YYYY-MM-DD') as session_date 
            FROM generate_series(0, ($2::date - $1::date)) n
            WHERE EXTRACT(ISODOW FROM ($1::date + n) AT TIME ZONE 'UTC') != 7
              AND (
                  NOT EXISTS (
                      SELECT 1 FROM "Attendance" a1 
                      WHERE a1.date = ($1::date + n)
                        AND (a1."classId" = $3 OR $3 IS NULL) 
                        AND a1.subject = 'BULK_ABSENT'
                  )
                  OR EXISTS (
                      SELECT 1 FROM "Attendance" a2
                      WHERE a2.date = ($1::date + n)
                        AND (a2."classId" = $3 OR $3 IS NULL)
                        AND a2.status IN ('PRESENT', 'LATE')
                  )
              )
            ORDER BY session_date DESC
        `;
        const sessionParams: any[] = [finalStartDate, finalEndDate, classIdToUse];
        const allSessionsRes = await db.query(sessionQuery, sessionParams);
        const sessionDates = allSessionsRes.rows.map(r => r.session_date);
        const totalSessions = sessionDates.length;

        // 3. Get records (Only on valid sessions for this class)
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
            params.push(formatDate(startDate), formatDate(endDate));
        }
        query += ` ORDER BY a.date DESC`;

        const attendanceRes = await db.query(query, params);
        const realRecords = attendanceRes.rows;

        // We no longer filter realRecords by sessionDates because we want the frontend to receive
        // BULK_ABSENT records (which are explicitly excluded from sessionDates) so it can display "Non-Academic Day".
        res.json({
            records: realRecords,
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
        const attendanceDateStr = formatDate(date || new Date());

        // REGISTRY SYNC: Ensure this date is marked as a valid school session
        await db.query(`INSERT INTO "SchoolSession" (date) VALUES ($1) ON CONFLICT DO NOTHING`, [attendanceDateStr]);

        // UPSERT: Atomic Teacher Attendance
        clearStatsCache();
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
        clearStatsCache();
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
            const dStr = formatDate(record.date);

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

    if (!['PRESENT', 'ABSENT', 'LATE', 'PARTIAL'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value (PRESENT, ABSENT, LATE, or PARTIAL required)' });
    }

    try {
        console.log(`Admin updating teacher attendance ${id}:`, req.body);
        clearStatsCache();
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
            const dStr = formatDate(record.date);

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
 * Enforces privacy: Teachers can only view their own records.
 */
export const getTeacherAttendance = async (req: AuthRequest, res: Response) => {
    const { teacherId, startDate, endDate } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Privacy Guard: Teachers can only see their own attendance
    const targetTeacherId = userRole === 'ADMIN' ? (teacherId || userId) : userId;

    try {
        // Institutional Launch Lock: January 2026 Minimum
        const minDate = '2026-01-01';
        let finalStartDate = startDate ? formatDate(startDate) : minDate;
        let finalEndDate = endDate ? formatDate(endDate) : formatDate(new Date());

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

        if (targetTeacherId) {
            query += ` AND ta."teacherId" = $3`;
            params.push(targetTeacherId);
        }
        query += ` ORDER BY ta.date DESC`;

        const { rows } = await db.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching teacher attendance:', error);
        res.status(500).json({ message: 'Error fetching teacher attendance' });
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
        const attendanceDateStr = formatDate(date);
        const markerId = req.user.id;

        // Ensure date is in SchoolSession
        await db.query(`INSERT INTO "SchoolSession" (date) VALUES ($1) ON CONFLICT DO NOTHING`, [attendanceDateStr]);

        let query = '';
        const params: any[] = [attendanceDateStr, markerId, 'ABSENT', 'BULK_ABSENT'];

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
        clearStatsCache();

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
    const { classId, academicYear, startDate: queryStartDate, endDate: queryEndDate, studentId } = req.query;

    try {
        const year = academicYear || new Date().getFullYear();

        // Students can only see their own stats
        let targetStudentId = studentId;
        if (req.user?.role === 'STUDENT') {
            targetStudentId = req.user.id;
        }

        // Institutional Launch Lock: January 2026 Minimum
        const minLaunchDate = '2026-01-01';
        const todayStr = formatDate(new Date());
        let startDate: string = queryStartDate ? formatDate(queryStartDate) : `${year}-01-01`;
        let endDate: string = queryEndDate ? formatDate(queryEndDate) : todayStr;

        if (startDate < minLaunchDate) startDate = minLaunchDate;
        
        // Safety: Do not count future days for statistics in the current year
        if (year === new Date().getFullYear() && endDate > todayStr) {
            endDate = todayStr;
        }

        // Cache Check: Elite Speed optimization
        const cacheKey = `stats_${classId || 'all'}_${targetStudentId || 'all'}_${startDate}_${endDate}`;
        const cached = statsCache.get(cacheKey);
        if (cached && Date.now() < cached.expires) {
            return res.json(cached.data);
        }

        // Optimized Query using CTEs with Single-Pass Aggregation
        // Requirement: Academic Day = (Not Sunday) AND (Not Bulk Absent)
        const statsQuery = `
            WITH DateRange AS (
                SELECT ($1::date + n) as d
                FROM generate_series(0, ($2::date - $1::date)) n
                WHERE EXTRACT(ISODOW FROM ($1::date + n) AT TIME ZONE 'UTC') != 7 -- Exclude Sundays
            ),
            -- Identify days where a class was "Closed" (Bulk Absent)
            ClosureDays AS (
                SELECT DISTINCT "classId", date
                FROM "Attendance" a1
                WHERE date >= $1 AND date <= $2
                  AND subject = 'BULK_ABSENT'
                  AND EXTRACT(ISODOW FROM date AT TIME ZONE 'UTC') != 7
                  AND NOT EXISTS (
                      SELECT 1 FROM "Attendance" a2
                      WHERE a2.date = a1.date 
                        AND a2."classId" = a1."classId"
                        AND a2.status IN ('PRESENT', 'LATE')
                  )
            ),
            ClassSessionCounts AS (
                SELECT 
                    c.id as class_id,
                    (SELECT COUNT(*)::int FROM DateRange) - (
                        SELECT COUNT(DISTINCT date)::int 
                        FROM ClosureDays cd 
                        WHERE cd."classId" = c.id
                    ) as session_count
                FROM "Class" c
                GROUP BY c.id
            ),
            StudentAggregates AS (
                SELECT 
                    a."studentId",
                    COUNT(*) FILTER (WHERE a.status = 'ABSENT' AND a.subject != 'BULK_ABSENT') as absent_count,
                    COUNT(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE')) as present_count
                FROM "Attendance" a
                WHERE a.date >= $1 AND a.date <= $2
                  AND EXTRACT(ISODOW FROM a.date AT TIME ZONE 'UTC') != 7
                GROUP BY a."studentId"
            )
            SELECT 
                s.id, 
                s."classId", 
                COALESCE(sa.absent_count, 0) as absent_count,
                COALESCE(sa.present_count, 0) as present_count,
                csc.session_count
            FROM "Student" s
            JOIN ClassSessionCounts csc ON s."classId" = csc.class_id
            LEFT JOIN StudentAggregates sa ON s.id = sa."studentId"
            WHERE 1=1
            ${classId ? 'AND s."classId" = $3' : ''}
            ${targetStudentId ? `AND s.id = ${classId ? '$4' : '$3'}` : ''}
        `;

        const queryParams = [startDate, endDate];
        if (classId) queryParams.push(classId as string);
        if (targetStudentId) queryParams.push(targetStudentId as string);

        const result = await db.query(statsQuery, queryParams);

        const statsMap: Record<string, any> = {};
        result.rows.forEach(r => {
            statsMap[r.id] = {
                absent: r.absent_count,
                present: r.present_count,
                total: r.session_count
            };
        });

        let schoolWideTotal = 0;
        if (!classId) {
            const schoolWideRes = await db.query(
                `WITH DateRange AS (
                    SELECT ($1::date + n) as d
                    FROM generate_series(0, ($2::date - $1::date)) n
                    WHERE EXTRACT(ISODOW FROM ($1::date + n) AT TIME ZONE 'UTC') != 7
                ),
                FullClosures AS (
                    SELECT date FROM "Attendance"
                    WHERE date >= $1 AND date <= $2 AND subject = 'BULK_ABSENT'
                      AND EXTRACT(ISODOW FROM date AT TIME ZONE 'UTC') != 7
                    GROUP BY date
                    HAVING COUNT(DISTINCT "classId") = (SELECT COUNT(*) FROM "Class")
                )
                SELECT (SELECT COUNT(*) FROM DateRange) - (SELECT COUNT(*) FROM FullClosures) as count`,
                [startDate, endDate]
            );
            schoolWideTotal = parseInt(schoolWideRes.rows[0].count || '0');
        }

        const responseData = {
            stats: statsMap,
            totalSessions: classId ? (result.rows[0]?.session_count || 0) : schoolWideTotal
        };

        // Cache the result
        statsCache.set(cacheKey, { data: responseData, expires: Date.now() + STATS_TTL });

        res.json(responseData);
    } catch (error) {
        console.error('Error fetching student stats summary:', error);
        res.status(500).json({ message: 'Error fetching stats summary' });
    }
};
