import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key_change_in_production';

export const login = async (req: Request, res: Response) => {
    // The frontend sends 'username' but it functionally acts as the login ID
    const { username: loginId, password } = req.body;

    try {
        // Try to find the user in each table
        let userData: any = null;
        let role: string = '';

        const admin = await prisma.admin.findFirst({
            where: {
                OR: [
                    { adminId: loginId },
                    { username: loginId }
                ]
            }
        });
        if (admin) {
            userData = admin;
            role = 'ADMIN';
        } else {
            // Check teacher by teacherId
            const teacher = await prisma.teacher.findUnique({
                where: { teacherId: loginId }
            });
            if (teacher) {
                userData = teacher;
                role = 'TEACHER';
            } else {
                // Check student by studentId
                const student = await prisma.student.findUnique({
                    where: { studentId: loginId }
                });
                if (student) {
                    userData = student;
                    role = 'STUDENT';
                }
            }
        }

        if (!userData) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: userData.id, role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: userData.id,
                name: userData.name,
                role: role,
                ...(role === 'ADMIN' && { adminId: userData.adminId, username: userData.username }),
                ...(role === 'STUDENT' && { studentId: userData.studentId, rollNumber: userData.rollNumber }),
                ...(role === 'TEACHER' && { teacherId: userData.teacherId }),
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const register = async (req: Request, res: Response) => {
    const { name, password, role, email, rollNumber, teacherId, adminId, username, classId } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        let newUser: any;

        const generate10DigitId = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();

        if (role === 'ADMIN') {
            newUser = await prisma.admin.create({
                data: { name, adminId, username, password: hashedPassword, email }
            });
        } else if (role === 'TEACHER') {
            let uniqueId = teacherId;
            if (!uniqueId) {
                let isUnique = false;
                while (!isUnique) {
                    uniqueId = generate10DigitId();
                    const existing = await prisma.teacher.findUnique({ where: { teacherId: uniqueId } });
                    if (!existing) isUnique = true;
                }
            }
            newUser = await prisma.teacher.create({
                data: { name, password: hashedPassword, email, teacherId: uniqueId }
            });
        } else if (role === 'STUDENT') {
            let uniqueId = '';
            let isUnique = false;
            while (!isUnique) {
                uniqueId = generate10DigitId();
                const existing = await prisma.student.findUnique({ where: { studentId: uniqueId } });
                if (!existing) isUnique = true;
            }

            newUser = await prisma.student.create({
                data: {
                    name,
                    password: hashedPassword,
                    email,
                    rollNumber,
                    studentId: uniqueId,
                    class: { connect: { id: classId } }
                }
            });
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }

        res.status(201).json({ message: 'User created successfully', userId: newUser.id });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
