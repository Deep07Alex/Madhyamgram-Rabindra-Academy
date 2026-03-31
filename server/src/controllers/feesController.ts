/**
 * Fees Controller
 *
 * Handles Monthly Fee and Admission Fee recording and reporting
 * for the admin panel.
 */
import { Request, Response } from 'express';
import { db } from '../lib/db.js';

// ─────────────────────────────────────────────
// MONTHLY FEES
// ─────────────────────────────────────────────

/** Record a new monthly fee payment */
export const recordMonthlyFee = async (req: Request, res: Response) => {
    const { studentId, date, month, academicYear, fee, fine, others } = req.body;

    if (!studentId || !month || !date) {
        return res.status(400).json({ message: 'Student ID, month, and date are required' });
    }

    const feeAmt = parseFloat(fee) || 0;
    const fineAmt = parseFloat(fine) || 0;
    const othersAmt = parseFloat(others) || 0;
    const total = feeAmt + fineAmt + othersAmt;

    try {
        // Resolve student UUID from their admission number (studentId like S-1042)
        let sid = (studentId as string).trim();
        if (!sid.toUpperCase().startsWith('S-')) sid = `S-${sid}`;

        const stuRes = await db.query(`SELECT id FROM "Student" WHERE "studentId" = $1 LIMIT 1`, [sid]);
        if (stuRes.rows.length === 0) {
            return res.status(404).json({ message: `No student found with ID ${studentId}` });
        }
        const stuUUID = stuRes.rows[0].id;
        const year = academicYear || new Date().getFullYear();

        // CHECK IF RECORD EXISTS FOR THIS STUDENT/MONTH/YEAR
        // We look for an exact month match or an overlap to prevent duplicates
        const existing = await db.query(
            `SELECT id FROM "MonthlyFee" WHERE "studentId" = $1 AND month = $2 AND "academicYear" = $3`,
            [stuUUID, month, year]
        );

        let result;
        if (existing.rows.length > 0) {
            // Update existing specific record
            result = await db.query(
                `UPDATE "MonthlyFee" 
                 SET date = $1, fee = $2, fine = $3, others = $4, total = $5, "createdAt" = CURRENT_TIMESTAMP
                 WHERE id = $6 RETURNING *`,
                [date, feeAmt, fineAmt, othersAmt, total, existing.rows[0].id]
            );
        } else {
            // INSERT NEW
            result = await db.query(
                `INSERT INTO "MonthlyFee"
                    (id, "studentId", date, month, "academicYear", fee, fine, others, total)
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [stuUUID, date, month, year, feeAmt, fineAmt, othersAmt, total]
            );
        }

        // CREATE OR UPDATE AUTO-NOTICE FOR STUDENT (Valid for 24 HOURS)
        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            // Use a unique title per student/month/year to avoid grouping notices incorrectly
            const noticeTitle = `Fee Cleared: ${month}`;

            const noticeContent = `Your fees for ${month} (${year}) has been recorded successfully. Total: ₹${total.toFixed(2)}. This notice will expire in 24 hours.`;

            await db.query(
                `INSERT INTO "Notice" 
                    (id, title, content, type, "targetAudience", "targetStudentId", "expiresAt")
                 VALUES (gen_random_uuid(), $1, $2, 'INTERNAL', 'STUDENT', $3, $4)`,
                [noticeTitle, noticeContent, stuUUID, expiresAt]
            );
        } catch (noticeErr) {
            console.error('Failed to create auto-notice:', noticeErr);
        }

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('recordMonthlyFee error:', error);
        res.status(500).json({ message: error.message || 'Failed to record monthly fee' });
    }
};

/** Get list of monthly fees – filterable by class/month/year */
export const getMonthlyFees = async (req: Request, res: Response) => {
    const { month, academicYear, classId, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    try {
        const conditions: string[] = [];
        const params: any[] = [];
        let pi = 1;

        if (month) { conditions.push(`mf.month LIKE '%' || $${pi++} || '%'`); params.push(month); }
        if (academicYear) { conditions.push(`mf."academicYear" = $${pi++}`); params.push(parseInt(academicYear as string)); }
        if (classId) { conditions.push(`s."classId" = $${pi++}`); params.push(classId); }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const rows = await db.query(
            `SELECT mf.*, s.name AS "studentName", s."studentId" AS "admissionNo",
                    s."rollNumber", c.name AS "className"
             FROM "MonthlyFee" mf
             JOIN "Student" s ON s.id = mf."studentId"
             JOIN "Class" c ON c.id = s."classId"
             ${where}
             ORDER BY mf."createdAt" DESC
             LIMIT $${pi} OFFSET $${pi + 1}`,
            [...params, parseInt(limit as string), offset]
        );

        const countRes = await db.query(
            `SELECT COUNT(*) FROM "MonthlyFee" mf
             JOIN "Student" s ON s.id = mf."studentId"
             ${where}`, params
        );

        res.json({ fees: rows.rows, total: parseInt(countRes.rows[0].count) });
    } catch (error) {
        console.error('getMonthlyFees error:', error);
        res.status(500).json({ message: 'Failed to fetch monthly fees' });
    }
};

/** End-of-month due report: students who don't have a payment for the given month */
export const getMonthlyDueReport = async (req: Request, res: Response) => {
    const { month, academicYear, classId } = req.query;

    if (!month || !academicYear) {
        return res.status(400).json({ message: 'month and academicYear are required' });
    }

    try {
        const conditions: string[] = [];
        const params: any[] = [month, parseInt(academicYear as string)];
        let pi = 3;

        if (classId) { conditions.push(`s."classId" = $${pi++}`); params.push(classId); }
        const classFilter = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

        const rows = await db.query(
            `SELECT s.id, s."studentId" AS "admissionNo", s.name, s."rollNumber",
                    c.name AS "className"
             FROM "Student" s
             JOIN "Class" c ON c.id = s."classId"
             WHERE s.id NOT IN (
                 SELECT "studentId" FROM "MonthlyFee"
                 WHERE month LIKE '%' || $1 || '%' AND "academicYear" = $2
             ) ${classFilter}
             ORDER BY c.name, s."rollNumber"`,
            params
        );

        res.json({ dues: rows.rows });
    } catch (error) {
        console.error('getMonthlyDueReport error:', error);
        res.status(500).json({ message: 'Failed to fetch monthly due report' });
    }
};

/** Delete a monthly fee record */
export const deleteMonthlyFee = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query(`DELETE FROM "MonthlyFee" WHERE id = $1`, [id]);
        res.json({ message: 'Fee record deleted successfully' });
    } catch (error) {
        console.error('deleteMonthlyFee error:', error);
        res.status(500).json({ message: 'Failed to delete fee record' });
    }
};

// ─────────────────────────────────────────────
// ADMISSION FEES
// ─────────────────────────────────────────────

/** Record or update an admission fee payment */
export const recordAdmissionFee = async (req: Request, res: Response) => {
    const { studentId, date, totalAdmissionFee, amountPaid } = req.body;

    if (!studentId || !date || totalAdmissionFee === undefined) {
        return res.status(400).json({ message: 'Student ID, date, and total admission fee are required' });
    }

    const total = parseFloat(totalAdmissionFee) || 0;
    const paid = parseFloat(amountPaid) || 0;
    const due = total - paid;

    try {
        let sid = (studentId as string).trim();
        if (!sid.toUpperCase().startsWith('S-')) sid = `S-${sid}`;

        const stuRes = await db.query(`SELECT id FROM "Student" WHERE "studentId" = $1 LIMIT 1`, [sid]);
        if (stuRes.rows.length === 0) {
            return res.status(404).json({ message: `No student found with ID ${studentId}` });
        }
        const stuUUID = stuRes.rows[0].id;

        // CHECK IF RECORD EXISTS
        const existing = await db.query(`SELECT id FROM "AdmissionFee" WHERE "studentId" = $1 LIMIT 1`, [stuUUID]);

        let result;
        if (existing.rows.length > 0) {
            // OVERWRITE
            result = await db.query(
                `UPDATE "AdmissionFee"
                 SET date = $1, "totalAdmissionFee" = $2, "amountPaid" = $3, due = $4, "createdAt" = CURRENT_TIMESTAMP
                 WHERE id = $5 RETURNING *`,
                [date, total, paid, due, existing.rows[0].id]
            );
        } else {
            // INSERT
            result = await db.query(
                `INSERT INTO "AdmissionFee" (id, "studentId", date, "totalAdmissionFee", "amountPaid", due)
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
                 RETURNING *`,
                [stuUUID, date, total, paid, due]
            );
        }

        // CREATE OR UPDATE AUTO-NOTICE FOR STUDENT (Valid for 24 HOURS)
        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            const noticeTitle = `Admission Fee Update`;

            // Check if a notice already exists
            const existingNotice = await db.query(
                `SELECT id FROM "Notice" 
                 WHERE "targetStudentId" = $1 AND title = $2 AND type = 'INTERNAL' LIMIT 1`,
                [stuUUID, noticeTitle]
            );

            if (existingNotice.rows.length > 0) {
                // Update
                await db.query(
                    `UPDATE "Notice" 
                     SET content = $1, "expiresAt" = $2, "createdAt" = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [
                        `Your admission fee record has been updated on ${date}. Paid: ₹${paid.toFixed(2)}, Remaining Due: ₹${due.toFixed(2)}.`,
                        expiresAt,
                        existingNotice.rows[0].id
                    ]
                );
            } else {
                // Insert
                await db.query(
                    `INSERT INTO "Notice" 
                        (id, title, content, type, "targetAudience", "targetStudentId", "expiresAt")
                     VALUES (gen_random_uuid(), $1, $2, 'INTERNAL', 'STUDENT', $3, $4)`,
                    [
                        noticeTitle,
                        `Your admission fee record has been updated on ${date}. Paid: ₹${paid.toFixed(2)}, Remaining Due: ₹${due.toFixed(2)}.`,
                        stuUUID,
                        expiresAt
                    ]
                );
            }
        } catch (noticeErr) {
            console.error('Failed to update/create admission notice:', noticeErr);
        }

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('recordAdmissionFee error:', error);
        res.status(500).json({ message: 'Failed to record admission fee' });
    }
};

