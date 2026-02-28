import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const createResult = async (req: Request, res: Response) => {
    try {
        const { semester, subject, marks, totalMarks, grade, studentId } = req.body;

        const result = await prisma.result.create({
            data: {
                semester,
                subject,
                marks: parseFloat(marks as string),
                totalMarks: parseFloat(totalMarks as string),
                grade,
                studentId
            }
        });

        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error creating result' });
    }
};

export const getResults = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, semester } = req.query;
        let whereClause: any = {};

        if (req.user?.role === 'STUDENT') {
            whereClause.studentId = req.user.id;
        } else {
            if (studentId) whereClause.studentId = studentId as string;
        }

        if (semester) whereClause.semester = semester as string;

        const results = await prisma.result.findMany({
            where: whereClause,
            include: { student: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching results' });
    }
};
