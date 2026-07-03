# SipWebRTCApp - Pure JS React Native SIP.js & WebRTC Calling System

This repository contains a production-quality, highly educational, complete Audio Calling application built from scratch. It uses **SIP.js** for session signaling and **WebRTC** (`react-native-webrtc`) for peer-to-peer media streaming. 

A dedicated **Node.js + Socket.IO** signaling server acts as a mock SIP registrar and proxy, routing SIP signaling text messages over WebSockets so that no real Asterisk or FreePBX servers are required.

---

## 🗂️ Project Structure

This project is organized into two primary subdirectories:

1. **[Client/](file:///home/nikita/Nikita/Projects/SipWebRTCApp/Client)**: The React Native CLI frontend application. Employs a robust, modular services architecture with Context API, custom hooks, and a built-in terminal logging panel.
2. **[Server/](file:///home/nikita/Nikita/Projects/SipWebRTCApp/Server)**: The Node.js + Express backend server. Manages in-memory user sessions, signs login credentials, parses standard SIP text messages, and proxy-routes calls.

---

## 🚀 Quick Start Guide

### Step 1: Run the Backend Signaling Server
1. Navigate to the Server directory:
   ```bash
   cd Server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (uses nodemon):
   ```bash
   npm run dev
   ```
   The signaling server will start on port `3000`.

---

### Step 2: Run the React Native Client
1. Navigate to the Client directory:
   ```bash
   cd Client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables and verify configuration:
   ```bash
   cp .env.example .env
   ```
   *Note: If testing on Android emulator, configure the server hosts to connect to `10.0.2.2` (automatically handled by `Client/src/config.js`).*
4. Start the Metro bundler:
   ```bash
   npm run start
   ```
5. Build and launch the application:
   - **Android Emulator/Device**:
     ```bash
     npm run android
     ```
   - **iOS Simulator/Device**:
     ```bash
     npm run ios
     ```

---

## 📞 Call Simulation Instructions

To simulate a complete call:
1. Start two emulators or devices (e.g. Device 1 and Device 2).
2. Open the app on Device 1, tap **Alice** under "Quick Tap Login", and click **Sign In**. Alice's SIP.js agent will start and REGISTER as `ONLINE`.
3. Open the app on Device 2, tap **Bob** under "Quick Tap Login", and click **Sign In**. Bob will also REGISTER as `ONLINE`.
4. On Alice's screen, you will see Bob listed as **ONLINE** with a active phone call button.
5. Tap the **Call Button** (📞) next to Bob's name.
6. Alice's device will enter **Outgoing Call Screen** transitioning from `Dialing...` to `Ringing...`.
7. Bob's device will instantly transition to the **Incoming Call Screen** showing `Incoming Call from alice` with green **Accept** and red **Decline** options.
8. Tap **Accept** on Bob's device.
9. Both devices will create `RTCPeerConnection`s, exchange SDP offers/answers and ICE candidates, and connect the audio stream.
10. The layout transitions to the **Active Call Screen**, displaying a call timer ticking up in real time.
11. You can test the **Mute**, **Speaker**, and **Hold** buttons (logs will stream in real time).
12. Tap **End Call** on either device. The call will terminate (SIP BYE), resetting both statuses back to `ONLINE` on the dashboard.
13. Click the **Logs** button (📝) in the header on either screen to browse the exact trace of all SIP signaling packets and WebRTC connections.
