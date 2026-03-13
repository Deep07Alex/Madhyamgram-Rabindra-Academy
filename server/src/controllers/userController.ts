import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
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

        query += ` ORDER BY c.grade ASC, CAST(s."rollNumber" AS INTEGER) ASC NULLS LAST`;

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
        const teachersRes = await db.query(`SELECT * FROM "Teacher" ORDER BY "isTeaching" DESC, "joiningDate" ASC NULLS LAST, "name" ASC`);
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

// Delete all students
export const deleteAllStudents = async (req: Request, res: Response) => {
    try {
        await db.query(`DELETE FROM "Student"`);
        res.json({ message: 'All students deleted successfully' });
    } catch (error) {
        console.error('Error deleting all students:', error);
        res.status(500).json({ message: 'Error deleting all students' });
    }
};

// Delete a class

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

// Update a student (general update)
export const updateStudent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, studentId, rollNumber, banglarSikkhaId, password } = req.body;

    try {
        let updateQuery = 'UPDATE "Student" SET ';
        const params: any[] = [];
        let paramCount = 1;

        if (name) {
            updateQuery += `"name" = $${paramCount++}, `;
            params.push(name);
        }
        if (studentId) {
            // Ensure prefix
            const finalId = studentId.toUpperCase().startsWith('S-') ? studentId : `S-${studentId}`;
            updateQuery += `"studentId" = $${paramCount++}, `;
            params.push(finalId);
        }
        if (rollNumber !== undefined) {
            updateQuery += `"rollNumber" = $${paramCount++}, `;
            params.push(rollNumber);
        }
        if (banglarSikkhaId !== undefined) {
            updateQuery += `"banglarSikkhaId" = $${paramCount++}, `;
            params.push(banglarSikkhaId);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += `password = $${paramCount++}, "plainPassword" = $${paramCount++}, `;
            params.push(hashedPassword, password);
        }

        // Remove trailing comma and space
        updateQuery = updateQuery.slice(0, -2);
        updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
        params.push(id);

        const result = await db.query(updateQuery, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({ message: 'Student updated successfully', student: result.rows[0] });
    } catch (error: any) {
        console.error('Update student error:', error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ message: 'Admission Number or Email already exists' });
        }
        res.status(500).json({ message: 'Error updating student' });
    }
};

// Update a teacher/faculty (general update)
export const updateTeacher = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, teacherId, phone, aadhar, designation, joiningDate, isTeaching, password } = req.body;

    try {
        let updateQuery = 'UPDATE "Teacher" SET ';
        const params: any[] = [];
        let paramCount = 1;

        if (name) {
            updateQuery += `"name" = $${paramCount++}, `;
            params.push(name);
        }
        if (teacherId !== undefined) {
             updateQuery += `"teacherId" = $${paramCount++}, `;
             params.push(teacherId);
        }
        if (phone !== undefined) {
            updateQuery += `"phone" = $${paramCount++}, `;
            params.push(phone);
        }
        if (aadhar !== undefined) {
            updateQuery += `"aadhar" = $${paramCount++}, `;
            params.push(aadhar);
        }
        if (designation !== undefined) {
            updateQuery += `"designation" = $${paramCount++}, `;
            params.push(designation);
        }
        if (joiningDate !== undefined) {
            updateQuery += `"joiningDate" = $${paramCount++}, `;
            params.push(joiningDate);
        }
        if (isTeaching !== undefined) {
            updateQuery += `"isTeaching" = $${paramCount++}, `;
            params.push(isTeaching);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += `password = $${paramCount++}, "plainPassword" = $${paramCount++}, `;
            params.push(hashedPassword, password);
        }

        // Remove trailing comma and space
        updateQuery = updateQuery.slice(0, -2);
        updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
        params.push(id);

        const result = await db.query(updateQuery, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Faculty not found' });
        }

        res.json({ message: 'Faculty updated successfully', teacher: result.rows[0] });
    } catch (error: any) {
        console.error('Update teacher error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Teacher ID or Email already exists' });
        }
        res.status(500).json({ message: 'Error updating faculty member' });
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

