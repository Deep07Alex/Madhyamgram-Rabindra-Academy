import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

// --- Homework Management ---

export const createHomework = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, dueDate, classId } = req.body;
        const teacherId = req.user?.id;

        let fileUrl = null;
        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
        }

        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });

        const homework = await prisma.homework.create({
            data: {
                title,
                description,
                dueDate: new Date(dueDate),
                classId,
                teacherId,
                fileUrl
            }
        });

        res.status(201).json(homework);
    } catch (error) {
        res.status(500).json({ message: 'Error creating homework' });
    }
};

export const getHomeworks = async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.query;
        let whereClause: any = {};

        if (classId) whereClause.classId = classId as string;

        // If student, only see their class's homework. But for now, we leave it to frontend or expand logic later.
        if (req.user?.role === 'STUDENT') {
            const student = await prisma.student.findUnique({ where: { id: req.user.id } });
            if (student) whereClause.classId = student.classId;
        }

        const homeworks = await prisma.homework.findMany({
            where: whereClause,
            include: { teacher: true, class: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json(homeworks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching homeworks' });
    }
};

// --- Submissions Management ---

export const submitHomework = async (req: AuthRequest, res: Response) => {
    try {
        const { homeworkId, content } = req.body;
        const studentId = req.user?.id;

        if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

        let fileUrl = null;
        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
        }

        // Upsert submission (allow student to resubmit until graded)
        const existing = await prisma.submission.findFirst({
            where: { studentId, homeworkId }
        });

        if (existing) {
            const updated = await prisma.submission.update({
                where: { id: existing.id },
                data: {
                    content,
                    ...(fileUrl && { fileUrl }),
                    status: 'SUBMITTED',
                    submittedAt: new Date()
                }
            });
            return res.json(updated);
        }

        const submission = await prisma.submission.create({
            data: {
                homeworkId,
                studentId,
                content,
                fileUrl,
                status: 'SUBMITTED'
            }
        });

        res.status(201).json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting homework' });
    }
};

export const getSubmissions = async (req: Request, res: Response) => {
    try {
        const { homeworkId, studentId } = req.query;
        let whereClause: any = {};

        if (homeworkId) whereClause.homeworkId = homeworkId as string;
        if (studentId) whereClause.studentId = studentId as string;

        const submissions = await prisma.submission.findMany({
            where: whereClause,
            include: { student: true, homework: true },
            orderBy: { submittedAt: 'desc' }
        });

        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching submissions' });
    }
};

export const gradeSubmission = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body; // should be 'GRADED' etc.

        const submission = await prisma.submission.update({
            where: { id },
            data: { status }
        });

        res.json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Error grading submission' });
    }
};
