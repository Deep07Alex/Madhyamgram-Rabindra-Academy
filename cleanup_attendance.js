const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ user: 'postgres', database: 'Madhyamgram-Ravindra-Academy', port: 5432 });

async function run() {
    try {
        const res = await pool.query('SELECT * FROM "Attendance" ORDER BY "studentId", date DESC');
        fs.writeFileSync('attendance-dump.json', JSON.stringify(res.rows, null, 2), 'utf8');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
