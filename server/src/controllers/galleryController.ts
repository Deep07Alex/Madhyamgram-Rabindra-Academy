import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const uploadGalleryImage = async (req: Request, res: Response) => {
    try {
        const { title, description } = req.body;

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        } else {
            return res.status(400).json({ message: 'Image file is required' });
        }

        const galleryItem = await prisma.gallery.create({
            data: {
                title,
                description,
                imageUrl
            }
        });

        res.status(201).json(galleryItem);
    } catch (error) {
        res.status(500).json({ message: 'Error uploading image' });
    }
};

export const getGalleryImages = async (req: Request, res: Response) => {
    try {
        const images = await prisma.gallery.findMany({
            orderBy: { createdAt: 'desc' }
        });

        res.json(images);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching gallery images' });
    }
};

export const deleteGalleryImage = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.gallery.delete({ where: { id } });
        res.json({ message: 'Image deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting image' });
    }
}
