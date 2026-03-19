import cron from 'node-cron';
import { db } from './db.js';
import crypto from 'crypto';

export const initCronJobs = () => {
    // Schedule a task to run every day at 6:00 AM
    // Seconds Minute Hour DayOfMonth Month DayOfWeek
    cron.schedule('0 0 6 * * *', async () => {
        console.log('Running Daily Attendance Marking Job at 6:00 AM...');
        
        try {
            const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

                // Marking students as PRESENT by default using a single bulk insert for high performance
            console.log('Marking students as PRESENT by default...');

            await db.query(`
                INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId")
                SELECT 
                    gen_random_uuid(), 
                    $1::date, 
                    'PRESENT', 
                    s.id, 
                    (SELECT id FROM "Teacher" LIMIT 1), 
                    s."classId"
                FROM "Student" s
                WHERE NOT EXISTS (
                    SELECT 1 FROM "Attendance" a 
                    WHERE a."studentId" = s.id AND a.date::date = $1::date
                )
            `, [todayStr]);

            console.log('Daily Attendance Marking Job COMPLETED.');
        } catch (error) {
            console.error('Error in Daily Attendance Marking Job:', error);
        }
    });

    console.log('Attendance Cron Jobs Initialized (6:00 AM Daily).');
};
