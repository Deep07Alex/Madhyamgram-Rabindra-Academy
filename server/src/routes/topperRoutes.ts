import { Router } from 'express';
import { db } from '../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { v4 as uuidv4 } from 'uuid';
import { broadcast } from '../lib/sseManager.js';

const router = Router();

// GET all toppers
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "Topper" ORDER BY "order" ASC, "createdAt" DESC');
        // Group by session if needed, but for now just return all
        // The frontend expects { students: [], session: "" }
        const session = result.rows.length > 0 ? result.rows[0].session : '2025-26';
        res.json({ students: result.rows, session });
    } catch (error) {
        console.error('Error fetching toppers:', error);
        res.status(500).json({ message: 'Error fetching toppers' });
    }
});

// POST new topper (Admin only)
router.post('/', authenticate, authorize(['ADMIN']), upload.single('photo'), async (req, res) => {
    const { name, class: className, rank, gender, session } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;
    const id = uuidv4();

    try {
        const result = await db.query(
            'INSERT INTO "Topper" (id, name, class, rank, gender, photo, session) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [id, name, className, rank, gender, photo, session]
        );
        const record = result.rows[0];
        broadcast('toppers:updated', { action: 'created', id: record.id });
        res.status(201).json(record);
    } catch (error) {
        console.error('Error creating topper:', error);
        res.status(500).json({ message: 'Error creating topper' });
    }
});

// Update topper (Admin only)
router.patch('/:id', authenticate, authorize(['ADMIN']), upload.single('photo'), async (req, res) => {
    const { id } = req.params;
    const { name, class: className, rank, gender, session } = req.body;
    
    try {
        // Fetch current to keep photo if not replaced
        const currentResult = await db.query('SELECT photo FROM "Topper" WHERE id = $1', [id]);
        if (currentResult.rowCount === 0) return res.status(404).json({ message: 'Topper not found' });
        
        const photo = req.file ? `/uploads/${req.file.filename}` : currentResult.rows[0].photo;

        const result = await db.query(
            `UPDATE "Topper" 
             SET name = $1, class = $2, rank = $3, gender = $4, photo = $5, session = $6 
             WHERE id = $7 RETURNING *`,
            [name, className, rank, gender, photo, session, id]
        );
        const record = result.rows[0];
        broadcast('toppers:updated', { action: 'updated', id: record.id });
        res.json(record);
    } catch (error) {
        console.error('Error updating topper:', error);
        res.status(500).json({ message: 'Error updating topper' });
    }
});

// DELETE topper
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM "Topper" WHERE id = $1', [id]);
        broadcast('toppers:updated', { action: 'deleted', id });
        res.json({ message: 'Topper removed successfully' });
    } catch (error) {
        console.error('Error deleting topper:', error);
        res.status(500).json({ message: 'Error deleting topper' });
    }
});

export default router;
