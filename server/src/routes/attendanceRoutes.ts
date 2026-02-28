import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { markStudentAttendance, getStudentAttendance, markTeacherAttendance, getTeacherAttendance } from '../controllers/attendanceController.js';

const router = Router();

// Protect all routes
router.use(authenticate);

// Student Attendance routes
router.post('/student', authorize(['TEACHER']), markStudentAttendance);
router.get('/student', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getStudentAttendance);

// Teacher Attendance routes
router.post('/teacher', authorize(['TEACHER']), markTeacherAttendance);
router.get('/teacher', authorize(['ADMIN', 'TEACHER']), getTeacherAttendance);

export default router;
