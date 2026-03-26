import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        await client.connect();
        const res = await client.query('SELECT DISTINCT subject FROM "Result"');
        console.log('Subjects in DB:', res.rows.map(r => r.subject));
        const evsCount = await client.query('SELECT COUNT(*) FROM "Result" WHERE subject LIKE \'%EVS%\'');
        console.log('EVS Count:', evsCount.rows[0].count);
    } finally {
        await client.end();
    }
}

check().catch(console.error);
