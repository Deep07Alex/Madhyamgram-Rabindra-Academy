import { db } from '../server/src/lib/db.js';

async function checkTable() {
    try {
        const res = await db.query("SELECT count(*) FROM information_schema.tables WHERE table_name = 'AcademicTerm'");
        console.log('Table count:', res.rows[0].count);
        
        if (res.rows[0].count === '0') {
            console.log('Table AcademicTerm does not exist. Attempting to create it...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS "AcademicTerm" (
                    "id" TEXT PRIMARY KEY,
                    "semester" TEXT NOT NULL,
                    "academicYear" INTEGER NOT NULL,
                    "startDate" DATE NOT NULL,
                    "endDate" DATE NOT NULL,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "academic_term_unique" UNIQUE ("semester", "academicYear")
                );
                CREATE INDEX IF NOT EXISTS "idx_academic_term_lookup" ON "AcademicTerm"("academicYear", "semester");
            `);
            console.log('Table created successfully.');
        } else {
            console.log('Table AcademicTerm already exists.');
        }
    } catch (err) {
        console.error('Error checking/creating table:', err);
    } finally {
        process.exit();
    }
}

checkTable();
