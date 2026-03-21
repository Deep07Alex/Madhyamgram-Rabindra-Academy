/**
 * Gallery Routes
 * 
 * Defines endpoints for uploading and managing school gallery images.
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadGalleryImage, getGalleryImages, deleteGalleryImage } from '../controllers/galleryController.js';

const router = Router();

// Public route
router.get('/', getGalleryImages);

// Protected routes (Admin only)
router.post('/', authenticate, authorize(['ADMIN']), upload.single('image'), uploadGalleryImage);
router.delete('/:id', authenticate, authorize(['ADMIN']), deleteGalleryImage);

export default router;
