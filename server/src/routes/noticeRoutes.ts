/**
 * Notice Routes
 * 
 * Defines endpoints for school-wide notices and announcements.
 * Supports public access for landing page visibility.
 */
import express from 'express';
import { createNotice, getNotices, deleteNotice } from '../controllers/noticeController.js';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth.js';

const router = express.Router();

// Allow unauthenticated access to GET /notices (for public notices on the landing page)
// In the controller, we check if `req.user` exists. If not, we return only PUBLIC notices.
router.get('/', optionalAuthenticate, getNotices);
// For authenticated users, `req.user` will be populated, yielding appropriate notices.

router.post('/', authenticate, authorize(['ADMIN']), createNotice);
router.delete('/:id', authenticate, authorize(['ADMIN']), deleteNotice);

export default router;
