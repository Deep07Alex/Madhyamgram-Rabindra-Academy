import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createFee, createFeesForClass, recordPayment, getFees } from '../controllers/feeController.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['ADMIN']), createFee);
router.post('/batch', authorize(['ADMIN']), createFeesForClass);
router.patch('/:id/pay', authorize(['ADMIN']), recordPayment);
router.get('/', authorize(['ADMIN', 'STUDENT']), getFees);

export default router;
