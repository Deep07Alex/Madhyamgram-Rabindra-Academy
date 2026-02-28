import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key_change_in_production';

export const login = async (req: Request, res: Response) => {
    // The frontend sends 'username' but it functionally acts as the login ID
    const { username: loginId, password } = req.body;

    try {
        // Try to find the user in each table
        let userData: any = null;
        let role: string = '';

        const adminRes = await db.query(
            `SELECT * FROM "Admin" WHERE "adminId" = $1 OR "username" = $1 LIMIT 1`,
            [loginId]
        );

        if (adminRes.rows.length > 0) {
            userData = adminRes.rows[0];
            role = 'ADMIN';
        } else {
            // Check teacher by teacherId
            const teacherRes = await db.query(
                `SELECT * FROM "Teacher" WHERE "teacherId" = $1 LIMIT 1`,
                [loginId]
            );
            if (teacherRes.rows.length > 0) {
                userData = teacherRes.rows[0];
                role = 'TEACHER';
            } else {
                // Check student by studentId
                const studentRes = await db.query(
                    `SELECT * FROM "Student" WHERE "studentId" = $1 LIMIT 1`,
                    [loginId]
                );
                if (studentRes.rows.length > 0) {
                    userData = studentRes.rows[0];
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
        let newUserId = crypto.randomUUID();

        const generate10DigitId = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();

        if (role === 'ADMIN') {
            await db.query(
                `INSERT INTO "Admin" (id, "adminId", username, password, name, email) VALUES ($1, $2, $3, $4, $5, $6)`,
                [newUserId, adminId, username, hashedPassword, name, email]
            );
        } else if (role === 'TEACHER') {
            let uniqueId = teacherId;
            if (!uniqueId) {
                let isUnique = false;
                while (!isUnique) {
                    uniqueId = generate10DigitId();
                    const existingRes = await db.query(`SELECT id FROM "Teacher" WHERE "teacherId" = $1`, [uniqueId]);
                    if (existingRes.rows.length === 0) isUnique = true;
                }
            }
            await db.query(
                `INSERT INTO "Teacher" (id, password, name, email, "teacherId") VALUES ($1, $2, $3, $4, $5)`,
                [newUserId, hashedPassword, name, email, uniqueId]
            );
        } else if (role === 'STUDENT') {
            let uniqueId = '';
            let isUnique = false;
            while (!isUnique) {
                uniqueId = generate10DigitId();
                const existingRes = await db.query(`SELECT id FROM "Student" WHERE "studentId" = $1`, [uniqueId]);
                if (existingRes.rows.length === 0) isUnique = true;
            }

            await db.query(
                `INSERT INTO "Student" (id, "studentId", password, name, email, "rollNumber", "classId") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [newUserId, uniqueId, hashedPassword, name, email, rollNumber, classId]
            );
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }

        res.status(201).json({ message: 'User created successfully', userId: newUserId });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
