import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useChatStore } from '../store/chatStore';
import { useCrypto } from './useCrypto';

const SIGNALING_SERVER_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001';

const iceServers = [
    { urls: "stun:stun.l.google.com:19302" }
];
if (import.meta.env.VITE_TURN_URL) {
    iceServers.push({
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL
    });
}

const iceConfig = { iceServers };

export function useWebRTC(roomId, password, onMessageDecrypted) {
    const socketRef = useRef(null);
    const pcRef = useRef(null);
    const dcRef = useRef(null);

    const {
        setConnectionStatus, setRole, setFingerprint, setSharedKey,
        sharedKey
    } = useChatStore();
    const {
        generateECDHKeys, deriveSharedKey, generateFingerprint, encryptMessage
    } = useCrypto();

    const keysRef = useRef(null);

    const setupDataChannel = useCallback((dc) => {
        dcRef.current = dc;
        dc.onopen = async () => {
            setConnectionStatus('connected');

            const keys = await generateECDHKeys();
            keysRef.current = keys;

            dc.send(JSON.stringify({
                type: 'key-exchange',
                jwk: keys.jwk
            }));
        };

        dc.onmessage = async (event) => {
            try {
                const payload = JSON.parse(event.data);

                if (payload.type === 'key-exchange') {
                    const remoteJwk = payload.jwk;

                    const derivedKey = await deriveSharedKey(keysRef.current.keyPair.privateKey, remoteJwk);
                    setSharedKey(derivedKey);

                    const fingerprint = await generateFingerprint(keysRef.current.jwk, remoteJwk);
                    setFingerprint(fingerprint);

                    setConnectionStatus('encrypted');
                } else if (payload.type === 'chat-message') {
                    if (onMessageDecrypted) {
                        onMessageDecrypted(payload.iv, payload.ciphertext);
                    }
                }
            } catch (e) {
                console.error("Message handling error:", e);
            }
        };

        dc.onclose = () => {
            setConnectionStatus('peer_disconnected');
        };
    }, [generateECDHKeys, deriveSharedKey, generateFingerprint, setConnectionStatus, setSharedKey, setFingerprint, onMessageDecrypted]);

    const initWebRTC = useCallback(async (role) => {
        pcRef.current = new RTCPeerConnection(iceConfig);

        pcRef.current.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice_candidate', {
                    roomId,
                    candidate: event.candidate
                });
            }
        };

        if (role === 'offerer') {
            const dc = pcRef.current.createDataChannel('chat');
            setupDataChannel(dc);

            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            socketRef.current.emit('webrtc_offer', { roomId, sdp: offer });
        } else {
            pcRef.current.ondatachannel = (event) => {
                setupDataChannel(event.channel);
            };
        }
    }, [roomId, setupDataChannel]);

    useEffect(() => {
        if (!roomId) return;

        setConnectionStatus('connecting');
        socketRef.current = io(SIGNALING_SERVER_URL);

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join_room', { roomId, password }, async (response) => {
                if (response.error) {
                    console.error(response.error);
                    setConnectionStatus('disconnected');
                    alert(response.error);
                    return;
                }

                const role = response.role;
                setRole(role);

                if (role === 'answerer') {
                    await initWebRTC(role);
                }
            });
        });

        socketRef.current.on('peer_joined', async () => {
            const state = useChatStore.getState();
            if (state.role === 'offerer') {
                if (pcRef.current) pcRef.current.close(); // Reset PC on new join
                await initWebRTC('offerer');
            }
        });

        socketRef.current.on('webrtc_offer', async ({ sdp }) => {
            if (!pcRef.current) {
                // We might be answerer but PC not initialized yet?
                await initWebRTC('answerer');
            }
            if (pcRef.current) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(answer);
                socketRef.current.emit('webrtc_answer', { roomId, sdp: answer });
            }
        });

        socketRef.current.on('webrtc_answer', async ({ sdp }) => {
            if (pcRef.current && pcRef.current.signalingState !== 'stable') {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        });

        socketRef.current.on('ice_candidate', async ({ candidate }) => {
            try {
                if (pcRef.current) {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (e) {
                console.error("Error adding ice candidate", e);
            }
        });

        socketRef.current.on('peer_disconnected', () => {
            setConnectionStatus('peer_disconnected');
            if (pcRef.current) pcRef.current.close();
            pcRef.current = null;
            setSharedKey(null);
            setFingerprint(null);
        });

        return () => {
            if (dcRef.current) dcRef.current.close();
            if (pcRef.current) pcRef.current.close();
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [roomId, password, initWebRTC, setConnectionStatus, setRole, setSharedKey, setFingerprint]);

    const sendTransportMessage = async (messageText) => {
        const currentSharedKey = useChatStore.getState().sharedKey;
        if (dcRef.current?.readyState === 'open' && currentSharedKey) {
            const { iv, ciphertext } = await encryptMessage(currentSharedKey, messageText);
            dcRef.current.send(JSON.stringify({
                type: 'chat-message',
                iv,
                ciphertext
            }));
            return { iv, ciphertext };
        }
        return null;
    };

    return { sendMessage: sendTransportMessage };
}
