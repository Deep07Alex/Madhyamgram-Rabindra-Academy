/**
 * Database Initialization and Migrations
 * 
 * Responsibilities:
 * 1. Ensures all required tables and enums exist (DDL).
 * 2. Runs idempotent migrations to update schema over time.
 * 3. Initializes default system configurations.
 * 4. Creates performance indexes for common queries.
 */
import { db } from './db.js';

/**
 * Core initialization function called on server startup.
 */
export const initDb = async () => {
    try {
        console.log('Initializing database tables...');

        await db.query(`
            -- Enums
            DO $$ BEGIN
                CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            DO $$ BEGIN
                CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;


            -- Admin Table
            CREATE TABLE IF NOT EXISTS "Admin" (
                "id" TEXT PRIMARY KEY,
                "adminId" TEXT UNIQUE NOT NULL,
                "username" TEXT UNIQUE,
                "password" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "email" TEXT UNIQUE,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Teacher Table
            CREATE TABLE IF NOT EXISTS "Teacher" (
                "id" TEXT PRIMARY KEY,
                "password" TEXT, -- Nullable for non-teaching staff
                "name" TEXT NOT NULL,
                "email" TEXT UNIQUE,
                "teacherId" TEXT UNIQUE, -- Optional/Null for non-teaching staff
                "phone" TEXT,
                "aadhar" TEXT,
                "photo" TEXT, -- URL to uploaded photo
                "address" TEXT,
                "dob" DATE,
                "qualification" TEXT,
                "extraQualification" TEXT,
                "designation" TEXT,
                "caste" TEXT,
                "joiningDate" DATE,
                "isTeaching" BOOLEAN DEFAULT TRUE,
                "plainPassword" TEXT, -- Storing for admin visibility
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Add missing columns if they don't exist
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Teacher' AND column_name='photo') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "photo" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Teacher' AND column_name='address') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "address" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Teacher' AND column_name='dob') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "dob" DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Teacher' AND column_name='qualification') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "qualification" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Teacher' AND column_name='extraQualification') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "extraQualification" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Teacher' AND column_name='caste') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "caste" TEXT;
                END IF;
            END $$;

            -- Class Table
            CREATE TABLE IF NOT EXISTS "Class" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT UNIQUE NOT NULL,
                "grade" INTEGER NOT NULL
            );

            -- _ClassToTeacher (Implicit M:N join table from Prisma)
            CREATE TABLE IF NOT EXISTS "_ClassToTeacher" (
                "A" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "B" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "_ClassToTeacher_AB_unique" ON "_ClassToTeacher"("A", "B");
            CREATE INDEX IF NOT EXISTS "_ClassToTeacher_B_index" ON "_ClassToTeacher"("B");

            -- Student Table
            CREATE TABLE IF NOT EXISTS "Student" (
                "id" TEXT PRIMARY KEY,
                "studentId" TEXT UNIQUE NOT NULL,
                "password" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "email" TEXT UNIQUE,
                "rollNumber" TEXT NOT NULL,
                "banglarSikkhaId" TEXT,
                "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "photo" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Attendance Table (create with date stored as DATE for one-per-day)
            CREATE TABLE IF NOT EXISTS "Attendance" (
                "id" TEXT PRIMARY KEY,
                "date" DATE NOT NULL DEFAULT CURRENT_DATE,
                "status" "AttendanceStatus" NOT NULL,
                "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "subject" TEXT
            );
            -- One attendance record per student per day
            CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_student_date_unique" ON "Attendance"("studentId", "date");

            -- TeacherAttendance Table
            CREATE TABLE IF NOT EXISTS "TeacherAttendance" (
                "id" TEXT PRIMARY KEY,
                "date" DATE NOT NULL DEFAULT CURRENT_DATE,
                "status" "AttendanceStatus" NOT NULL,
                "arrivalTime" TIME,
                "departureTime" TIME,
                "reason" TEXT,
                "earlyLeaveReason" TEXT,
                "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            -- One attendance record per teacher per day
            CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAttendance_teacher_date_unique" ON "TeacherAttendance"("teacherId", "date");

            -- Homework Table
            CREATE TABLE IF NOT EXISTS "Homework" (
                "id" TEXT PRIMARY KEY,
                "title" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "subject" TEXT,
                "fileUrl" TEXT,
                "dueDate" TIMESTAMP(3) NOT NULL,
                "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Submission Table
            CREATE TABLE IF NOT EXISTS "Submission" (
                "id" TEXT PRIMARY KEY,
                "content" TEXT,
                "fileUrl" TEXT,
                "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
                "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "homeworkId" TEXT NOT NULL REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );


            -- Result Table
            CREATE TABLE IF NOT EXISTS "Result" (
                "id" TEXT PRIMARY KEY,
                "semester" TEXT NOT NULL,
                "subject" TEXT NOT NULL,
                "marks" DOUBLE PRECISION NOT NULL,
                "totalMarks" DOUBLE PRECISION NOT NULL,
                "academicYear" INTEGER NOT NULL DEFAULT 2025,
                "grade" TEXT,
                "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Gallery Table

            -- Gallery Table
            CREATE TABLE IF NOT EXISTS "Gallery" (
                "id" TEXT PRIMARY KEY,
                "title" TEXT NOT NULL,
                "imageUrl" TEXT NOT NULL,
                "description" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Notice Table
            CREATE TABLE IF NOT EXISTS "Notice" (
                "id" TEXT PRIMARY KEY,
                "title" TEXT NOT NULL,
                "content" TEXT NOT NULL,
                "type" TEXT NOT NULL CHECK ("type" IN ('PUBLIC', 'INTERNAL')),
                "targetAudience" TEXT DEFAULT 'ALL' CHECK ("targetAudience" IN ('ALL', 'TEACHER', 'STUDENT')),
                "targetClassId" TEXT REFERENCES "Class"("id") ON DELETE CASCADE,
                "targetStudentId" TEXT REFERENCES "Student"("id") ON DELETE CASCADE,
                "expiresAt" TIMESTAMP(3),
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- SystemConfig Table (for persistent settings)
            CREATE TABLE IF NOT EXISTS "SystemConfig" (
                "key" TEXT PRIMARY KEY,
                "value" TEXT NOT NULL,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Default configs
            INSERT INTO "SystemConfig" ("key", "value") VALUES ('attendance_override', 'AUTO')
            ON CONFLICT ("key") DO NOTHING;
        `);

        console.log('Database tables verified/initialized successfully.');

        // --- Migrations: run idempotently on every start ---
        // 1. Alter date columns from TIMESTAMP to DATE if not already DATE
        await db.query(`
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'Attendance' AND column_name = 'date' AND data_type = 'timestamp without time zone'
                ) THEN
                    -- Remove duplicates first (keep the one with lowest id for each student+day)
                    DELETE FROM "Attendance"
                    WHERE id NOT IN (
                        SELECT DISTINCT ON ("studentId", date::DATE) id
                        FROM "Attendance"
                        ORDER BY "studentId", date::DATE, id ASC
                    );
                    -- Alter column type
                    ALTER TABLE "Attendance" ALTER COLUMN date TYPE DATE USING date::DATE;
                END IF;
            END $$;
        `);

        await db.query(`
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'TeacherAttendance' AND column_name = 'date' AND data_type = 'timestamp without time zone'
                ) THEN
                    -- Remove duplicates first
                    DELETE FROM "TeacherAttendance"
                    WHERE id NOT IN (
                        SELECT DISTINCT ON ("teacherId", date::DATE) id
                        FROM "TeacherAttendance"
                        ORDER BY "teacherId", date::DATE, id ASC
                    );
                    -- Alter column type
                    ALTER TABLE "TeacherAttendance" ALTER COLUMN date TYPE DATE USING date::DATE;
                END IF;
            END $$;
        `);        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'Notice' AND column_name = 'expiresAt'
                ) THEN
                    ALTER TABLE "Notice" ADD COLUMN "expiresAt" TIMESTAMP(3);
                END IF;
            END $$;
        `);

        // 2. Add 'reason' and time columns to TeacherAttendance if they don't exist
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TeacherAttendance' AND column_name = 'reason') THEN
                    ALTER TABLE "TeacherAttendance" ADD COLUMN "reason" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TeacherAttendance' AND column_name = 'arrivalTime') THEN
                    ALTER TABLE "TeacherAttendance" ADD COLUMN "arrivalTime" TIME;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TeacherAttendance' AND column_name = 'departureTime') THEN
                    ALTER TABLE "TeacherAttendance" ADD COLUMN "departureTime" TIME;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TeacherAttendance' AND column_name = 'earlyLeaveReason') THEN
                    ALTER TABLE "TeacherAttendance" ADD COLUMN "earlyLeaveReason" TEXT;
                END IF;
            END $$;
        `);

        // 3. Add 'banglarSikkhaId' and 'photo' columns to Student if they don't exist
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'Student' AND column_name = 'banglarSikkhaId'
                ) THEN
                    ALTER TABLE "Student" ADD COLUMN "banglarSikkhaId" TEXT;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'Student' AND column_name = 'photo'
                ) THEN
                    ALTER TABLE "Student" ADD COLUMN "photo" TEXT;
                END IF;

                -- Add unique constraint if not exists
                IF NOT EXISTS (
                    SELECT 1 FROM pg_indexes 
                    WHERE tablename = 'Student' AND indexname = 'Student_banglarSikkhaId_unique'
                ) THEN
                    CREATE UNIQUE INDEX "Student_banglarSikkhaId_unique" ON "Student"("banglarSikkhaId") WHERE ("banglarSikkhaId" IS NOT NULL);
                END IF;
            END $$;
        `);

        // 4. Update Teacher Table Schema
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Teacher' AND column_name = 'phone') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "phone" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Teacher' AND column_name = 'aadhar') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "aadhar" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Teacher' AND column_name = 'designation') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "designation" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Teacher' AND column_name = 'joiningDate') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "joiningDate" DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Teacher' AND column_name = 'isTeaching') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "isTeaching" BOOLEAN DEFAULT TRUE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Teacher' AND column_name = 'plainPassword') THEN
                    ALTER TABLE "Teacher" ADD COLUMN "plainPassword" TEXT;
                END IF;
                
                -- Make password and teacherId nullable if they aren't already
                ALTER TABLE "Teacher" ALTER COLUMN "password" DROP NOT NULL;
                ALTER TABLE "Teacher" ALTER COLUMN "teacherId" DROP NOT NULL;
            END $$;
        `);

        // 5. Update Submission Table Schema
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Submission' AND column_name = 'feedback') THEN
                    ALTER TABLE "Submission" ADD COLUMN "feedback" TEXT;
                END IF;
            END $$;
        `);

        // 6. Update Result Table Schema (Academic Year & Unique Constraint)
        await db.query(`
            DO $$ BEGIN
                -- Add academicYear if missing
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Result' AND column_name = 'academicYear') THEN
                    ALTER TABLE "Result" ADD COLUMN "academicYear" INTEGER NOT NULL DEFAULT 2025;
                END IF;

                -- Add unique constraint if missing
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'result_unique_entry') THEN
                    ALTER TABLE "Result" ADD CONSTRAINT "result_unique_entry" UNIQUE ("studentId", "subject", "semester", "academicYear");
                END IF;
            END $$;
        `);

        // 6. Create unique and performance indexes if they don't exist
        await db.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_student_date_unique" ON "Attendance"("studentId", "date");
            CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAttendance_teacher_date_unique" ON "TeacherAttendance"("teacherId", "date");
            
            -- Performance Indexes for common lookups
            CREATE INDEX IF NOT EXISTS "idx_student_class" ON "Student"("classId");
            CREATE INDEX IF NOT EXISTS "idx_student_rollNumber" ON "Student"("rollNumber");
            CREATE INDEX IF NOT EXISTS "idx_student_name" ON "Student"("name");
            CREATE INDEX IF NOT EXISTS "idx_attendance_date" ON "Attendance"("date");
            CREATE INDEX IF NOT EXISTS "idx_attendance_class" ON "Attendance"("classId");
            CREATE INDEX IF NOT EXISTS "idx_teacher_phone" ON "Teacher"("phone");
            CREATE INDEX IF NOT EXISTS "idx_teacher_aadhar" ON "Teacher"("aadhar");
            CREATE INDEX IF NOT EXISTS "idx_teacher_name" ON "Teacher"("name");
            CREATE INDEX IF NOT EXISTS "idx_result_student" ON "Result"("studentId");
            CREATE INDEX IF NOT EXISTS "idx_homework_class" ON "Homework"("classId");
            CREATE INDEX IF NOT EXISTS "idx_homework_teacher" ON "Homework"("teacherId");
            CREATE INDEX IF NOT EXISTS "idx_submission_status" ON "Submission"("status");
            CREATE INDEX IF NOT EXISTS "idx_submission_homework" ON "Submission"("homeworkId");
            CREATE INDEX IF NOT EXISTS "idx_submission_student" ON "Submission"("studentId");
            CREATE INDEX IF NOT EXISTS "idx_notice_createdAt" ON "Notice"("createdAt");
            CREATE INDEX IF NOT EXISTS "idx_notice_audience" ON "Notice"("targetAudience");
            CREATE INDEX IF NOT EXISTS "idx_notice_type" ON "Notice"("type");
        `);

        console.log('Migrations applied successfully.');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};
