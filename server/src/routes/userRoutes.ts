import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getStudents, getTeachers, getClasses, createClass, deleteStudent, deleteTeacher, deleteClass, updateUserPassword, assignTeacherToClass, removeTeacherFromClass } from '../controllers/userController.js';

const router = Router();

// Protect all routes
router.use(authenticate);

// Admin-only routes for modifications
router.post('/classes', authorize(['ADMIN']), createClass);
router.delete('/students/:id', authorize(['ADMIN']), deleteStudent);
router.delete('/teachers/:id', authorize(['ADMIN']), deleteTeacher);
router.delete('/classes/:id', authorize(['ADMIN']), deleteClass);
router.patch('/:id/password', authorize(['ADMIN']), updateUserPassword);

// Class-Teacher Assignments
router.post('/classes/:id/teachers', authorize(['ADMIN']), assignTeacherToClass);
router.delete('/classes/:id/teachers/:teacherId', authorize(['ADMIN']), removeTeacherFromClass);

// Read routes available to ADMIN and TEACHER
router.get('/students', authorize(['ADMIN', 'TEACHER']), getStudents);
router.get('/teachers', authorize(['ADMIN', 'TEACHER']), getTeachers);
router.get('/classes', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getClasses);

export default router;
