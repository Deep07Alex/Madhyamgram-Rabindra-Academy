import { db } from './db.js';

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

            DO $$ BEGIN
                CREATE TYPE "FeeStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL');
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
                "password" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "email" TEXT UNIQUE,
                "teacherId" TEXT UNIQUE NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

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
                "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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

            -- Fee Table
            CREATE TABLE IF NOT EXISTS "Fee" (
                "id" TEXT PRIMARY KEY,
                "amount" DOUBLE PRECISION NOT NULL,
                "dueDate" TIMESTAMP(3) NOT NULL,
                "paidAt" TIMESTAMP(3),
                "status" "FeeStatus" NOT NULL DEFAULT 'PENDING',
                "type" TEXT NOT NULL,
                "paymentMethod" TEXT,
                "transactionId" TEXT,
                "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "remark" TEXT
            );

            -- Result Table
            CREATE TABLE IF NOT EXISTS "Result" (
                "id" TEXT PRIMARY KEY,
                "semester" TEXT NOT NULL,
                "subject" TEXT NOT NULL,
                "marks" DOUBLE PRECISION NOT NULL,
                "totalMarks" DOUBLE PRECISION NOT NULL,
                "grade" TEXT,
                "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

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
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
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
        `);

        // 2. Create unique indexes if they don't exist
        await db.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_student_date_unique" ON "Attendance"("studentId", date);
            CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAttendance_teacher_date_unique" ON "TeacherAttendance"("teacherId", date);
        `);

        console.log('Migrations applied successfully.');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};
