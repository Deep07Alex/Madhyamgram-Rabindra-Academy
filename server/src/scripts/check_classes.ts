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

async function check() {
    try {
        const res = await pool.query('SELECT * FROM "Class"');
        console.log(JSON.stringify(res.rows, null, 2));
        await pool.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
