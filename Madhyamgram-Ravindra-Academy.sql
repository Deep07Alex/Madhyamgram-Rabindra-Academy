-- Madhyamgram Rabindra Academy - Universal Database Setup Script
-- Designed to run on any PostgreSQL instance without errors.

-- 1. Create ENUM Types (Safe Check)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN
        CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeeStatus') THEN
        CREATE TYPE "FeeStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubmissionStatus') THEN
        CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');
    END IF;
END $$;

-- 2. Create Tables (Safe Check)
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT PRIMARY KEY,
    "adminId" TEXT UNIQUE NOT NULL,
    "username" TEXT UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "Class" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL,
    "grade" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "Teacher" (
    "id" TEXT PRIMARY KEY,
    "teacherId" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

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
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "Attendance" (
    "id" TEXT PRIMARY KEY,
    "date" DATE DEFAULT CURRENT_DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "subject" TEXT
);

CREATE TABLE IF NOT EXISTS "TeacherAttendance" (
    "id" TEXT PRIMARY KEY,
    "date" DATE DEFAULT CURRENT_DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Fee" (
    "id" TEXT PRIMARY KEY,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "FeeStatus" DEFAULT 'PENDING' NOT NULL,
    "type" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "remark" TEXT
);

CREATE TABLE IF NOT EXISTS "Homework" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subject" TEXT,
    "fileUrl" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "Submission" (
    "id" TEXT PRIMARY KEY,
    "content" TEXT,
    "fileUrl" TEXT,
    "status" "SubmissionStatus" DEFAULT 'PENDING' NOT NULL,
    "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "homeworkId" TEXT NOT NULL REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "Result" (
    "id" TEXT PRIMARY KEY,
    "semester" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "grade" TEXT,
    "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "Gallery" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

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

CREATE TABLE IF NOT EXISTS "_ClassToTeacher" (
    "A" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "B" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Create Indexes (Safe Check)
CREATE UNIQUE INDEX IF NOT EXISTS "_ClassToTeacher_AB_unique" ON "_ClassToTeacher"("A", "B");
CREATE INDEX IF NOT EXISTS "_ClassToTeacher_B_index" ON "_ClassToTeacher"("B");
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_student_date_unique" ON "Attendance"("studentId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAttendance_teacher_date_unique" ON "TeacherAttendance"("teacherId", "date");

-- 4. Initial Seed Data (Safe Injection)
INSERT INTO "Admin" (id, "adminId", username, password, name, email, "createdAt", "updatedAt") 
VALUES ('28bf7bb7-9fe1-45a5-9352-eec9bdf00d24', '8100474669', 'aritrada420', '$2b$10$Z7qqcHuHmteO3ZRQ3rtrg.rCfkVbNRs1PK5KqxAg3bdtuETa8IwhC', 'Aritra Dutta', 'aritradatt39@gmail.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

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
