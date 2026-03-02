import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (code: string, password: string) => void;
}

export function JoinRoomModal({ isOpen, onClose, onJoinRoom }: JoinRoomModalProps) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const handleJoin = () => {
    if (code.trim()) {
      onJoinRoom(code, password);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 w-full max-w-md mx-4 rounded-2xl p-6"
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
              fontFamily: "Inter, sans-serif",
            }}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#555] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-white mb-1" style={{ fontSize: "18px", fontWeight: 600 }}>Join a Room</h2>
            <p className="text-[#666] mb-6" style={{ fontSize: "13px", fontWeight: 400 }}>
              Enter the room code to connect
            </p>

            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter room code..."
              className="w-full px-4 py-3 rounded-xl text-white placeholder-[#555] mb-3 outline-none focus:ring-1 focus:ring-[#6366f1] transition-all"
              style={{
                backgroundColor: "#111",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "14px",
              }}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (if required)"
              className={`w-full px-4 py-3 rounded-xl placeholder-[#555] mb-2 outline-none focus:ring-1 focus:ring-[#6366f1] transition-all ${
                code.trim() ? "text-white" : "text-[#333] opacity-50"
              }`}
              disabled={!code.trim()}
              style={{
                backgroundColor: "#111",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "Inter, sans-serif",
                fontSize: "13px",
              }}
            />

            <div className="mt-4">
              <button
                onClick={handleJoin}
                disabled={!code.trim()}
                className="w-full py-3 rounded-xl text-white transition-all duration-200 cursor-pointer hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#6366f1",
                  boxShadow: code.trim() ? "0 0 20px rgba(99, 102, 241, 0.25)" : "none",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Join
              </button>
            </div>

            <p className="text-center text-[#444] mt-4" style={{ fontSize: "11px" }}>
              Room codes are case-sensitive
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
