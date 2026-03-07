import { create } from 'zustand';

export const useChatStore = create((set) => ({
    roomId: null,
    role: null, // 'offerer' | 'answerer'
    connectionStatus: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'encrypted' | 'peer_disconnected'
    messages: [],
    fingerprint: null,
    sharedKey: null,

    setRoomId: (id) => set({ roomId: id }),
    setRole: (role) => set({ role }),
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setMessages: (messages) => set({ messages }),
    setFingerprint: (fingerprint) => set({ fingerprint }),
    setSharedKey: (sharedKey) => set({ sharedKey }),
    clearChat: () => set({ messages: [] }),
    markMessageSent: (id) => set((state) => ({
        messages: state.messages.map(m => m.id === id ? { ...m, pending: false } : m)
    })),
}));
