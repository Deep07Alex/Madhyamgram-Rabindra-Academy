/**
 * Dashboard Controller
 * 
 * Provides aggregated statistics and unified data summaries for different user roles
 * (Admin, Teacher, Student) to power their respective dashboard views.
 */
import { Response } from 'express';
import { db } from '../lib/db.js';
import { AuthRequest } from '../middleware/auth.js';

// REMOVED statsCache to ensure 100% real-time data sync

/**
 * Generates high-level statistics for the dashboard.
 * - Admins get school-wide counts (Students, Teachers, Classes, projected Fees).
 * - Teachers get their assigned class counts and pending submission stats.
 * - Students get their personal attendance rate and academic performance overview.
 */
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    const role = req.user?.role;
    const userId = req.user?.id;

    try {
        let statsData: any;

        if (role === 'ADMIN') {
            const [studentRes, teacherRes, classRes, feeRes, configRes] = await Promise.all([
                db.query(`SELECT COUNT(*) FROM "Student"`),
                db.query(`SELECT COUNT(*) FROM "Teacher"`),
                db.query(`SELECT COUNT(*) FROM "Class"`),
                db.query(`SELECT SUM(amount) FROM "Fee"`),
                db.query('SELECT value FROM "SystemConfig" WHERE key = $1', ['attendance_override'])
            ]);

            statsData = {
                students: parseInt(studentRes.rows[0].count, 10),
                teachers: parseInt(teacherRes.rows[0].count, 10),
                classes: parseInt(classRes.rows[0].count, 10),
                projectedFees: parseFloat(feeRes.rows[0].sum || '0'),
                config: {
                    attendance_override: configRes.rows.length > 0 ? configRes.rows[0].value : 'AUTO'
                }
            };
        } else if (role === 'TEACHER') {
            const [classCountRes, pendingHomeworkRes, attendanceRes] = await Promise.all([
                db.query(`SELECT COUNT(*) FROM "_ClassToTeacher" WHERE "B" = $1`, [userId]),
                db.query(`
                    SELECT COUNT(*) FROM "Submission" s
                    JOIN "Homework" h ON s."homeworkId" = h.id
                    WHERE h."teacherId" = $1 AND s.status = 'PENDING'
                `, [userId]),
                db.query(`
                    WITH TeacherClasses AS (
                        SELECT "A" as class_id FROM "_ClassToTeacher" WHERE "B" = $1
                    ),
                    ClassStats AS (
                        SELECT 
                            a."classId",
                            COUNT(DISTINCT a.date) as total_sessions,
                            SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absences,
                            (SELECT COUNT(*) FROM "Student" s WHERE s."classId" = a."classId") as student_count
                        FROM "Attendance" a
                        WHERE a."classId" IN (SELECT class_id FROM TeacherClasses)
                        GROUP BY a."classId"
                    )
                    SELECT 
                        COALESCE(
                            AVG(
                                CASE 
                                    WHEN total_sessions = 0 OR student_count = 0 THEN 100
                                    ELSE (1.0 - (absences::float / (total_sessions * student_count))) * 100
                                END
                            ), 
                            100
                        ) as rate
                    FROM ClassStats
                `, [userId])
            ]);

            statsData = {
                assignedClasses: parseInt(classCountRes.rows[0].count, 10),
                pendingSubmissions: parseInt(pendingHomeworkRes.rows[0].count, 10),
                attendanceRate: Math.round(parseFloat(attendanceRes.rows[0].rate || '100'))
            };
        } else if (role === 'STUDENT') {
            const [attendanceRes, gradeRes, subjectRes] = await Promise.all([
                db.query(`
                    WITH Stats AS (
                        SELECT 
                            (SELECT COUNT(DISTINCT date) FROM (
                                SELECT date::date FROM "Attendance"
                                UNION
                                SELECT date::date FROM "TeacherAttendance"
                            ) as all_dates) as global_sessions,
                            (SELECT COUNT(*) FROM "Attendance" WHERE "studentId" = $1 AND status = 'ABSENT') as student_absences
                    )
                    SELECT 
                        CASE 
                            WHEN global_sessions = 0 THEN 100
                            ELSE GREATEST(0, (1.0 - (student_absences::float / GREATEST(global_sessions, 1))) * 100)
                        END as rate
                    FROM Stats
                `, [userId]),
                db.query(`
                    SELECT AVG(marks / NULLIF("totalMarks", 0) * 100) as average
                    FROM "Result"
                    WHERE "studentId" = $1
                `, [userId]),
                db.query(`
                    SELECT COUNT(DISTINCT subject) FROM (
                        SELECT subject FROM "Result" WHERE "studentId" = $1
                        UNION
                        SELECT subject FROM "Homework" h
                        JOIN "Student" s ON h."classId" = s."classId"
                        WHERE s.id = $1
                    ) as subjects
                `, [userId])
            ]);

            statsData = {
                attendanceRate: Math.round(parseFloat(attendanceRes.rows[0].rate || '100')),
                averageGrade: Math.round(parseFloat(gradeRes.rows[0].average || '0')),
                activeSubjects: parseInt(subjectRes.rows[0].count, 10)
            };
        }

        if (statsData) {
            return res.json(statsData);
        }

        res.status(403).json({ message: 'Unauthorized role' });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

/**
 * Retrieves a unified bundle of data (Profile, Stats, Notices, Assignments) 
 * in a single request for Student and Teacher dashboards.
 */
export const getUnifiedDashboardData = async (req: AuthRequest, res: Response) => {
    const { id: userId, role } = req.user!;

    try {
        const [configRes] = await Promise.all([
            db.query('SELECT value FROM "SystemConfig" WHERE key = $1', ['attendance_override'])
        ]);
        const attendanceOverride = configRes.rows.length > 0 ? configRes.rows[0].value : 'AUTO';

        if (role === 'STUDENT') {
            const [profileRes, statsRes, noticeRes, homeworkRes] = await Promise.all([
                db.query(`SELECT * FROM "Student" WHERE id = $1`, [userId]),
                db.query(`
                    WITH Stats AS (
                        SELECT 
                            (SELECT COUNT(DISTINCT date) FROM (
                                SELECT date::date FROM "Attendance"
                                UNION
                                SELECT date::date FROM "TeacherAttendance"
                            ) as all_dates) as global_sessions,
                            (SELECT COUNT(*) FROM "Attendance" WHERE "studentId" = $1 AND status = 'ABSENT') as student_absences,
                            (SELECT AVG(marks / NULLIF("totalMarks", 0) * 100) FROM "Result" WHERE "studentId" = $1) as average_grade,
                            (SELECT COUNT(DISTINCT subject) FROM (
                                SELECT subject FROM "Result" WHERE "studentId" = $1
                                UNION
                                SELECT h.subject FROM "Homework" h JOIN "Student" s ON h."classId" = s."classId" WHERE s.id = $1
                            ) as subjects) as active_subjects
                    )
                    SELECT 
                        CASE WHEN global_sessions = 0 THEN 100 ELSE GREATEST(0, (1.0 - (student_absences::float / GREATEST(global_sessions, 1))) * 100) END as attendance_rate,
                        average_grade,
                        active_subjects
                    FROM Stats
                `, [userId]),
                db.query(`
                    SELECT * FROM "Notice" 
                    WHERE ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
                    ORDER BY "createdAt" DESC LIMIT 5
                `),
                db.query(`
                    SELECT h.*, t.name as "teacherName",
                    COALESCE((SELECT json_agg(json_build_object('id', s2.id, 'status', s2.status))
                              FROM "Submission" s2 
                              WHERE s2."homeworkId" = h.id AND s2."studentId" = s.id
                             ), '[]'::json) as submissions
                    FROM "Homework" h
                    JOIN "Teacher" t ON h."teacherId" = t.id
                    JOIN "Student" s ON h."classId" = s."classId"
                    WHERE s.id = $1
                    ORDER BY h."createdAt" DESC
                `, [userId])
            ]);

            const profile = { ...profileRes.rows[0], role: 'STUDENT' };
            const stats = statsRes.rows[0];
            
            return res.json({
                profile,
                stats: {
                    attendanceRate: Math.round(parseFloat(stats.attendance_rate || '100')),
                    averageGrade: Math.round(parseFloat(stats.average_grade || '0')),
                    activeSubjects: parseInt(stats.active_subjects || '0')
                },
                notices: noticeRes.rows,
                assignments: homeworkRes.rows,
                config: { attendance_override: attendanceOverride }
            });
        }

        if (role === 'TEACHER') {
            const [profileRes, statsRes, noticeRes, todayAttendanceRes] = await Promise.all([
                db.query(`SELECT * FROM "Teacher" WHERE id = $1`, [userId]),
                db.query(`
                    SELECT 
                        (SELECT COUNT(*) FROM "_ClassToTeacher" WHERE "B" = $1) as assigned_classes,
                        (SELECT COUNT(*) FROM "Submission" s JOIN "Homework" h ON s."homeworkId" = h.id WHERE h."teacherId" = $1 AND s.status = 'PENDING') as pending_submissions
                `, [userId]),
                db.query(`SELECT * FROM "Notice" ORDER BY "createdAt" DESC LIMIT 5`),
                db.query(`
                    SELECT * FROM "TeacherAttendance" 
                    WHERE "teacherId" = $1 AND date::date = CURRENT_DATE
                `, [userId])
            ]);

            const profile = { ...profileRes.rows[0], role: 'TEACHER' };

            return res.json({
                profile,
                stats: {
                    assignedClasses: parseInt(statsRes.rows[0].assigned_classes || '0'),
                    pendingSubmissions: parseInt(statsRes.rows[0].pending_submissions || '0'),
                    attendanceRate: 98 // Placeholder for teacher specific logic if needed
                },
                notices: noticeRes.rows,
                todayAttendance: todayAttendanceRes.rows[0] || null,
                config: { attendance_override: attendanceOverride }
            });
        }

        return res.status(403).json({ message: 'Unified data only available for Student/Teacher' });
    } catch (error) {
        console.error('Unified dashboard error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
