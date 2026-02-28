import { db } from '../lib/db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const resetDatabase = async () => {
    try {
        console.log("Wiping existing users...");

        // Delete all data from user tables
        await db.query(`DELETE FROM "Student"`);
        await db.query(`DELETE FROM "Teacher"`);
        await db.query(`DELETE FROM "Admin"`);
        console.log("All students, teachers, and admins deleted successfully.");

        console.log("Creating new specific Admin...");
        const hashedPassword = await bcrypt.hash('Aritradutta@2005', 10);
        const id = crypto.randomUUID();

        await db.query(
            `INSERT INTO "Admin" (id, "adminId", username, password, name, email) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                id,
                '8100474669',
                'aritradatt',
                hashedPassword,
                'Aritra Dutta',
                'aritradatt39@gmail.com'
            ]
        );

        console.log('--- NEW ADMIN DETAILS ---');
        console.log('Name: Aritra Dutta');
        console.log('Username: aritradatt');
        console.log('AdminID: 8100474669');
        console.log('Password: Aritradutta@2005');
        console.log('Email: aritradatt39@gmail.com');
        console.log('-------------------------');

    } catch (error) {
        console.error("Error resetting database:", error);
    } finally {
        process.exit(0);
    }
};

resetDatabase();
