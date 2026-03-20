import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query(`SELECT id FROM "Student" LIMIT 1`);
    if (res.rows.length === 0) return console.log('No student found');
    const studentId = res.rows[0].id;
    
    console.log('Testing dashboard query for student:', studentId);
    const q = `
                    SELECT h.title, h.id, 
                    COALESCE(sub.data, '[]'::json) as submissions
                    FROM "Homework" h
                    JOIN "Student" s ON h."classId" = s."classId"
                    LEFT JOIN LATERAL (
                        SELECT json_agg(json_build_object('id', id, 'status', status)) as data
                        FROM "Submission"
                        WHERE "homeworkId" = h.id AND "studentId" = s.id
                    ) sub ON true
                    WHERE s.id = $1
                    ORDER BY h."createdAt" DESC
    `;
    const data = await pool.query(q, [studentId]);
    console.log(JSON.stringify(data.rows, null, 2));
  } catch(e) { console.error(e); }
  finally { pool.end(); }
}
run();
