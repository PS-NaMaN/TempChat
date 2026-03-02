import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check } from "lucide-react";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (code: string, password: string | null) => void;
}

function generateCode(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789#@&";
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function CreateRoomModal({ isOpen, onClose, onCreateRoom }: CreateRoomModalProps) {
  const [roomCode, setRoomCode] = useState(generateCode());
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRoomCode(generateCode());
      setPasswordProtect(false);
      setPassword("");
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    onCreateRoom(roomCode, passwordProtect ? password : null);
    onClose();
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
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Modal */}
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

            <h2 className="text-white mb-1" style={{ fontSize: "18px", fontWeight: 600 }}>Create a New Room</h2>
            <p className="text-[#666] mb-6" style={{ fontSize: "13px", fontWeight: 400 }}>
              Share the room code with someone to start chatting
            </p>

            {/* Room Code Display */}
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-xl mb-5"
              style={{ backgroundColor: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="text-white" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "20px", fontWeight: 500, letterSpacing: "0.08em" }}>
                {roomCode}
              </span>
              <button
                onClick={handleCopy}
                className="text-[#666] hover:text-[#6366f1] transition-colors cursor-pointer p-1"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Toggle */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#aaa]" style={{ fontSize: "13px", fontWeight: 400 }}>Password Protect this Room</span>
              <button
                onClick={() => setPasswordProtect(!passwordProtect)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer`}
                style={{ backgroundColor: passwordProtect ? "#6366f1" : "#333" }}
              >
                <motion.div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
                  animate={{ left: passwordProtect ? "22px" : "2px" }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Password Input */}
            <AnimatePresence>
              {passwordProtect && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set a password..."
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-[#555] mb-4 outline-none focus:ring-1 focus:ring-[#6366f1] transition-all"
                    style={{
                      backgroundColor: "#111",
                      border: "1px solid rgba(255,255,255,0.08)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "13px",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleCreate}
                className="w-full py-3 rounded-xl text-white transition-all duration-200 cursor-pointer hover:brightness-110"
                style={{
                  backgroundColor: "#6366f1",
                  boxShadow: "0 0 20px rgba(99, 102, 241, 0.25)",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Create Room
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-[#666] hover:text-white transition-colors cursor-pointer"
                style={{ fontSize: "13px", fontWeight: 400 }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
