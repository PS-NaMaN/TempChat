import { Lock, Plus, LogIn, Settings, Copy, Check, X, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

interface Room {
  code: string;
  active: boolean;
  locked: boolean;
}

interface SidebarProps {
  rooms: Room[];
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onSelectRoom: (code: string) => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  activeRoomCode: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ rooms, onCreateRoom, onJoinRoom, onSelectRoom, onOpenSettings, onOpenAbout, activeRoomCode, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 md:relative w-[280px] sm:w-[260px] min-w-[260px] h-full flex flex-col transition-transform duration-300 md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ backgroundColor: "var(--bg-sidebar)", fontFamily: "Inter, sans-serif", borderRight: "1px solid var(--border-light)" }}>
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={onClose}>
            <Lock className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-[var(--text-main)] tracking-widest uppercase" style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.15em" }}>TEMPCHAT</span>
          </Link>
          <button onClick={onClose} className="md:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-main)] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Buttons */}
      <div className="px-4 flex flex-col gap-2.5 mt-2">
        <button
          onClick={() => {
            onCreateRoom();
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white transition-all duration-200 cursor-pointer hover:brightness-110"
          style={{
            backgroundColor: "var(--accent)",
            boxShadow: "0 0 20px var(--accent-transparent-4)",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          <Plus className="w-4 h-4" />
          Create Room
        </button>
        <button
          onClick={() => {
            onJoinRoom();
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[var(--text-main)] border transition-all duration-200 cursor-pointer hover:bg-[var(--hover-bg)]"
          style={{
            borderColor: "var(--accent)",
            backgroundColor: "transparent",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          <LogIn className="w-4 h-4" />
          Join Room
        </button>
      </div>

      {/* Recent Rooms */}
      <div className="mt-8 px-4 flex-1">
        <span className="text-[var(--text-faint)] uppercase tracking-wider" style={{ fontSize: "10px", fontWeight: 600 }}>
          Recent Rooms
        </span>
        <div className="mt-3 flex flex-col gap-1">
          {rooms.map((room) => (
            <SidebarRoomItem
              key={room.code}
              room={room}
              isActive={activeRoomCode === room.code}
              onSelect={() => {
                onSelectRoom(room.code);
                onClose();
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-2 pt-1 flex flex-col gap-1">
        <button
          onClick={() => {
            onOpenAbout();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--hover-bg)] transition-all duration-150 cursor-pointer"
        >
          <Info className="w-4 h-4" />
          <span style={{ fontSize: "13px", fontWeight: 400 }}>About</span>
        </button>
        <button
          onClick={() => {
            onOpenSettings();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--hover-bg)] transition-all duration-150 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span style={{ fontSize: "13px", fontWeight: 400 }}>Settings</span>
        </button>
      </div>
      <div className="px-5 py-3 border-t border-[var(--border-light)]">
        <span className="text-[var(--text-dark)]" style={{ fontSize: "11px" }}>End-to-end encrypted</span>
      </div>
    </div>
    </>
  );
}

function SidebarRoomItem({ room, isActive, onSelect }: { room: Room, isActive: boolean, onSelect: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting the room
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={onSelect}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer text-left ${isActive ? "bg-[var(--hover-bg-strong)]" : "hover:bg-[var(--hover-bg)]"
        }`}
      style={{ backgroundColor: isActive ? "var(--accent-transparent-2)" : undefined }}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${room.active ? "bg-emerald-400" : "bg-[var(--text-dark)]"}`}
        style={room.active ? { boxShadow: "0 0 6px rgba(52, 211, 153, 0.5)" } : {}}
      />
      <span className="text-[var(--text-primary)] flex-1" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
        {room.code}
      </span>
      {room.locked && <Lock className="w-3 h-3 text-[var(--text-faint)] opacity-100 group-hover:hidden transition-opacity" />}

      <div
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)]"
        title="Copy room link"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </div>
    </button>
  );
}