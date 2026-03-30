import { Router } from 'express';
import { db } from '../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all resources
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "Resource" ORDER BY "createdAt" DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ message: 'Error fetching resources' });
    }
});

// POST new resource (Admin only)
router.post('/', authenticate, authorize(['ADMIN']), upload.single('file'), async (req, res) => {
    const { title, category } = req.body;
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    const id = uuidv4();

    try {
        const result = await db.query(
            'INSERT INTO "Resource" (id, title, category, "fileUrl") VALUES ($1, $2, $3, $4) RETURNING *',
            [id, title, category || 'General', fileUrl]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating resource:', error);
        res.status(500).json({ message: 'Error creating resource' });
    }
});

// Update resource (Admin only)
router.patch('/:id', authenticate, authorize(['ADMIN']), upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { title, category } = req.body;
    
    try {
        const currentResult = await db.query('SELECT "fileUrl" FROM "Resource" WHERE id = $1', [id]);
        if (currentResult.rowCount === 0) return res.status(404).json({ message: 'Resource not found' });
        
        const fileUrl = req.file ? `/uploads/${req.file.filename}` : currentResult.rows[0].fileUrl;

        const result = await db.query(
            'UPDATE "Resource" SET title = $1, category = $2, "fileUrl" = $3 WHERE id = $4 RETURNING *',
            [title, category || 'General', fileUrl, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ message: 'Error updating resource' });
    }
});

// DELETE resource
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM "Resource" WHERE id = $1', [id]);
        res.json({ message: 'Resource removed successfully' });
    } catch (error) {
        console.error('Error deleting resource:', error);
        res.status(500).json({ message: 'Error deleting resource' });
    }
});

export default router;
