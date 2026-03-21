/**
 * Result Routes
 * 
 * Defines endpoints for publishing and retrieving academic results.
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createResult, getResults } from '../controllers/resultController.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['ADMIN']), createResult);
router.get('/', authorize(['ADMIN', 'TEACHER', 'STUDENT']), getResults);

export default router;
