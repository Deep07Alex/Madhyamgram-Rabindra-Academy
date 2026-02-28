import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

// --- Student Attendance ---

export const markStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { date, status, studentId, classId, subject } = req.body;
    const teacherId = req.user?.id;

    if (!teacherId || req.user?.role !== 'TEACHER') {
        return res.status(403).json({ message: 'Only teachers can mark attendance' });
    }

    try {
        const attendance = await prisma.attendance.create({
            data: {
                date: new Date(date),
                status,
                studentId,
                teacherId,
                classId,
                subject
            }
        });
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error marking student attendance' });
    }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
    const { studentId, classId, startDate, endDate } = req.query;

    try {
        let whereClause: any = {};

        if (studentId) whereClause.studentId = studentId as string;
        if (classId) whereClause.classId = classId as string;

        if (startDate && endDate) {
            whereClause.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        const attendance = await prisma.attendance.findMany({
            where: whereClause,
            include: { student: true, class: true }
        });

        res.json(attendance);
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
        const attendance = await prisma.teacherAttendance.create({
            data: {
                date: new Date(date),
                status,
                teacherId
            }
        });
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error marking teacher attendance' });
    }
};

export const getTeacherAttendance = async (req: Request, res: Response) => {
    const { teacherId, startDate, endDate } = req.query;

    try {
        let whereClause: any = {};

        if (teacherId) whereClause.teacherId = teacherId as string;

        if (startDate && endDate) {
            whereClause.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        const attendance = await prisma.teacherAttendance.findMany({
            where: whereClause,
            include: { teacher: true }
        });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teacher attendance' });
    }
};
