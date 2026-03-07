import { useState, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { CreateRoomModal } from "./components/CreateRoomModal";
import { JoinRoomModal } from "./components/JoinRoomModal";
import { MainChatArea } from "./components/MainChatArea";
import { SettingsModal } from "./components/SettingsModal";
import { useEffect } from "react";
interface Room {
  code: string;
  active: boolean;
  locked: boolean;
}

interface Message {
  id: string;
  text: string;
  sender: "me" | "other";
  time: string;
}

const initialRooms: Room[] = [
  { code: "xK9#mP2", active: true, locked: true },
  { code: "bR4&jL7", active: true, locked: false },
  { code: "nQ8@wT5", active: false, locked: true },
];

const sampleResponses = [
  "Got it, thanks!",
  "Let me check on that.",
  "Sounds good to me.",
  "Can you share more details?",
  "Perfect, I'll take care of it.",
  "Interesting, tell me more.",
];

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, Message[]>>({});

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

  const currentMessages = activeRoomCode ? messagesByRoom[activeRoomCode] || [] : [];

  const handleCreateRoom = useCallback((code: string, password: string | null) => {
    const newRoom: Room = { code, active: true, locked: !!password };
    setRooms((prev) => [newRoom, ...prev]);
    setActiveRoomCode(code);
  }, []);

  const handleJoinRoom = useCallback((code: string, _password: string) => {
    const exists = rooms.find((r) => r.code === code);
    if (!exists) {
      const newRoom: Room = { code, active: true, locked: false };
      setRooms((prev) => [newRoom, ...prev]);
    }
    setActiveRoomCode(code);
  }, [rooms]);

  const handleSelectRoom = useCallback((code: string) => {
    setActiveRoomCode(code);
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    if (!activeRoomCode) return;
    const newMsg: Message = {
      id: crypto.randomUUID(),
      text,
      sender: "me",
      time: getCurrentTime(),
    };
    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoomCode]: [...(prev[activeRoomCode] || []), newMsg],
    }));

    // Simulate reply
    setTimeout(() => {
      const reply: Message = {
        id: crypto.randomUUID(),
        text: sampleResponses[Math.floor(Math.random() * sampleResponses.length)],
        sender: "other",
        time: getCurrentTime(),
      };
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoomCode]: [...(prev[activeRoomCode] || []), reply],
      }));
    }, 800 + Math.random() * 1200);
  }, [activeRoomCode]);

  const handleClearChat = useCallback(() => {
    if (!activeRoomCode) return;
    setMessagesByRoom((prev) => ({ ...prev, [activeRoomCode]: [] }));
  }, [activeRoomCode]);

  return (
    <div className="h-full w-full flex" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar
        rooms={rooms}
        onCreateRoom={() => setShowCreateModal(true)}
        onJoinRoom={() => setShowJoinModal(true)}
        onSelectRoom={handleSelectRoom}
        onOpenSettings={() => setShowSettingsModal(true)}
        activeRoomCode={activeRoomCode}
      />
      <MainChatArea
        activeRoomCode={activeRoomCode}
        messages={currentMessages}
        onSendMessage={handleSendMessage}
        onClearChat={handleClearChat}
        onExportChat={() => { }}
        connectionStatus="encrypted"
        fingerprint={null}
      />
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
