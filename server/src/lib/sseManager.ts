// SSE Manager: keeps a registry of all connected client response streams
// and provides a broadcast function to push events to all of them.

import { Response } from 'express';

const clients = new Set<Response>();

export const addClient = (res: Response) => {
    clients.add(res);
};

export const removeClient = (res: Response) => {
    clients.delete(res);
};

export type SSEEventType =
    | 'attendance:updated'
    | 'homework_created'
    | 'homework_deleted'
    | 'homework_submitted'
    | 'result:created'
    | 'fee:created'
    | 'fee:paid'
    | 'user:created'
    | 'user:deleted'
    | 'class:updated';

export const broadcast = (event: SSEEventType, data: Record<string, unknown> = {}) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(res => {
        try {
            res.write(payload);
        } catch {
            // Client already disconnected
            clients.delete(res);
        }
    });
};
