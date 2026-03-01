import { useEffect, useCallback, useRef } from 'react';

// List of all event types the server can emit
export type SSEEventType =
    | 'connected'
    | 'attendance:updated'
    | 'homework:created'
    | 'homework:deleted'
    | 'homework:submitted'
    | 'result:created'
    | 'fee:created'
    | 'fee:paid'
    | 'user:created'
    | 'user:deleted'
    | 'class:updated';

type EventHandlers = Partial<Record<SSEEventType, (data: any) => void>>;

/**
 * useServerEvents - connects to the SSE stream and fires callbacks
 * whenever matching events arrive from the server.
 *
 * Usage:
 *   useServerEvents({
 *     'attendance:updated': () => fetchAttendance(),
 *     'homework:created': () => fetchHomework(),
 *   });
 */
const useServerEvents = (handlers: EventHandlers) => {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers; // Always latest without re-subscribing

    const connect = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/events?token=${token}`;
        const es = new EventSource(url);

        const eventTypes = Object.keys(handlersRef.current) as SSEEventType[];

        eventTypes.forEach(type => {
            es.addEventListener(type, (e: MessageEvent) => {
                const data = JSON.parse(e.data || '{}');
                handlersRef.current[type]?.(data);
            });
        });

        es.onerror = () => {
            es.close();
            // Auto-reconnect after 3 seconds
            setTimeout(() => connect(), 3000);
        };

        return es;
    }, []);

    useEffect(() => {
        const es = connect();
        return () => {
            es?.close();
        };
    }, [connect]);
};

export default useServerEvents;
