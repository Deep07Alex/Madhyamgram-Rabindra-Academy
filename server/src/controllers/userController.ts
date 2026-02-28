import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';

// Get all students
export const getStudents = async (req: AuthRequest, res: Response) => {
    try {
        let query = `
            SELECT s.*, row_to_json(c.*) as class 
            FROM "Student" s 
            LEFT JOIN "Class" c ON s."classId" = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (req.user?.role === 'TEACHER') {
            query += ` AND s."classId" IN (SELECT "A" FROM "_ClassToTeacher" WHERE "B" = $${paramCount++})`;
            params.push(req.user.id);
        }

        const studentsRes = await db.query(query, params);
        res.json(studentsRes.rows);
    } catch (error) {
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

// Get all classes
export const getClasses = async (req: Request, res: Response) => {
    try {
        const classesRes = await db.query(`
            SELECT c.*, 
            (SELECT COUNT(*) FROM "Student" s WHERE s."classId" = c.id) as "_count_students"
            FROM "Class" c
        `);
        const formatted = classesRes.rows.map(c => ({
            ...c,
            _count: { students: parseInt(c._count_students, 10) }
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching classes' });
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
