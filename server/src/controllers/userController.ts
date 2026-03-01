import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';

// Get all students
export const getStudents = async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.query;
        let query = `
            SELECT s.*, row_to_json(c.*) as class 
            FROM "Student" s 
            LEFT JOIN "Class" c ON s."classId" = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (classId) {
            query += ` AND s."classId" = $${paramCount++}`;
            params.push(classId);
        }

        query += ` ORDER BY s."rollNumber" ASC NULLS LAST`;

        const studentsRes = await db.query(query, params);
        res.json(studentsRes.rows);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Error fetching students' });
    }
};

// Get all teachers
export const getTeachers = async (req: Request, res: Response) => {
    try {
        const teachersRes = await db.query(`SELECT * FROM "Teacher"`);
        res.json(teachersRes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teachers' });
    }
};

export const getClasses = async (req: AuthRequest, res: Response) => {
    try {
        const query = `
            SELECT c.*, 
            (SELECT COUNT(*) FROM "Student" s WHERE s."classId" = c.id) as "_count_students",
            (SELECT json_agg(row_to_json(t.*)) 
             FROM "Teacher" t 
             JOIN "_ClassToTeacher" ct ON ct."B" = t.id 
             WHERE ct."A" = c.id) as teachers
            FROM "Class" c
            ORDER BY c.grade ASC, c.name ASC
        `;

        const classesRes = await db.query(query);
        const formatted = classesRes.rows.map(c => ({
            ...c,
            _count: { students: parseInt(c._count_students, 10) },
            teachers: c.teachers || []
        }));
        res.json(formatted);
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ message: 'Error fetching classes' });
    }
};

// Assign teacher to class
export const assignTeacherToClass = async (req: Request, res: Response) => {
    const { id: classId } = req.params;
    const { teacherId } = req.body;
    try {
        await db.query(
            `INSERT INTO "_ClassToTeacher" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [classId, teacherId]
        );
        res.json({ message: 'Teacher assigned successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error assigning teacher' });
    }
};

// Remove teacher from class
export const removeTeacherFromClass = async (req: Request, res: Response) => {
    const { id: classId, teacherId } = req.params;
    try {
        await db.query(
            `DELETE FROM "_ClassToTeacher" WHERE "A" = $1 AND "B" = $2`,
            [classId, teacherId]
        );
        res.json({ message: 'Teacher removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing teacher' });
    }
};

// Create a class
export const createClass = async (req: Request, res: Response) => {
    const { name, grade } = req.body;
    try {
        const id = crypto.randomUUID();
        const newClassRes = await db.query(
            `INSERT INTO "Class" (id, name, grade) VALUES ($1, $2, $3) RETURNING *`,
            [id, name, parseInt(grade as string)]
        );
        res.status(201).json(newClassRes.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating class' });
    }
};

// Delete a student
export const deleteStudent = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await db.query(`DELETE FROM "Student" WHERE id = $1`, [id]);
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting student' });
    }
};

// Delete a teacher
export const deleteTeacher = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await db.query(`DELETE FROM "Teacher" WHERE id = $1`, [id]);
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting teacher' });
    }
};

// Delete a class
export const deleteClass = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await db.query(`DELETE FROM "Class" WHERE id = $1`, [id]);
        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting class' });
    }
};

// Update user password
export const updateUserPassword = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { password, type } = req.body; // type: 'student' | 'teacher'

    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const table = type === 'student' ? 'Student' : 'Teacher';

        const updateQuery = `
            UPDATE "${table}" 
            SET password = $1, "plainPassword" = $2 
            WHERE id = $3
        `;

        const result = await db.query(updateQuery, [hashedPassword, password, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
};
