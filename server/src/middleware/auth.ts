/**
 * Authentication Middleware
 * 
 * Provides utilities for verifying JWT tokens and enforcing role-based access control (RBAC).
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('CRITICAL ERROR: JWT_SECRET IS NOT DEFINED IN ENVIRONMENT');
    process.exit(1);
}

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

/**
 * Mandatory Authentication Middleware
 * Verifies the 'Authorization' bearer token. 
 * If valid, populates req.user; otherwise, returns 401 Unauthorized.
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

/**
 * Optional Authentication Middleware
 * Attempts to verify a token if present, but proceeds regardless.
 * Useful for routes that have different behavior for guests vs. logged-in users (e.g., Notices).
 */
export const optionalAuthenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
        req.user = decoded;
        next();
    } catch (error) {
        // Even if token is invalid, we proceed, but without req.user populated.
        // Or we could return 401. Typically if a token is provided but invalid, 401 is better.
        // But for safe fallback, let's just not set req.user.
        return next();
    }
};

/**
 * Role-Based Authorization Factory
 * Returns a middleware that ensures the authenticated user has one of the allowed roles.
 */
export const authorize = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};