/** Get all admission fee records with student info */
export const getAdmissionFees = async (req: Request, res: Response) => {
    const { classId, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    try {
        const params: any[] = [];
        let classFilter = '';
        if (classId) { classFilter = `WHERE s."classId" = $1`; params.push(classId); }

        const rows = await db.query(
            `SELECT af.*, s.name AS "studentName", s."studentId" AS "admissionNo",
                    s."rollNumber", c.name AS "className"
             FROM "AdmissionFee" af
             JOIN "Student" s ON s.id = af."studentId"
             JOIN "Class" c ON c.id = s."classId"
             ${classFilter}
             ORDER BY af."createdAt" DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, parseInt(limit as string), offset]
        );

        res.json({ fees: rows.rows });
    } catch (error) {
        console.error('getAdmissionFees error:', error);
        res.status(500).json({ message: 'Failed to fetch admission fees' });
    }
};

/** Get all students with outstanding admission fee dues */
export const getAdmissionDueReport = async (req: Request, res: Response) => {
    const { classId } = req.query;

    try {
        const params: any[] = [];
        let classFilter = '';
        if (classId) { classFilter = `AND s."classId" = $1`; params.push(classId); }

        const rows = await db.query(
            `SELECT s."studentId" AS "admissionNo", s.name, s."rollNumber",
                    c.name AS "className",
                    SUM(af."totalAdmissionFee") AS "totalFee",
                    SUM(af."amountPaid") AS "totalPaid",
                    SUM(af.due) AS "totalDue"
             FROM "AdmissionFee" af
             JOIN "Student" s ON s.id = af."studentId"
             JOIN "Class" c ON c.id = s."classId"
             WHERE af.due > 0 ${classFilter}
             GROUP BY s.id, s."studentId", s.name, s."rollNumber", c.name
             ORDER BY c.name, s."rollNumber"`,
            params
        );

        res.json({ dues: rows.rows });
    } catch (error) {
        console.error('getAdmissionDueReport error:', error);
        res.status(500).json({ message: 'Failed to fetch admission due report' });
    }
};

/** Delete an admission fee record */
export const deleteAdmissionFee = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await db.query(`DELETE FROM "AdmissionFee" WHERE id = $1`, [id]);
        res.json({ message: 'Admission fee record deleted successfully' });
    } catch (error) {
        console.error('deleteAdmissionFee error:', error);
        res.status(500).json({ message: 'Failed to delete admission fee record' });
    }
};

/** Lookup student by admission ID for auto-fill */
export const lookupStudent = async (req: Request, res: Response) => {
    const raw = req.params.studentId as string;
    let studentId = raw.trim();
    if (!studentId.toUpperCase().startsWith('S-')) studentId = `S-${studentId}`;

    try {
        const result = await db.query(
            `SELECT s."studentId", s.name, s."rollNumber", s.photo,
                    c.name AS "className", c.id AS "classId"
             FROM "Student" s
             JOIN "Class" c ON c.id = s."classId"
             WHERE s."studentId" = $1 LIMIT 1`,
            [studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('lookupStudent error:', error);
        res.status(500).json({ message: 'Lookup failed' });
    }
};

/** Live search students by admission ID or name for dropdowns, or list by classId */
export const searchStudents = async (req: Request, res: Response) => {
    const { q, classId } = req.query;

    try {
        if (classId) {
            // Fetch all students for a specific class - ordered by roll number
            const result = await db.query(
                `SELECT s.id, s."studentId", s.name, s."rollNumber",
                        c.name AS "className", c.id AS "classId"
                 FROM "Student" s
                 JOIN "Class" c ON c.id = s."classId"
                 WHERE s."classId" = $1
                 ORDER BY s."rollNumber" ASC, s.name ASC`,
                [classId]
            );
            return res.json(result.rows);
        }

        if (!q || (q as string).trim().length < 2) return res.json([]);

        const queryStr = `%${(q as string).trim().toUpperCase()}%`;
        const result = await db.query(
            `SELECT s.id, s."studentId", s.name, s."rollNumber",
                    c.name AS "className", c.id AS "classId"
             FROM "Student" s
             JOIN "Class" c ON c.id = s."classId"
             WHERE UPPER(s."studentId") LIKE $1 OR UPPER(s.name) LIKE $1
             ORDER BY s.name ASC
             LIMIT 8`,
            [queryStr]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('searchStudents error:', error);
        res.status(500).json({ message: 'Search failed' });
    }
};
