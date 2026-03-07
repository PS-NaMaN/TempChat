import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, AlertTriangle, Palette, Moon, Sun, Monitor } from "lucide-react";
import { useStorage } from "../../hooks/useStorage";
import { useNavigate } from "react-router-dom";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: string;
    setTheme: (theme: string) => void;
    accent: string;
    setAccent: (accent: string) => void;
}

const PRESET_ACCENTS = [
    "#6366f1", // Indigo (default)
    "#ec4899", // Pink
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
];

export function SettingsModal({ isOpen, onClose, theme, setTheme, accent, setAccent }: SettingsModalProps) {
    const { clearAllData } = useStorage();
    const navigate = useNavigate();

    const handleClearAllData = async () => {
        if (confirm("Are you sure? This will permanently delete all chat history, keys, and saved rooms from your browser.")) {
            await clearAllData();
            alert("All local data has been cleared.");
            navigate("/");
            window.location.reload(); // Hard refresh to reset all state
        }
    };

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
                        className="relative z-10 w-full max-w-sm rounded-2xl p-6 flex flex-col gap-6"
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

                        <h2 className="text-[var(--text-main)]" style={{ fontSize: "18px", fontWeight: 600 }}>Settings</h2>

                        <div className="flex flex-col gap-5">
                            {/* Theme Options */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[var(--text-secondary)] uppercase tracking-wider" style={{ fontSize: "10px", fontWeight: 600 }}>
                                    Appearance
                                </span>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setTheme("slate")}
                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${theme === "slate"
                                            ? "border-[var(--accent)] bg-[var(--accent-transparent-1)] text-[var(--accent)]"
                                            : "border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--hover-bg)]"
                                            }`}
                                    >
                                        <Monitor className="w-4 h-4" />
                                        <span style={{ fontSize: "11px", fontWeight: 500 }}>Slate</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("amoled")}
                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${theme === "amoled"
                                            ? "border-[var(--accent)] bg-[var(--accent-transparent-1)] text-[var(--accent)]"
                                            : "border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--hover-bg)]"
                                            }`}
                                    >
                                        <Moon className="w-4 h-4" />
                                        <span style={{ fontSize: "11px", fontWeight: 500 }}>AMOLED</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("light")}
                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${theme === "light"
                                            ? "border-[var(--accent)] bg-[var(--accent-transparent-1)] text-[var(--accent)]"
                                            : "border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--hover-bg)]"
                                            }`}
                                    >
                                        <Sun className="w-4 h-4" />
                                        <span style={{ fontSize: "11px", fontWeight: 500 }}>Light</span>
                                    </button>
                                </div>
                            </div>

                            {/* Accent Color Options */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[var(--text-secondary)] uppercase tracking-wider" style={{ fontSize: "10px", fontWeight: 600 }}>
                                        Accent Color
                                    </span>
                                </div>
                                <div className="flex gap-2 items-center flex-wrap">
                                    {PRESET_ACCENTS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setAccent(color)}
                                            className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center border-2 border-[var(--bg-panel)]"
                                            style={{ backgroundColor: color, outline: accent === color ? `2px solid ${color}` : "none" }}
                                        />
                                    ))}
                                    <div className="w-[1px] h-4 bg-[var(--border-light)] mx-1" />
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-[var(--bg-panel)] flex-shrink-0 cursor-pointer" style={{ outline: !PRESET_ACCENTS.includes(accent) ? `2px solid ${accent}` : "none", backgroundColor: accent }}>
                                        <Palette className="w-3 h-3 text-white mix-blend-difference absolute inset-0 m-auto pointer-events-none opacity-50" />
                                        <input
                                            type="color"
                                            value={accent}
                                            onChange={(e) => setAccent(e.target.value)}
                                            className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div
                                className="p-4 rounded-xl flex flex-col gap-3 mt-2"
                                style={{ backgroundColor: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}
                            >
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="text-red-500 font-medium text-sm mb-1">Danger Zone</h3>
                                        <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                                            Delete everything stored locally in your browser. This action cannot be reversed, and all histories and keys will be lost permanently.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleClearAllData}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg text-white transition-all duration-200 cursor-pointer hover:brightness-110 bg-red-500"
                                    style={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear All Local Data
                                </button>
                            </div>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
