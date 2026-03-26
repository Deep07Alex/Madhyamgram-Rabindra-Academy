/**
 * Homework Routes
 * 
 * Defines endpoints for assigning homework and managing student submissions and grading.
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
    createHomework,
    updateHomework,
    deleteHomework,
    getHomeworks,
    submitHomework,
    getSubmissions,
    gradeSubmission
} from '../controllers/homeworkController.js';

const router = Router();

router.use(authenticate);

// Homework routes
router.post('/', authorize(['TEACHER', 'ADMIN']), upload.single('file'), createHomework);
router.get('/', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getHomeworks);
router.patch('/:id', authorize(['TEACHER', 'ADMIN']), upload.single('file'), updateHomework);
router.delete('/:id', authorize(['TEACHER', 'ADMIN']), deleteHomework);

// Submission routes
router.post('/submit', authorize(['STUDENT']), upload.single('file'), submitHomework);
router.get('/submissions', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getSubmissions);
router.get('/:id/submissions', authorize(['ADMIN', 'TEACHER']), getSubmissions);  // teacher view by homework ID
router.patch('/submissions/:id/grade', authorize(['TEACHER', 'ADMIN']), gradeSubmission);

export default router;
