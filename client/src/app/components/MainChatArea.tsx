import { useState } from "react";
import { Lock, Shield, Send, Download, Trash2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "me" | "other";
  time: string;
}

interface MainChatAreaProps {
  activeRoomCode: string | null;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onExportChat: () => void;
  connectionStatus: string;
  fingerprint: string | null;
}

export function MainChatArea({
  activeRoomCode,
  messages,
  onSendMessage,
  onClearChat,
  onExportChat,
  connectionStatus,
  fingerprint
}: MainChatAreaProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() && activeRoomCode && connectionStatus === 'encrypted') {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full transition-colors duration-200" style={{ backgroundColor: "var(--bg-chat)", fontFamily: "Inter, sans-serif" }}>
      {/* Top Bar */}
      <div
        className="flex justify-between px-5 py-3"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <div className="flex flex-col gap-1">
          {activeRoomCode ? (
            <span className="text-[var(--text-secondary)]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
              Room: {activeRoomCode}
            </span>
          ) : (
            <span className="text-[var(--text-dark)]" style={{ fontSize: "13px" }}>No room selected</span>
          )}
          {fingerprint && (
            <span className="text-[var(--text-faint)] opacity-80" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px" }}>
              {fingerprint}
            </span>
          )}
        </div>

        {activeRoomCode && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionStatus === 'encrypted' ? 'bg-emerald-400' : (connectionStatus === 'peer_disconnected' || connectionStatus === 'room_full') ? 'hidden' : 'bg-yellow-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionStatus === 'encrypted' ? 'bg-emerald-400' : (connectionStatus === 'peer_disconnected' || connectionStatus === 'room_full') ? 'bg-red-500' : 'bg-yellow-400'}`} />
              </span>
              <span className={connectionStatus === 'encrypted' ? "text-emerald-400" : (connectionStatus === 'peer_disconnected' || connectionStatus === 'room_full') ? "text-red-500" : "text-yellow-400"} style={{ fontSize: "12px", fontWeight: 400 }}>
                {connectionStatus === 'disconnected' ? 'Disconnected' :
                  connectionStatus === 'room_full' ? 'Room Full' :
                    connectionStatus === 'connecting' ? 'Connecting...' :
                      connectionStatus === 'connected' ? 'Connected (Exchanging Keys)' :
                        connectionStatus === 'encrypted' ? '🔒 Encrypted & Connected' :
                          connectionStatus === 'peer_disconnected' ? 'Peer disconnected' : connectionStatus}
              </span>
            </div>

            <div className="flex items-center gap-1 mt-1">
              <button onClick={onExportChat} className="p-2 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors cursor-pointer rounded-lg hover:bg-[var(--hover-bg)]" title="Export Chat">
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClearChat}
                className="p-2 text-[var(--text-faint)] hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-[var(--hover-bg)]"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {!activeRoomCode ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="p-6 rounded-full" style={{ backgroundColor: "var(--accent-transparent-1)" }}>
              <Shield className="w-12 h-12 text-[var(--text-darker)]" />
            </div>
            <h2 className="text-[var(--text-dark)]" style={{ fontSize: "20px", fontWeight: 500 }}>No active session</h2>
            <p className="text-[var(--text-darker)] text-center max-w-sm" style={{ fontSize: "14px", fontWeight: 400, lineHeight: 1.6 }}>
              Create or join a room to start a private, encrypted conversation
            </p>
          </div>
        ) : (
          /* Messages */
          <div className="flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full pt-20 gap-3">
                <Lock className="w-6 h-6 text-[var(--text-darker)]" />
                <p className="text-[var(--text-dark)]" style={{ fontSize: "13px" }}>
                  This conversation is end-to-end encrypted
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <MessageBubble msg={msg} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="px-5 pb-5 pt-2">
        <div
          className={`flex items-center gap-3 rounded-full px-4 py-2 transition-all ${activeRoomCode ? "" : "opacity-40"
            }`}
          style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border-light)" }}
        >
          <Lock className="w-4 h-4 text-[var(--text-darker)] flex-shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeRoomCode ? "Type a message..." : "Join a room to start chatting"}
            disabled={!activeRoomCode}
            className="flex-1 bg-transparent text-[var(--text-main)] placeholder-[var(--text-dark)] outline-none disabled:cursor-not-allowed"
            style={{ fontSize: "14px", fontWeight: 400 }}
          />
          <button
            onClick={handleSend}
            disabled={!activeRoomCode || !input.trim()}
            className="p-2 rounded-full transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              backgroundColor: input.trim() && activeRoomCode ? "var(--accent)" : "transparent",
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = msg.text.length > 500;

  const displayText = isLong && !expanded ? msg.text.slice(0, 500) + "..." : msg.text;

  return (
    <div
      className="max-w-[70%] px-4 py-2.5 rounded-2xl flex flex-col"
      style={{
        backgroundColor: msg.sender === "me" ? "var(--accent)" : "var(--bg-chat-bubble-other)",
        borderBottomRightRadius: msg.sender === "me" ? "6px" : "16px",
        borderBottomLeftRadius: msg.sender === "other" ? "6px" : "16px",
      }}
    >
      <p
        className="whitespace-pre-wrap break-words"
        style={{ color: msg.sender === "me" ? "var(--bg-chat-bubble-me-text)" : "var(--bg-chat-bubble-other-text)", fontSize: "14px", fontWeight: 400, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "break-word" }}
      >
        {displayText}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`self-start mt-1 text-[11px] font-medium hover:underline ${msg.sender === "me" ? "text-white/80" : "text-[var(--text-muted)]"}`}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      <p
        className={`mt-1 text-right ${msg.sender === "me" ? "text-white/50" : "text-[var(--text-faint)]"}`}
        style={{ fontSize: "10px" }}
      >
        {msg.time}
      </p>
    </div>
  );
}
