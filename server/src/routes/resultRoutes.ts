/**
 * Result Routes
 * 
 * Defines endpoints for publishing and retrieving academic results.
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createResult, getResults, bulkUploadResults, getConsolidatedReport, deleteResult } from '../controllers/resultController.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticate);

router.post('/', authorize(['ADMIN']), createResult);
router.post('/bulk', authorize(['ADMIN', 'TEACHER']), upload.single('file'), bulkUploadResults);
router.get('/', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getResults);
router.get('/report/:studentId', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getConsolidatedReport);
router.delete('/:id', authorize(['ADMIN']), deleteResult);

export default router;
