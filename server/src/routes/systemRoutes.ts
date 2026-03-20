import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import { authenticate, authorize } from '../middleware/auth.js';
import { db } from '../lib/db.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/system');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `festival-banner-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|avif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed (jpeg, jpg, png, webp, avif)'));
    }
});

// Update Festival Banner
router.post('/festival-banner', authenticate, authorize(['ADMIN']), upload.single('banner'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    try {
        const optimizedFilename = `opt-${req.file.filename.split('.')[0]}.webp`;
        const optimizedPath = path.join(req.file.destination, optimizedFilename);
        
        await sharp(req.file.path)
            .resize(1200, 800, { fit: 'inside', withoutEnlargement: true }) // Standard banner size
            .webp({ quality: 85 })
            .toFile(optimizedPath);
            
        // Delete original file
        fs.unlinkSync(req.file.path);
        
        const relativePath = `/uploads/system/${optimizedFilename}`;
        
        // Update DB
        await db.query(
            'INSERT INTO "SystemConfig" (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, "updatedAt" = CURRENT_TIMESTAMP',
            ['festival_banner_url', relativePath]
        );
        
        res.json({ url: relativePath });
    } catch (error) {
        console.error('Sharp/DB error:', error);
        res.status(500).json({ message: 'Error processing banner upload' });
    }
});

// Get Festival Banner
router.get('/festival-banner', async (req, res) => {
    try {
        const result = await db.query('SELECT value FROM "SystemConfig" WHERE key = $1', ['festival_banner_url']);
        const url = result.rows.length > 0 ? result.rows[0].value : '/dol.png'; // Default fallback
        res.json({ url });
    } catch (error) {
        console.error('Error fetching banner:', error);
        res.status(500).json({ message: 'Error fetching banner' });
    }
});

export default router;
