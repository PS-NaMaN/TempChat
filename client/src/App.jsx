import { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './app/components/Sidebar';
import { CreateRoomModal } from './app/components/CreateRoomModal';
import { JoinRoomModal } from './app/components/JoinRoomModal';
import { SettingsModal } from './app/components/SettingsModal';
import { AboutModal } from './app/components/AboutModal';
import { MainChatArea } from './app/components/MainChatArea';
import { useChatStore } from './store/chatStore';
import { useWebRTC } from './hooks/useWebRTC';
import { useStorage } from './hooks/useStorage';
import { encryptBinary, decryptMessage, decryptBinary } from './hooks/useCrypto';
import { Lock, LogIn } from 'lucide-react';

function Dashboard() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [rooms, setRooms] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'slate');
    const [accent, setAccent] = useState(() => localStorage.getItem('accent') || '#6366f1');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        connectionStatus, fingerprint, setRoomId, sharedKey, updateMessage
    } = useChatStore();

    const {
        saveEncryptedMessage, getEncryptedMessages, clearMessages,
        saveRoomKey, getRoomKey, saveRecentRoom, getRecentRooms,
        savePendingMessage, getPendingMessages, deletePendingMessage
    } = useStorage();

    const flushingRef = useRef(false);

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
            setIsSidebarOpen(true);
            return;
        }

        setIsSidebarOpen(false);

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
            const decryptedText = await decryptMessage(currentSharedKey, iv, ciphertext);
            const parsed = JSON.parse(decryptedText);
            const newMsg = {
                id: parsed.id,
                text: parsed.text,
                sender: 'other',
                time: parsed.time
            };

            addMessage(newMsg);
            saveEncryptedMessage({ id: parsed.id, roomId, text: parsed.text, time: parsed.time, sender: 'other' });
        } catch (e) {
            console.error("Failed to decrypt incoming message", e);
        }
    }, [roomId, addMessage, saveEncryptedMessage]);

    const handleFileReceived = useCallback(async (fileData) => {
        const currentSharedKey = useChatStore.getState().sharedKey;
        if (!currentSharedKey) return;

        try {
            const decryptedBuffer = await decryptBinary(currentSharedKey, fileData.iv, fileData.ciphertext);
            const blob = new Blob([decryptedBuffer], { type: fileData.fileType });
            const blobUrl = URL.createObjectURL(blob);

            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });

            const isImage = fileData.fileType.startsWith('image/');
            const isVideo = fileData.fileType.startsWith('video/');
            const isAudio = fileData.fileType.startsWith('audio/');
            const isPdf = fileData.fileType === 'application/pdf';

            const newMsg = {
                id: fileData.msgId,
                text: '',
                sender: 'other',
                time: fileData.time,
                progress: 100,
                fileName: fileData.fileName
            };

            if (isImage) {
                newMsg.image = blobUrl;
                newMsg.imageBase64 = base64;
            } else if (isVideo) {
                newMsg.video = blobUrl;
                newMsg.videoBase64 = base64;
            } else if (isAudio) {
                newMsg.audio = blobUrl;
                newMsg.audioBase64 = base64;
            } else if (isPdf) {
                newMsg.pdf = blobUrl;
                newMsg.pdfBase64 = base64;
            }

            addMessage(newMsg);
            
            const storageMsg = { 
                id: fileData.msgId, 
                roomId, 
                text: '', 
                time: fileData.time, 
                sender: 'other',
                fileName: fileData.fileName
            };
            if (isImage) storageMsg.image = base64;
            if (isVideo) storageMsg.video = base64;
            if (isAudio) storageMsg.audio = base64;
            if (isPdf) storageMsg.pdf = base64;

            saveEncryptedMessage(storageMsg);
        } catch (e) {
            console.error("Failed to decrypt incoming file", e);
        }
    }, [roomId, addMessage, saveEncryptedMessage]);

    const handleFileProgress = useCallback((msgId, progress) => {
        updateMessage(msgId, { progress });
    }, [updateMessage]);

    const { sendMessage, sendFileChunks } = useWebRTC(
        isJoined ? roomId : null, 
        password, 
        handleDecryptedMessage, 
        handleFileReceived, 
        handleFileProgress
    );

    // Storage interactions (restoring messages upon loading a room)
    useEffect(() => {
        const handleStorage = async () => {
            if (!roomId) return;
            if (sharedKey) {
                await saveRoomKey(roomId, sharedKey);
            }
            const savedKey = sharedKey || await getRoomKey(roomId);

            let restoredMsgs = [];

            // Restore encrypted (already-sent) messages
            const storedMsgs = await getEncryptedMessages(roomId);
            if (storedMsgs.length > 0) {
                try {
                    for (const msg of storedMsgs) {
                        if (msg.image) {
                            restoredMsgs.push({
                                id: msg.id,
                                text: msg.text || '',
                                image: msg.image,
                                sender: msg.sender || 'me',
                                time: msg.time || '',
                                progress: 100,
                                fileName: msg.fileName
                            });
                        } else if (msg.video) {
                            restoredMsgs.push({
                                id: msg.id,
                                text: msg.text || '',
                                video: msg.video,
                                sender: msg.sender || 'me',
                                time: msg.time || '',
                                progress: 100,
                                fileName: msg.fileName
                            });
                        } else if (msg.audio) {
                            restoredMsgs.push({
                                id: msg.id,
                                text: msg.text || '',
                                audio: msg.audio,
                                sender: msg.sender || 'me',
                                time: msg.time || '',
                                progress: 100,
                                fileName: msg.fileName
                            });
                        } else if (msg.pdf) {
                            restoredMsgs.push({
                                id: msg.id,
                                text: msg.text || '',
                                pdf: msg.pdf,
                                sender: msg.sender || 'me',
                                time: msg.time || '',
                                progress: 100,
                                fileName: msg.fileName
                            });
                        } else if (msg.text) {
                            restoredMsgs.push({
                                id: msg.id,
                                text: msg.text,
                                sender: msg.sender || 'me',
                                time: msg.time || ''
                            });
                        } else if (msg.iv && msg.ciphertext && savedKey) {
                            try {
                                const text = await decryptMessage(savedKey, msg.iv, msg.ciphertext);
                                const parsed = JSON.parse(text);
                                restoredMsgs.push({
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
                } catch (e) {
                    console.error("Failed to load messages", e);
                }
            }

            // Restore pending (queued, unsent) messages
            const pending = await getPendingMessages(roomId);
            for (const item of pending) {
                restoredMsgs.push({ ...item.displayMsg, pending: true });
            }

            if (restoredMsgs.length > 0) {
                setMessages(restoredMsgs);
            }
        };
        handleStorage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, sharedKey]);

    // Flush pending message queue when connection becomes encrypted
    useEffect(() => {
        if (connectionStatus !== 'encrypted' || !roomId || flushingRef.current) return;

        const flushQueue = async () => {
            const pending = await getPendingMessages(roomId);
            if (pending.length === 0) return;

            flushingRef.current = true;
            console.log(`[Queue] Flushing ${pending.length} pending message(s)...`);

            for (const item of pending) {
                // Check if connection is still encrypted before each send
                const currentStatus = useChatStore.getState().connectionStatus;
                if (currentStatus !== 'encrypted') {
                    console.log('[Queue] Connection lost mid-flush, stopping.');
                    break;
                }

                try {
                    const encResult = await sendMessage(item.plainPayload);
                    if (encResult) {
                        await saveEncryptedMessage({
                            id: item.id,
                            roomId,
                            text: JSON.parse(item.plainPayload).text,
                            time: JSON.parse(item.plainPayload).time,
                            sender: 'me'
                        });
                        await deletePendingMessage(item.id);
                        // Update UI to remove 'Queued' tag
                        useChatStore.getState().markMessageSent(item.id);
                        console.log(`[Queue] Sent queued message ${item.id}`);
                    }
                } catch (e) {
                    console.error('[Queue] Failed to send queued message', item.id, e);
                }

                // Rate-limit: wait 200ms between each send
                await new Promise(r => setTimeout(r, 200));
            }

            flushingRef.current = false;
        };

        flushQueue();
    }, [connectionStatus, roomId, sendMessage, getPendingMessages, deletePendingMessage, saveEncryptedMessage]);

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

        const currentStatus = useChatStore.getState().connectionStatus;

        if (currentStatus === 'encrypted') {
            // Connection is live — send immediately
            const encResult = await sendMessage(plainPayload);
            if (encResult) {
                const newMsg = { id: timestamp.toString(), text, sender: 'me', time: timeStr };
                addMessage(newMsg);
                saveEncryptedMessage({ id: timestamp.toString(), roomId, text, time: timeStr, sender: 'me' });
            }
        } else {
            // No peer yet — queue the message in IndexedDB and show it in the UI
            const newMsg = { id: timestamp.toString(), text, sender: 'me', time: timeStr, pending: true };
            addMessage(newMsg);
            await savePendingMessage({
                id: timestamp.toString(),
                roomId,
                plainPayload,
                displayMsg: newMsg
            });
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleSendFile = async (file) => {
        const currentSharedKey = useChatStore.getState().sharedKey;
        if (!currentSharedKey || !file) return;

        if (file.size > 100 * 1024 * 1024) {
            alert("Warning: Files larger than 100MB are stored in IndexedDB and may take up significant space in your browser's local cache.");
        }

        const timestamp = Date.now();
        const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const msgId = timestamp.toString();
        const transferId = `file_${msgId}`;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const encrypted = await encryptBinary(currentSharedKey, arrayBuffer);

            const blobUrl = URL.createObjectURL(file);

            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            const isAudio = file.type.startsWith('audio/');
            const isPdf = file.type === 'application/pdf';

            const newMsg = {
                id: msgId,
                text: '',
                sender: 'me',
                time: timeStr,
                progress: 0,
                fileName: file.name,
                fileSize: formatFileSize(file.size)
            };

            if (isImage) {
                newMsg.image = blobUrl;
                newMsg.imageBase64 = base64;
            } else if (isVideo) {
                newMsg.video = blobUrl;
                newMsg.videoBase64 = base64;
            } else if (isAudio) {
                newMsg.audio = blobUrl;
                newMsg.audioBase64 = base64;
            } else if (isPdf) {
                newMsg.pdf = blobUrl;
                newMsg.pdfBase64 = base64;
            }

            addMessage(newMsg);

            const sent = await sendFileChunks(encrypted, {
                transferId,
                fileName: file.name,
                fileType: file.type,
                msgId,
                time: timeStr
            }, (progress) => {
                updateMessage(msgId, { progress });
            });

            if (sent) {
                const storageMsg = { 
                    id: msgId, 
                    roomId, 
                    text: '', 
                    time: timeStr, 
                    sender: 'me',
                    fileName: file.name
                };
                if (isImage) storageMsg.image = base64;
                if (isVideo) storageMsg.video = base64;
                if (isAudio) storageMsg.audio = base64;
                if (isPdf) storageMsg.pdf = base64;
                saveEncryptedMessage(storageMsg);
            }
        } catch (e) {
            console.error("Failed to send file", e);
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
                onSendFile={handleSendFile}
                onClearChat={handleClearCurrentChat}
                onExportChat={handleExportChat}
                connectionStatus={connectionStatus}
                fingerprint={fingerprint}
                onOpenSidebar={() => setIsSidebarOpen(true)}
            />
        );
    }

    const touchStartX = useRef(null);
    const touchEndX = useRef(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        
        if (isLeftSwipe) {
            setIsSidebarOpen(false); // Swipe left to close
        }
        if (isRightSwipe) {
            setIsSidebarOpen(true); // Swipe right to open
        }
        
        touchStartX.current = null;
        touchEndX.current = null;
    };

    return (
        <div 
            className="h-[100dvh] w-full flex transition-colors duration-200 overflow-hidden relative" 
            style={{ fontFamily: "Inter, sans-serif", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <Sidebar
                rooms={rooms}
                onCreateRoom={() => setShowCreateModal(true)}
                onJoinRoom={() => setShowJoinModal(true)}
                onSelectRoom={(code) => navigate(`/${code}`)}
                onOpenSettings={() => setShowSettingsModal(true)}
                onOpenAbout={() => setShowAboutModal(true)}
                activeRoomCode={roomId || null}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
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
            <AboutModal
                isOpen={showAboutModal}
                onClose={() => setShowAboutModal(false)}
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
