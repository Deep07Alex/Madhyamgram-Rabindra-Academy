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

async function replaceClasses() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Note: grade is arbitrary but used for sorting in getClasses
        const newClasses = [
            { id: 'class-nursery', name: 'Nursery', grade: 0 },
            { id: 'class-kg1', name: 'KG-I', grade: 1 },
            { id: 'class-kg2-a', name: 'KG-II A', grade: 2 },
            { id: 'class-kg2-b', name: 'KG-II B', grade: 3 },
            { id: 'class-1', name: 'STD-I', grade: 4 },
            { id: 'class-2', name: 'STD-II', grade: 5 },
            { id: 'class-3', name: 'STD-III', grade: 6 },
            { id: 'class-4', name: 'STD-IV', grade: 7 },
        ];

        console.log('Starting class replacement migration...');

        for (const cls of newClasses) {
            // Upsert the new classes
            await client.query(`
                INSERT INTO "Class" (id, name, grade)
                VALUES ($1, $2, $3)
                ON CONFLICT (id) DO UPDATE SET name = $2, grade = $3
            `, [cls.id, cls.name, cls.grade]);
            console.log(`Ensured class: ${cls.name}`);
        }

        // Map any students from old classes that might exist in the database.
        // The most recently used classes were STD-I, STD-II, etc., and before that they were class-1, etc.
        // We will map STD-I to Class 1, etc., just in case.
        const mapping = [
            // From old "Nursery" -> "Nursery" (already handled by ID match)
            // From old "KG-I" -> "KG1" (already handled by ID match class-kg1)
            // From old "KG-II" -> "KG2" (already handled by ID match class-kg2)
            { old: 'class-std1', new: 'class-1' },
            { old: 'class-std2', new: 'class-2' },
            { old: 'class-std3', new: 'class-3' },
            { old: 'class-std4', new: 'class-4' },
            // Just in case there are really old ones like old class-5
            { old: 'class-5', new: 'class-4' },
            { old: 'class-6', new: 'class-4' },
            { old: 'class-7', new: 'class-4' },
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

        // Delete any class not in our new list
        const validIds = newClasses.map(c => c.id);
        const placeholders = validIds.map((_, i) => '$' + (i + 1)).join(',');
        
        console.log(`Deleting all other classes except: ${validIds.join(', ')}`);
        const delRes = await client.query(`DELETE FROM "Class" WHERE id NOT IN (${placeholders})`, validIds);
        console.log(`Deleted ${delRes.rowCount} old classes.`);

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

replaceClasses();
