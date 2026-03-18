# 🔒 TempChat

**Visit: https://temp-chat-lemon.vercel.app
**Ephemeral, End-to-End Encrypted, Peer-to-Peer Communication.**

TempChat is a privacy-first, open-source communication platform designed for the exchange of highly sensitive information. It serves as a secure, temporary bridge for sharing data that should never be permanently archived or monitored by third parties.

---

## ✨ Key Features

- **End-to-End Encryption (E2EE)**: Messages are encrypted locally using AES-GCM (256-bit) before ever leaving your device.
- **Perfect Forward Secrecy**: Uses ECDH (P-256) for a unique key exchange per session.
- **True Peer-to-Peer**: Powered by WebRTC DataChannels. Messages flow directly between peers, bypassing the server entirely once the connection is established.
- **Zero-Storage Philosophy**: The signaling server acts only as a coordinator. No chat data, IP addresses (beyond signaling), or metadata are stored on any server.
- **Ephemeral Rooms**: Rooms and their temporary local history are automatically purged after 24 hours of inactivity.
- **No Identity Requirements**: Create and join rooms without accounts, emails, or phone numbers.
- **Rich Aesthetics**: Responsive design with support for multiple themes (Slate, AMOLED, Light) and custom accent colors.

---

## 🛠 Technical Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS 4.0
- **Animations**: Framer Motion
- **State Management**: Zustand
- **P2P Networking**: WebRTC (RTCPeerConnection)
- **Encryption**: Web Crypto API (SubtleCrypto)
- **Icons**: Lucide React

### Backend (Signaling)
- **Runtime**: Node.js
- **Framework**: Express
- **Real-time**: Socket.io
- **Security**: Argon2 for memory-hard room password hashing

---

## 🔒 Security Architecture

TempChat operates as a **trustless system**.

1.  **Key Exchange**: When two peers connect, they generate temporary ECDH key pairs. They exchange public keys via the signaling server and derive a shared 256-bit AES key locally.
2.  **Encryption**: Every message, image chunk, and file is encrypted using the derived shared key with a unique IV (Initialization Vector) for each packet.
3.  **Transport**: Encrypted payloads are sent through a WebRTC DataChannel. The signaling server is only aware that two users are connected; it cannot decrypt or even see the traffic.
4.  **Hashing**: If a room is password-protected, the server only stores a salted Argon2 hash of the password to verify access during the signaling phase.

> [!WARNING]
> **P2P Connectivity**: TempChat does not use TURN servers to maintain total peer-to-peer integrity. There is a small chance (est. 10%) that restrictive ISP NATs or firewalls may block connections. In such cases, using a VPN can often resolve the issue.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [npm](https://www.npmjs.com/)

### 1. Clone the repository
```bash
git clone https://github.com/PS-NaMaN/TempChat.git
cd TempChat
```

### 2. Setup Signaling Server
```bash
cd server
npm install
npm start
```
By default, the server runs on `http://localhost:3001`.

### 3. Setup Client
```bash
cd ../client
npm install
npm run dev
```
Open `http://localhost:5173` in two different browser windows to start testing.

---

## 🤝 Contributing

TempChat is an open-source project. Contributions, bug reports, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

Built with 💜 by [Naman Sinha](https://github.com/PS-NaMaN)
