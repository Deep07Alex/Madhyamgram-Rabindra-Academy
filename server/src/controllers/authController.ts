import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key_change_in_production';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        // Try to find the user in each table
        let userData: any = null;
        let role: string = '';

        const admin = await prisma.admin.findUnique({ where: { username } });
        if (admin) {
            userData = admin;
            role = 'ADMIN';
        } else {
            const teacher = await prisma.teacher.findUnique({ where: { username } });
            if (teacher) {
                userData = teacher;
                role = 'TEACHER';
            } else {
                const student = await prisma.student.findUnique({ where: { username } });
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
                username: userData.username,
                role: role,
                ...(role === 'STUDENT' && { studentId: userData.id }),
                ...(role === 'TEACHER' && { teacherId: userData.id }),
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const register = async (req: Request, res: Response) => {
    const { name, username, password, role, email, rollNumber, teacherId, classId } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        let newUser: any;

        if (role === 'ADMIN') {
            newUser = await prisma.admin.create({
                data: { name, username, password: hashedPassword, email }
            });
        } else if (role === 'TEACHER') {
            newUser = await prisma.teacher.create({
                data: { name, username, password: hashedPassword, email, teacherId }
            });
        } else if (role === 'STUDENT') {
            newUser = await prisma.student.create({
                data: {
                    name,
                    username,
                    password: hashedPassword,
                    email,
                    rollNumber,
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
