import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
    createHomework,
    deleteHomework,
    getHomeworks,
    submitHomework,
    getSubmissions,
    gradeSubmission
} from '../controllers/homeworkController.js';

const router = Router();

router.use(authenticate);

// Homework routes
router.post('/', authorize(['TEACHER']), upload.single('file'), createHomework);
router.get('/', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getHomeworks);
router.delete('/:id', authorize(['TEACHER', 'ADMIN']), deleteHomework);

// Submission routes
router.post('/submit', authorize(['STUDENT']), upload.single('file'), submitHomework);
router.get('/submissions', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getSubmissions);
router.get('/:id/submissions', authorize(['ADMIN', 'TEACHER']), getSubmissions);  // teacher view by homework ID
router.patch('/submissions/:id/grade', authorize(['TEACHER', 'ADMIN']), gradeSubmission);

export default router;
