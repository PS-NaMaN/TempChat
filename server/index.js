require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const roomManager = require('./roomManager');

const app = express();

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

app.get('/', (req, res) => {
    res.send('Signaling server is running');
});

app.post('/api/rooms/create', async (req, res) => {
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

app.post('/api/rooms/check', async (req, res) => {
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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

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
