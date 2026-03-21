/**
 * Authentication Routes
 * 
 * Handles user entry points: login, registration, and profile retrieval.
 */
import { Router } from 'express';
import { login, register, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', register); // Admin only in production
router.get('/me', authenticate, getMe);

export default router;
