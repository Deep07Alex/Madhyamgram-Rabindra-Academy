const fs = require('fs');
const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', database: 'Madhyamgram-Ravindra-Academy', port: 5432 });

async function run() {
    try {
        const res = await pool.query('SELECT * FROM "Attendance" ORDER BY date DESC');
        fs.writeFileSync('db_rows.json', JSON.stringify(res.rows, null, 2), 'utf8');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