// Bulk Import Students
export const bulkStudentImport = async (req: AuthRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return res.status(400).json({ message: 'Excel file is empty (no sheets found)' });
        }
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            return res.status(400).json({ message: 'Sheet not found' });
        }
        const data = XLSX.utils.sheet_to_json(worksheet);

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        // Class Mapping Helper
        const getMappedClassId = (rawName: string, classes: any[]) => {
            const name = rawName.toUpperCase();
            if (name === 'NURSERY') return classes.find(c => c.name === 'Nursery')?.id;
            if (name === 'KG-I') return classes.find(c => c.name === 'KG-I')?.id;
            if (name === 'KG-II A') return classes.find(c => c.name === 'KG-II A')?.id;
            if (name === 'KG-II B') return classes.find(c => c.name === 'KG-II B')?.id;
            if (name === 'STD-I') return classes.find(c => c.name === 'STD-I')?.id;
            if (name === 'STD-II') return classes.find(c => c.name === 'STD-II')?.id;
            if (name === 'STD-III') return classes.find(c => c.name === 'STD-III')?.id;
            if (name === 'STD-IV') return classes.find(c => c.name === 'STD-IV')?.id;
            
            // Fallbacks
            if (name.includes('NURSERY')) return classes.find(c => c.id === 'class-nursery')?.id;
            if (name.includes('KG-I') || name.includes('KG1')) return classes.find(c => c.id === 'class-kg1')?.id;
            if (name.includes('KG-II A') || name.includes('KG2 A')) return classes.find(c => c.id === 'class-kg2-a')?.id;
            if (name.includes('KG-II B') || name.includes('KG2 B')) return classes.find(c => c.id === 'class-kg2-b')?.id;
            if (name.includes('KG-II') || name.includes('KG2')) return classes.find(c => c.id === 'class-kg2-a')?.id;
            if (name.includes('STD-I') || name === 'CLASS 1' || name === 'CLASS I') return classes.find(c => c.id === 'class-1')?.id;
            if (name.includes('STD-II') || name === 'CLASS 2' || name === 'CLASS II') return classes.find(c => c.id === 'class-2')?.id;
            if (name.includes('STD-III') || name === 'CLASS 3' || name === 'CLASS III') return classes.find(c => c.id === 'class-3')?.id;
            if (name.includes('STD-IV') || name === 'CLASS 4' || name === 'CLASS IV') return classes.find(c => c.id === 'class-4')?.id;
            return classes.find(c => name.includes(c.name.toUpperCase()))?.id;
        };

        // Fetch all classes for mapping
        const classesRes = await db.query(`SELECT * FROM "Class"`);
        const classes = classesRes.rows;

        for (const [index, row] of (data as any[]).entries()) {
            try {
                // Column mapping based on screenshots:
                // CLASS, Roll, NAME, STUDENT ID IN BANGLAR SHIKSHA PORTAL, Admission Registration No.
                const name = row['NAME'];
                const rawClass = row['CLASS'];
                const rollNumber = row['Roll']?.toString();
                let studentId = row['Admission Registration No.']?.toString();
                const banglarSikkhaId = row['STUDENT ID IN BANGLAR SHIKSHA PORTAL']?.toString();

                if (!name || !rawClass || !studentId) {
                    results.failed++;
                    results.errors.push(`Row ${index + 2}: Missing mandatory fields (Name, Class, or Admission No)`);
                    continue;
                }

                // Ensure S- prefix
                if (!studentId.toUpperCase().startsWith('S-')) {
                    studentId = `S-${studentId}`;
                }

                const classId = getMappedClassId(rawClass, classes);
                if (!classId) {
                    results.failed++;
                    results.errors.push(`Row ${index + 2}: Unknown class "${rawClass}"`);
                    continue;
                }

                // Check for existing studentId
                const existingId = await db.query(`SELECT id FROM "Student" WHERE "studentId" = $1`, [studentId]);
                if (existingId.rows.length > 0) {
                    results.failed++;
                    results.errors.push(`Row ${index + 2}: Student with Admission No "${studentId}" already exists`);
                    continue;
                }

                // Create student
                const id = crypto.randomUUID();
                const cleanName = name.toString().trim().toLowerCase().replace(/\s+/g, '');
                const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                const numericId = studentId.replace(/\D/g, '');
                const password = `${capitalizedName}@${numericId}`;
                const hashedPassword = await bcrypt.hash(password, 10);

                await db.query(
                    `INSERT INTO "Student" (id, "studentId", password, "plainPassword", name, "rollNumber", "classId", "banglarSikkhaId") 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [id, studentId, hashedPassword, password, name, rollNumber || '0', classId, banglarSikkhaId || null]
                );

                results.success++;
            } catch (err: any) {
                console.error(`Error importing row ${index + 2}:`, err);
                results.failed++;
                results.errors.push(`Row ${index + 2}: ${err.message}`);
            }
        }

        res.json({
            message: `Import completed: ${results.success} students imported successfully, ${results.failed} failed.`,
            ...results
        });
    } catch (error: any) {
        console.error('Bulk import error:', error);
        res.status(500).json({ message: 'Error processing bulk import', error: error.message });
    }
};
