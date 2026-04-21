export const generateECDHKeys = async () => {
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        false,
        ["deriveKey"]
    );
    const jwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    return { keyPair, jwk };
};

export const deriveSharedKey = async (localPrivateKey, remoteJwk) => {
    const remotePublicKey = await window.crypto.subtle.importKey(
        "jwk",
        remoteJwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );
    return await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: remotePublicKey },
        localPrivateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
};

export const encryptMessage = async (sharedKey, messageText) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(messageText);
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        encodedMessage
    );
    return {
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(ciphertextBuffer))
    };
};

export const decryptMessage = async (sharedKey, ivArray, ciphertextArray) => {
    const iv = new Uint8Array(ivArray);
    const ciphertext = new Uint8Array(ciphertextArray);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        ciphertext
    );
    return new TextDecoder().decode(decryptedBuffer);
};

export const encryptBinary = async (sharedKey, arrayBuffer) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        arrayBuffer
    );
    return { iv: new Uint8Array(iv), ciphertext: new Uint8Array(ciphertextBuffer) };
};

export const decryptBinary = async (sharedKey, ivArray, ciphertextArray) => {
    const iv = new Uint8Array(ivArray);
    const ciphertext = new Uint8Array(ciphertextArray);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        ciphertext
    );
    return decryptedBuffer;
};

export const generateFingerprint = async (localJwk, remoteJwk) => {
    const sortedKeys = [localJwk.x, remoteJwk.x].sort();
    const combined = sortedKeys.join("-");
    const hashBuffer = await window.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(combined)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `🔑 Session: ${hexHash.substring(0, 8)}`;
};
