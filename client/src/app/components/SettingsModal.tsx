import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { useStorage } from "../../hooks/useStorage";
import { useNavigate } from "react-router-dom";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
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
                        className="relative z-10 w-full max-w-sm rounded-2xl p-6"
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

                        <h2 className="text-white mb-6" style={{ fontSize: "18px", fontWeight: 600 }}>Settings</h2>

                        <div className="flex flex-col gap-4">
                            <div
                                className="p-4 rounded-xl flex flex-col gap-3"
                                style={{ backgroundColor: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                            >
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="text-red-500 font-medium text-sm mb-1">Danger Zone</h3>
                                        <p className="text-[#888] text-xs leading-relaxed">
                                            Delete everything stored locally in your browser. This action cannot be reversed, and all histories and keys will be lost permanently.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleClearAllData}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg text-white transition-all duration-200 cursor-pointer hover:brightness-110"
                                    style={{
                                        backgroundColor: "#ef4444",
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
