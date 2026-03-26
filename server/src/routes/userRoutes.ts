/**
 * User Management Routes
 * 
 * Central hub for managing Student, Teacher, and Class entities.
 * Includes utilities for bulk imports and password resets.
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getStudents, getTeachers, getClasses, createClass, deleteStudent, deleteTeacher, deleteClass, updateUserPassword, updateStudent, updateTeacher, assignTeacherToClass, removeTeacherFromClass, bulkStudentImport, deleteAllStudents, enrollStudent, downloadStudentCredentials } from '../controllers/userController.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Protect all routes
router.use(authenticate);

// Admin-only routes for modifications
router.post('/classes', authorize(['ADMIN']), createClass);
router.post('/students/enroll', authorize(['ADMIN']), enrollStudent);
router.delete('/students/all', authorize(['ADMIN']), deleteAllStudents);
router.delete('/students/:id', authorize(['ADMIN']), deleteStudent);
router.patch('/students/:id', authorize(['ADMIN']), updateStudent);
router.delete('/teachers/:id', authorize(['ADMIN']), deleteTeacher);
router.patch('/teachers/:id', authorize(['ADMIN']), updateTeacher);
router.delete('/classes/:id', authorize(['ADMIN']), deleteClass);
router.patch('/:id/password', authorize(['ADMIN']), updateUserPassword);
router.post('/students/bulk', authorize(['ADMIN']), upload.single('file'), bulkStudentImport);
router.get('/students/download-credentials', authorize(['ADMIN']), downloadStudentCredentials);

// Class-Teacher Assignments
router.post('/classes/:id/teachers', authorize(['ADMIN']), assignTeacherToClass);
router.delete('/classes/:id/teachers/:teacherId', authorize(['ADMIN']), removeTeacherFromClass);

// Read routes available to ADMIN and TEACHER
router.get('/students', authorize(['ADMIN', 'TEACHER']), getStudents);
router.get('/teachers', authorize(['ADMIN', 'TEACHER']), getTeachers);
router.get('/classes', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getClasses);

export default router;
