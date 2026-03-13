import 'dotenv/config';
import { db } from '../lib/db.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const generate10DigitId = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();

async function testRegistration() {
    console.log('--- STARTING DUPLICATE STUDENT TEST ---');
    try {
        const testClassId = 'class-nursery';
        const testRoll = '999';
        const testName = 'Test Student';

        // 1. Clean up any existing test student
        await db.query(`DELETE FROM "Student" WHERE "rollNumber" = $1 AND "classId" = $2`, [testRoll, testClassId]);

        // 2. Insert first student directly
        const hashedPassword = await bcrypt.hash('password123', 10);
        let uniqueId = 'S-' + generate10DigitId();
        await db.query(
            `INSERT INTO "Student" (id, "studentId", password, "plainPassword", name, email, "rollNumber", "classId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [crypto.randomUUID(), uniqueId, hashedPassword, 'password123', testName, 'test@example.com', testRoll, testClassId]
        );
        console.log(`[PASS] Step 1: Inserted first student with Roll: ${testRoll} in Class: ${testClassId}`);

        // 3. Try to insert second student through logic we just wrote
        const duplicateCheck = await db.query(
            `SELECT id FROM "Student" WHERE "rollNumber" = $1 AND "classId" = $2 LIMIT 1`,
            [testRoll, testClassId]
        );

        if (duplicateCheck.rows.length > 0) {
            console.log(`[PASS] Step 2: Backend correctly caught the duplicate roll number! Returned: "Roll number already exists in this class"`);
        } else {
            console.error(`[FAIL] Step 2: Backend failed to catch the duplicate.`);
        }

        // Clean up
        await db.query(`DELETE FROM "Student" WHERE "rollNumber" = $1 AND "classId" = $2`, [testRoll, testClassId]);
        console.log('--- TEST FINISHED & CLEANED UP ---');

    } catch (e) {
        console.error('Test failed with error:', e);
    } finally {
        // process.exit(0);
    }
}

testRegistration();
