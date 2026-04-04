/**
 * User Controller
 * 
 * Manages core entities: Students, Teachers (Faculty), and Classes.
 * Handles CRUD operations, relationship management (Teachers to Classes), 
 * and bulk data imports.
 */
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { AuthRequest } from '../middleware/auth.js';
import { broadcast, sendToUser, sendToRole } from '../lib/sseManager.js';

// Get all students
/**
 * Retrieves a list of students, optionally filtered by class.
 * Includes associated class data in the response.
 */
export const getStudents = async (req: AuthRequest, res: Response) => {
    try {
        const { classId, page = 1, limit = 20, search = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

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

        if (search) {
            query += ` AND (s.name ILIKE $${paramCount} OR s."studentId" ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        const countQuery = query.replace('s.*, row_to_json(c.*) as class', 'COUNT(*) as total');

        query += ` ORDER BY c.grade ASC, CAST(s."rollNumber" AS INTEGER) ASC NULLS LAST`;
        query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(Number(limit), offset);

        const [studentsRes, countRes] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, params.slice(0, paramCount - 3))
        ]);

        const total = parseInt(countRes.rows[0].total, 10);
        const totalPages = Math.ceil(total / Number(limit));

        res.json({
            students: studentsRes.rows,
            total,
            totalPages,
            page: Number(page),
            limit: Number(limit)
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Error fetching students' });
    }
};

// Get all teachers
/**
 * Retrieves all teachers/faculty members.
 * Sorted by teaching status and joining date.
 */
export const getTeachers = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, search = '', filter = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        // Staff filter logic: these designations are considered Non-Teaching/Special Staff
        const staffDesignations = ['NON-TEACHING STAFF', 'KARATE TEACHER', 'DANCE TEACHER'];
        const staffListStr = staffDesignations.map(d => `'${d}'`).join(',');

        let filterClause = '';
        if (filter === 'staff') {
            filterClause = `AND designation IN (${staffListStr})`;
        } else if (filter === 'teachers') {
            filterClause = `AND designation NOT IN (${staffListStr})`;
        }

        const baseQuery = `
            FROM (
                SELECT id, name, email, "teacherId", phone, aadhar, photo, address, dob, qualification, "extraQualification", designation, caste, "joiningDate", "isTeaching", "plainPassword", 'TEACHER' as role FROM "Teacher"
                UNION ALL
                SELECT id, name, email, "adminId" as "teacherId", phone, aadhar, photo, address, dob, qualification, "extraQualification", designation, caste, "joiningDate", TRUE as "isTeaching", "plainPassword", 'ADMIN' as role FROM "Admin"
                WHERE designation IN ('PRINCIPAL', 'HEAD MISTRESS')
            ) staff
            WHERE (name ILIKE $1 OR "teacherId" ILIKE $1 OR designation ILIKE $1)
            ${filterClause}
        `;

        const searchParam = `%${search}%`;

        const countRes = await db.query(`SELECT COUNT(*) as total ${baseQuery}`, [searchParam]);
        const teachersRes = await db.query(`
            SELECT * ${baseQuery}
            ORDER BY "isTeaching" DESC, "joiningDate" ASC NULLS LAST, "name" ASC
            LIMIT $2 OFFSET $3
        `, [searchParam, Number(limit), offset]);

        const total = parseInt(countRes.rows[0].total, 10);
        const totalPages = Math.ceil(total / Number(limit));

        res.json({
            teachers: teachersRes.rows,
            total,
            totalPages,
            page: Number(page),
            limit: Number(limit)
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ message: 'Error fetching teachers' });
    }
};

/**
 * Retrieves all classes with student counts and assigned teachers.
 */
export const getClasses = async (req: AuthRequest, res: Response) => {
    try {
        const query = `
            SELECT c.*, 
            (SELECT COUNT(*) FROM "Student" s WHERE s."classId" = c.id) as "_count_students",
            (SELECT json_agg(row_to_json(t.*)) 
             FROM "Teacher" t 
             JOIN "_ClassToTeacher" ct ON ct."B" = t.id 
             WHERE ct."A" = c.id) as teachers,
            (SELECT json_agg(row_to_json(sub.*))
             FROM (
                 SELECT * FROM "Subject" sb 
                 WHERE sb."classId" = c.id 
                 ORDER BY sb."name" ASC
             ) sub) as subjects
            FROM "Class" c
            ORDER BY c.grade ASC, c.name ASC
        `;

        const classesRes = await db.query(query);
        const formatted = classesRes.rows.map(c => ({
            ...c,
            _count: { students: parseInt(c._count_students, 10) },
            teachers: c.teachers || [],
            subjects: c.subjects || []
        }));
        res.json(formatted);
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ message: 'Error fetching classes' });
    }
};

// Assign teacher to class
/**
 * Links a teacher to a specific class.
 */
export const assignTeacherToClass = async (req: Request, res: Response) => {
    const { id: classId } = req.params;
    const { teacherId } = req.body;
    try {
        await db.query(
            `INSERT INTO "_ClassToTeacher" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [classId, teacherId]
        );
        broadcast('class:updated', { classId, teacherId });
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
        broadcast('class:updated', { classId, teacherId });
        res.json({ message: 'Teacher removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing teacher' });
    }
};

// Create a class
/**
 * Creates a new class/grade.
 */
export const createClass = async (req: Request, res: Response) => {
    const { name, grade, monthlyFee, subjects } = req.body;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const id = crypto.randomUUID();
        const newClassRes = await client.query(
            `INSERT INTO "Class" (id, name, grade, "monthlyFee") VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, name, parseInt(grade as string), parseFloat(monthlyFee as string) || 0]
        );

        // Add subjects if provided
        if (subjects && Array.isArray(subjects)) {
            for (const s of subjects) {
                if (!s.name) continue;
                await client.query(
                    `INSERT INTO "Subject" (id, "classId", name, "fullMarks") VALUES ($1, $2, $3, $4)`,
                    [crypto.randomUUID(), id, s.name, parseInt(s.fullMarks) || 100]
                );
            }
        }

        await client.query('COMMIT');
        broadcast('class:updated', { id });
        res.status(201).json(newClassRes.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create class error:', error);
        res.status(500).json({ message: 'Error creating class' });
    } finally {
        client.release();
    }
};

// Update a class
export const updateClass = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, grade, monthlyFee, subjects } = req.body;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `UPDATE "Class" SET name = $1, grade = $2, "monthlyFee" = $3 WHERE id = $4 RETURNING *`,
            [name, parseInt(grade as string), parseFloat(monthlyFee as string) || 0, id]
        );
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Class not found' });
        }

        // Sync subjects: update existing, insert new, delete removed, and cascade name changes
        if (subjects && Array.isArray(subjects)) {
            const existingRes = await client.query(`SELECT id, name FROM "Subject" WHERE "classId" = $1`, [id]);
            const existingSubjects = existingRes.rows;

            for (const s of subjects) {
                if (!s.name) continue;
                if (s.id) {
                    const oldSub = existingSubjects.find(x => x.id === s.id);
                    if (oldSub && oldSub.name !== s.name) {
                        // Cascade rename for safety. We only do this if the name string actually changed.
                        // (Use ON CONFLICT DO NOTHING or just simple updates since these tables reference string subjects)
                        await client.query(`UPDATE "Result" SET subject = $1 WHERE "classId" = $2 AND subject = $3`, [s.name, id, oldSub.name]).catch(() => { });
                        await client.query(`UPDATE "Homework" SET subject = $1 WHERE "classId" = $2 AND subject = $3`, [s.name, id, oldSub.name]).catch(() => { });
                        await client.query(`UPDATE "Attendance" SET subject = $1 WHERE "classId" = $2 AND subject = $3`, [s.name, id, oldSub.name]).catch(() => { });
                    }
                    await client.query(
                        `UPDATE "Subject" SET name = $1, "fullMarks" = $2 WHERE id = $3 AND "classId" = $4`,
                        [s.name, parseInt(s.fullMarks) || 100, s.id, id]
                    );
                } else {
                    await client.query(
                        `INSERT INTO "Subject" (id, "classId", name, "fullMarks") VALUES ($1, $2, $3, $4)`,
                        [crypto.randomUUID(), id, s.name, parseInt(s.fullMarks) || 100]
                    );
                }
            }

            // Delete removed subjects
            const incomingIds = subjects.filter(s => s.id).map(s => s.id);
            const toDelete = existingSubjects.filter(ex => !incomingIds.includes(ex.id));
            if (toDelete.length > 0) {
                const deleteIds = toDelete.map(x => x.id);
                await client.query(`DELETE FROM "Subject" WHERE id = ANY($1)`, [deleteIds]);
            }
        } else if (subjects !== undefined) {
            // If subjects was explicitly passed as empty array from frontend
            await client.query(`DELETE FROM "Subject" WHERE "classId" = $1`, [id]);
        }

        await client.query('COMMIT');
        broadcast('class:updated', { id });
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update class error:', error);
        res.status(500).json({ message: 'Error updating class' });
    } finally {
        client.release();
    }
};

// Delete a student
/**
 * Hard-deletes a student record.
 */
export const deleteStudent = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        // Explicitly clear fees (just in case cascade is missing)
        await db.query(`DELETE FROM "MonthlyFee" WHERE "studentId" = $1`, [id]);
        await db.query(`DELETE FROM "AdmissionFee" WHERE "studentId" = $1`, [id]);

        await db.query(`DELETE FROM "Student" WHERE id = $1`, [id]);
        broadcast('user:deleted', { id, role: 'STUDENT' });
        res.json({ message: 'Student and related records deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting student' });
    }
};

// Delete a teacher
export const deleteTeacher = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        const delRes = await db.query(`DELETE FROM "Teacher" WHERE id = $1`, [id]);
        if (delRes.rowCount === 0) {
            await db.query(`DELETE FROM "Admin" WHERE id = $1 AND designation IN ('PRINCIPAL', 'HEAD MISTRESS')`, [id]);
        }
        broadcast('user:deleted', { id, role: 'TEACHER' });
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting teacher' });
    }
};
// Delete all students
/**
 * Deletes EVERY student from the database. 
 * EMERGENCY/CLEANUP ONLY.
 */
export const deleteAllStudents = async (req: Request, res: Response) => {
    try {
        // Explicitly clear all fee records
        await db.query(`DELETE FROM "MonthlyFee"`);
        await db.query(`DELETE FROM "AdmissionFee"`);

        await db.query(`DELETE FROM "Student"`);
        broadcast('user:deleted', { all: true, role: 'STUDENT' });
        res.json({ message: 'All students and fee records deleted successfully' });
    } catch (error) {
        console.error('Error deleting all students:', error);
        res.status(500).json({ message: 'Error deleting all students' });
    }
};


// Delete a class
export const deleteClass = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await db.query(`DELETE FROM "Class" WHERE id = $1`, [id]);
        broadcast('class:updated', { id });
        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting class' });
    }
};

// Enroll a single student
export const enrollStudent = async (req: Request, res: Response) => {
    const {
        name, studentId, rollNumber, banglarSikkhaId, email, password, classId,
        guardianName, dob, address, phone
    } = req.body;

    try {
        const id = crypto.randomUUID();

        // Ensure uppercase S- prefix for standardize comparison
        let finalId = studentId.trim();
        if (!finalId.toUpperCase().startsWith('S-')) {
            finalId = `S-${finalId}`;
        } else {
            const numericPart = finalId.slice(2).replace(/\s/g, '');
            finalId = `S-${numericPart}`;
        }

        // 1. Check Banglar Sikkha ID (If provided) - MUST BE FIRST per user req
        if (banglarSikkhaId && banglarSikkhaId.trim() !== "") {
            const banglarCheck = await db.query(`SELECT id FROM "Student" WHERE "banglarSikkhaId" = $1 LIMIT 1`, [banglarSikkhaId.trim()]);
            if (banglarCheck.rows.length > 0) {
                return res.status(400).json({ message: `Bangla Sikkhar id (${banglarSikkhaId.trim()}) already exist` });
            }
        }

        // 2. Check Admission Number (studentId) - SECOND
        const idCheck = await db.query(`SELECT id FROM "Student" WHERE "studentId" = $1 LIMIT 1`, [finalId]);
        if (idCheck.rows.length > 0) {
            return res.status(400).json({ message: `Admission number (${studentId.trim()}) already exist` });
        }

        // 3. Check Roll Number within the specific Class - THIRD
        const rollCheck = await db.query(
            `SELECT id FROM "Student" WHERE "rollNumber" = $1 AND "classId" = $2 LIMIT 1`,
            [rollNumber.toString().trim(), classId]
        );
        if (rollCheck.rows.length > 0) {
            return res.status(400).json({ message: `Roll number (${rollNumber.toString().trim()}) already exist in this class` });
        }

        // Auto-generate password if not provided (Name@Last4DigitsOfID)
        let finalPassword = password;
        if (!finalPassword || finalPassword.trim() === '') {
            const cleanName = name.trim().toLowerCase().replace(/\s+/g, '');
            const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            const numericId = finalId.replace(/\D/g, '');
            finalPassword = `${capitalizedName}@${numericId.slice(-4) || '0000'}`;
        }
        const hashedPassword = await bcrypt.hash(finalPassword, 10);

        const query = `
            INSERT INTO "Student" (
                id, "studentId", password, "plainPassword", name, email, 
                "rollNumber", "banglarSikkhaId", "classId",
                "guardianName", "dob", "address", "phone"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

        const result = await db.query(query, [
            id, finalId, hashedPassword, finalPassword, name, email || null,
            rollNumber, banglarSikkhaId || null, classId,
            guardianName || null, dob || null, address || null, phone || null
        ]);

        broadcast('user:created', { id, role: 'STUDENT' });

        // AUTOMATIC PRESENT MARKING FOR TODAY
        // Ensures new students have their "Today" attendance saved immediately
        try {
            const todayDate = new Date().toLocaleDateString('en-CA');
            // Get any marker ID (Admins are stored in Admin table)
            const staffCheck = await db.query('SELECT id FROM "Admin" UNION SELECT id FROM "Teacher" LIMIT 1');
            if (staffCheck.rows.length > 0) {
                await db.query(
                    `INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId", subject) 
                     VALUES ($1, $2, 'PRESENT', $3, $4, $5, 'FULL DAY SESSION') 
                     ON CONFLICT DO NOTHING`,
                    [crypto.randomUUID(), todayDate, id, staffCheck.rows[0].id, classId]
                );
            }
        } catch (attErr) {
            console.warn('Silent failure marking new student attendance for today:', attErr);
        }

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Enroll student error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Admission Number or Email already exists' });
        }
        res.status(500).json({ message: 'Error enrolling student' });
    }
};

/**
 * Live Validation for Enrollment
 */
export const validateStudentEnrollment = async (req: Request, res: Response) => {
    try {
        const { type, value, classId, studentId: currentStudentId } = req.query;

        if (type === 'studentId') {
            let finalId = (value as string).trim();
            if (!finalId.toUpperCase().startsWith('S-')) {
                finalId = `S-${finalId}`;
            } else {
                const numericPart = finalId.slice(2).replace(/\s/g, '');
                finalId = `S-${numericPart}`;
            }

            const check = await db.query(
                `SELECT id FROM "Student" WHERE "studentId" = $1 ${currentStudentId ? 'AND id != $2' : ''} LIMIT 1`,
                currentStudentId ? [finalId, currentStudentId] : [finalId]
            );
            return res.json({ exists: check.rows.length > 0, message: check.rows.length > 0 ? `Admission number (${(value as string).trim()}) already exist` : '' });
        }

        if (type === 'banglarSikkhaId') {
            const check = await db.query(
                `SELECT id FROM "Student" WHERE "banglarSikkhaId" = $1 ${currentStudentId ? 'AND id != $2' : ''} LIMIT 1`,
                currentStudentId ? [value, currentStudentId] : [value]
            );
            return res.json({ exists: check.rows.length > 0, message: check.rows.length > 0 ? `Bangla Sikkhar id (${(value as string).trim()}) already exist` : '' });
        }

        if (type === 'rollNumber' && classId) {
            const check = await db.query(
                `SELECT id FROM "Student" WHERE "rollNumber" = $1 AND "classId" = $2 ${currentStudentId ? 'AND id != $3' : ''} LIMIT 1`,
                currentStudentId ? [value, classId, currentStudentId] : [value, classId]
            );
            return res.json({ exists: check.rows.length > 0, message: check.rows.length > 0 ? `Roll number (${(value as string).trim()}) already exist in this class` : '' });
        }

        res.json({ exists: false });
    } catch (error) {
        res.status(500).json({ message: 'Validation error' });
    }
};

/**
 * Live Validation for Teacher/Faculty Enrollment
 */
export const validateTeacherEnrollment = async (req: Request, res: Response) => {
    try {
        const { type, value, teacherId: currentTeacherId } = req.query;

        if (type === 'teacherId') {
            const val = (value as string).trim();
            // Check both Teacher and Admin tables
            const checkTeacher = await db.query(
                `SELECT id FROM "Teacher" WHERE "teacherId" = $1 ${currentTeacherId ? 'AND id != $2' : ''} LIMIT 1`,
                currentTeacherId ? [val, currentTeacherId] : [val]
            );

            const checkAdmin = await db.query(
                `SELECT id FROM "Admin" WHERE "adminId" = $1 ${currentTeacherId ? 'AND id != $2' : ''} LIMIT 1`,
                currentTeacherId ? [val, currentTeacherId] : [val]
            );

            const exists = checkTeacher.rows.length > 0 || checkAdmin.rows.length > 0;
            return res.json({
                exists,
                message: exists ? `${val} already present` : ''
            });
        }

        if (type === 'aadhar') {
            const val = (value as string).trim();
            const checkTeacher = await db.query(
                `SELECT id FROM "Teacher" WHERE "aadhar" = $1 ${currentTeacherId ? 'AND id != $2' : ''} LIMIT 1`,
                currentTeacherId ? [val, currentTeacherId] : [val]
            );

            const checkAdmin = await db.query(
                `SELECT id FROM "Admin" WHERE "aadhar" = $1 ${currentTeacherId ? 'AND id != $2' : ''} LIMIT 1`,
                currentTeacherId ? [val, currentTeacherId] : [val]
            );

            const exists = checkTeacher.rows.length > 0 || checkAdmin.rows.length > 0;
            return res.json({
                exists,
                message: exists ? `Aadhar number already exists` : ''
            });
        }

        res.json({ exists: false });
    } catch (error) {
        res.status(500).json({ message: 'Validation error' });
    }
};

// Update a student (general update)
/**
 * Dynamically updates student fields. 
 * Supports updating name, ID, roll number, Banglar Sikkha ID, email, password, and photo.
 */
export const updateStudent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        name, studentId, rollNumber, banglarSikkhaId, email, password, photo,
        guardianName, dob, address, phone
    } = req.body;

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
                const numericPart = finalId.slice(2).replace(/\s/g, '');
                finalId = `S-${numericPart}`;
            }

            // Check duplicate Admission Number
            const idCheck = await db.query(`SELECT id FROM "Student" WHERE "studentId" = $1 AND id != $2`, [finalId, id]);
            if (idCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Admission number already exists' });
            }

            updateQuery += `"studentId" = $${paramCount++}, `;
            params.push(finalId);
        }

        if (rollNumber !== undefined) {
            const rollCheck = await db.query(
                `SELECT id FROM "Student" WHERE "rollNumber" = $1 AND "classId" = (SELECT "classId" FROM "Student" WHERE id = $2) AND id != $2`,
                [rollNumber.toString().trim(), id]
            );
            if (rollCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Roll number already exists in this class' });
            }
            updateQuery += `"rollNumber" = $${paramCount++}, `;
            params.push(rollNumber.toString().trim());
        }

        if (banglarSikkhaId !== undefined) {
            const safeBanglarSikkhaId = (banglarSikkhaId && banglarSikkhaId.trim()) ? banglarSikkhaId.trim() : null;
            if (safeBanglarSikkhaId) {
                const banglarCheck = await db.query(
                    `SELECT id FROM "Student" WHERE "banglarSikkhaId" = $1 AND id != $2 LIMIT 1`,
                    [safeBanglarSikkhaId, id]
                );
                if (banglarCheck.rows.length > 0) {
                    return res.status(400).json({ message: 'Bangla Sikkhar id already exist' });
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
        if (guardianName !== undefined) {
            updateQuery += `"guardianName" = $${paramCount++}, `;
            params.push(guardianName || null);
        }
        if (dob !== undefined) {
            updateQuery += `"dob" = $${paramCount++}, `;
            params.push(dob || null);
        }
        if (address !== undefined) {
            updateQuery += `"address" = $${paramCount++}, `;
            params.push(address || null);
        }
        if (phone !== undefined) {
            updateQuery += `"phone" = $${paramCount++}, `;
            params.push(phone || null);
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
        // Emit live update events (Global broadcast handles all relevant views)
        broadcast('profile_updated', { studentId: id, updatedStudent });

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
/**
 * Dynamically updates teacher/faculty fields.
 * Handles both teaching and administration staff.
 */
export const updateTeacher = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        name, teacherId, phone, aadhar, designation, joiningDate, isTeaching, password,
        photo, address, dob, qualification, extraQualification, caste, email
    } = req.body;

    try {
        // 1. Determine target table (Teacher or Admin)
        const checkRes = await db.query(`
            SELECT 'TEACHER' as role FROM "Teacher" WHERE id = $1
            UNION ALL
            SELECT 'ADMIN' as role FROM "Admin" WHERE id = $1
            LIMIT 1
        `, [id]);

        if (checkRes.rowCount === 0) {
            return res.status(404).json({ message: 'Faculty member not found' });
        }

        const role = checkRes.rows[0].role;
        const tableName = role === 'ADMIN' ? 'Admin' : 'Teacher';
        const idField = role === 'ADMIN' ? 'adminId' : 'teacherId';

        // 2. Build dynamic update query
        let updateQuery = `UPDATE "${tableName}" SET `;
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
            updateQuery += `"${idField}" = $${paramCount++}, `;
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

        // Only Teacher table has isTeaching
        if (isTeaching !== undefined && role === 'TEACHER') {
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

        // Add updatedAt and cleanup
        updateQuery += `"updatedAt" = CURRENT_TIMESTAMP `;
        updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
        params.push(id);

        const result = await db.query(updateQuery, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Update failed' });
        }

        const updatedUser = result.rows[0];
        broadcast('profile_updated', { teacherId: id, role, updatedUser });
        res.json({ message: 'Faculty updated successfully', teacher: updatedUser });
    } catch (error: any) {
        console.error('Update teacher error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'ID or Email already exists' });
        }
        res.status(500).json({ message: 'Error updating faculty member' });
    }
};

// Bulk Import Students - Modernized Rebuild
/**
 * Massively handles student data imports from Excel files.
 * 
 * Logic Overview:
 * 1. Pre-fetches classes and existing IDs for performance.
 * 2. Normalizes text to handle messy Excel formatting reliably.
 * 3. Uses alias-based searching to find columns (e.g., "STUDENT NAME" or "NAME").
 * 4. Implements "Fuzzy Grade Mapping" to link rows to the correct Class ID.
 * 5. Handles "Structural Rows" (headers/instructions) by skipping them.
 * 6. Generates formatted Student IDs (S-...) and default passwords.
 * 7. Performs a single batch INSERT for maximum database efficiency.
 */
export const bulkStudentImport = async (req: AuthRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const client = await db.connect();
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const results = { success: 0, failed: 0, skipped: 0, errors: [] as any[] };
        const validStudents: any[] = [];

        // Pre-fetch all classes and existing IDs for O(1) checks
        const [classesRes, existingIdsRes] = await Promise.all([
            client.query(`SELECT id, name FROM "Class"`),
            client.query(`SELECT "studentId", "banglarSikkhaId" FROM "Student"`)
        ]);

        // TOUGHER NORMALIZATION: Remove EVERYTHING except letters and numbers
        const normalize = (val: any) => val ? val.toString().toUpperCase().replace(/[^A-Z0-9]/g, '').trim() : "";

        // Cache for classes to avoid redundant DB calls and handle auto-creation in-batch
        const classes = (classesRes.rows as any[]).map(c => ({ ...c, norm: normalize(c.name) })).sort((a, b) => b.name.length - a.name.length);
        const existingStudentIds = new Set(existingIdsRes.rows.map(r => r.studentId.toUpperCase()));

        const MANDATORY_HEADERS = [
            'CLASS',
            'Roll',
            'NAME',
            'STUDENT ID IN BANGLAR SHIKSHA PORTAL',
            'Admission Registration No.'
        ];

        /**
         * Maps raw Excel grade names (e.g., "Class 1", "STDI") to 
         * existing database Class IDs using exact and then fuzzy matches.
         */
        const getMappedClassId = (rawName: any) => {
            if (!rawName) return undefined;
            const normExcel = normalize(rawName);

            // 1. Exact Match (Prioritize)
            let found = classes.find(c => c.norm === normExcel);
            if (found) return found.id;

            // 2. Fuzzy Roman Numerals & Class Prefixes
            // Map "CLASS 1", "CLASS-I", "STANDARD 1" -> "STDI"
            let fuzzy = normExcel
                .replace(/^CLASS|^STANDARD|^STD/g, 'STD')
                .replace(/1$/g, 'I').replace(/2$/g, 'II').replace(/3$/g, 'III').replace(/4$/g, 'IV')
                .replace(/ONE$/g, 'I').replace(/TWO$/g, 'II').replace(/THREE$/g, 'III').replace(/FOUR$/g, 'IV')
                .replace(/KG1/g, 'KGI').replace(/KG2/g, 'KGII');

            found = classes.find(c => c.norm === fuzzy);
            if (found) return found.id;

            // 3. Longest Partial Match
            found = classes.find(c => normExcel.includes(c.norm) || c.norm.includes(normExcel));
            return found?.id;
        };

        const usedRollsInClass = new Set<string>();

        let processedValidSheet = false;
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;

            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (rawData.length === 0) continue;

            const headersRaw = (rawData[0] as any[]).map(h => (h || "").toString().replace(/\s+/g, ' ').trim()).filter(h => h !== "");
            const headersNorm = headersRaw.map(h => h.toUpperCase());
            const mandatoryNorm = MANDATORY_HEADERS.map(h => h.toUpperCase());

            const missing = mandatoryNorm.filter(h => !headersNorm.includes(h));
            const extra = headersNorm.filter(h => !mandatoryNorm.includes(h));

            // If this sheet doesn't even have the core headers, skip it (could be Sheet2/3)
            // But if it HAS headers but they are wrong (extra/missing), we should decide: skip or error?
            // Safer to skip sheets that don't look like our data at all.
            if (missing.length === mandatoryNorm.length) continue;

            // If it LOOKS like a student sheet but format is wrong, error out.
            if (missing.length > 0 || extra.length > 0) {
                return res.status(400).json({ message: "excel format is not supported" });
            }

            processedValidSheet = true;
            const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            if (!data || data.length === 0) continue;

            const usedRollsInSheet = new Set<string>();
            let lastValidClassId = "";
            let lastValidClassName = "";

            for (const [index, row] of (data as any[]).entries()) {
                const rowNum = index + 2;
                let studentName = "Unknown";
                try {
                    // 1. SCAN ENTIRE ROW FOR GRADE CHANGE (Handles Merged/Centered Headers)
                    // This is proactive: any cell that looks like a grade updates the state.
                    // IMPORTANT: We do NOT 'break' here because promotional sheets often have
                    // [Old Grade, New Grade]. We want the LAST grade found (the promoted one).
                    for (const key of Object.keys(row)) {
                        const cellVal = (row[key] || "").toString().trim();
                        if (cellVal && cellVal.length > 2 && cellVal.length < 25) {
                            const normCell = normalize(cellVal);
                            if (normCell === 'CLASS' || normCell === 'GRADE' || normCell === 'SL') continue;

                            const detectedId = getMappedClassId(cellVal);
                            if (detectedId) {
                                lastValidClassId = detectedId;
                                lastValidClassName = cellVal;
                                // No break - keep scanning to find the latest/promoted grade in the row
                            }
                        }
                    }

                    const classId = lastValidClassId;
                    const finalClassName = lastValidClassName;

                    // 2. EXTRACT STUDENT DATA (STRICT MAPPING)
                    studentName = (row['NAME'] || "").toString().trim();
                    let admissionNoRaw = (row['Admission Registration No.'] || "").toString().trim();

                    // SKIP HEADING/STRUCTURAL ROWS
                    if (!studentName || studentName.toUpperCase() === 'NAME' || !admissionNoRaw) {
                        continue;
                    }

                    if (!classId) {
                        throw new Error(`Grade not detected. System expects: Nursery, KG-I A, KG-I B, KG-II A, KG-II B, STD-I to IV.`);
                    }

                    let rollNumber = (row['Roll'] || "").toString().trim() || '0';
                    const banglarSikkhaId = (row['STUDENT ID IN BANGLAR SHIKSHA PORTAL'] || "").toString().trim();

                    let admissionNo = admissionNoRaw.toString().replace(/[^0-9]/g, '');
                    if (!admissionNo) throw new Error(`Admission No "${admissionNoRaw}" must contain digits.`);

                    let studentId = `S-${admissionNo}`;
                    const upperStudentId = studentId.toUpperCase();

                    if (existingStudentIds.has(upperStudentId)) {
                        results.skipped++;
                        continue;
                    }

                    const rollKey = `${classId}-${rollNumber}`;
                    if (usedRollsInSheet.has(rollKey)) {
                        if (existingStudentIds.has(upperStudentId)) {
                            results.skipped++;
                            continue;
                        }
                        throw new Error(`Roll #${rollNumber} duplicate in ${finalClassName}.`);
                    }

                    const cleanName = studentName.replace(/\s+/g, '').toLowerCase();
                    const transformedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                    const password = `${transformedName}@${admissionNo}`;

                    const guardianName = (row['GUARDIAN NAME'] || row['FATHER NAME'] || "").toString().trim();
                    const phone = (row['PHONE'] || row['MOBILE'] || "").toString().trim();
                    const address = (row['ADDRESS'] || "").toString().trim();
                    const dobRaw = (row['DOB'] || row['DATE OF BIRTH'] || "").toString().trim();

                    validStudents.push({
                        id: crypto.randomUUID(),
                        studentId,
                        password,
                        name: studentName,
                        rollNumber,
                        classId,
                        banglarSikkhaId: (banglarSikkhaId && banglarSikkhaId !== "0") ? banglarSikkhaId : null,
                        guardianName,
                        phone,
                        address,
                        dob: dobRaw ? new Date(dobRaw).toISOString().split('T')[0] : null
                    });

                    existingStudentIds.add(upperStudentId);
                    usedRollsInSheet.add(rollKey);
                } catch (err: any) {
                    results.failed++;
                    results.errors.push({
                        sheet: sheetName,
                        row: rowNum,
                        name: studentName,
                        message: `${err.message} (Detected as: ${lastValidClassName || "None"}, ID: ${lastValidClassId || "None"})`
                    });
                }
            }
        }

        if (!processedValidSheet) {
            return res.status(400).json({ message: "excel format is not supported" });
        }

        const HASH_BATCH_SIZE = 30; // Smaller batch for stability
        for (let i = 0; i < validStudents.length; i += HASH_BATCH_SIZE) {
            const batch = validStudents.slice(i, i + HASH_BATCH_SIZE);
            await Promise.all(batch.map(async (st) => {
                st.hashedPassword = await bcrypt.hash(st.password, 10);
            }));
        }

        if (validStudents.length > 0) {
            await client.query('BEGIN');
            try {
                const columns = '(id, "studentId", password, "plainPassword", name, "rollNumber", "classId", "banglarSikkhaId", "guardianName", "dob", "address", "phone")';
                const values: any[] = [];
                const placeholders: string[] = [];

                validStudents.forEach((st, idx) => {
                    const base = idx * 12;
                    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12})`);
                    values.push(
                        st.id, st.studentId, st.hashedPassword, st.password,
                        st.name, st.rollNumber, st.classId, st.banglarSikkhaId,
                        st.guardianName || null, st.dob || null, st.address || null, st.phone || null
                    );
                });

                const query = `INSERT INTO "Student" ${columns} VALUES ${placeholders.join(', ')}`;
                await client.query(query, values);

                // AUTOMATIC ATTENDANCE MARKING FOR BULK IMPORT (TODAY)
                try {
                    const todayDate = new Date().toLocaleDateString('en-CA');
                    const staffCheck = await client.query('SELECT id FROM "Admin" UNION SELECT id FROM "Teacher" LIMIT 1');
                    if (staffCheck.rows.length > 0) {
                        const markerId = staffCheck.rows[0].id;
                        const attendanceValues: any[] = [];
                        const attendancePlaceholders: string[] = [];

                        validStudents.forEach((st, idx) => {
                            const base = idx * 5;
                            attendancePlaceholders.push(`($${base + 1}, $${base + 2}, 'PRESENT', $${base + 3}, $${base + 4}, $${base + 5}, 'FULL DAY SESSION')`);
                            attendanceValues.push(crypto.randomUUID(), todayDate, st.id, markerId, st.classId);
                        });

                        const attQuery = `INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId", subject) VALUES ${attendancePlaceholders.join(', ')}`;
                        await client.query(attQuery, attendanceValues);
                    }
                } catch (autoAttErr) {
                    console.warn("Silent failure in bulk auto-attendance marking:", autoAttErr);
                }

                await client.query('COMMIT');
                broadcast('user:created', { count: validStudents.length });
                results.success = validStudents.length;
            } catch (dbError: any) {
                await client.query('ROLLBACK');
                throw dbError;
            }
        }

        res.json({
            message: `Import processed: ${results.success} added, ${results.skipped} skipped, ${results.failed} failed.`,
            ...results
        });
    } catch (error: any) {
        console.error('Bulk import error:', error);
        res.status(500).json({ message: 'Critical error during import', error: error.message });
    } finally {
        client.release();
    }
};

