/**
 * Profile Photo Upload Routes
 * 
 * Manages photo uploads for students and teachers.
 * Automatically optimizes and standardizes images (400x400 WebP) upon upload.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.path.includes('student') ? 'students' : 'teachers';
        const dir = path.join(__dirname, `../../uploads/${type}`);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const type = req.path.includes('student') ? 'student' : 'teacher';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${type}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
    }
});

// Teacher Photo Upload
router.post('/teacher-photo', authenticate, authorize(['ADMIN', 'TEACHER']), upload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    try {
        const optimizedFilename = `opt-${req.file.filename.split('.')[0]}.webp`;
        const optimizedPath = path.join(req.file.destination, optimizedFilename);
        
        await sharp(req.file.path)
            .resize(400, 400, { fit: 'cover' })
            .webp({ quality: 80 })
            .toFile(optimizedPath);
            
        // Delete original file to save space
        fs.unlinkSync(req.file.path);
        
        const relativePath = `/uploads/teachers/${optimizedFilename}`;
        res.json({ url: relativePath });
    } catch (error) {
        console.error('Sharp error:', error);
        res.status(500).json({ message: 'Error processing image' });
    }
});

// Student Photo Upload
router.post('/student-photo', authenticate, authorize(['ADMIN', 'TEACHER']), upload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    try {
        const optimizedFilename = `opt-${req.file.filename.split('.')[0]}.webp`;
        const optimizedPath = path.join(req.file.destination, optimizedFilename);
        
        await sharp(req.file.path)
            .resize(400, 400, { fit: 'cover' })
            .webp({ quality: 80 })
            .toFile(optimizedPath);
            
        // Delete original file
        fs.unlinkSync(req.file.path);
        
        const relativePath = `/uploads/students/${optimizedFilename}`;
        res.json({ url: relativePath });
    } catch (error) {
        console.error('Sharp error:', error);
        res.status(500).json({ message: 'Error processing image' });
    }
});

export default router;
