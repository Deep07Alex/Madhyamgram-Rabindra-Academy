/**
 * Attendance Routes
 * 
 * Defines endpoints for tracking student and teacher presence.
 * Access is strictly role-based (Admin/Teacher for marking, Student for viewing).
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    markStudentAttendance,
    getStudentAttendance,
    markTeacherAttendance,
    getTeacherAttendance,
    updateStudentAttendance,
    updateTeacherAttendance,
    getAttendanceConfig,
    updateAttendanceConfig,
    bulkMarkStudentAbsent,
    getStudentStatsSummary
} from '../controllers/attendanceController.js';

const router = Router();

// Protect all routes
router.use(authenticate);

// Student Attendance routes
router.post('/student', authorize(['ADMIN', 'TEACHER']), markStudentAttendance);
router.post('/bulk-absent', authorize(['ADMIN']), bulkMarkStudentAbsent);
router.get('/student', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getStudentAttendance);
router.get('/stats/students', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getStudentStatsSummary);
router.patch('/admin/student/:id', authorize(['ADMIN']), updateStudentAttendance);

// Teacher Attendance routes
router.post('/teacher', authorize(['ADMIN', 'TEACHER']), markTeacherAttendance);
router.get('/teacher', authorize(['ADMIN', 'TEACHER']), getTeacherAttendance);
router.patch('/admin/teacher/:id', authorize(['ADMIN']), updateTeacherAttendance);

// Attendance Configuration
router.get('/config', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getAttendanceConfig);
router.patch('/config', authorize(['ADMIN']), updateAttendanceConfig);

export default router;
