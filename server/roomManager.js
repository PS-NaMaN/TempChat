const argon2 = require('argon2');

class RoomManager {
    constructor() {
        this.rooms = new Map();
        // 24 hours in milliseconds
        this.ttl = 24 * 60 * 60 * 1000;

        // Auto-clean every 30 minutes
        setInterval(() => this.cleanup(), 30 * 60 * 1000);
    }

    async createRoom(roomId, password) {
        let passwordHash = null;
        if (password) {
            passwordHash = await argon2.hash(password);
        }

        this.rooms.set(roomId, {
            passwordHash,
            createdAt: Date.now(),
            users: [],
        });

        return true;
    }

    async verifyPassword(roomId, password) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        if (!room.passwordHash) return true; // No password

        if (!password) return false;

        try {
            return await argon2.verify(room.passwordHash, password);
        } catch (err) {
            console.error('Password verification error', err);
            return false;
        }
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    isRoomFull(roomId) {
        const room = this.rooms.get(roomId);
        return room ? room.users.length >= 2 : false;
    }

    addUser(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        if (room.users.length >= 2) return null;

        // Determine the missing role
        let role = 'offerer';
        if (room.users.length === 1) {
            role = room.users[0].role === 'offerer' ? 'answerer' : 'offerer';
        }
        room.users.push({ socketId, role });

        return role;
    }

    removeUser(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.users = room.users.filter(u => u.socketId !== socketId);

        // If empty, delete room immediately
        // if (room.users.length === 0) {
        //     this.rooms.delete(roomId);
        // }
    }

    removeUserGlobally(socketId) {
        for (const [roomId, room] of this.rooms.entries()) {
            const userIndex = room.users.findIndex(u => u.socketId === socketId);
            if (userIndex !== -1) {
                room.users.splice(userIndex, 1);
                // if (room.users.length === 0) {
                //     this.rooms.delete(roomId);
                // }
                return roomId; // return the room id they were removed from
            }
        }
        return null;
    }

    cleanup() {
        const now = Date.now();
        for (const [roomId, room] of this.rooms.entries()) {
            if (now - room.createdAt > this.ttl) {
                this.rooms.delete(roomId);
            }
        }
    }
}

module.exports = new RoomManager();
