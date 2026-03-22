import express from 'express';
import morgan from 'morgan';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import homeworkRoutes from './routes/homeworkRoutes.js';

import resultRoutes from './routes/resultRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import { db } from './lib/db.js';
import { initDb } from './lib/initDb.js';
import { initCronJobs } from './lib/cron.js';
import { addClient, removeClient } from './lib/sseManager.js';
import jwt from 'jsonwebtoken';
import { initSocket } from './lib/socket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Environment Validation
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'];
REQUIRED_ENV.forEach(key => {
    if (!process.env[key]) {
        console.error(`CRITICAL: Missing environment variable ${key}`);
        process.exit(1);
    }
});

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads');
const teacherUploadDir = path.join(__dirname, '../uploads/teachers');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(teacherUploadDir)) fs.mkdirSync(teacherUploadDir, { recursive: true });

// 1. Logging and Performance
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check (Professional monitoring)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'UP', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
    });
});

// 2. Security Middleware
const isProd = process.env.NODE_ENV === 'production';
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "*"],
            connectSrc: ["'self'", "*"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
}));

// 3. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 1000 : 5000, // Stricter in prod
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}

// 4. CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || !isProd) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Serve static files with aggressive caching for institutional assets
app.use('/uploads', express.static(uploadDir, {
    maxAge: '30d', // Cache user photos for 30 days
    etag: true,
    lastModified: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/homework', homeworkRoutes);

app.use('/api/results', resultRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/system', systemRoutes);

// SSE
app.get('/api/events', (req, res) => {
    const token = req.query.token as string;
    let userId: string | undefined;
    let role: string | undefined;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key') as any;
            userId = decoded.id;
            role = decoded.role;
        } catch (err) {
            console.error('SSE Auth Error:', err);
        }
    }

    const clientId = addClient(res, userId, role);
    
    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        if (res.writableEnded) {
            clearInterval(heartbeat);
            return;
        }
        res.write(':ping\n\n');
    }, 30000);

    req.on('close', () => {
        clearInterval(heartbeat);
        removeClient(clientId);
    });
});

// SSE Health/Connection check (already handled by /api/events)
// Removing redundant root SSE handlers

// Health
app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = await db.query('SELECT 1');
        res.json({
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            database: dbStatus.rowCount === 1 ? 'connected' : 'error'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

app.get('/api', (req, res) => {
    res.send('Madhyamgram Rabindra Academy API is running');
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDistPath, {
        maxAge: '1y',
        etag: true,
        lastModified: true,
        immutable: true,
        setHeaders: (res, path) => {
            if (path.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache'); // Don't cache index.html
            } else {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
        }
    }));
    app.get('*', (req, res) => {
        // Only serve index.html if it's not an /api route (already handled above)
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(clientDistPath, 'index.html'));
        }
    });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

initDb().then(() => {
    initCronJobs();
// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Initialize Socket.io
initSocket(server);

// 5. Graceful Shutdown (Absolute Professional Final Step)
const shutdown = async () => {
    console.log('Shutdown signal received. Closing HTTP server...');
    server.close(async () => {
        console.log('HTTP server closed. Closing database pool...');
        try {
            await db.end();
            console.log('Database pool closed. Shutdown complete.');
            process.exit(0);
        } catch (err) {
            console.error('Error during database pool shutdown:', err);
            process.exit(1);
        }
    });

    // Force close after 10s
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
});
