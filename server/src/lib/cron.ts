/**
 * Cron Job Manager
 * 
 * Handles scheduled background tasks such as daily attendance resets
 * and automatic cleanup of expired notices.
 */
import cron from 'node-cron';
import { db } from './db.js';
import crypto from 'crypto';

/**
 * Initializes all system-wide cron jobs.
 */
export const initCronJobs = () => {
    // 1. Daily Attendance Marking Job (Midnight)
    // Runs at 00:00 every day
    cron.schedule('0 0 0 * * *', async () => {
        console.log('Running Midnight Auto-Attendance Job...');

        try {
            // Check system configuration
            const configRes = await db.query('SELECT value FROM "SystemConfig" WHERE key = $1', ['attendance_override']);
            const mode = configRes.rows.length > 0 ? configRes.rows[0].value : 'AUTO';

            if (mode !== 'AUTO') {
                console.log(`Auto-attendance skipped. System mode is: ${mode}`);
                return;
            }

            const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

            // Get a valid teacher ID to act as the "marker" (System Marker)
            const teacherRes = await db.query('SELECT id FROM "Teacher" LIMIT 1');
            if (teacherRes.rows.length === 0) {
                console.warn('Auto-attendance skipped: No teachers found in database to act as marker.');
                return;
            }
            const markerId = teacherRes.rows[0].id;

            console.log(`Marking all students as PRESENT for ${todayStr}...`);

            await db.query(`
                INSERT INTO "Attendance" (id, date, status, "studentId", "teacherId", "classId", subject)
                SELECT 
                    gen_random_uuid(), 
                    $1::date, 
                    'PRESENT', 
                    s.id, 
                    $2, 
                    s."classId",
                    'FULL DAY SESSION'
                FROM "Student" s
                WHERE NOT EXISTS (
                    SELECT 1 FROM "Attendance" a 
                    WHERE a."studentId" = s.id AND a.date::date = $1::date
                )
            `, [todayStr, markerId]);

            // 2. Cleanup Logic (Optional/Extended)
            // We no longer delete attendance records every 30 days because users need to see long-term history.
            // Old cleanup was causing "Absent" records to disappear, making students appear "Present" again.
            console.log('Attendance cleanup skipped to preserve history.');

            console.log('Midnight Auto-Attendance Job COMPLETED.');
        } catch (error) {
            console.error('Error in Midnight Auto-Attendance Job:', error);
        }
    });

    // 3. Hourly Notice Cleanup Case
    cron.schedule('0 * * * *', async () => {
        console.log('Running Hourly Notice Cleanup Job...');
        try {
            const res = await db.query('DELETE FROM "Notice" WHERE "expiresAt" < CURRENT_TIMESTAMP');
            if (res.rowCount && res.rowCount > 0) {
                console.log(`Cleanup: Deleted ${res.rowCount} expired notices.`);
            }
        } catch (error) {
            console.error('Error in Notice Cleanup Job:', error);
        }
    });

    console.log('Attendance Cron Jobs Initialized (Midnight Daily).');
    console.log('Notice Cleanup Cron Initialized (Hourly).');
};