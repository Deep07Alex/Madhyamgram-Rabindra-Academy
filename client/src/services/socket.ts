import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true
});

socket.on('connect', () => {
    if (import.meta.env.DEV) console.log('Real-time connection established:', socket.id);
});

socket.on('disconnect', () => {
    if (import.meta.env.DEV) console.log('Real-time connection lost');
});
