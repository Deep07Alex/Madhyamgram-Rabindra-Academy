import { io } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';

// Determine the backend URL for Socket.io
// In Native/Android: Use the production domain
// In Web/Dev: Use the base URL or current origin
const SOCKET_URL = (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'electron')
    ? 'https://madhyamgramrabindraacademy.in' 
    : (import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000');

/**
 * Socket.io Client Instance
 * Single instance used across the application to maintain a persistent connection.
 */
export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity, // Keep trying
    reconnectionDelay: 2000,
    transports: ['polling', 'websocket'], // Polling first is safer for mobile proxies
    secure: true,
    rejectUnauthorized: false // Often needed for institutional certs
});

// Debugging
socket.on('connect', () => {
    console.log('Socket connected to:', SOCKET_URL);
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
});

export default socket;
