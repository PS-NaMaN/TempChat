import { openDB } from 'idb';

const DB_NAME = 'TempChatDB';
const DB_VERSION = 3; // Incremented for recentRooms store
const STORE_NAME = 'messages';
const KEYS_STORE = 'roomKeys';
const RECENT_ROOMS_STORE = 'recentRooms';

const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('roomId', 'roomId');
            }
            if (!db.objectStoreNames.contains(KEYS_STORE)) {
                db.createObjectStore(KEYS_STORE);
            }
            if (!db.objectStoreNames.contains(RECENT_ROOMS_STORE)) {
                db.createObjectStore(RECENT_ROOMS_STORE, { keyPath: 'code' });
            }
        },
    });
};

const saveRoomKey = async (roomId, cryptoKey) => {
    try {
        const db = await initDB();
        await db.put(KEYS_STORE, cryptoKey, roomId);
    } catch (e) {
        console.error('Failed to save room key', e);
    }
};

const getRoomKey = async (roomId) => {
    try {
        const db = await initDB();
        return await db.get(KEYS_STORE, roomId);
    } catch (e) {
        console.error(e);
        return null;
    }
};

const saveEncryptedMessage = async (encryptedData) => {
    try {
        const db = await initDB();
        await db.put(STORE_NAME, encryptedData);
    } catch (err) {
        console.error('Failed to save message to IDB:', err);
    }
};

const getEncryptedMessages = async (roomId) => {
    try {
        const db = await initDB();
        const messages = await db.getAllFromIndex(STORE_NAME, 'roomId', roomId);
        return messages.sort((a, b) => a.id - b.id);
    } catch (err) {
        console.error('Failed to get messages from IDB:', err);
        return [];
    }
};

const clearMessages = async (roomId) => {
    try {
        const db = await initDB();
        const keys = await db.getAllKeysFromIndex(STORE_NAME, 'roomId', roomId);
        const tx = db.transaction(STORE_NAME, 'readwrite');
        for (const key of keys) {
            tx.store.delete(key);
        }
        await tx.done;
    } catch (err) {
        console.error('Failed to clear messages from IDB:', err);
    }
};

const saveRecentRoom = async (roomData) => {
    try {
        const db = await initDB();
        await db.put(RECENT_ROOMS_STORE, roomData);

        const allRooms = await db.getAll(RECENT_ROOMS_STORE);
        if (allRooms.length > 10) {
            allRooms.sort((a, b) => b.lastVisited - a.lastVisited);
            for (let i = 10; i < allRooms.length; i++) {
                const roomCode = allRooms[i].code;
                await db.delete(RECENT_ROOMS_STORE, roomCode);
                await db.delete(KEYS_STORE, roomCode);

                const keys = await db.getAllKeysFromIndex(STORE_NAME, 'roomId', roomCode);
                const tx = db.transaction(STORE_NAME, 'readwrite');
                for (const key of keys) {
                    tx.store.delete(key);
                }
                await tx.done;
            }
        }
    } catch (err) {
        console.error('Failed to save recent room', err);
    }
};

const getRecentRooms = async () => {
    try {
        const db = await initDB();
        const rooms = await db.getAll(RECENT_ROOMS_STORE);
        return rooms.sort((a, b) => b.lastVisited - a.lastVisited); // Descending by last visited
    } catch (err) {
        console.error('Failed to get recent rooms', err);
        return [];
    }
};

const clearAllData = async () => {
    try {
        const db = await initDB();
        await db.clear(STORE_NAME);
        await db.clear(KEYS_STORE);
        await db.clear(RECENT_ROOMS_STORE);
    } catch (err) {
        console.error('Failed to clear all data', err);
    }
};

// Export as a hook that returns stable references
export function useStorage() {
    return {
        saveRoomKey, getRoomKey,
        saveEncryptedMessage, getEncryptedMessages, clearMessages,
        saveRecentRoom, getRecentRooms, clearAllData
    };
}
