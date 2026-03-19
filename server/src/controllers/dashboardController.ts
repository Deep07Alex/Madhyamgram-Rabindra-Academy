import { Response } from 'express';
import { db } from '../lib/db.js';
import { AuthRequest } from '../middleware/auth.js';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    const role = req.user?.role;
    const userId = req.user?.id;

    try {
        if (role === 'ADMIN') {
            const studentRes = await db.query(`SELECT COUNT(*) FROM "Student"`);
            const teacherRes = await db.query(`SELECT COUNT(*) FROM "Teacher"`);
            const classRes = await db.query(`SELECT COUNT(*) FROM "Class"`);
            const feeRes = await db.query(`SELECT SUM(amount) FROM "Fee"`);

            return res.json({
                students: parseInt(studentRes.rows[0].count, 10),
                teachers: parseInt(teacherRes.rows[0].count, 10),
                classes: parseInt(classRes.rows[0].count, 10),
                projectedFees: parseFloat(feeRes.rows[0].sum || '0')
            });
        }

        if (role === 'TEACHER') {
            const classCountRes = await db.query(`SELECT COUNT(*) FROM "_ClassToTeacher" WHERE "B" = $1`, [userId]);
            const pendingHomeworkRes = await db.query(`
                SELECT COUNT(*) FROM "Submission" s
                JOIN "Homework" h ON s."homeworkId" = h.id
                WHERE h."teacherId" = $1 AND s.status = 'PENDING'
            `, [userId]);

            // Average attendance for classes this teacher teaches
            // New Logic: 100% by default, decreased only by ABSENT marks
            const attendanceRes = await db.query(`
                WITH ClassSessions AS (
                    SELECT "classId", COUNT(DISTINCT date) as total_sessions
                    FROM "Attendance"
                    WHERE "classId" IN (SELECT "A" FROM "_ClassToTeacher" WHERE "B" = $1)
                    GROUP BY "classId"
                ),
                ClassAbsences AS (
                    SELECT "classId", COUNT(*) as total_absences
                    FROM "Attendance"
                    WHERE "classId" IN (SELECT "A" FROM "_ClassToTeacher" WHERE "B" = $1)
                      AND status = 'ABSENT'
                    GROUP BY "classId"
                ),
                ClassEnrollment AS (
                    SELECT "classId", COUNT(*) as student_count
                    FROM "Student"
                    WHERE "classId" IN (SELECT "A" FROM "_ClassToTeacher" WHERE "B" = $1)
                    GROUP BY "classId"
                )
                SELECT 
                    COALESCE(
                        AVG(
                            CASE 
                                WHEN cs.total_sessions = 0 THEN 100
                                ELSE (1.0 - (ca.total_absences::float / (cs.total_sessions * ce.student_count))) * 100
                            END
                        ), 
                        100
                    ) as rate
                FROM ClassSessions cs
                LEFT JOIN ClassAbsences ca ON cs."classId" = ca."classId"
                JOIN ClassEnrollment ce ON cs."classId" = ce."classId"
            `, [userId]);

            return res.json({
                assignedClasses: parseInt(classCountRes.rows[0].count, 10),
                pendingSubmissions: parseInt(pendingHomeworkRes.rows[0].count, 10),
                attendanceRate: Math.round(parseFloat(attendanceRes.rows[0].rate || '100'))
            });
        }

        if (role === 'STUDENT') {
            const attendanceRes = await db.query(`
                WITH SchoolSessions AS (
                    SELECT COUNT(DISTINCT d) as total_sessions
                    FROM (
                        SELECT date::date as d FROM "Attendance"
                        UNION
                        SELECT CURRENT_DATE as d
                    ) as sessions
                ),
                StudentAbsences AS (
                    SELECT COUNT(*) as absent_count
                    FROM "Attendance"
                    WHERE "studentId" = $1 AND status = 'ABSENT'
                )
                SELECT 
                    CASE 
                        WHEN ss.total_sessions = 0 THEN 100
                        ELSE ((ss.total_sessions - sa.absent_count)::float / ss.total_sessions * 100)
                    END as rate
                FROM SchoolSessions ss, StudentAbsences sa
            `, [userId]);

            const gradeRes = await db.query(`
                SELECT AVG(marks / "totalMarks" * 100) as average
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

            return res.json({
                attendanceRate: Math.round(parseFloat(attendanceRes.rows[0].rate || '100')),
                averageGrade: Math.round(parseFloat(gradeRes.rows[0].average || '0')),
                activeSubjects: parseInt(subjectRes.rows[0].count, 10)
            });
        }

        res.status(403).json({ message: 'Unauthorized role' });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};
