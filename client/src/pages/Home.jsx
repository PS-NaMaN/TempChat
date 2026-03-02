import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Plus, Shield } from 'lucide-react';

export default function Home() {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleCreateRoom = async () => {
        setIsLoading(true);
        try {
            // Generate 8-char crypto random string
            const array = new Uint8Array(4); // 4 bytes = 8 hex chars
            window.crypto.getRandomValues(array);
            const roomId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

            const API_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001';

            const res = await fetch(`${API_URL}/api/rooms/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId,
                    password: password || undefined
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Redirect and pass the password securely via React Router state
                navigate(`/${roomId}`, { state: { password: password || undefined } });
            } else {
                alert(data.error || 'Failed to create room');
            }
        } catch (e) {
            console.error(e);
            alert('Network error while creating room');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-white min-h-screen">
            <div className="w-full max-w-md flex flex-col items-center gap-6">

                {/* App Title */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-[#6366f1] rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                        Cipher
                    </h1>
                </div>

                <p className="text-center text-[#888] text-[15px] mb-6">
                    A completely anonymous, privacy-first ephemeral P2P chat. No history on servers.
                </p>

                {/* Create Card */}
                <div className="w-full bg-[#111] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-[#888] font-medium tracking-wide uppercase px-1">
                            Room Password (Optional)
                        </label>
                        <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 transition-colors focus-within:border-[#6366f1]/50">
                            <Lock className="w-4 h-4 text-[#555]" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Leave blank for no password"
                                className="flex-1 bg-transparent text-white outline-none placeholder-[#444] text-[14px]"
                            />
                        </div>
                        <p className="text-[11px] text-[#555] px-1 mt-1">
                            Passwords are only hashed with Argon2 on the server.
                        </p>
                    </div>

                    <button
                        onClick={handleCreateRoom}
                        disabled={isLoading}
                        className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white transition-all duration-200 cursor-pointer hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            backgroundColor: "#6366f1",
                            boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
                            fontSize: "15px",
                            fontWeight: 500,
                        }}
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <Plus className="w-5 h-5" />
                                Create Secure Room
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
