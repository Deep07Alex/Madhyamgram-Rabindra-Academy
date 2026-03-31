/**
 * Gallery Controller
 * 
 * Manages the school image gallery, including uploads and metadata management.
 */
import { Request, Response } from 'express';
import { db } from '../lib/db.js';
import crypto from 'crypto';

/**
 * Uploads a new image to the gallery with an optional title and description.
 */
export const uploadGalleryImage = async (req: Request, res: Response) => {
    try {
        const { title, description } = req.body;

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        } else {
            return res.status(400).json({ message: 'Image file is required' });
        }

        const id = crypto.randomUUID();
        const galleryRes = await db.query(
            `INSERT INTO "Gallery" (id, title, description, "imageUrl") 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, title, description || null, imageUrl]
        );

        broadcast('gallery:updated', { action: 'created', id });
        res.status(201).json(galleryRes.rows[0]);
    } catch (error) {
        console.error('uploadGalleryImage error:', error);
        res.status(500).json({ message: 'Error uploading image' });
    }
};

/**
 * Retrieves all images in the gallery, sorted by most recent.
 */
export const getGalleryImages = async (req: Request, res: Response) => {
    try {
        const imagesRes = await db.query(`SELECT * FROM "Gallery" ORDER BY "createdAt" DESC`);
        res.json(imagesRes.rows);
    } catch (error) {
        console.error('getGalleryImages error:', error);
        res.status(500).json({ message: 'Error fetching gallery images' });
    }
};

/**
 * Updates a gallery image's metadata or file.
 */
export const updateGalleryImage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;

        const currentResult = await db.query('SELECT "imageUrl" FROM "Gallery" WHERE id = $1', [id]);
        if (currentResult.rowCount === 0) return res.status(404).json({ message: 'Gallery image not found' });
        
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : currentResult.rows[0].imageUrl;

        const updateRes = await db.query(
            `UPDATE "Gallery" SET title = $1, description = $2, "imageUrl" = $3 WHERE id = $4 RETURNING *`,
            [title, description || null, imageUrl, id]
        );

        broadcast('gallery:updated', { action: 'updated', id });
        res.json(updateRes.rows[0]);
    } catch (error) {
        console.error('Error updating gallery:', error);
        res.status(500).json({ message: 'Error updating gallery' });
    }
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { broadcast } from '../lib/sseManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Deletes an image from the gallery database and physical storage.
 */
export const deleteGalleryImage = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        
        // 1. Get the image URL first
        const imageRes = await db.query(`SELECT "imageUrl" FROM "Gallery" WHERE id = $1`, [id]);
        if (imageRes.rows.length === 0) return res.status(404).json({ message: 'Image not found' });
        
        const imageUrl = imageRes.rows[0].imageUrl;
        
        // 2. Delete from DB
        await db.query(`DELETE FROM "Gallery" WHERE id = $1`, [id]);
        
        // 3. Delete physical file
        if (imageUrl) {
            const fileName = imageUrl.replace('/uploads/', '');
            const filePath = path.join(__dirname, '../../uploads', fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        broadcast('gallery:updated', { id, action: 'deleted' });
        res.json({ message: 'Image and file deleted successfully' });
    } catch (error) {
        console.error('deleteGalleryImage error:', error);
        res.status(500).json({ message: 'Error deleting image' });
    }
}
