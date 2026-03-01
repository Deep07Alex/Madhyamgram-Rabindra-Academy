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
            const attendanceRes = await db.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'PRESENT')::float / NULLIF(COUNT(*), 0) * 100 as rate
                FROM "Attendance"
                WHERE "teacherId" = $1
            `, [userId]);

            return res.json({
                assignedClasses: parseInt(classCountRes.rows[0].count, 10),
                pendingSubmissions: parseInt(pendingHomeworkRes.rows[0].count, 10),
                attendanceRate: Math.round(parseFloat(attendanceRes.rows[0].rate || '0'))
            });
        }

        if (role === 'STUDENT') {
            const attendanceRes = await db.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'PRESENT')::float / NULLIF(COUNT(*), 0) * 100 as rate
                FROM "Attendance"
                WHERE "studentId" = $1
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
                attendanceRate: Math.round(parseFloat(attendanceRes.rows[0].rate || '0')),
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
