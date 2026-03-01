import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        const res = await pool.query('SELECT name, "studentId", "plainPassword" FROM "Student"');
        console.log(JSON.stringify(res.rows, null, 2));

        const res2 = await pool.query('SELECT name, "teacherId", "plainPassword" FROM "Teacher"');
        console.log(JSON.stringify(res2.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
