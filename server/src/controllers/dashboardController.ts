import { Response } from 'express';
import { db } from '../lib/db.js';
import { AuthRequest } from '../middleware/auth.js';

// Simple in-memory cache to prevent database hammering in production
const statsCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    const role = req.user?.role;
    const userId = req.user?.id;
    const cacheKey = `${role}:${userId}`;

    // Check cache
    const cached = statsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return res.json(cached.data);
    }

    try {
        let statsData: any;

        if (role === 'ADMIN') {
            const studentRes = await db.query(`SELECT COUNT(*) FROM "Student"`);
            const teacherRes = await db.query(`SELECT COUNT(*) FROM "Teacher"`);
            const classRes = await db.query(`SELECT COUNT(*) FROM "Class"`);
            const feeRes = await db.query(`SELECT SUM(amount) FROM "Fee"`);

            statsData = {
                students: parseInt(studentRes.rows[0].count, 10),
                teachers: parseInt(teacherRes.rows[0].count, 10),
                classes: parseInt(classRes.rows[0].count, 10),
                projectedFees: parseFloat(feeRes.rows[0].sum || '0')
            };
        }

        else if (role === 'TEACHER') {
            const classCountRes = await db.query(`SELECT COUNT(*) FROM "_ClassToTeacher" WHERE "B" = $1`, [userId]);
            const pendingHomeworkRes = await db.query(`
                SELECT COUNT(*) FROM "Submission" s
                JOIN "Homework" h ON s."homeworkId" = h.id
                WHERE h."teacherId" = $1 AND s.status = 'PENDING'
            `, [userId]);

            // Optimized Teacher Attendance Rate Query
            const attendanceRes = await db.query(`
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
            `, [userId]);

            statsData = {
                assignedClasses: parseInt(classCountRes.rows[0].count, 10),
                pendingSubmissions: parseInt(pendingHomeworkRes.rows[0].count, 10),
                attendanceRate: Math.round(parseFloat(attendanceRes.rows[0].rate || '100'))
            };
        }

        else if (role === 'STUDENT') {
            // Optimized Student Attendance Rate Query
            const attendanceRes = await db.query(`
                WITH Stats AS (
                    SELECT 
                        (SELECT COUNT(DISTINCT date) FROM "Attendance") as global_sessions,
                        (SELECT COUNT(*) FROM "Attendance" WHERE "studentId" = $1 AND status = 'ABSENT') as student_absences
                )
                SELECT 
                    CASE 
                        WHEN global_sessions = 0 THEN 100
                        ELSE GREATEST(0, (1.0 - (student_absences::float / GREATEST(global_sessions, 1))) * 100)
                    END as rate
                FROM Stats
            `, [userId]);

            const gradeRes = await db.query(`
                SELECT AVG(marks / NULLIF("totalMarks", 0) * 100) as average
                FROM "Result"
                WHERE "studentId" = $1
            `, [userId]);

            const subjectRes = await db.query(`
                SELECT COUNT(DISTINCT subject) FROM (
                    SELECT subject FROM "Result" WHERE "studentId" = $1
                    UNION
                    SELECT subject FROM "Homework" h
                    JOIN "Student" s ON h."classId" = s."classId"
                    WHERE s.id = $1
                ) as subjects
            `, [userId]);

            statsData = {
                attendanceRate: Math.round(parseFloat(attendanceRes.rows[0].rate || '100')),
                averageGrade: Math.round(parseFloat(gradeRes.rows[0].average || '0')),
                activeSubjects: parseInt(subjectRes.rows[0].count, 10)
            };
        }

        if (statsData) {
            statsCache.set(cacheKey, { data: statsData, timestamp: Date.now() });
            return res.json(statsData);
        }

        res.status(403).json({ message: 'Unauthorized role' });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};
