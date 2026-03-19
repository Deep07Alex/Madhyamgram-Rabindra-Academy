import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be set in production environment!');
}
const FINAL_JWT_SECRET = JWT_SECRET || 'dev_fallback_secret_key_123_change_for_prod';

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
            let adminLoginId = loginId;
            if (adminLoginId && typeof adminLoginId === 'string' && !adminLoginId.toUpperCase().startsWith('A-')) {
                adminLoginId = `A-${adminLoginId}`;
            }

            const adminRes = await db.query(
                `SELECT * FROM "Admin" WHERE "adminId" = $1 OR "adminId" = $2 OR "username" = $2 LIMIT 1`,
                [adminLoginId, loginId]
            );
            if (adminRes.rows.length > 0) {
                userData = adminRes.rows[0];
            } else {
                // Allow Principal to log in as Admin if they have an 'A-' prefix or if we prepend it
                const teacherRes = await db.query(
                    `SELECT * FROM "Teacher" WHERE ("teacherId" = $1 OR "teacherId" = $2) AND designation IN ('PRINCIPAL', 'HEAD MISTRESS') LIMIT 1`,
                    [adminLoginId, loginId]
                );
                if (teacherRes.rows.length > 0) userData = teacherRes.rows[0];
            }
        } else if (role === 'TEACHER') {
            let teacherLoginId = loginId;
            // Admins (Principal/HM) can also log in with A- prefix even under Teacher role selector if needed
            if (teacherLoginId && typeof teacherLoginId === 'string' && !teacherLoginId.toUpperCase().startsWith('T-') && !teacherLoginId.toUpperCase().startsWith('A-')) {
                teacherLoginId = `T-${teacherLoginId}`;
            }

            const teacherRes = await db.query(
                `SELECT * FROM "Teacher" WHERE "teacherId" = $1 OR "teacherId" = $2 LIMIT 1`,
                [teacherLoginId, loginId]
            );
            if (teacherRes.rows.length > 0) {
                userData = teacherRes.rows[0];
                if (userData.isTeaching === false) {
                    return res.status(403).json({ message: 'Login access is disabled for this account type' });
                }
            }
        } else if (role === 'STUDENT') {
            let studentLoginId = loginId;
            // Add S- prefix logic for student loginId
            if (studentLoginId && typeof studentLoginId === 'string' && !studentLoginId.toUpperCase().startsWith('S-')) {
                studentLoginId = `S-${studentLoginId}`;
            }

            const studentRes = await db.query(
                `SELECT * FROM "Student" WHERE "studentId" = $1 OR "studentId" = $2 LIMIT 1`,
                [studentLoginId, loginId]
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
            FINAL_JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        const { password: _, plainPassword: __, ...userResponse } = userData;
        res.json({
            token,
            user: {
                ...userResponse,
                role
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const register = async (req: Request, res: Response) => {
    const { 
        name, password, role, email, rollNumber, teacherId, adminId, username, classId,
        phone, aadhar, designation, joiningDate, isTeaching,
        photo, address, dob, qualification, extraQualification, caste
    } = req.body;

    // Basic validation
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Name is required' });
    }
    // Password is now optional across roles to allow for auto-generation in controllers
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

        const generate8DigitId = () => Math.floor(10000000 + Math.random() * 90000000).toString();

        if (role === 'ADMIN') {
            let finalAdminId = adminId;
            if (phone && !finalAdminId) {
                finalAdminId = `A-${phone}`;
            } else if (finalAdminId && !finalAdminId.toUpperCase().startsWith('A-')) {
                finalAdminId = `A-${finalAdminId}`;
            }
            await db.query(
                `INSERT INTO "Admin" (id, "adminId", username, password, "plainPassword", name, email) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [newUserId, finalAdminId, username, hashedPassword, password, name, safeEmail]
            );
        } else if (role === 'TEACHER') {
            let uniqueId = teacherId;
            let hashedPassword = null;
            
            // Ensure ID and Password for all staff (Teaching or Non-Teaching)
            // to satisfy DB constraints. The isTeaching flag will control login access.
            if (['PRINCIPAL', 'HEAD MISTRESS'].includes(designation) && phone && !aadhar) {
                uniqueId = `A-${phone}`;
            } else if (aadhar && aadhar.length >= 8) {
                const prefix = ['PRINCIPAL', 'HEAD MISTRESS'].includes(designation) ? 'A-' : 'T-';
                uniqueId = `${prefix}${aadhar.slice(-8)}`;
            }

            if (!uniqueId) {
                let isUnique = false;
                const prefix = (['PRINCIPAL', 'HEAD MISTRESS'].includes(designation)) ? 'A-' : 'T-';
                while (!isUnique) {
                    uniqueId = prefix + generate8DigitId();
                    const existingRes = await db.query(`SELECT id FROM "Teacher" WHERE "teacherId" = $1`, [uniqueId]);
                    if (existingRes.rows.length === 0) isUnique = true;
                }
            } else if (['PRINCIPAL', 'HEAD MISTRESS'].includes(designation) && !uniqueId.toUpperCase().startsWith('A-')) {
                uniqueId = `A-${uniqueId}`;
            } else if (!uniqueId.toUpperCase().startsWith('T-') && !uniqueId.toUpperCase().startsWith('A-')) {
                uniqueId = `T-${uniqueId}`;
            }

            if (password) {
                hashedPassword = await bcrypt.hash(password, 10);
            } else {
                // Auto-generate password if empty
                const cleanName = name.trim().toLowerCase().replace(/\s+/g, '');
                const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                const suffixDigits = (aadhar && aadhar.length >= 4) ? aadhar.slice(-4) : uniqueId.replace(/\D/g, '').slice(-4);
                const finalPassword = `${capitalizedName}@${suffixDigits || '0000'}`;
                hashedPassword = await bcrypt.hash(finalPassword, 10);
                req.body.password = finalPassword; // Update request body for DB insert
            }

            const safePhone = (phone && phone.trim()) ? phone.trim() : null;
            const safeAadhar = (aadhar && aadhar.trim()) ? aadhar.trim() : null;

            await db.query(
                `INSERT INTO "Teacher" (
                    id, password, "plainPassword", name, email, "teacherId", phone, aadhar, 
                    designation, "joiningDate", "isTeaching",
                    photo, address, dob, qualification, "extraQualification", caste
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                [
                    newUserId, hashedPassword, req.body.password || password, name, safeEmail, uniqueId, safePhone, safeAadhar, 
                    designation, joiningDate, isTeaching ?? true,
                    photo, address, dob, qualification, extraQualification, caste
                ]
            );
        } else if (role === 'STUDENT') {
            const { studentId: manualStudentId, banglarSikkhaId, photo } = req.body;
            
            if (!manualStudentId) {
                return res.status(400).json({ message: 'Admission Number (Student ID) is required' });
            }

            let finalStudentId = manualStudentId.trim();
            if (!finalStudentId.toUpperCase().startsWith('S-')) {
                finalStudentId = `S-${finalStudentId}`;
            } else {
                // Standardize to uppercase S- if it already had a prefix
                finalStudentId = `S-${finalStudentId.slice(2)}`;
            }

            // Check if studentId already exists
            const studentIdCheck = await db.query(
                `SELECT id FROM "Student" WHERE "studentId" = $1 LIMIT 1`,
                [finalStudentId]
            );

            if (studentIdCheck.rows.length > 0) {
                return res.status(400).json({ message: `Student with Admission Number ${manualStudentId} already exists` });
            }

            // Check if roll number already exists for this class
            const duplicateCheck = await db.query(
                `SELECT id FROM "Student" WHERE "rollNumber" = $1 AND "classId" = $2 LIMIT 1`,
                [rollNumber, classId]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Roll number already exists in this class' });
            }

            // Check if banglarSikkhaId already exists
            const safeBanglarId = (banglarSikkhaId && banglarSikkhaId.trim()) ? banglarSikkhaId.trim() : null;
            if (safeBanglarId) {
                const banglarCheck = await db.query(
                    `SELECT id FROM "Student" WHERE "banglarSikkhaId" = $1 LIMIT 1`,
                    [safeBanglarId]
                );
                if (banglarCheck.rows.length > 0) {
                    return res.status(400).json({ message: 'This Banglar Sikkha ID is already present' });
                }
            }

            // Auto-generate password if not provided or empty
            let finalPassword = password;
            if (!finalPassword || finalPassword.trim() === '') {
                const cleanName = name.trim().toLowerCase().replace(/\s+/g, '');
                const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                const numericId = finalStudentId.replace(/\D/g, '');
                finalPassword = `${capitalizedName}@${numericId.slice(-4) || '0000'}`;
            }
            const hashedFinalPassword = await bcrypt.hash(finalPassword, 10);

            await db.query(
                `INSERT INTO "Student" (id, "studentId", password, "plainPassword", name, email, "rollNumber", "banglarSikkhaId", "classId", photo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [newUserId, finalStudentId, hashedFinalPassword, finalPassword, name, safeEmail, rollNumber, safeBanglarId, classId, photo]
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

export const getMe = async (req: Request, res: Response) => {
    try {
        const { id, role } = (req as any).user;
        let userData: any = null;

        if (role === 'ADMIN') {
            const adminRes = await db.query(`SELECT * FROM "Admin" WHERE id = $1 LIMIT 1`, [id]);
            if (adminRes.rows.length > 0) userData = adminRes.rows[0];
        } else if (role === 'TEACHER') {
            const teacherRes = await db.query(`SELECT * FROM "Teacher" WHERE id = $1 LIMIT 1`, [id]);
            if (teacherRes.rows.length > 0) userData = teacherRes.rows[0];
        } else if (role === 'STUDENT') {
            const studentRes = await db.query(`SELECT * FROM "Student" WHERE id = $1 LIMIT 1`, [id]);
            if (studentRes.rows.length > 0) userData = studentRes.rows[0];
        }

        if (!userData) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { password: _, plainPassword: __, ...userResponse } = userData;
        res.json({
            ...userResponse,
            role
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
