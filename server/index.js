require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const roomManager = require('./roomManager');

const app = express();

// --- API Rate Limiters ---
const createRoomLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 room creations per window
    message: { error: 'Too many rooms created from this IP, please try again in a minute' },
    standardHeaders: true,
    legacyHeaders: false,
});

const checkRoomLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 120, // Limit each IP to 120 room checks per window
    message: { error: 'Too many room checks from this IP, please try again in a minute' },
    standardHeaders: true,
    legacyHeaders: false,
});

const standardLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200, // Limit each IP to 200 general requests per window
    message: 'Too many requests from this IP'
});

// --- Socket.io Rate Limiting ---
const SOCKET_RATE_LIMIT = 240; // events per minute
const SOCKET_RATE_WINDOW = 60 * 1000; 
const socketMessageCounts = new Map();

const allowedOrigins = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',')
    : [];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : true, // 'true' reflects the request origin
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

app.get('/', standardLimiter, (req, res) => {
    res.send('Signaling server is running');
});

app.post('/api/rooms/create', createRoomLimiter, async (req, res) => {
    try {
        const { roomId, password } = req.body;
        if (!roomId) return res.status(400).json({ error: 'roomId required' });

        if (roomManager.getRoom(roomId)) {
            return res.status(400).json({ error: 'Room already exists' });
        }

        await roomManager.createRoom(roomId, password);
        res.json({ success: true, roomId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/rooms/check', checkRoomLimiter, async (req, res) => {
    const { roomId } = req.body;
    const room = roomManager.getRoom(roomId);

    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    // Proactively purge truly dead sockets before checking capacity
    if (room.users) {
        room.users = room.users.filter(u => io.sockets.sockets.has(u.socketId));
    }

    if (roomManager.isRoomFull(roomId)) {
        return res.status(403).json({ error: 'Room is full' });
    }

    res.json({
        exists: true,
        requiresPassword: !!room.passwordHash
    });
});

io.on('connection_error', (err) => {
    console.error('Socket.io connection error:', err);
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Socket rate limiter middleware
    socket.use(([event, ...args], next) => {
        const now = Date.now();
        let record = socketMessageCounts.get(socket.id);

        if (!record || now > record.resetTime) {
            record = { count: 1, resetTime: now + SOCKET_RATE_WINDOW };
            socketMessageCounts.set(socket.id, record);
            return next();
        }

        record.count++;
        if (record.count > SOCKET_RATE_LIMIT) {
            socket.emit('error', 'Rate limit exceeded');
            console.warn(`Socket ${socket.id} exceeded rate limit. Event: ${event}`);
            // Drop the event to protect the server
            return next(new Error('Rate limit exceeded'));
        }
        
        next();
    });

    socket.on('join_room', async ({ roomId, password }, callback) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
            if (callback) callback({ error: 'Room not found' });
            return;
        }

        // Proactively purge truly dead sockets before checking capacity
        if (room.users) {
            room.users = room.users.filter(u => io.sockets.sockets.has(u.socketId));
        }

        if (roomManager.isRoomFull(roomId)) {
            if (callback) callback({ error: 'Room is full' });
            return;
        }

        if (room.passwordHash) {
            const isValid = await roomManager.verifyPassword(roomId, password);
            if (!isValid) {
                if (callback) callback({ error: 'Invalid password' });
                return;
            }
        }

        const role = roomManager.addUser(roomId, socket.id);
        if (!role) {
            if (callback) callback({ error: 'Could not join room' });
            return;
        }

        socket.join(roomId);

        const roomInfo = roomManager.getRoom(roomId);
        const usersCount = roomInfo ? roomInfo.users.length : 1;

        // Notify the other peer if they exist
        socket.to(roomId).emit('peer_joined');

        if (callback) callback({ success: true, role, usersCount });
    });

    socket.on('webrtc_offer', ({ sdp, roomId }) => {
        socket.to(roomId).emit('webrtc_offer', { sdp });
    });

    socket.on('webrtc_answer', ({ sdp, roomId }) => {
        socket.to(roomId).emit('webrtc_answer', { sdp });
    });

    socket.on('ice_candidate', ({ candidate, roomId }) => {
        socket.to(roomId).emit('ice_candidate', { candidate });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        socketMessageCounts.delete(socket.id); // Clean up rate limiter memory
        const roomId = roomManager.removeUserGlobally(socket.id);
        if (roomId) {
            socket.to(roomId).emit('peer_disconnected');
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
