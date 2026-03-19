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
    const { name, studentId, rollNumber, banglarSikkhaId, email, password, photo } = req.body;

    try {
        let updateQuery = 'UPDATE "Student" SET ';
        const params: any[] = [];
        let paramCount = 1;

        if (name) {
            updateQuery += `"name" = $${paramCount++}, `;
            params.push(name);
        }
        if (email !== undefined) {
             const safeEmail = (email && email.trim()) ? email.trim() : null;
             updateQuery += `"email" = $${paramCount++}, `;
             params.push(safeEmail);
        }
        if (studentId) {
            // Ensure uppercase S- prefix and trim
            let finalId = studentId.trim();
            if (!finalId.toUpperCase().startsWith('S-')) {
                finalId = `S-${finalId}`;
            } else {
                finalId = `S-${finalId.slice(2)}`;
            }
            updateQuery += `"studentId" = $${paramCount++}, `;
            params.push(finalId);
        }
        if (rollNumber !== undefined) {
            updateQuery += `"rollNumber" = $${paramCount++}, `;
            params.push(rollNumber);
        }
        if (banglarSikkhaId !== undefined) {
            const safeBanglarSikkhaId = (banglarSikkhaId && banglarSikkhaId.trim()) ? banglarSikkhaId.trim() : null;
            if (safeBanglarSikkhaId) {
                const banglarCheck = await db.query(
                    `SELECT id FROM "Student" WHERE "banglarSikkhaId" = $1 AND id != $2 LIMIT 1`,
                    [safeBanglarSikkhaId, id]
                );
                if (banglarCheck.rows.length > 0) {
                    return res.status(400).json({ message: 'Cannot be updated as this Banglar Sikkha ID is already allotted to another student' });
                }
            }
            updateQuery += `"banglarSikkhaId" = $${paramCount++}, `;
            params.push(safeBanglarSikkhaId);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += `password = $${paramCount++}, "plainPassword" = $${paramCount++}, `;
            params.push(hashedPassword, password);
        }
        if (photo !== undefined) {
            updateQuery += `"photo" = $${paramCount++}, `;
            params.push(photo);
        }

        // Remove trailing comma and space
        updateQuery = updateQuery.slice(0, -2);
        updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
        params.push(id);

        const result = await db.query(updateQuery, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const updatedStudent = result.rows[0];
        // Emit live update event
        import('../lib/socket.js').then(({ emitEvent }) => {
            emitEvent('profile_updated', { studentId: id }, `student:${id}`);
        }).catch(err => console.error('Socket emission error:', err));

        res.json({ message: 'Student updated successfully', student: updatedStudent });
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
    const { 
        name, teacherId, phone, aadhar, designation, joiningDate, isTeaching, password,
        photo, address, dob, qualification, extraQualification, caste, email
    } = req.body;

    try {
        let updateQuery = 'UPDATE "Teacher" SET ';
        const params: any[] = [];
        let paramCount = 1;

        if (name) {
            updateQuery += `"name" = $${paramCount++}, `;
            params.push(name);
        }
        if (email !== undefined) {
             const safeEmail = (email && email.trim()) ? email.trim() : null;
             updateQuery += `"email" = $${paramCount++}, `;
             params.push(safeEmail);
        }
        if (teacherId !== undefined) {
             const safeTeacherId = (teacherId && teacherId.trim()) ? teacherId.trim() : null;
             updateQuery += `"teacherId" = $${paramCount++}, `;
             params.push(safeTeacherId);
        }
        if (phone !== undefined) {
            const safePhone = (phone && phone.trim()) ? phone.trim() : null;
            updateQuery += `"phone" = $${paramCount++}, `;
            params.push(safePhone);
        }
        if (aadhar !== undefined) {
            const safeAadhar = (aadhar && aadhar.trim()) ? aadhar.trim() : null;
            updateQuery += `"aadhar" = $${paramCount++}, `;
            params.push(safeAadhar);
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
        if (photo !== undefined) {
            updateQuery += `"photo" = $${paramCount++}, `;
            params.push(photo);
        }
        if (address !== undefined) {
            updateQuery += `"address" = $${paramCount++}, `;
            params.push(address);
        }
        if (dob !== undefined) {
            updateQuery += `"dob" = $${paramCount++}, `;
            params.push(dob);
        }
        if (qualification !== undefined) {
            updateQuery += `"qualification" = $${paramCount++}, `;
            params.push(qualification);
        }
        if (extraQualification !== undefined) {
            updateQuery += `"extraQualification" = $${paramCount++}, `;
            params.push(extraQualification);
        }
        if (caste !== undefined) {
            updateQuery += `"caste" = $${paramCount++}, `;
            params.push(caste);
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


        const updatedTeacher = result.rows[0];
        // Emit live update event
        import('../lib/socket.js').then(({ emitEvent }) => {
            emitEvent('profile_updated', { teacherId: id }, `teacher:${id}`);
        }).catch(err => console.error('Socket emission error:', err));

        res.json({ message: 'Faculty updated successfully', teacher: updatedTeacher });
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

    const client = await db.connect();
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return res.status(400).json({ message: 'Excel file is empty' });
        
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) return res.status(400).json({ message: 'Sheet not found' });
        const data = XLSX.utils.sheet_to_json(worksheet);

        const results = { success: 0, failed: 0, errors: [] as string[] };
        const validStudents: any[] = [];

        // Pre-fetch all classes and existing IDs for O(1) checks
        const [classesRes, existingIdsRes] = await Promise.all([
            client.query(`SELECT id, name FROM "Class"`),
            client.query(`SELECT "studentId", "banglarSikkhaId" FROM "Student"`)
        ]);

        const classes = classesRes.rows;
        const existingStudentIds = new Set(existingIdsRes.rows.map(r => r.studentId.toUpperCase()));
        const existingBanglarIds = new Set(existingIdsRes.rows.filter(r => r.banglarSikkhaId).map(r => r.banglarSikkhaId.toUpperCase()));

        const getMappedClassId = (rawName: string) => {
            const name = rawName.toString().toUpperCase().trim();
            const found = classes.find(c => c.name.toUpperCase() === name || name.includes(c.name.toUpperCase()));
            return found?.id;
        };

        // Step 1: Pre-process and validate all rows (In-memory)
        for (const [index, row] of (data as any[]).entries()) {
            try {
                const name = row['NAME']?.toString().trim();
                const rawClass = row['CLASS']?.toString().trim();
                const rollNumber = row['Roll']?.toString().trim() || '0';
                let studentId = row['Admission Registration No.']?.toString().trim();
                const banglarSikkhaId = row['STUDENT ID IN BANGLAR SHIKSHA PORTAL']?.toString().trim();

                if (!name || !rawClass || !studentId) {
                    throw new Error(`Missing mandatory fields (Name: ${!!name}, Class: ${!!rawClass}, Admission No: ${!!studentId})`);
                }

                if (!studentId.toUpperCase().startsWith('S-')) {
                    studentId = `S-${studentId}`;
                }

                const upperStudentId = studentId.toUpperCase();
                if (existingStudentIds.has(upperStudentId)) {
                    throw new Error(`Admission No "${studentId}" already exists`);
                }

                if (banglarSikkhaId && existingBanglarIds.has(banglarSikkhaId.toUpperCase())) {
                    throw new Error(`Banglar Sikkha ID "${banglarSikkhaId}" already exists`);
                }

                const classId = getMappedClassId(rawClass);
                if (!classId) {
                    throw new Error(`Unknown class "${rawClass}"`);
                }

                const cleanName = name.toLowerCase().replace(/\s+/g, '');
                const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                const numericId = studentId.replace(/\D/g, '');
                const password = `${capitalizedName}@${numericId.slice(-4) || '0000'}`;

                validStudents.push({
                    id: crypto.randomUUID(),
                    studentId,
                    password,
                    name,
                    rollNumber,
                    classId,
                    banglarSikkhaId: banglarSikkhaId || null
                });

                existingStudentIds.add(upperStudentId);
                if (banglarSikkhaId) existingBanglarIds.add(banglarSikkhaId.toUpperCase());
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Row ${index + 2}: ${err.message}`);
            }
        }

        // Step 2: Parallel Password Hashing in Chunks
        // Using chunks to prevent CPU exhaustion on very large files
        const HASH_BATCH_SIZE = 50;
        for (let i = 0; i < validStudents.length; i += HASH_BATCH_SIZE) {
            const batch = validStudents.slice(i, i + HASH_BATCH_SIZE);
            await Promise.all(batch.map(async (st) => {
                st.hashedPassword = await bcrypt.hash(st.password, 10);
            }));
        }

        // Step 3: Single Bulk Transaction
        if (validStudents.length > 0) {
            await client.query('BEGIN');
            try {
                // Construct a single multi-row INSERT query
                // Parameter count = rows * 8 (id, studentId, password, plainPassword, name, rollNumber, classId, banglarSikkhaId)
                const columns = '(id, "studentId", password, "plainPassword", name, "rollNumber", "classId", "banglarSikkhaId")';
                const values: any[] = [];
                const placeholders: string[] = [];

                validStudents.forEach((st, idx) => {
                    const base = idx * 8;
                    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`);
                    values.push(
                        st.id, st.studentId, st.hashedPassword, st.password, 
                        st.name, st.rollNumber, st.classId, st.banglarSikkhaId
                    );
                });

                const query = `INSERT INTO "Student" ${columns} VALUES ${placeholders.join(', ')}`;
                await client.query(query, values);
                await client.query('COMMIT');
                results.success = validStudents.length;
            } catch (dbError: any) {
                await client.query('ROLLBACK');
                throw dbError;
            }
        }

        res.json({
            message: `Import completed: ${results.success} students imported, ${results.failed} failed.`,
            ...results
        });
    } catch (error: any) {
        console.error('Bulk import error:', error);
        res.status(500).json({ message: 'Error processing bulk import', error: error.message });
    } finally {
        client.release();
    }
};
