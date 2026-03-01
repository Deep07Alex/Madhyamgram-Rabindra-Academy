-- Allow email to be NULL for all user types (empty email treated as NULL to avoid unique constraint collision)
ALTER TABLE "Student" ALTER COLUMN email DROP NOT NULL;
ALTER TABLE "Teacher" ALTER COLUMN email DROP NOT NULL;
ALTER TABLE "Admin"   ALTER COLUMN email DROP NOT NULL;
