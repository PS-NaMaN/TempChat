import { useState, useRef } from "react";
import { Lock, Shield, Send, Download, Trash2, Clock, ImagePlus, X, Menu, FileText, Music, Play } from "lucide-react";

interface Message {
  id: string;
  text: string;
  image?: string;
  imageBase64?: string;
  video?: string;
  videoBase64?: string;
  audio?: string;
  audioBase64?: string;
  pdf?: string;
  pdfBase64?: string;
  fileName?: string;
  fileSize?: string;
  sender: "me" | "other";
  time: string;
  pending?: boolean;
  progress?: number;
}

interface MainChatAreaProps {
  activeRoomCode: string | null;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onSendFile?: (file: File) => void;
  onClearChat: () => void;
  onExportChat: () => void;
  connectionStatus: string;
  fingerprint: string | null;
  onOpenSidebar: () => void;
}

export function MainChatArea({
  activeRoomCode,
  messages,
  onSendMessage,
  onSendFile,
  onClearChat,
  onExportChat,
  connectionStatus,
  fingerprint,
  onOpenSidebar
}: MainChatAreaProps) {
  const [input, setInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleSend = () => {
    if (input.trim() && activeRoomCode) {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf'];
    if (file && allowedTypes.some(type => file.type.startsWith(type) || file.type === type) && onSendFile) {
      onSendFile(file);
    }
    // Reset the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSendFile) {
      dragCounter.current++;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSendFile) {
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (onSendFile && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf'];
      if (allowedTypes.some(type => file.type.startsWith(type) || file.type === type)) {
        onSendFile(file);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!onSendFile || !activeRoomCode) return;

    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const type = items[i].type;
        if (type.startsWith("image/") || type.startsWith("video/") || type.startsWith("audio/") || type === "application/pdf") {
          const file = items[i].getAsFile();
          if (file) {
            onSendFile(file);
            e.preventDefault();
          }
        }
      }
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full transition-colors duration-200 relative"
      style={{ backgroundColor: "var(--bg-chat)", fontFamily: "Inter, sans-serif" }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Drag and Drop Overlay */}
      {isDragging && onSendFile && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-300">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-dashed border-[var(--accent)] bg-black/60 shadow-2xl scale-110 transform transition-transform duration-300">
            <div className="p-5 rounded-full bg-[var(--accent)] text-white shadow-lg animate-bounce">
              <ImagePlus className="w-10 h-10" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-xl font-bold text-white">Drop file to send</h3>
              <p className="text-white/60 text-sm">Release to share in the room</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div
        className={`flex ${activeRoomCode ? "flex-col md:flex-row" : "flex-row"} items-center justify-between px-3 sm:px-5 py-2 sm:py-3 min-h-[56px] sm:min-h-[60px] ${activeRoomCode ? "gap-2 md:gap-0" : "gap-0"}`}
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        {/* Connection Status - Top Center for Mobile */}
        {activeRoomCode && (
          <div className="flex md:hidden items-center justify-center gap-2 w-full pt-1">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionStatus === 'encrypted' ? 'bg-emerald-400' : (connectionStatus === 'peer_disconnected' || connectionStatus === 'room_full') ? 'hidden' : 'bg-yellow-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionStatus === 'encrypted' ? 'bg-emerald-400' : (connectionStatus === 'peer_disconnected' || connectionStatus === 'room_full') ? 'bg-red-500' : 'bg-yellow-400'}`} />
            </span>
            <span className={connectionStatus === 'encrypted' ? "text-emerald-400" : (connectionStatus === 'peer_disconnected' || connectionStatus === 'room_full') ? "text-red-500" : "text-yellow-400"} style={{ fontSize: "11px", fontWeight: 400 }}>
              {connectionStatus === 'disconnected' ? 'Disconnected' :
                connectionStatus === 'room_full' ? 'Room Full' :
                  connectionStatus === 'connecting' ? 'Connecting...' :
                    connectionStatus === 'connected' ? 'Connected (Exchanging Keys)' :
                      connectionStatus === 'encrypted' ? '🔒 Encrypted & Connected' :
                        connectionStatus === 'peer_disconnected' ? 'Peer disconnected' : connectionStatus}
            </span>
          </div>
        )}

        {/* Main Header Content Row */}
        <div className="flex items-center justify-between md:justify-start gap-2 sm:gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenSidebar}
              className="md:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col gap-0.5">
              {activeRoomCode ? (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-secondary)]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
                    <span className="hidden sm:inline">Room: </span>{activeRoomCode}
                  </span>
                  {fingerprint && (
                    <span className="hidden md:block text-[var(--text-faint)] opacity-80" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px" }}>
                      {fingerprint}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[var(--text-dark)]" style={{ fontSize: "13px" }}>No room selected</span>
              )}
            </div>
          </div>

          {/* Action Buttons for Mobile - Aligned with Menu/RoomCode */}
          {activeRoomCode && (
            <div className="flex md:hidden items-center gap-1">
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
          )}
        </div>

        {/* Desktop-only Right Side Content */}
        {activeRoomCode && (
          <div className="hidden md:flex flex-col items-end gap-1">
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
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 custom-scrollbar">
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
      <div className="px-3 sm:px-5 pb-5 pt-2">
        {onSendFile && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload-input"
          />
        )}
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
          {onSendFile && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeRoomCode}
              className="p-2 rounded-full transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center hover:bg-white/5"
              title="Send File"
              id="file-upload-button"
            >
              <ImagePlus className="w-4 h-4 text-[var(--text-faint)]" />
            </button>
          )}
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
  const [showModal, setShowModal] = useState(false);
  const isLong = msg.text && msg.text.length > 500;
  const displayText = isLong && !expanded ? msg.text.slice(0, 500) + "..." : msg.text;
  const imageSrc = msg.image || msg.imageBase64;
  const videoSrc = msg.video || msg.videoBase64;
  const audioSrc = msg.audio || msg.audioBase64;
  const pdfSrc = msg.pdf || msg.pdfBase64;

  return (
    <>
      <div
        className="max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl flex flex-col relative overflow-hidden"
        style={{
          backgroundColor: msg.sender === "me" ? "var(--accent)" : "var(--bg-chat-bubble-other)",
          borderBottomRightRadius: msg.sender === "me" ? "6px" : "16px",
          borderBottomLeftRadius: msg.sender === "other" ? "6px" : "16px",
        }}
      >
        {msg.progress !== undefined && msg.progress < 100 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-black/20">
            <div 
              className="h-full bg-white/50 transition-all duration-300 ease-out" 
              style={{ width: `${msg.progress}%` }} 
            />
          </div>
        )}

        {imageSrc && (
          <img
            src={imageSrc}
            alt="Shared image"
            className="rounded-xl mb-1.5 cursor-pointer hover:opacity-90 transition-opacity mt-1"
            style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'cover' }}
            onClick={() => setShowModal(true)}
          />
        )}

        {videoSrc && (
          <video
            src={videoSrc}
            controls
            preload="metadata"
            className="rounded-xl mb-1.5 mt-1"
            style={{ maxWidth: '100%', maxHeight: '300px' }}
          />
        )}

        {audioSrc && (
          <div className="flex flex-col gap-2 mt-1 mb-1.5 min-w-[200px] sm:min-w-[280px]">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/10 border border-white/5">
              <div className="p-2.5 rounded-full bg-[var(--accent)] text-white shadow-sm">
                <Music className="w-5 h-5" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[13px] font-medium text-white truncate" title={msg.fileName || "Audio file"}>
                  {msg.fileName || "Audio file"}
                </span>
                <span className="text-[10px] text-white/60">
                  {msg.fileSize || "Shared Audio"}
                </span>
              </div>
            </div>
            <audio src={audioSrc} controls className="w-full h-8 custom-audio-player" />
          </div>
        )}

        {pdfSrc && (
          <div className="flex flex-col gap-2 mt-1 mb-1.5 min-w-[200px] sm:min-w-[240px]">
            <a
              href={pdfSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-black/10 border border-white/5 hover:bg-black/20 transition-all group"
            >
              <div className="p-2.5 rounded-full bg-red-500/80 text-white shadow-sm group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col overflow-hidden flex-1">
                <span className="text-[13px] font-medium text-white truncate" title={msg.fileName || "Document.pdf"}>
                  {msg.fileName || "Document.pdf"}
                </span>
                <span className="text-[10px] text-white/60">
                  {msg.fileSize || "PDF Document"}
                </span>
              </div>
              <Download className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
            </a>
          </div>
        )}

        {displayText && (
          <p
            className="whitespace-pre-wrap break-words"
            style={{ color: msg.sender === "me" ? "var(--bg-chat-bubble-me-text)" : "var(--bg-chat-bubble-other-text)", fontSize: "14px", fontWeight: 400, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            {displayText}
          </p>
        )}

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`self-start mt-1 text-[11px] font-medium hover:underline ${msg.sender === "me" ? "text-white/80" : "text-[var(--text-muted)]"}`}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        <div
          className={`mt-1 flex items-center gap-1 ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
        >
          {msg.pending && (
            <span className="flex items-center gap-0.5 text-white/40">
              <Clock className="w-3 h-3" />
              <span style={{ fontSize: "9px" }}>Queued</span>
            </span>
          )}
          <p
            className={`${msg.sender === "me" ? "text-white/50" : "text-[var(--text-faint)]"}`}
            style={{ fontSize: "10px" }}
          >
            {msg.time}
          </p>
        </div>
      </div>

      {/* Lightbox Modal */}
      {showModal && imageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <button
            onClick={() => setShowModal(false)}
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-colors cursor-pointer rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={imageSrc}
            alt="Full size image"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
