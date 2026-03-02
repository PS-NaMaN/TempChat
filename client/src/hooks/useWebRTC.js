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

                    // Await in case remote sent keys faster than our own WebCrypto generation
                    let retries = 0;
                    while (!keysRef.current && retries < 40) {
                        await new Promise(r => setTimeout(r, 50));
                        retries++;
                    }
                    if (!keysRef.current) throw new Error("Keys not ready after waiting");

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
                    console.error("WebRTC Error:", response.error);
                    setConnectionStatus(response.error === 'Room not found' ? 'disconnected (expired)' : 'disconnected');
                    if (response.error !== 'Room not found' && response.error !== 'Room is full') {
                        alert(response.error);
                    }
                    return;
                }

                const { role, usersCount } = response;
                setRole(role);

                if (role === 'answerer') {
                    await initWebRTC(role);
                } else if (role === 'offerer' && usersCount > 1) {
                    // the offerer has rejoined a room where the answerer is already waiting
                    await initWebRTC(role);
                }
            });
        });

        let pendingCandidates = [];

        socketRef.current.on('peer_joined', async () => {
            const state = useChatStore.getState();
            // Only the offerer should proactively reset and send a new offer when someone joins
            if (state.role === 'offerer') {
                if (pcRef.current) pcRef.current.close();
                pendingCandidates = [];
                await initWebRTC('offerer');
            }
            // Answerers gracefully wait for the `webrtc_offer` event to arrive.
        });

        socketRef.current.on('webrtc_offer', async ({ sdp }) => {
            // If an offer arrives, we clean up any old connection and start fresh to prevent race conditions
            if (pcRef.current) pcRef.current.close();
            pendingCandidates = [];

            await initWebRTC('answerer');

            await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socketRef.current.emit('webrtc_answer', { roomId, sdp: answer });

            // Process any ICE candidates that arrived early
            while (pendingCandidates.length > 0) {
                const c = pendingCandidates.shift();
                pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error("ICE error", e));
            }
        });

        socketRef.current.on('webrtc_answer', async ({ sdp }) => {
            if (pcRef.current && pcRef.current.signalingState !== 'stable') {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

                while (pendingCandidates.length > 0) {
                    const c = pendingCandidates.shift();
                    pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error("ICE error", e));
                }
            }
        });

        socketRef.current.on('ice_candidate', async ({ candidate }) => {
            if (pcRef.current && pcRef.current.remoteDescription) {
                pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("ICE error", e));
            } else {
                pendingCandidates.push(candidate);
            }
        });

        const handleBeforeUnload = () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        socketRef.current.on('peer_disconnected', () => {
            setConnectionStatus('peer_disconnected');
            if (pcRef.current) pcRef.current.close();
            pcRef.current = null;
            setSharedKey(null);
            setFingerprint(null);
        });

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (dcRef.current) dcRef.current.close();
            if (pcRef.current) pcRef.current.close();
            if (socketRef.current) socketRef.current.disconnect();

            dcRef.current = null;
            pcRef.current = null;
            socketRef.current = null;
            keysRef.current = null;
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
