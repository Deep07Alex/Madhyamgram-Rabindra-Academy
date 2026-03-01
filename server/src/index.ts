import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import homeworkRoutes from './routes/homeworkRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { db } from './lib/db.js';
import { initDb } from './lib/initDb.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --- Server-Sent Events (SSE) endpoint ---
import { addClient, removeClient } from './lib/sseManager.js';

app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Register client
    addClient(res);

    // Send initial ping to confirm connection
    res.write('event: connected\ndata: {"message":"SSE connected"}\n\n');

    // Keep alive every 25s
    const heartbeat = setInterval(() => {
        try {
            res.write(':ping\n\n');
        } catch {
            clearInterval(heartbeat);
        }
    }, 25000);

    // Cleanup when client disconnects
    req.on('close', () => {
        clearInterval(heartbeat);
        removeClient(res);
    });
});

app.get('/', (req, res) => {
    res.send('Madhyamgram Rabindra Academy API is running');
});

// Initialize database then Start the server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
