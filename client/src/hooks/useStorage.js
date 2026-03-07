import { openDB } from 'idb';

const DB_NAME = 'TempChatDB';
const DB_VERSION = 4; // Incremented for pendingMessages store
const STORE_NAME = 'messages';
const KEYS_STORE = 'roomKeys';
const RECENT_ROOMS_STORE = 'recentRooms';
const PENDING_STORE = 'pendingMessages';

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
            if (!db.objectStoreNames.contains(PENDING_STORE)) {
                const pStore = db.createObjectStore(PENDING_STORE, { keyPath: 'id' });
                pStore.createIndex('roomId', 'roomId');
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
        await db.clear(PENDING_STORE);
    } catch (err) {
        console.error('Failed to clear all data', err);
    }
};

// ---- Pending message queue helpers ----

const savePendingMessage = async (msg) => {
    // msg: { id, roomId, plainPayload, displayMsg }
    try {
        const db = await initDB();
        await db.put(PENDING_STORE, msg);
    } catch (err) {
        console.error('Failed to save pending message', err);
    }
};

const getPendingMessages = async (roomId) => {
    try {
        const db = await initDB();
        const msgs = await db.getAllFromIndex(PENDING_STORE, 'roomId', roomId);
        return msgs.sort((a, b) => Number(a.id) - Number(b.id));
    } catch (err) {
        console.error('Failed to get pending messages', err);
        return [];
    }
};

const deletePendingMessage = async (id) => {
    try {
        const db = await initDB();
        await db.delete(PENDING_STORE, id);
    } catch (err) {
        console.error('Failed to delete pending message', err);
    }
};

const clearPendingMessages = async (roomId) => {
    try {
        const db = await initDB();
        const keys = await db.getAllKeysFromIndex(PENDING_STORE, 'roomId', roomId);
        const tx = db.transaction(PENDING_STORE, 'readwrite');
        for (const key of keys) {
            tx.store.delete(key);
        }
        await tx.done;
    } catch (err) {
        console.error('Failed to clear pending messages', err);
    }
};

// Export as a hook that returns stable references
export function useStorage() {
    return {
        saveRoomKey, getRoomKey,
        saveEncryptedMessage, getEncryptedMessages, clearMessages,
        saveRecentRoom, getRecentRooms, clearAllData,
        savePendingMessage, getPendingMessages, deletePendingMessage, clearPendingMessages
    };
}
