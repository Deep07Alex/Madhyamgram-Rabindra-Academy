import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    markStudentAttendance,
    getStudentAttendance,
    markTeacherAttendance,
    getTeacherAttendance,
    updateStudentAttendance,
    updateTeacherAttendance
} from '../controllers/attendanceController.js';

const router = Router();

// Protect all routes
router.use(authenticate);

// Student Attendance routes
router.post('/student', authorize(['TEACHER']), markStudentAttendance);
router.get('/student', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getStudentAttendance);
router.patch('/admin/student/:id', authorize(['ADMIN']), updateStudentAttendance);

// Teacher Attendance routes
router.post('/teacher', authorize(['TEACHER']), markTeacherAttendance);
router.get('/teacher', authorize(['ADMIN', 'TEACHER']), getTeacherAttendance);
router.patch('/admin/teacher/:id', authorize(['ADMIN']), updateTeacherAttendance);

export default router;