// Update user password
/**
 * Directly updates a user's password.
 * Supports both Student and Teacher tables via the 'type' parameter.
 */
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

        if (result.rowCount === 0 && type === 'teacher') {
            // Try updating Admin table
            const adminUpdateQuery = `
                UPDATE "Admin" 
                SET password = $1, "plainPassword" = $2 
                WHERE id = $3 AND designation IN ('PRINCIPAL', 'HEAD MISTRESS')
            `;
            const adminResult = await db.query(adminUpdateQuery, [hashedPassword, password, id]);
            if (adminResult.rowCount === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
        } else if (result.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
};

/**
 * Generates an Excel sheet containing student login IDs and passwords.
 * Useful for distribution when accounts are first created or reset.
 */
export const downloadStudentCredentials = async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.query;
        let query = `
            SELECT s."studentId", s.name, s."plainPassword", c.name as "className", s."rollNumber"
            FROM "Student" s
            JOIN "Class" c ON s."classId" = c.id
        `;
        const params = [];
        if (classId) {
            query += ` WHERE s."classId" = $1`;
            params.push(classId);
        }
        query += ` ORDER BY c.grade ASC, CAST(s."rollNumber" AS INTEGER) ASC`;

        const studentsRes = await db.query(query, params);

        const data = studentsRes.rows.map(row => ({
            'Class': row.className,
            'Roll Number': row.rollNumber,
            'Student Name': row.name,
            'Login ID': row.studentId,
            'Password': row.plainPassword
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Student Credentials");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=student_credentials.xlsx');
        res.send(buffer);

    } catch (error) {
        console.error('Error downloading credentials:', error);
        res.status(500).json({ message: 'Error downloading credentials' });
    }
};


