import { Router } from 'express';
import { db } from '../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { v4 as uuidv4 } from 'uuid';
import { broadcast } from '../lib/sseManager.js';

const router = Router();

// GET all alumni photos
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "Alumni" ORDER BY "createdAt" DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching alumni photos:', error);
        res.status(500).json({ message: 'Error fetching alumni photos' });
    }
});

// POST new alumni photo (Admin only)
router.post('/', authenticate, authorize(['ADMIN']), upload.single('image'), async (req, res) => {
    const { batch, description, title } = req.body;
    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    const id = uuidv4();

    try {
        const result = await db.query(
            'INSERT INTO "Alumni" (id, batch, "imageUrl", description, title) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, batch, imageUrl, description, title || '']
        );
        const record = result.rows[0];
        broadcast('alumni:updated', { action: 'created', id: record.id });
        res.status(201).json(record);
    } catch (error) {
        console.error('Error creating alumni record:', error);
        res.status(500).json({ message: 'Error creating alumni record' });
    }
});

// Update alumni record (Admin only)
router.patch('/:id', authenticate, authorize(['ADMIN']), upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { batch, description, title } = req.body;
    
    try {
        const currentResult = await db.query('SELECT "imageUrl" FROM "Alumni" WHERE id = $1', [id]);
        if (currentResult.rowCount === 0) return res.status(404).json({ message: 'Alumni record not found' });
        
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : currentResult.rows[0].imageUrl;

        const result = await db.query(
            'UPDATE "Alumni" SET batch = $1, description = $2, "imageUrl" = $3, title = $4 WHERE id = $5 RETURNING *',
            [batch, description || null, imageUrl, title, id]
        );
        const record = result.rows[0];
        broadcast('alumni:updated', { action: 'updated', id: record.id });
        res.json(record);
    } catch (error) {
        console.error('Error updating alumni record:', error);
        res.status(500).json({ message: 'Error updating alumni record' });
    }
});

// DELETE alumni photo
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM "Alumni" WHERE id = $1', [id]);
        broadcast('alumni:updated', { action: 'deleted', id });
        res.json({ message: 'Alumni record removed successfully' });
    } catch (error) {
        console.error('Error deleting alumni record:', error);
        res.status(500).json({ message: 'Error deleting alumni record' });
    }
});

export default router;
