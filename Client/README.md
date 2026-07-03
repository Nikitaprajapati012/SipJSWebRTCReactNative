# Client application - Ventrilo

Ventrilo is a production-quality React Native audio calling application utilizing **SIP.js** for signaling and **WebRTC** for real-time media exchange. It connects to a customized Node.js Socket.IO mock SIP server, simulating standard VoIP operations without requiring a real PBX/SIP server backend.

---

## 🏗️ Architectural Overview

The application is built on a decoupled architecture separating **Signaling** (negotiation and session control) and **Media** (raw RTP audio data streams).

```
 ┌────────────────────────────────────────────────────────┐
 │                      CLIENT APP                        │
 │                                                        │
 │   ┌─────────────────┐             ┌────────────────┐   │
 │   │     SIP.js      │             │    WebRTC      │   │
 │   │   (Signaling)   │             │    (Media)     │   │
 │   └────────┬────────┘             └───────┬────────┘   │
 └────────────┼──────────────────────────────┼────────────┘
              │                              │
              │ SIP Packets                  │ RTP Audio Stream
              │ (Socket.IO tunnel)           │ (Peer-to-Peer)
              ▼                              ▼
 ┌───────────────────────────┐ ┌───────────────────────────┐
 │       MOCK SERVER         │ │        PEER DEVICE        │
 │    (Express / Socket)     │ │        (Remote Mic)       │
 └───────────────────────────┘ └───────────────────────────┘
```

### Key Differences: Signaling vs. Media
1. **Signaling (SIP.js / Socket.IO)**: 
   - **Protocol**: Session Initiation Protocol (SIP).
   - **Role**: Coordinates the call. Finds the remote peer, dials their number, handles ringing alerts, agrees to accept or decline the call, and exchanges connection criteria (SDP / ICE).
   - **Path**: Client 1 ➜ Mock Server ➜ Client 2.
2. **Media (react-native-webrtc)**:
   - **Protocol**: Real-time Transport Protocol (RTP) / Secure RTP (SRTP).
   - **Role**: Encodes, transmits, and decodes raw audio packets.
   - **Path**: Peer-to-Peer directly between Device 1 and Device 2. Once the call is connected, media does NOT transit through our signaling server.

---

## 🗂️ Folder Structure

```
Client/
├── App.js               # Entry router and state providers (Auth, Socket, Call)
├── index.js             # Native app registry and WebRTC global polyfills
├── package.json         # Client dependencies and run scripts
├── .env.example         # Template for environment variables
└── src/
    ├── config.js        # Host URLs & STUN configuration
    ├── context/
    │   ├── AuthContext.js    # Manages user authentication and tokens
    │   ├── SocketContext.js  # Manages WebSocket connection to proxy
    │   └── CallContext.js    # Core call state machine (ticking timers, streams)
    ├── hooks/
    │   ├── useAuth.js   # Context shortcut for user sessions
    │   ├── useSocket.js # Context shortcut for socket connections
    │   ├── useCall.js   # Context shortcut for active calls
    │   └── useUsers.js  # Manages initial list fetch & live status syncing
    ├── screens/
    │   ├── LoginScreen.js  # Sleek credential inputs & autofill panel
    │   ├── HomeScreen.js   # Presence list of contacts & dialing trigger
    │   ├── CallScreen.js   # Dynamic layout (Incoming Ringing, Outgoing, Active)
    │   └── DebugScreen.js  # Terminal window monitoring real-time logs
    └── services/
        ├── Logger.js         # Centralized log manager with subscription buffers
        ├── StorageService.js # Wrapper around AsyncStorage
        ├── AuthService.js    # Handles HTTP Login REST calls
        ├── SocketService.js  # Handles socket connection events
        ├── WebRTCService.js  # Wraps manual RTCPeerConnection creation
        ├── SipService.js     # Hooks Socket.IO transport into SIP.js core
        ├── CallService.js    # Orchestrates SipService & WebRTCService together
        └── UserService.js    # Fetches contacts & listens for socket presence updates
```

---

## ⚡ SIP.js & WebRTC Protocols Explained

### 1. How SIP.js Works
SIP.js is a SIP signaling library. It maintains the SIP transaction and session state machine.
- **REGISTER**: When Alice logs in, SIP.js sends a `REGISTER` message to our proxy to tell the network she is reachable at `sip:alice@mock.sip.server`.
- **INVITE**: To place a call, Alice's SIP.js creates an `INVITE` request containing an Session Description Protocol (SDP) body.
- **100 Trying / 180 Ringing**: The server returns `100 Trying` (routing in progress) and `180 Ringing` (receiver device alert) to Alice's client.
- **200 OK**: When Bob clicks Accept, his SIP.js returns a `200 OK` response containing his SDP answer.
- **BYE**: When either party hangs up, a `BYE` message is sent, telling the other client to tear down the audio channel.

### 2. How WebRTC Works
WebRTC (Web Real-Time Communication) provides the capabilities to capture and stream microphone data directly between devices.
- **RTCPeerConnection**: Represents the connection between the local computer and a remote peer.
- **Offer/Answer Flow (SDP)**:
  - **Session Description Protocol (SDP)** is a text description of a device's media capabilities (audio codecs supported, network addresses, ports).
  - The Caller generates an **Offer SDP** and sends it via SIP signaling to the Callee.
  - The Callee receives the Offer, configures their device, generates an **Answer SDP**, and sends it back to the Caller.
- **ICE Gathering Flow (Interactive Connectivity Establishment)**:
  - To bypass firewalls and routers, WebRTC uses STUN servers (`stun.l.google.com:19302`) to identify a client's public IP address (IP candidates).
  - In our implementation, we use **Vanilla ICE**: we pause the SDP generation until our client compiles all local network candidates (`iceGatheringState === 'complete'`). This embeds all paths directly into the SDP, making connection extremely robust without complex candidate trickle handlers.

---

## 📝 Centralized Logger & Mock SIP Server

### 1. Logger.js
Every lifecycle event is logged using a unified structure:
```
[Timestamp] [Username] [Screen] [Module] [Method] [Action] [Result]
```
For example, when Alice calls Bob:
```
----------------------------------------------------
[14:10:15]
User   : Alice
Screen : Home
Module : CallService
Method : makeCall()
Action : Call Initiated
Result : Calling Bob
----------------------------------------------------
```
These logs are simultaneously output to `console.log()` and appended to a central ring-buffer, which the **DebugScreen** subscribes to for real-time visualization.

### 2. Mock SIP Server
The Server acts as a SIP registrar and SIP proxy.
- **Registrar**: Resolves user locations by mapping SIP URIs (`sip:alice@mock.sip.server`) to Socket IDs.
- **Proxy**: Parses raw text SIP messages coming from a client socket, reads their `To` and `From` headers, and routes them to the recipient's socket, updating and broadcasting presence states (ONLINE, OFFLINE, IN CALL) reactively.

---

## ⚙️ Installation & Running

### Prerequisites
- Node.js (>= 18)
- React Native CLI environment setup (Android SDK / Xcode)

### 1. Install Dependencies
Ensure you run this inside the `Client/` directory:
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and adjust the variables to point to your development server's IP address (use `10.0.2.2` for Android emulator):
```env
API_URL=http://localhost:3000/api
SOCKET_URL=http://localhost:3000
```

### 3. Run the Metro Bundler
Start the Metro bundler to compile Javascript assets:
```bash
npm run start
```

### 4. Build and Launch App
Open a separate terminal window and launch the build process for your target emulator or device:
- **Android**:
  ```bash
  npm run android
  ```
- **iOS**:
  ```bash
  npm run ios
  ```
