import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const createFee = async (req: Request, res: Response) => {
    try {
        const { amount, dueDate, type, studentId } = req.body;

        const fee = await prisma.fee.create({
            data: {
                amount: parseFloat(amount as string),
                dueDate: new Date(dueDate),
                type,
                studentId,
                status: 'PENDING'
            }
        });

        res.status(201).json(fee);
    } catch (error) {
        res.status(500).json({ message: 'Error creating fee' });
    }
};

export const createFeesForClass = async (req: Request, res: Response) => {
    try {
        const { amount, dueDate, type, classId } = req.body;

        const students = await prisma.student.findMany({ where: { classId } });

        const feesData = students.map((student: { id: string }) => ({
            amount: parseFloat(amount as string),
            dueDate: new Date(dueDate),
            type,
            studentId: student.id,
            status: 'PENDING' as const
        }));

        const result = await prisma.fee.createMany({
            data: feesData
        });

        res.status(201).json({ message: `${result.count} fees created` });
    } catch (error) {
        res.status(500).json({ message: 'Error creating fees for class' });
    }
};

export const recordPayment = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { amountPaid, paymentMethod, remark, status } = req.body;

        const updatedFee = await prisma.fee.update({
            where: { id },
            data: {
                status: status || 'PAID',
                paidAt: new Date(),
                paymentMethod,
                remark,
                // In a real system, you might reduce `amount` or keep track of total paid.
                // For now, setting status to PAID or PARTIAL.
            }
        });

        res.json(updatedFee);
    } catch (error) {
        res.status(500).json({ message: 'Error recording payment' });
    }
};

export const getFees = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, classId, status } = req.query;
        let whereClause: any = {};

        if (req.user?.role === 'STUDENT') {
            whereClause.studentId = req.user.id;
        } else {
            if (studentId) whereClause.studentId = studentId as string;
            if (classId) {
                const students = await prisma.student.findMany({ where: { classId: classId as string } });
                whereClause.studentId = { in: students.map(s => s.id) };
            }
        }

        if (status) whereClause.status = status as string;

        const fees = await prisma.fee.findMany({
            where: whereClause,
            include: { student: { include: { class: true } } },
            orderBy: { dueDate: 'desc' }
        });

        res.json(fees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fees' });
    }
};
