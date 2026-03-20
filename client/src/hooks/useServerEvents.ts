import { useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

// List of all event types the server can emit
export type SSEEventType =
    | 'connected'
    | 'attendance:updated'
    | 'homework_created'
    | 'homework_deleted'
    | 'homework_submitted'
    | 'homework_graded'
    | 'result:created'
    | 'result_published'
    | 'fee:created'
    | 'fee:paid'
    | 'fee_created'
    | 'fee_updated'
    | 'user:created'
    | 'user:deleted'
    | 'class:updated'
    | 'profile_updated'
    | 'system:config_updated'
    | 'new_notice'
    | 'notice_deleted';

type EventHandlers = Partial<Record<SSEEventType, (data: any) => void>>;

const useServerEvents = (handlers: EventHandlers) => {
    const { user } = useAuth();
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    const lastEventsRef = useRef<Record<string, number>>({});

    useEffect(() => {
        if (!user) return;

        // Debounced event wrapper
        const handleEvent = (type: SSEEventType, data: any) => {
            const now = Date.now();
            const lastTime = lastEventsRef.current[type] || 0;
            
            // Only handle same event type once every 200ms
            if (now - lastTime < 200) return;
            lastEventsRef.current[type] = now;
            
            handlersRef.current[type]?.(data);
        };

        const eventTypes = Object.keys(handlersRef.current) as SSEEventType[];

        eventTypes.forEach(type => {
            socket.on(type, (data: any) => handleEvent(type, data));
        });

        // Join relevant rooms for targeted updates
        socket.emit('join_room', `user:${user.id}`);
        socket.emit('join_room', `role:${user.role}`);
        if (user.classId) {
            socket.emit('join_room', `class:${user.classId}`);
        }

        return () => {
            eventTypes.forEach(type => socket.off(type));
            socket.emit('leave_room', `user:${user.id}`);
            socket.emit('leave_room', `role:${user.role}`);
            if (user.classId) {
                socket.emit('leave_room', `class:${user.classId}`);
            }
        };
    }, [user]);
};

export default useServerEvents;
