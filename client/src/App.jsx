import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './app/components/Sidebar';
import { CreateRoomModal } from './app/components/CreateRoomModal';
import { JoinRoomModal } from './app/components/JoinRoomModal';
import { SettingsModal } from './app/components/SettingsModal';
import { MainChatArea } from './app/components/MainChatArea';
import { useChatStore } from './store/chatStore';
import { useWebRTC } from './hooks/useWebRTC';
import { useStorage } from './hooks/useStorage';
import { Lock, LogIn } from 'lucide-react';

function Dashboard() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [rooms, setRooms] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'slate');
    const [accent, setAccent] = useState(() => localStorage.getItem('accent') || '#6366f1');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.style.setProperty('--accent', accent);
        localStorage.setItem('accent', accent);
    }, [accent]);

    const [password, setPassword] = useState(location.state?.password || '');
    const [passwordInput, setPasswordInput] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [loadingRoom, setLoadingRoom] = useState(false);

    const {
        messages, addMessage, setMessages, clearChat,
        connectionStatus, fingerprint, setRoomId, sharedKey
    } = useChatStore();

    const {
        saveEncryptedMessage, getEncryptedMessages, clearMessages,
        saveRoomKey, getRoomKey, saveRecentRoom, getRecentRooms
    } = useStorage();

    const reloadRecentRooms = useCallback(async () => {
        const list = await getRecentRooms();
        setRooms(list);
    }, [getRecentRooms]);

    // Load recents on mount
    useEffect(() => {
        reloadRecentRooms();
    }, [reloadRecentRooms]);

    // Reset states when roomId changes
    useEffect(() => {
        setNeedsPassword(false);
        setIsJoined(false);
        setPasswordInput('');
        clearChat();

        if (!roomId) {
            setRoomId(null);
            return;
        }

        const navPassword = location.state?.password || '';
        setPassword(navPassword);

        setLoadingRoom(true);
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
                    const recentRoomsList = await getRecentRooms();
                    const hasLocalRoom = recentRoomsList.some(r => r.code === roomId);
                    if (hasLocalRoom) {
                        setIsJoined(true);
                        setNeedsPassword(false);
                        return;
                    }
                    alert(data.error || 'Room error');
                    navigate('/');
                    return;
                }

                // Add to recent rooms
                const roomData = { code: roomId, locked: data.requiresPassword, lastVisited: Date.now(), active: true };
                await saveRecentRoom(roomData);
                await reloadRecentRooms();

                if (data.requiresPassword && !navPassword) {
                    setNeedsPassword(true);
                } else {
                    setIsJoined(true);
                }
            } catch (e) {
                console.error(e);
                alert('Failed to check room');
                navigate('/');
            } finally {
                setLoadingRoom(false);
            }
        };

        checkRoom();
    }, [roomId, navigate, setRoomId, clearChat, saveRecentRoom, location.state?.password, reloadRecentRooms]);

    const handleDecryptedMessage = useCallback(async (iv, ciphertext) => {
        const currentSharedKey = useChatStore.getState().sharedKey;
        if (!currentSharedKey) return;

        try {
            const { decryptMessage } = await import('./hooks/useCrypto').then(m => m.useCrypto());
            const decryptedText = await decryptMessage(currentSharedKey, iv, ciphertext);
            const parsed = JSON.parse(decryptedText);
            const newMsg = {
                id: parsed.id,
                text: parsed.text,
                sender: 'other',
                time: parsed.time
            };

            addMessage(newMsg);
            saveEncryptedMessage({ id: parsed.id, roomId, iv, ciphertext, sender: 'other' });
        } catch (e) {
            console.error("Failed to decrypt incoming message", e);
        }
    }, [roomId, addMessage, saveEncryptedMessage]);

    const { sendMessage } = useWebRTC(isJoined ? roomId : null, password, handleDecryptedMessage);

    // Storage interactions (restoring messages upon loading a room)
    useEffect(() => {
        const handleStorage = async () => {
            if (!roomId) return;
            if (sharedKey) {
                await saveRoomKey(roomId, sharedKey);
            }
            const savedKey = sharedKey || await getRoomKey(roomId);
            if (!savedKey) return;

            const encryptedMsgs = await getEncryptedMessages(roomId);
            if (encryptedMsgs.length > 0) {
                try {
                    const { decryptMessage } = await import('./hooks/useCrypto').then(m => m.useCrypto());
                    const decryptedMsgs = [];
                    for (const msg of encryptedMsgs) {
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
                    setMessages(decryptedMsgs);
                } catch (e) {
                    console.error("Failed to load messages", e);
                }
            }
        };
        handleStorage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, sharedKey]);

    const handleCreateRoom = async (code, pwd) => {
        const currentRooms = await getRecentRooms();
        if (currentRooms.length >= 10) {
            const confirmed = window.confirm("You have reached the limit of 10 active rooms. Creating a new one will automatically delete your oldest room's history. Continue?");
            if (!confirmed) return;
        }

        setShowCreateModal(false);

        try {
            const API_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001';
            const res = await fetch(`${API_URL}/api/rooms/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: code, password: pwd || undefined })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                navigate(`/${code}`, { state: { password: pwd || undefined } });
            } else {
                alert(data.error || 'Failed to create room');
            }
        } catch (e) {
            console.error(e);
            alert('Network error while creating room');
        }
    };

    const handleJoinRoom = (code, pwd) => {
        setShowJoinModal(false);
        navigate(`/${code}`, { state: { password: pwd || undefined } });
    };

    const handleAuth = (e) => {
        e.preventDefault();
        if (passwordInput) {
            setPassword(passwordInput);
            setNeedsPassword(false);
            setIsJoined(true);
        }
    };

    const handleNewMessage = async (text) => {
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
            saveEncryptedMessage({ id: timestamp.toString(), roomId, iv: encResult.iv, ciphertext: encResult.ciphertext, sender: 'me' });
        }
    };

    const handleClearCurrentChat = async () => {
        if (roomId) {
            if (confirm("Clear history for this chat?")) {
                await clearMessages(roomId);
                clearChat();
            }
        }
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

    let RightContent;

    if (loadingRoom) {
        RightContent = (
            <div className="flex-1 flex flex-col items-center justify-center w-full transition-colors duration-200" style={{ backgroundColor: "var(--bg-chat)" }}>
                <span className="w-8 h-8 border-4 border-t-transparent border-[var(--accent)] opacity-80 rounded-full animate-spin"></span>
            </div>
        )
    } else if (needsPassword) {
        RightContent = (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-[var(--text-main)] w-full h-full transition-colors duration-200" style={{ backgroundColor: "var(--bg-chat)" }}>
                <form onSubmit={handleAuth} className="w-full max-w-md border rounded-2xl p-6 shadow-2xl flex flex-col gap-5 transition-colors duration-200" style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-light)" }}>
                    <div className="flex flex-col items-center gap-3 mb-2">
                        <Lock className="w-8 h-8 text-[var(--accent)]" />
                        <h2 className="text-xl font-semibold">Enter Password</h2>
                        <p className="text-[var(--text-secondary)] text-sm text-center">This room is password protected.</p>
                    </div>
                    <div className="flex items-center gap-3 border rounded-xl px-4 py-3 focus-within:border-[var(--accent)] transition-all" style={{ backgroundColor: "var(--bg-panel)", borderColor: "var(--border-light)" }}>
                        <Lock className="w-4 h-4 text-[var(--icon-muted)]" />
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Room Password"
                            className="flex-1 bg-transparent text-[var(--text-main)] outline-none placeholder-[var(--text-dark)] text-[14px]"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!passwordInput.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white transition-all duration-200 cursor-pointer hover:brightness-110 disabled:opacity-50"
                        style={{ backgroundColor: "var(--accent)" }}
                    >
                        <LogIn className="w-4 h-4" />
                        Unlock Room
                    </button>
                </form>
            </div>
        );
    } else {
        RightContent = (
            <MainChatArea
                activeRoomCode={roomId || null}
                messages={messages}
                onSendMessage={handleNewMessage}
                onClearChat={handleClearCurrentChat}
                onExportChat={handleExportChat}
                connectionStatus={connectionStatus}
                fingerprint={fingerprint}
            />
        );
    }

    return (
        <div className="h-full w-full flex transition-colors duration-200" style={{ fontFamily: "Inter, sans-serif", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}>
            <Sidebar
                rooms={rooms}
                onCreateRoom={() => setShowCreateModal(true)}
                onJoinRoom={() => setShowJoinModal(true)}
                onSelectRoom={(code) => navigate(`/${code}`)}
                onOpenSettings={() => setShowSettingsModal(true)}
                activeRoomCode={roomId || null}
            />

            <div className="flex-1 h-full relative">
                {RightContent}
            </div>

            <CreateRoomModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreateRoom={handleCreateRoom}
            />
            <JoinRoomModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                onJoinRoom={handleJoinRoom}
            />
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                theme={theme}
                setTheme={setTheme}
                accent={accent}
                setAccent={setAccent}
            />
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/:roomId" element={<Dashboard />} />
        </Routes>
    );
}
