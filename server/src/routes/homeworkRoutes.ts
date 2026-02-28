import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
    createHomework,
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

// Submission routes
router.post('/submit', authorize(['STUDENT']), upload.single('file'), submitHomework);
router.get('/submissions', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getSubmissions);
router.patch('/submissions/:id/grade', authorize(['TEACHER', 'ADMIN']), gradeSubmission);

export default router;
