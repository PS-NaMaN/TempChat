import { Lock, Plus, LogIn, Settings } from "lucide-react";

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
  activeRoomCode: string | null;
}

export function Sidebar({ rooms, onCreateRoom, onJoinRoom, onSelectRoom, activeRoomCode }: SidebarProps) {
  return (
    <div className="w-[260px] min-w-[260px] h-full flex flex-col" style={{ backgroundColor: "#0f0f0f", fontFamily: "Inter, sans-serif" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 pt-6 pb-4">
        <Lock className="w-4 h-4 text-[#6366f1]" />
        <span className="text-white tracking-widest" style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "0.15em" }}>CIPHER</span>
      </div>

      {/* Buttons */}
      <div className="px-4 flex flex-col gap-2.5 mt-2">
        <button
          onClick={onCreateRoom}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white transition-all duration-200 cursor-pointer hover:brightness-110"
          style={{
            backgroundColor: "#6366f1",
            boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          <Plus className="w-4 h-4" />
          Create Room
        </button>
        <button
          onClick={onJoinRoom}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white border transition-all duration-200 cursor-pointer hover:bg-white/5"
          style={{
            borderColor: "#6366f1",
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
        <span className="text-[#555] uppercase tracking-wider" style={{ fontSize: "10px", fontWeight: 600 }}>
          Recent Rooms
        </span>
        <div className="mt-3 flex flex-col gap-1">
          {rooms.map((room) => (
            <button
              key={room.code}
              onClick={() => onSelectRoom(room.code)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer text-left ${
                activeRoomCode === room.code ? "bg-white/10" : "hover:bg-white/5"
              }`}
              style={{ backgroundColor: activeRoomCode === room.code ? "rgba(99,102,241,0.12)" : undefined }}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${room.active ? "bg-emerald-400" : "bg-[#444]"}`}
                style={room.active ? { boxShadow: "0 0 6px rgba(52, 211, 153, 0.5)" } : {}}
              />
              <span className="text-[#ccc] flex-1" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
                {room.code}
              </span>
              {room.locked && <Lock className="w-3 h-3 text-[#555]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-2 pt-1">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#888] hover:text-white hover:bg-white/5 transition-all duration-150 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span style={{ fontSize: "13px", fontWeight: 400 }}>Settings</span>
        </button>
      </div>
      <div className="px-5 py-3 border-t border-white/5">
        <span className="text-[#444]" style={{ fontSize: "11px" }}>End-to-end encrypted</span>
      </div>
    </div>
  );
}