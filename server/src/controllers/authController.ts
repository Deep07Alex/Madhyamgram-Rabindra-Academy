import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key_change_in_production';

export const login = async (req: Request, res: Response) => {
    // The frontend sends 'username' but it functionally acts as the login ID
    const { username: loginId, password, role: requestedRole } = req.body;

    if (!requestedRole) {
        return res.status(400).json({ message: 'User role is required' });
    }

    try {
        let userData: any = null;
        let role: string = requestedRole.toUpperCase();

        if (role === 'ADMIN') {
            const adminRes = await db.query(
                `SELECT * FROM "Admin" WHERE "adminId" = $1 OR "username" = $1 LIMIT 1`,
                [loginId]
            );
            if (adminRes.rows.length > 0) userData = adminRes.rows[0];
        } else if (role === 'TEACHER') {
            const teacherRes = await db.query(
                `SELECT * FROM "Teacher" WHERE "teacherId" = $1 LIMIT 1`,
                [loginId]
            );
            if (teacherRes.rows.length > 0) userData = teacherRes.rows[0];
        } else if (role === 'STUDENT') {
            const studentRes = await db.query(
                `SELECT * FROM "Student" WHERE "studentId" = $1 LIMIT 1`,
                [loginId]
            );
            if (studentRes.rows.length > 0) userData = studentRes.rows[0];
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }

        if (!userData) {
            const notFoundMsg = role === 'TEACHER' ? 'No faculty found' : role === 'STUDENT' ? 'No student found' : 'No administrator found';
            return res.status(401).json({ message: notFoundMsg });
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
                email: userData.email,
                role: role,
                ...(role === 'ADMIN' && { adminId: userData.adminId, username: userData.username }),
                ...(role === 'STUDENT' && { studentId: userData.studentId, rollNumber: userData.rollNumber, classId: userData.classId }),
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

    // Basic validation
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Name is required' });
    }
    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }
    if (!role) {
        return res.status(400).json({ message: 'Role is required' });
    }
    if (role === 'STUDENT' && !classId) {
        return res.status(400).json({ message: 'Class is required for students' });
    }

    // Treat empty email as NULL so the unique constraint isn't violated
    const safeEmail = (email && email.trim()) ? email.trim() : null;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let newUserId = crypto.randomUUID();

        const generate10DigitId = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();

        if (role === 'ADMIN') {
            await db.query(
                `INSERT INTO "Admin" (id, "adminId", username, password, "plainPassword", name, email) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [newUserId, adminId, username, hashedPassword, password, name, safeEmail]
            );
        } else if (role === 'TEACHER') {
            let uniqueId = teacherId;
            if (!uniqueId) {
                let isUnique = false;
                while (!isUnique) {
                    uniqueId = 'T-' + generate10DigitId();
                    const existingRes = await db.query(`SELECT id FROM "Teacher" WHERE "teacherId" = $1`, [uniqueId]);
                    if (existingRes.rows.length === 0) isUnique = true;
                }
            }
            await db.query(
                `INSERT INTO "Teacher" (id, password, "plainPassword", name, email, "teacherId") VALUES ($1, $2, $3, $4, $5, $6)`,
                [newUserId, hashedPassword, password, name, safeEmail, uniqueId]
            );
        } else if (role === 'STUDENT') {
            // Check if roll number already exists for this class
            const duplicateCheck = await db.query(
                `SELECT id FROM "Student" WHERE "rollNumber" = $1 AND "classId" = $2 LIMIT 1`,
                [rollNumber, classId]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Roll number already exists in this class' });
            }

            let uniqueId = '';
            let isUnique = false;
            while (!isUnique) {
                uniqueId = 'S-' + generate10DigitId();
                const existingRes = await db.query(`SELECT id FROM "Student" WHERE "studentId" = $1`, [uniqueId]);
                if (existingRes.rows.length === 0) isUnique = true;
            }

            await db.query(
                `INSERT INTO "Student" (id, "studentId", password, "plainPassword", name, email, "rollNumber", "classId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [newUserId, uniqueId, hashedPassword, password, name, safeEmail, rollNumber, classId]
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
