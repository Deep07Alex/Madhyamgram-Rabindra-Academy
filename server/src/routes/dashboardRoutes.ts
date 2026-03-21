/**
 * Dashboard Routes
 * 
 * Provides summarized data bundles for the different dashboard user interfaces.
 */
import express from 'express';
import { getDashboardStats, getUnifiedDashboardData } from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticate, authorize(['ADMIN', 'TEACHER', 'STUDENT']), getDashboardStats);
router.get('/unified', authenticate, authorize(['TEACHER', 'STUDENT']), getUnifiedDashboardData);

export default router;
