/**
 * SSE (Server-Sent Events) Manager
 * 
 * Manages real-time event broadcasting to clients.
 * Note: This system works alongside WebSockets for dual-stack real-time compatibility.
 */
import { Response } from 'express';
import { emitEvent } from './socket.js';

interface SSEClient {
    id: string;
    res: Response;
    userId: string | undefined;
    role: string | undefined;
}

let clients: SSEClient[] = [];

/**
 * Registers a new SSE client connection.
 */
export const addClient = (res: Response, userId?: string, role?: string) => {
    const id = Date.now().toString();
    const newClient: SSEClient = { id, res, userId, role };
    clients.push(newClient);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    res.write('retry: 10000\n\n');

    return id;
};

/**
 * Removes a disconnected SSE client.
 */
export const removeClient = (id: string) => {
    clients = clients.filter(c => c.id !== id);
};

export type SSEEventType =
    | 'user:deleted'
    | 'class:updated'
    | 'new_notice'
    | 'notice_deleted'
    | 'profile_updated'
    | 'result_published'
    | 'homework_created'
    | 'homework_deleted'
    | 'homework_updated'
    | 'homework_submitted'
    | 'homework_graded'
    | 'attendance:updated'
    | 'system:config_updated'
    | 'user:created';

/**
 * Broadcast to all connected clients
 */
/**
 * Broadcasts an event to EVERY connected client (Sockets + SSE).
 */
export const broadcast = (event: SSEEventType, data: Record<string, unknown> = {}) => {
    // Sockets (Primary)
    emitEvent(event, data);

    // SSE (Legacy/Backup)
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(c => {
        try {
            c.res.write(payload);
        } catch (err) {
            // Error writing to client, likely disconnected
        }
    });
};

/**
 * Send event to a specific user
 */
/**
 * Sends an event to a specific User ID.
 */
export const sendToUser = (userId: string, event: SSEEventType, data: Record<string, unknown> = {}) => {
    // Sockets (Primary)
    emitEvent(event, data, `user:${userId}`);

    // SSE (Legacy/Backup)
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.filter(c => c.userId === userId).forEach(c => {
        try {
            c.res.write(payload);
        } catch (err) {
            // Error
        }
    });
};

/**
 * Send event to a specific role
 */
/**
 * Sends an event to all users with a specific Role.
 */
export const sendToRole = (role: string, event: SSEEventType, data: Record<string, unknown> = {}) => {
    // Sockets (Primary)
    emitEvent(event, data, `role:${role}`);

    // SSE (Legacy/Backup)
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.filter(c => c.role === role).forEach(c => {
        try {
            c.res.write(payload);
        } catch (err) {
            // Error
        }
    });
};

/**
 * Send event to a specific class room
 */
export const sendToClass = (classId: string, event: SSEEventType, data: Record<string, unknown> = {}) => {
    // Sockets (Primary)
    emitEvent(event, data, `class:${classId}`);

    // SSE (Legacy/Backup)
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(c => {
        try {
            c.res.write(payload);
        } catch (err) {}
    });
};
