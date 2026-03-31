/**
 * WebSocket (Socket.io) Manager
 * 
 * Initialized with the HTTP server to provide low-latency real-time communication.
 */
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

/**
 * Bootstraps the Socket.io server.
 */
export const initSocket = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: [
                'https://madhyamgramrabindraacademy.in',
                'https://www.madhyamgramrabindraacademy.in',
                'capacitor://localhost',
                'http://localhost',
                'http://localhost:5173',
                'http://localhost:3000'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join_room', (room: string) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

/**
 * Synchronous accessor for the IO instance.
 */
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

/**
 * Emits an event to a specific room or to everyone.
 */
export const emitEvent = (event: string, data: any, room?: string) => {
    if (io) {
        if (room) {
            io.to(room).emit(event, data);
        } else {
            io.emit(event, data);
        }
    }
};
