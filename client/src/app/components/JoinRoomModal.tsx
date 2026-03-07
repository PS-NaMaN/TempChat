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
              backgroundColor: "var(--bg-panel)",
              border: "1px solid var(--border-light)",
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
              className="absolute top-4 right-4 text-[var(--icon-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-[var(--text-main)] mb-1" style={{ fontSize: "18px", fontWeight: 600 }}>Join a Room</h2>
            <p className="text-[var(--text-muted)] mb-6" style={{ fontSize: "13px", fontWeight: 400 }}>
              Enter the room code to connect
            </p>

            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter room code..."
              className="w-full px-4 py-3 rounded-xl text-[var(--text-main)] placeholder-[var(--text-faint)] mb-3 outline-none transition-all"
              style={{
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-medium)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "14px",
              }}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (if required)"
              className={`w-full px-4 py-3 rounded-xl placeholder-[var(--text-faint)] mb-2 outline-none transition-all ${code.trim() ? "text-[var(--text-main)]" : "text-[var(--text-darker)] opacity-50"
                }`}
              disabled={!code.trim()}
              style={{
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-medium)",
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
                  backgroundColor: "var(--accent)",
                  boxShadow: code.trim() ? "0 0 20px var(--accent-transparent-3)" : "none",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Join
              </button>
            </div>

            <p className="text-center text-[var(--text-dark)] mt-4" style={{ fontSize: "11px" }}>
              Room codes are case-sensitive
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
