import { motion, AnimatePresence } from "motion/react";
import { X, Shield, Lock, Zap, Server, User } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
            className="relative z-10 w-full max-w-lg rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]"
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
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--border-light)] flex items-center justify-between sticky top-0 z-20" style={{ backgroundColor: "var(--bg-panel)" }}>
              <h2 className="text-[var(--text-main)] overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: "18px", fontWeight: 600 }}>About TempChat</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--icon-muted)] hover:text-[var(--text-main)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Swiper/Scroll Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
              <div className="flex flex-col gap-8">
                {/* Introduction Section */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-[var(--accent)]">
                    <Zap className="w-5 h-5" />
                    <h3 className="uppercase tracking-widest text-xs font-bold">Purpose</h3>
                  </div>
                  <p className="text-[var(--text-primary)] leading-relaxed" style={{ fontSize: "14px" }}>
                    TempChat is a specialized communication platform designed for the exchange of highly sensitive information.
                    It serves as a secure, ephemeral bridge for sharing data that should never be permanently archived or
                    monitored by third parties. Whether it is administrative credentials, personal identifiers, or sensitive
                    media, TempChat ensures the information exists only as long as the session.
                  </p>
                </section>

                {/* Privacy Section */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-emerald-400">
                    <Shield className="w-5 h-5" />
                    <h3 className="uppercase tracking-widest text-xs font-bold">Privacy & Ephemerality</h3>
                  </div>
                  <ul className="flex flex-col gap-3">
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0" />
                      <p className="text-[var(--text-secondary)]" style={{ fontSize: "13.5px" }}>
                        <span className="text-[var(--text-main)] font-medium">Automatic Purging:</span> All rooms are ephemeral by nature, with a strict 24-hour time-to-live (TTL)
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0" />
                      <p className="text-[var(--text-secondary)]" style={{ fontSize: "13.5px" }}>
                        <span className="text-[var(--text-main)] font-medium">No Identity Requirements:</span> No accounts, phone numbers, or emails are required to create or join a session.
                      </p>
                    </li>
                  </ul>
                </section>

                {/* Technical Stack Section */}
                <section className="flex flex-col gap-4">
                  <div className="flex items-center gap-2.5 text-blue-400">
                    <Lock className="w-5 h-5" />
                    <h3 className="uppercase tracking-widest text-xs font-bold">Technical Security</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-input)]">
                      <h4 className="text-[var(--text-main)] text-sm font-semibold mb-1">AES-GCM 256-bit</h4>
                      <p className="text-[var(--text-faint)] text-xs leading-relaxed">Industry-standard authenticated encryption ensures message confidentiality and integrity.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-input)]">
                      <h4 className="text-[var(--text-main)] text-sm font-semibold mb-1">ECDH (P-256)</h4>
                      <p className="text-[var(--text-faint)] text-xs leading-relaxed">Elliptic Curve Diffie-Hellman provides Perfect Forward Secrecy for every unique session.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-input)]">
                      <h4 className="text-[var(--text-main)] text-sm font-semibold mb-1">WebRTC (P2P)</h4>
                      <p className="text-[var(--text-faint)] text-xs leading-relaxed">Data flows directly between peers. Messages never pass through the server's application layer.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-input)]">
                      <h4 className="text-[var(--text-main)] text-sm font-semibold mb-1">Argon2 Hashing</h4>
                      <p className="text-[var(--text-faint)] text-xs leading-relaxed">Room passwords are protected by memory-hard Argon2 hashing, resistant to GPU-based attacks.</p>
                    </div>
                  </div>
                </section>

                {/* Infrastructure Section */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-amber-400">
                    <Server className="w-5 h-5" />
                    <h3 className="uppercase tracking-widest text-xs font-bold">Infrastructure</h3>
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed" style={{ fontSize: "13.5px" }}>
                    TempChat operates as a trustless system. The server acts solely as a signaling coordinator to establish
                    the initial Peer-to-Peer connection. Once the connection is encrypted, the signaling server has no knowledge
                    of the traffic content or the encryption keys generated locally on your device.
                  </p>
                </section>

                {/* Creator Section */}
                <section className="mt-2 pt-6 border-t border-[var(--border-light)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold">
                      ND
                    </div>
                    <div>
                      <h4 className="text-[var(--text-main)] text-sm font-semibold">Naman Sinha</h4>
                      <p className="text-[var(--text-faint)] text-xs">Software Developer</p>
                    </div>
                  </div>
                  <div className="text-[var(--text-dark)] text-[10px] font-mono uppercase tracking-widest">
                    v1.0.0
                  </div>
                </section>
              </div>
            </div>

            {/* Footer Action */}
            <div className="px-6 py-4 border-t border-[var(--border-light)] flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-white font-medium transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: "var(--accent)" }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
