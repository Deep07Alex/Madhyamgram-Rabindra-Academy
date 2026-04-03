/**
 * Server Events Hook
 * 
 * Manages WebSocket (Socket.io) subscriptions for real-time updates.
 * Features:
 * - Event debouncing to prevent UI flicker during rapid updates.
 * - Automatic room management based on user role and class.
 * - Type-safe event handling.
 * - Support for public (unauthenticated) events.
 */
import { useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl } from '../services/api';

// List of all event types the server can emit
export type SSEEventType =
    | 'connected'
    | 'attendance:updated'
    | 'homework_created'
    | 'homework_deleted'
    | 'homework_updated'
    | 'homework_submitted'
    | 'homework_graded'
    | 'result:created'
    | 'result_published'
    | 'user:created'
    | 'user:deleted'
    | 'class:updated'
    | 'profile_updated'
    | 'new_notice'
    | 'notice_deleted'
    | 'system:config_updated'
    | 'gallery:updated'
    | 'alumni:updated'
    | 'toppers:updated'
    | 'resources:updated';

type EventHandlers = Partial<Record<SSEEventType, (data: any) => void>>;

const useServerEvents = (handlers: EventHandlers) => {
    const { user } = useAuth();
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    const lastEventsRef = useRef<Record<string, number>>({});

    useEffect(() => {
        // Universal Event Dispatcher:
        // Ensures events from both WebSocket and SSE are handled consistently.
        const dispatchEvent = (type: string, data: any) => {
            const now = Date.now();
            const lastTime = lastEventsRef.current[type] || 0;
            
            // Deduplicate: Don't process same event multiple times within 250ms
            if (now - lastTime < 250) return;
            lastEventsRef.current[type] = now;
            
            // Execute the handler from the latest render
            const handler = (handlersRef.current as any)[type];
            if (handler) {
                console.log(`[LiveSync] Received event: ${type}`, data);
                handler(data);
            }
        };

        // 1. WebSocket Listeners (Primary)
        const eventTypes = Object.keys(handlersRef.current) as SSEEventType[];
        eventTypes.forEach(type => {
            socket.on(type, (data: any) => dispatchEvent(type, data));
        });

        // 2. SSE Listeners (Backup - Extremely reliable on Mobile/Hiding tabs)
        // Ensure absolute URL with /api prefix for production
        const baseUrl = getBaseUrl();
        const sseUrl = baseUrl.includes('/api') 
            ? `${baseUrl}/events` 
            : `${baseUrl}/api/events`;
        
        const eventSource = new EventSource(sseUrl, { withCredentials: true });

        eventTypes.forEach(type => {
            eventSource.addEventListener(type, (e: any) => {
                try {
                    const data = JSON.parse(e.data);
                    dispatchEvent(type, data);
                } catch (err) {
                    dispatchEvent(type, {});
                }
            });
        });

        // Room Management (only if logged in)
        if (user) {
            socket.emit('join_room', `user:${user.id}`);
            socket.emit('join_room', `role:${user.role}`);
            if (user.classId) {
                socket.emit('join_room', `class:${user.classId}`);
            }
        }

        // Periodic Health Check: If disconnected, try a manual reconnect
        const checkInterval = setInterval(() => {
            if (socket.disconnected) socket.connect();
        }, 10000);

        return () => {
            clearInterval(checkInterval);
            eventTypes.forEach(type => socket.off(type));
            eventSource.close();
            if (user) {
                socket.emit('leave_room', `user:${user.id}`);
                socket.emit('leave_room', `role:${user.role}`);
                if (user.classId) {
                    socket.emit('leave_room', `class:${user.classId}`);
                }
            }
        };
    }, [user, Object.keys(handlers).length]); // Only re-bind if number of events changes
};

export default useServerEvents;
