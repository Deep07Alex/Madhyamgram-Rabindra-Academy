import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function updateClasses() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const newClasses = [
            { id: 'class-nursery', name: 'Nursery', grade: 0 },
            { id: 'class-kg1', name: 'KG-I', grade: 1 },
            { id: 'class-kg2', name: 'KG-II', grade: 2 },
            { id: 'class-std1', name: 'STD-I', grade: 3 },
            { id: 'class-std2', name: 'STD-II', grade: 4 },
            { id: 'class-std3', name: 'STD-III', grade: 5 },
            { id: 'class-std4', name: 'STD-IV', grade: 6 },
        ];

        console.log('Starting class update migration...');

        for (const cls of newClasses) {
            // Upsert the new classes
            await client.query(`
                INSERT INTO "Class" (id, name, grade)
                VALUES ($1, $2, $3)
                ON CONFLICT (id) DO UPDATE SET name = $2, grade = $3
            `, [cls.id, cls.name, cls.grade]);
            console.log(`Ensured class: ${cls.name}`);
        }

        // Optional: Move students/teachers from old classes if they exist
        // This is a safety measure in case the user already has data
        const mapping = [
            { old: 'class-1', new: 'class-nursery' },
            { old: 'class-2', new: 'class-kg1' },
            { old: 'class-3', new: 'class-kg2' },
            { old: 'class-4', new: 'class-std1' },
            { old: 'class-5', new: 'class-std2' },
            { old: 'class-6', new: 'class-std3' },
            { old: 'class-7', new: 'class-std4' },
        ];

        for (const map of mapping) {
            // Update Students
            await client.query('UPDATE "Student" SET "classId" = $1 WHERE "classId" = $2', [map.new, map.old]);
            // Update Attendance
            await client.query('UPDATE "Attendance" SET "classId" = $1 WHERE "classId" = $2', [map.new, map.old]);
            // Update Homework
            await client.query('UPDATE "Homework" SET "classId" = $1 WHERE "classId" = $2', [map.new, map.old]);
            // Update ClassToTeacher
            await client.query('UPDATE "_ClassToTeacher" SET "A" = $1 WHERE "A" = $2', [map.new, map.old]);
        }

        // Clean up old classes that are no longer needed
        const oldClassIds = mapping.map(m => m.old);
        await client.query('DELETE FROM "Class" WHERE id = ANY($1)', [oldClassIds]);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

updateClasses();
