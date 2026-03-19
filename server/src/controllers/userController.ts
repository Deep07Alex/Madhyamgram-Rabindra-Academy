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

// Bulk Import Students - Modernized Rebuild
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
        const classes = (classesRes.rows as any[]).map(c => ({ ...c, norm: normalize(c.name) })).sort((a,b) => b.name.length - a.name.length);
        const existingStudentIds = new Set(existingIdsRes.rows.map(r => r.studentId.toUpperCase()));
        
        const findValue = (row: any, aliases: string[]) => {
            const keys = Object.keys(row);
            const normalizedAliases = aliases.map(a => normalize(a));
            const foundKey = keys.find(key => normalizedAliases.includes(normalize(key)));
            return foundKey ? row[foundKey] : undefined;
        }
        const nameAliases = ['NAME', 'STUDENT NAME', 'FULL NAME', 'CANDIDATE NAME'];
        const idAliases = ['ADMISSION NO', 'ADMISSIONID', 'REGISTER NO', 'REGISTRATION NO', 'REG NO', 'ID', 'ADMISSION REGISTRATION NO.', 'RID', 'STUDENTID', 'SLNO'];
        const rollAliases = ['ROLL', 'ROLL NO', 'SL', 'SR NO', 'SL NO', 'SL_NO'];
        const classAliases = ['CLASS', 'GRADE', 'STANDARD', 'STD', 'SECTION'];
        const banglarAliases = ['BANGLAR SIKKHA ID', 'BANGLAR SHIKSHA ID', 'BANGLAR SHIKSHA', 'BS ID', 'PORTAL ID', 'STUDENT ID IN BANGLAR SHIKSHA PORTAL'];

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

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;
            const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            if (!data || data.length === 0) continue;

            const usedRollsInSheet = new Set<string>(); // ISOLATE SEEN ROLLS PER SHEET
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

                    // 2. EXTRACT STUDENT DATA
                    studentName = (findValue(row, nameAliases) || "").toString().trim();
                    let admissionNoRaw = (findValue(row, idAliases) || "").toString().trim();

                    // SKIP HEADING/STRUCTURAL ROWS
                    if (!studentName || studentName.toUpperCase() === 'NAME' || normalize(studentName) === 'STUDENTNAME' || !admissionNoRaw || admissionNoRaw === 'ID') {
                        continue; 
                    }

                    if (!classId) {
                        throw new Error(`Grade not detected. System expects: Nursery, KG-I A, KG-I B, KG-II A, KG-II B, STD-I to IV.`);
                    }

                    let rollNumber = (findValue(row, rollAliases) || "").toString().trim() || '0';
                    const banglarSikkhaId = (findValue(row, banglarAliases) || "").toString().trim();

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

                    validStudents.push({
                        id: crypto.randomUUID(),
                        studentId,
                        password,
                        name: studentName,
                        rollNumber,
                        classId,
                        banglarSikkhaId: (banglarSikkhaId && banglarSikkhaId !== "0") ? banglarSikkhaId : null
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


