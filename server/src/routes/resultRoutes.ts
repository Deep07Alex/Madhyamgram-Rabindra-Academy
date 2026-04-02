/**
 * Result Routes
 * 
 * Defines endpoints for publishing and retrieving academic results.
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createResult, getResults, bulkUploadResults, getConsolidatedReport, deleteResult, deleteStudentResults, deleteClassResults, getClassRankings } from '../controllers/resultController.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticate);

router.post('/', authorize(['ADMIN']), createResult);
router.post('/bulk', authorize(['ADMIN', 'TEACHER']), upload.single('file'), bulkUploadResults);
router.get('/', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getResults);
router.get('/rankings', authorize(['ADMIN']), getClassRankings);
router.get('/report', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getConsolidatedReport);
router.get('/report/:studentId', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getConsolidatedReport);
router.delete('/student/:studentId', authorize(['ADMIN']), deleteStudentResults);
router.delete('/bulk/class/:classId', authorize(['ADMIN']), deleteClassResults);
router.delete('/:id', authorize(['ADMIN']), deleteResult);

export default router;
