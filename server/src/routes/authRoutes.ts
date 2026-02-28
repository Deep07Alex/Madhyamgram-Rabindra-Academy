import { Router } from 'express';
import { login, register } from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.post('/register', register); // Admin only in production

export default router;
