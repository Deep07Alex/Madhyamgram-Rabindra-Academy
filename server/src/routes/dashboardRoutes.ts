import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticate, authorize(['ADMIN', 'TEACHER', 'STUDENT']), getDashboardStats);

export default router;
