import { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { MainChatArea } from '../app/components/MainChatArea';
import { useChatStore } from '../store/chatStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { useStorage } from '../hooks/useStorage';
import { Lock, LogIn } from 'lucide-react';

export default function Room() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [password, setPassword] = useState(location.state?.password || '');
    const [passwordInput, setPasswordInput] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [isJoined, setIsJoined] = useState(false);

    const {
        messages, addMessage, setMessages, clearChat,
        connectionStatus, fingerprint, setRoomId, sharedKey
    } = useChatStore();

    const { saveEncryptedMessage, getEncryptedMessages, clearMessages, saveRoomKey, getRoomKey } = useStorage();

    const handleDecryptedMessage = useCallback(async (iv, ciphertext) => {
        const currentSharedKey = useChatStore.getState().sharedKey;
        if (!currentSharedKey) return;

        try {
            const { decryptMessage } = await import('../hooks/useCrypto').then(m => m.useCrypto());
            const decryptedText = await decryptMessage(currentSharedKey, iv, ciphertext);
            const parsed = JSON.parse(decryptedText);
            const newMsg = {
                id: parsed.id,
                text: parsed.text,
                sender: 'other',
                time: parsed.time
            };

            addMessage(newMsg);
            // Store as plaintext to survive session reloads where sharedKey changes
            saveEncryptedMessage({ id: parsed.id, roomId, text: parsed.text, time: parsed.time, sender: 'other' });
        } catch (e) {
            console.error("Failed to decrypt incoming message", e);
        }
    }, [roomId, addMessage, saveEncryptedMessage]);

    const { sendMessage } = useWebRTC(isJoined ? roomId : null, password, handleDecryptedMessage);

    // Initial Check
    useEffect(() => {
        setRoomId(roomId);

        const checkRoom = async () => {
            try {
                const API_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001';
                const res = await fetch(`${API_URL}/api/rooms/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId })
                });

                const data = await res.json();
                if (!res.ok) {
                    alert(data.error || 'Room error');
                    navigate('/');
                    return;
                }

                if (data.requiresPassword && !password) {
                    setNeedsPassword(true);
                } else {
                    setIsJoined(true);
                }
            } catch (e) {
                console.error(e);
                alert('Failed to check room');
                navigate('/');
            }
        };

        checkRoom();
    }, [roomId, password, navigate, setRoomId]);

    // Handle saving new sharedKeys and loading old messages
    useEffect(() => {
        const handleStorage = async () => {
            if (!roomId) return;

            if (sharedKey) {
                await saveRoomKey(roomId, sharedKey);
            }

            const savedKey = sharedKey || await getRoomKey(roomId);

            const storedMsgs = await getEncryptedMessages(roomId);
            if (storedMsgs.length > 0) {
                try {
                    const { decryptMessage } = await import('../hooks/useCrypto').then(m => m.useCrypto());
                    const decryptedMsgs = [];
                    for (const msg of storedMsgs) {
                        if (msg.text) {
                            // Already stored as plaintext
                            decryptedMsgs.push({
                                id: msg.id,
                                text: msg.text,
                                sender: msg.sender || 'me',
                                time: msg.time || ''
                            });
                        } else if (msg.iv && msg.ciphertext && savedKey) {
                            // Legacy encrypted message
                            try {
                                const text = await decryptMessage(savedKey, msg.iv, msg.ciphertext);
                                const parsed = JSON.parse(text);
                                decryptedMsgs.push({
                                    id: parsed.id,
                                    text: parsed.text,
                                    sender: msg.sender || parsed.sender || 'me',
                                    time: parsed.time
                                });
                            } catch (e) {
                                console.error("Could not decrypt history msg", e);
                            }
                        }
                    }

                    // Filter duplicates and sort
                    const uniqueMsgs = decryptedMsgs.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
                    uniqueMsgs.sort((a, b) => Number(a.id) - Number(b.id));
                    setMessages(uniqueMsgs);
                } catch (e) {
                    console.error("Failed to load messages", e);
                }
            }
        };

        handleStorage();
        // Intentionally omitting setMessages to prevent infinite loops. No hook dependencies changing either.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, sharedKey]);

    const handleAuth = (e) => {
        e.preventDefault();
        if (passwordInput) {
            setPassword(passwordInput);
            setNeedsPassword(false);
        }
    };

    const handleSendMessage = async (text) => {
        const timestamp = Date.now();
        const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const plainPayload = JSON.stringify({
            id: timestamp.toString(),
            text,
            sender: 'me',
            time: timeStr
        });

        const encResult = await sendMessage(plainPayload);

        if (encResult) {
            const newMsg = {
                id: timestamp.toString(),
                text,
                sender: 'me',
                time: timeStr
            };
            addMessage(newMsg);
            // Store as plaintext
            saveEncryptedMessage({ id: timestamp.toString(), roomId, text, time: timeStr, sender: 'me' });
        }
    };

    const handleClearChat = async () => {
        await clearMessages(roomId);
        clearChat();
    };

    const handleExportChat = () => {
        const exportText = messages.map(m => `[${m.time}] ${m.sender === 'me' ? 'You' : 'Peer'}: ${m.text}`).join('\n');
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${roomId}-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (needsPassword) {
        return (
            <div className="flex-1 min-h-screen flex flex-col items-center justify-center p-6 text-white bg-black w-full">
                <form onSubmit={handleAuth} className="w-full max-w-md bg-[#111] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
                    <div className="flex flex-col items-center gap-3 mb-2">
                        <Lock className="w-8 h-8 text-[#6366f1]" />
                        <h2 className="text-xl font-semibold">Enter Password</h2>
                        <p className="text-[#888] text-sm text-center">This room is password protected.</p>
                    </div>

                    <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 focus-within:border-[#6366f1]/50">
                        <Lock className="w-4 h-4 text-[#555]" />
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Room Password"
                            className="flex-1 bg-transparent text-white outline-none placeholder-[#444] text-[14px]"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!passwordInput.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white transition-all duration-200 cursor-pointer hover:brightness-110 disabled:opacity-50"
                        style={{ backgroundColor: "#6366f1" }}
                    >
                        <LogIn className="w-4 h-4" />
                        Join Room
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="w-full h-screen sm:p-4 bg-black flex items-center justify-center">
            <div className="w-full h-full max-w-4xl bg-[#111] sm:border border-white/5 sm:rounded-2xl overflow-hidden shadow-2xl flex">
                <MainChatArea
                    activeRoomCode={roomId}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onClearChat={handleClearChat}
                    onExportChat={handleExportChat}
                    connectionStatus={connectionStatus}
                    fingerprint={fingerprint}
                />
            </div>
        </div>
    );
}
