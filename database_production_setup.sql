-- Madhyamgram Rabindra Academy - Consolidated Production Database Setup Script
-- This script is idempotent and can be run multiple times without errors.

-- 1. Create ENUM Types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN
        CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubmissionStatus') THEN
        CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Tables

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

-- Class Table
CREATE TABLE IF NOT EXISTS "Class" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL,
    "grade" INTEGER NOT NULL
);

-- Teacher Table (Includes Non-Teaching Staff fields)
CREATE TABLE IF NOT EXISTS "Teacher" (
    "id" TEXT PRIMARY KEY,
    "teacherId" TEXT UNIQUE,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE,
    "phone" TEXT,
    "aadhar" TEXT,
    "designation" TEXT,
    "joiningDate" DATE,
    "isTeaching" BOOLEAN DEFAULT TRUE,
    "plainPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Student Table
CREATE TABLE IF NOT EXISTS "Student" (
    "id" TEXT PRIMARY KEY,
    "studentId" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "plainPassword" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE,
    "rollNumber" TEXT NOT NULL,
    "banglarSikkhaId" TEXT,
    "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS "Attendance" (
    "id" TEXT PRIMARY KEY,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "status" "AttendanceStatus" NOT NULL,
    "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "subject" TEXT
);

-- TeacherAttendance Table
CREATE TABLE IF NOT EXISTS "TeacherAttendance" (
    "id" TEXT PRIMARY KEY,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "status" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);


-- Homework Table
CREATE TABLE IF NOT EXISTS "Homework" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subject" TEXT,
    "fileUrl" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "allowFileUpload" BOOLEAN NOT NULL DEFAULT FALSE,
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
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- _ClassToTeacher Relation Table
CREATE TABLE IF NOT EXISTS "_ClassToTeacher" (
    "A" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "B" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Create Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "_ClassToTeacher_AB_unique" ON "_ClassToTeacher"("A", "B");
CREATE INDEX IF NOT EXISTS "_ClassToTeacher_B_index" ON "_ClassToTeacher"("B");
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_student_date_unique" ON "Attendance"("studentId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAttendance_teacher_date_unique" ON "TeacherAttendance"("teacherId", "date");

-- Performance Indexes for Production
CREATE INDEX IF NOT EXISTS "idx_student_class" ON "Student"("classId");
CREATE INDEX IF NOT EXISTS "idx_attendance_date" ON "Attendance"("date");
CREATE INDEX IF NOT EXISTS "idx_homework_class" ON "Homework"("classId");
CREATE INDEX IF NOT EXISTS "idx_notice_expires" ON "Notice"("expiresAt");
CREATE INDEX IF NOT EXISTS "idx_result_student" ON "Result"("studentId");

-- 4. Initial Seed Data

-- Admin
INSERT INTO "Admin" (id, "adminId", username, password, name, email, "createdAt", "updatedAt") 
VALUES ('28bf7bb7-9fe1-45a5-9352-eec9bdf00d24', '8100474669', 'aritrada420', '$2b$10$Z7qqcHuHmteO3ZRQ3rtrg.rCfkVbNRs1PK5KqxAg3bdtuETa8IwhC', 'Aritra Dutta', 'aritradatt39@gmail.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Classes
INSERT INTO "Class" (id, name, grade) VALUES 
('class-nursery', 'Nursery', 0),
('class-kg1', 'KG-I', 1),
('class-kg2-a', 'KG-II A', 2),
('class-kg2-b', 'KG-II B', 3),
('class-1', 'STD-I', 4),
('class-2', 'STD-II', 5),
('class-3', 'STD-III', 6),
('class-4', 'STD-IV', 7)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, grade = EXCLUDED.grade;
