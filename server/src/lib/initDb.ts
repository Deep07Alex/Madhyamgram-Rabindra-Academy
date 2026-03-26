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
        console.log('Initializing database tables and migrations...');

        await db.query(`
            -- 1. Enums
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN
                    CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');
                END IF;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubmissionStatus') THEN
                    CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');
                END IF;
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            -- 2. Core Tables
            
            -- Admin Table
            CREATE TABLE IF NOT EXISTS "Admin" (
                "id" TEXT PRIMARY KEY,
                "adminId" TEXT UNIQUE NOT NULL,
                "username" TEXT UNIQUE,
                "password" TEXT NOT NULL,
                "plainPassword" TEXT,
                "name" TEXT NOT NULL,
                "email" TEXT UNIQUE,
                "designation" TEXT,
                "phone" TEXT,
                "aadhar" TEXT,
                "photo" TEXT,
                "address" TEXT,
                "dob" DATE,
                "qualification" TEXT,
                "extraQualification" TEXT,
                "caste" TEXT,
                "joiningDate" DATE,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Teacher Table
            CREATE TABLE IF NOT EXISTS "Teacher" (
                "id" TEXT PRIMARY KEY,
                "password" TEXT,
                "name" TEXT NOT NULL,
                "email" TEXT UNIQUE,
                "teacherId" TEXT UNIQUE,
                "phone" TEXT,
                "aadhar" TEXT,
                "photo" TEXT,
                "address" TEXT,
                "dob" DATE,
                "qualification" TEXT,
                "extraQualification" TEXT,
                "designation" TEXT,
                "caste" TEXT,
                "joiningDate" DATE,
                "isTeaching" BOOLEAN DEFAULT TRUE,
                "plainPassword" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Class Table
            CREATE TABLE IF NOT EXISTS "Class" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT UNIQUE NOT NULL,
                "grade" INTEGER NOT NULL
            );

            -- _ClassToTeacher (Implicit M:N join table)
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
                "plainPassword" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "Student_banglarSikkhaId_unique" ON "Student"("banglarSikkhaId") WHERE ("banglarSikkhaId" IS NOT NULL);

            -- Attendance Table
            -- Note: teacherId is NOT constrained by FK to Teacher because it can be an Admin (Principal/HM)
            CREATE TABLE IF NOT EXISTS "Attendance" (
                "id" TEXT PRIMARY KEY,
                "date" DATE NOT NULL DEFAULT CURRENT_DATE,
                "status" "AttendanceStatus" NOT NULL,
                "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "teacherId" TEXT NOT NULL,
                "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "subject" TEXT
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_student_date_unique" ON "Attendance"("studentId", "date");

            -- TeacherAttendance Table
            -- Note: teacherId is NOT constrained by FK to Teacher because it can be an Admin (Principal/HM)
            CREATE TABLE IF NOT EXISTS "TeacherAttendance" (
                "id" TEXT PRIMARY KEY,
                "date" DATE NOT NULL DEFAULT CURRENT_DATE,
                "status" "AttendanceStatus" NOT NULL,
                "arrivalTime" TIME,
                "departureTime" TIME,
                "reason" TEXT,
                "earlyLeaveReason" TEXT,
                "teacherId" TEXT NOT NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAttendance_teacher_date_unique" ON "TeacherAttendance"("teacherId", "date");

            -- Homework Table
            CREATE TABLE IF NOT EXISTS "Homework" (
                "id" TEXT PRIMARY KEY,
                "title" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "subject" TEXT,
                "fileUrl" TEXT,
                "dueDate" TIMESTAMP(3),
                "teacherId" TEXT NOT NULL,
                "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "allowFileUpload" BOOLEAN DEFAULT TRUE,
                "isSubmissionRequired" BOOLEAN DEFAULT TRUE,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Ensure teacherId isn't strictly bound to Teacher table (Allow Admins)
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Homework_teacherId_fkey') THEN
                    ALTER TABLE "Homework" DROP CONSTRAINT "Homework_teacherId_fkey";
                END IF;
            END $$;

            -- Submission Table
            CREATE TABLE IF NOT EXISTS "Submission" (
                "id" TEXT PRIMARY KEY,
                "content" TEXT,
                "fileUrl" TEXT,
                "feedback" TEXT,
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
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "result_unique_entry" UNIQUE ("studentId", "subject", "semester", "academicYear")
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
                "expiresAt" TIMESTAMP(3),
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Monthly Fee Table
            CREATE TABLE IF NOT EXISTS "MonthlyFee" (
                "id" TEXT PRIMARY KEY,
                "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
                "date" DATE NOT NULL,
                "month" TEXT NOT NULL,
                "academicYear" INTEGER NOT NULL DEFAULT 2025,
                "fee" NUMERIC(10,2) NOT NULL DEFAULT 0,
                "fine" NUMERIC(10,2) NOT NULL DEFAULT 0,
                "others" NUMERIC(10,2) NOT NULL DEFAULT 0,
                "total" NUMERIC(10,2) NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Admission Fee Table
            CREATE TABLE IF NOT EXISTS "AdmissionFee" (
                "id" TEXT PRIMARY KEY,
                "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
                "date" DATE NOT NULL,
                "totalAdmissionFee" NUMERIC(10,2) NOT NULL DEFAULT 0,
                "amountPaid" NUMERIC(10,2) NOT NULL DEFAULT 0,
                "due" NUMERIC(10,2) NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- SystemConfig Table
            CREATE TABLE IF NOT EXISTS "SystemConfig" (
                "key" TEXT PRIMARY KEY,
                "value" TEXT NOT NULL,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Default System Data
            INSERT INTO "SystemConfig" ("key", "value") VALUES ('attendance_override', 'AUTO') ON CONFLICT ("key") DO NOTHING;

            INSERT INTO "Class" ("id", "name", "grade") VALUES
            ('class-nursery', 'Nursery', 0),
            ('class-kg-i', 'KG-I', 1),
            ('class-kg-ii-a', 'KG-II A', 2),
            ('class-kg-ii-b', 'KG-II B', 2),
            ('class-std-i', 'STD-I', 3),
            ('class-std-ii', 'STD-II', 4),
            ('class-std-iii', 'STD-III', 5),
            ('class-std-iv', 'STD-IV', 6)
            ON CONFLICT ("name") DO NOTHING;

            -- Default Admin (Initial setup)
            INSERT INTO "Admin" ("id", "adminId", "username", "password", "name", "email", "designation") 
            VALUES (
                'admin-aritra-uuid', 
                'A-8100474669', 
                'aritrada420', 
                '$2b$10$TZtbcOHow1SbhWx5azR2eOiMUpvUwylmmipL9wYmApi5d4IL/KuAi', 
                'Aritra Dutta', 
                'aritrada420@gmail.com',
                'DEVELOPER'
            ) ON CONFLICT ("adminId") DO NOTHING;

            -- 3. Essential Migrations (Alterations)
            
            -- Attendance Table: Relax teacherId dependency (Allow Admins)
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_teacherId_fkey') THEN
                    ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_teacherId_fkey";
                END IF;
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherAttendance_teacherId_fkey') THEN
                    ALTER TABLE "TeacherAttendance" DROP CONSTRAINT "TeacherAttendance_teacherId_fkey";
                END IF;
            END $$;

            -- Column Sync (Idempotent alterations)
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Homework' AND column_name='allowFileUpload') THEN
                    ALTER TABLE "Homework" ADD COLUMN "allowFileUpload" BOOLEAN DEFAULT TRUE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Submission' AND column_name='feedback') THEN
                    ALTER TABLE "Submission" ADD COLUMN "feedback" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Student' AND column_name='plainPassword') THEN
                    ALTER TABLE "Student" ADD COLUMN "plainPassword" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Admin' AND column_name='plainPassword') THEN
                    ALTER TABLE "Admin" ADD COLUMN "plainPassword" TEXT;
                END IF;
                
                -- Student Enhancements
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Student' AND column_name='guardianName') THEN
                    ALTER TABLE "Student" ADD COLUMN "guardianName" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Student' AND column_name='dob') THEN
                    ALTER TABLE "Student" ADD COLUMN "dob" DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Student' AND column_name='address') THEN
                    ALTER TABLE "Student" ADD COLUMN "address" TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Student' AND column_name='phone') THEN
                    ALTER TABLE "Student" ADD COLUMN "phone" TEXT;
                END IF;
            END $$;

            -- Leadership Role Migration (Teacher -> Admin)
            INSERT INTO "Admin" (
                id, "adminId", password, "plainPassword", name, email, 
                designation, phone, aadhar, photo, address, dob, 
                qualification, "extraQualification", caste, "joiningDate"
            )
            SELECT 
                id, "teacherId", password, "plainPassword", name, email, 
                designation, phone, aadhar, photo, address, dob, 
                qualification, "extraQualification", caste, "joiningDate"
            FROM "Teacher"
            WHERE designation IN ('PRINCIPAL', 'HEAD MISTRESS')
            ON CONFLICT ("adminId") DO UPDATE SET
                designation = EXCLUDED.designation,
                phone = EXCLUDED.phone,
                aadhar = EXCLUDED.aadhar,
                photo = EXCLUDED.photo,
                address = EXCLUDED.address,
                dob = EXCLUDED.dob,
                qualification = EXCLUDED.qualification,
                "extraQualification" = EXCLUDED."extraQualification",
                caste = EXCLUDED.caste,
                "joiningDate" = EXCLUDED."joiningDate";

            DELETE FROM "Teacher" WHERE designation IN ('PRINCIPAL', 'HEAD MISTRESS');

            -- 4. Performance Indexes
            CREATE INDEX IF NOT EXISTS "idx_student_class" ON "Student"("classId");
            CREATE INDEX IF NOT EXISTS "idx_student_rollNumber" ON "Student"("rollNumber");
            CREATE INDEX IF NOT EXISTS "idx_student_name" ON "Student"("name");
            CREATE INDEX IF NOT EXISTS "idx_student_id" ON "Student"("studentId");
            CREATE INDEX IF NOT EXISTS "idx_teacher_id" ON "Teacher"("teacherId");
            CREATE INDEX IF NOT EXISTS "idx_teacher_name" ON "Teacher"("name");
            CREATE INDEX IF NOT EXISTS "idx_attendance_date" ON "Attendance"("date");
            CREATE INDEX IF NOT EXISTS "idx_attendance_class" ON "Attendance"("classId");
            CREATE INDEX IF NOT EXISTS "idx_attendance_studentId" ON "Attendance"("studentId");
            CREATE INDEX IF NOT EXISTS "idx_attendance_date_student" ON "Attendance"("date", "studentId");
            CREATE INDEX IF NOT EXISTS "idx_result_student" ON "Result"("studentId");
            CREATE INDEX IF NOT EXISTS "idx_result_student_exam" ON "Result"("studentId", "semester");
            CREATE INDEX IF NOT EXISTS "idx_homework_class" ON "Homework"("classId");
            CREATE INDEX IF NOT EXISTS "idx_submission_status" ON "Submission"("status");
            CREATE INDEX IF NOT EXISTS "idx_notice_createdAt" ON "Notice"("createdAt");
        `);

        console.log('Database finalized and ready.');
    } catch (error) {
        console.error('Critical Database initialization failure:', error);
    }
};
