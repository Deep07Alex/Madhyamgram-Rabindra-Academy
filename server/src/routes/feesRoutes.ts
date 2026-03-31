/**
 * Fees Routes
 * All routes under /api/fees — admin only.
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    recordMonthlyFee,
    getMonthlyFees,
    getMonthlyDueReport,
    recordAdmissionFee,
    getAdmissionFees,
    getAdmissionDueReport,
    lookupStudent,
    searchStudents,
    deleteMonthlyFee,
    deleteAdmissionFee,
    getMyFees
} from '../controllers/feesController.js';

const router = Router();
router.use(authenticate);

// Student retrieves their own data
router.get('/my-account', authorize(['STUDENT']), getMyFees);

// Admin-only operations
router.use(authorize(['ADMIN']));

// Student lookup (for auto-fill)
router.get('/lookup/:studentId', lookupStudent);
router.get('/search', searchStudents);

// Monthly Fees
router.post('/monthly', recordMonthlyFee);
router.get('/monthly', getMonthlyFees);
router.get('/monthly/dues', getMonthlyDueReport);
router.delete('/monthly/:id', deleteMonthlyFee);

// Admission Fees
router.post('/admission', recordAdmissionFee);
router.get('/admission', getAdmissionFees);
router.get('/admission/dues', getAdmissionDueReport);
router.delete('/admission/:id', deleteAdmissionFee);

export default router;
