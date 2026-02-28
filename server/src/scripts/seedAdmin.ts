import { db } from '../lib/db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const seedAdmin = async () => {
    try {
        const adminRes = await db.query(`SELECT id FROM "Admin" LIMIT 1`);
        if (adminRes.rows.length === 0) {
            console.log('No admin found, creating default admin...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const id = crypto.randomUUID();
            await db.query(
                `INSERT INTO "Admin" (id, "adminId", username, password, name, email) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, 'ADM-001', 'admin', hashedPassword, 'Super Admin', 'admin@example.com']
            );
            console.log('Default Admin Created: Username: admin, Password: admin123');
        } else {
            console.log('Admin already exists.');
        }
    } catch (error) {
        console.error('Error seeding admin:', error);
    } finally {
        process.exit(0);
    }
};

seedAdmin();
