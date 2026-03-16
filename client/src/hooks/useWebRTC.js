import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useChatStore } from '../store/chatStore';
import { generateECDHKeys, deriveSharedKey, generateFingerprint, encryptMessage } from './useCrypto';

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

const IMAGE_CHUNK_SIZE = 16 * 1024; // 16KB chunks

export function useWebRTC(roomId, password, onMessageDecrypted, onImageReceived) {
    const socketRef = useRef(null);
    const pcRef = useRef(null);
    const dcRef = useRef(null);
    const imageBufferRef = useRef({});

    // Store callbacks in refs to avoid re-creating setupDataChannel/initWebRTC
    // when the callbacks change, which would tear down the entire WebRTC connection.
    const onMessageDecryptedRef = useRef(onMessageDecrypted);
    const onImageReceivedRef = useRef(onImageReceived);
    onMessageDecryptedRef.current = onMessageDecrypted;
    onImageReceivedRef.current = onImageReceived;

    const {
        setConnectionStatus, setRole, setFingerprint, setSharedKey,
        sharedKey
    } = useChatStore();

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
                    if (onMessageDecryptedRef.current) {
                        onMessageDecryptedRef.current(payload.iv, payload.ciphertext);
                    }
                } else if (payload.type === 'image-start') {
                    // Start buffering a new incoming image
                    imageBufferRef.current[payload.transferId] = {
                        totalChunks: payload.totalChunks,
                        fileName: payload.fileName,
                        fileType: payload.fileType,
                        iv: payload.iv,
                        msgId: payload.msgId,
                        time: payload.time,
                        chunks: []
                    };
                } else if (payload.type === 'image-chunk') {
                    const buf = imageBufferRef.current[payload.transferId];
                    if (buf) {
                        buf.chunks[payload.index] = payload.data;
                        // Check if all chunks received
                        const received = buf.chunks.filter(Boolean).length;
                        if (received === buf.totalChunks) {
                            // Reconstruct the full encrypted array
                            const fullArray = buf.chunks.flat();
                            if (onImageReceivedRef.current) {
                                onImageReceivedRef.current({
                                    iv: buf.iv,
                                    ciphertext: fullArray,
                                    fileName: buf.fileName,
                                    fileType: buf.fileType,
                                    msgId: buf.msgId,
                                    time: buf.time
                                });
                            }
                            delete imageBufferRef.current[payload.transferId];
                        }
                    }
                }
            } catch (e) {
                console.error("Message handling error:", e);
            }
        };

        dc.onclose = () => {
            setConnectionStatus('peer_disconnected');
        };
    }, [generateECDHKeys, deriveSharedKey, generateFingerprint, setConnectionStatus, setSharedKey, setFingerprint]);

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
        socketRef.current = io(SIGNALING_SERVER_URL, {
            transports: ['polling', 'websocket']
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to signaling server:', socketRef.current.id);
            socketRef.current.emit('join_room', { roomId, password }, async (response) => {
                if (response.error) {
                    console.error("WebRTC Join Error:", response.error);
                    setConnectionStatus(response.error === 'Room not found' ? 'disconnected (expired)' : response.error === 'Room is full' ? 'room_full' : 'disconnected');
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
                    await initWebRTC(role);
                }
            });
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('Signaling Connect Error:', err.message);
            console.error('Error Details:', err);
        });

        socketRef.current.on('disconnect', (reason) => {
            console.log('Signaling Disconnected:', reason);
            if (reason === 'io server disconnect') {
                socketRef.current.connect();
            }
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

    const sendImageChunks = async (encryptedData, meta) => {
        // encryptedData: { iv, ciphertext (number[]) }
        // meta: { transferId, fileName, fileType, msgId, time }
        if (dcRef.current?.readyState !== 'open') return false;

        const cipherArray = encryptedData.ciphertext;
        const totalChunks = Math.ceil(cipherArray.length / IMAGE_CHUNK_SIZE);

        // Send start message
        dcRef.current.send(JSON.stringify({
            type: 'image-start',
            transferId: meta.transferId,
            totalChunks,
            fileName: meta.fileName,
            fileType: meta.fileType,
            iv: encryptedData.iv,
            msgId: meta.msgId,
            time: meta.time
        }));

        // Send chunks
        for (let i = 0; i < totalChunks; i++) {
            const start = i * IMAGE_CHUNK_SIZE;
            const end = Math.min(start + IMAGE_CHUNK_SIZE, cipherArray.length);
            const chunk = cipherArray.slice(start, end);

            dcRef.current.send(JSON.stringify({
                type: 'image-chunk',
                transferId: meta.transferId,
                index: i,
                data: chunk
            }));

            // Small delay between chunks to avoid overwhelming the channel
            if (i < totalChunks - 1) {
                await new Promise(r => setTimeout(r, 5));
            }
        }

        return true;
    };

    return { sendMessage: sendTransportMessage, sendImageChunks };
}
