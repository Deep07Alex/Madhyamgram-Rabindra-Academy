import { PrismaClient, AttendanceStatus, SubmissionStatus, FeeStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import util from 'util';

const prisma = new PrismaClient();

async function main() {
    try {
        const adminPassword = await bcrypt.hash('admin123', 10);
        const teacherPassword = await bcrypt.hash('teacher123', 10);
        const studentPassword = await bcrypt.hash('student123', 10);

        console.log('--- Starting Simplified Seeding (7 Classes) ---');

        // Clear existing data
        await prisma.gallery.deleteMany();
        await prisma.result.deleteMany();
        await prisma.fee.deleteMany();
        await prisma.submission.deleteMany();
        await prisma.homework.deleteMany();
        await prisma.attendance.deleteMany();
        await prisma.class.deleteMany();
        await prisma.student.deleteMany();
        await prisma.teacher.deleteMany();
        await prisma.admin.deleteMany();

        console.log('✔ Database cleared');

        // 1. Create Admin
        const admin = await prisma.admin.create({
            data: {
                username: 'admin',
                password: adminPassword,
                name: 'System Admin',
                email: 'admin@academy.com',
            },
        });
        console.log('✔ Admin created: admin/admin123');

        // 2. Create Classes (Exactly 1-7)
        const classes = [];
        for (let i = 1; i <= 7; i++) {
            const cls = await prisma.class.create({
                data: {
                    name: `Class ${i}`,
                    grade: i,
                },
            });
            classes.push(cls);
        }
        console.log('✔ 7 Classes created');

        const class5 = classes.find(c => c.name === 'Class 5')!;
        const class6 = classes.find(c => c.name === 'Class 6')!;

        // 3. Create Teachers
        const teachersData = [
            { username: 'teacher1', name: 'John Smith', email: 'teacher1@academy.com', teacherId: 'T1001' },
            { username: 'teacher2', name: 'Sarah Wilson', email: 'teacher2@academy.com', teacherId: 'T1002' },
            { username: 'teacher3', name: 'Robert Brown', email: 'teacher3@academy.com', teacherId: 'T1003' }
        ];

        const teacherRecords = [];
        for (const t of teachersData) {
            const record = await prisma.teacher.create({
                data: {
                    username: t.username,
                    password: teacherPassword,
                    name: t.name,
                    email: t.email,
                    teacherId: t.teacherId
                }
            });
            teacherRecords.push(record);
            console.log(`✔ Teacher created: ${t.username}/teacher123`);
        }

        // 4. Create Students
        const studentsData = [
            { username: 'student1', name: 'Aritra Dutta', email: 'student1@academy.com', roll: 'S2026-001', classId: class5.id },
            { username: 'student2', name: 'Rahul Sharma', email: 'student2@academy.com', roll: 'S2026-002', classId: class6.id },
            { username: 'student3', name: 'Priya Das', email: 'student3@academy.com', roll: 'S2026-003', classId: class5.id }
        ];

        const studentRecords = [];
        for (const s of studentsData) {
            const record = await prisma.student.create({
                data: {
                    username: s.username,
                    password: studentPassword,
                    name: s.name,
                    email: s.email,
                    rollNumber: s.roll,
                    classId: s.classId
                }
            });
            studentRecords.push(record);
            console.log(`✔ Student created: ${s.username}/student123`);
        }

        // 5. Create Homework
        const homework = await prisma.homework.create({
            data: {
                title: 'Mathematics Algebra Quiz',
                description: 'Solve equations 1 to 20 from Chapter 4.',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                teacherId: teacherRecords[0]!.id,
                classId: class5.id,
            }
        });
        console.log('✔ Homework created');

        // 6. Create Submissions
        await prisma.submission.create({
            data: {
                homeworkId: homework.id,
                studentId: studentRecords[0]!.id,
                content: 'I have completed the algebra quiz.',
                status: SubmissionStatus.SUBMITTED
            }
        });
        console.log('✔ Homework submission created');

        // 7. Create Attendance Records
        for (const student of studentRecords) {
            await prisma.attendance.create({
                data: {
                    studentId: student.id,
                    teacherId: teacherRecords[0]!.id,
                    classId: student.classId,
                    status: AttendanceStatus.PRESENT,
                    subject: 'Mathematics'
                }
            });
        }
        console.log('✔ Attendance records created');

        // 8. Create Fee Records
        await prisma.fee.createMany({
            data: studentRecords.map(s => ({
                studentId: s.id,
                amount: 2500,
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                type: 'Monthly Tuition Fee',
                status: FeeStatus.PENDING
            }))
        });
        console.log('✔ Fee records created');

        // 9. Create Results
        await prisma.result.create({
            data: {
                studentId: studentRecords[0]!.id,
                semester: 'First Term',
                subject: 'Mathematics',
                marks: 85,
                totalMarks: 100,
                grade: 'A'
            }
        });
        console.log('✔ Result record created');

        // 10. Gallery Items
        await prisma.gallery.create({
            data: {
                title: 'School Sports Day 2026',
                imageUrl: 'https://images.unsplash.com/photo-1544333346-64fa7eac6c3f',
                description: 'Annual sports day event highlights.'
            }
        });
        console.log('✔ Gallery item created');

        console.log('--- Seeding Completed Successfully ---');
    } catch (e) {
        console.error('Error during seeding:');
        console.error(util.inspect(e, { depth: null }));
        process.exit(1);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
