# Ventrilo - SIP.js & WebRTC Audio + Video Calling Client

Ventrilo is a production-quality React Native audio and video calling application utilizing **SIP.js** for signaling, **WebRTC** (`react-native-webrtc`) for real-time media exchange, and native modules for Picture-in-Picture (PiP) support. It connects to a customized Node.js signaling proxy server.

---

## 🏗️ Video Calling & PiP Architecture

The application implements a real-time peer-to-peer (P2P) communication bridge for both audio and video streams. 

### Architecture Flow Diagram
```
Login
  ↓
SIP Registration
  ↓
Place Call (Audio/Video select)
  ↓
SIP INVITE (SDP contains m=audio & m=video)
  ↓
Offer/Answer Negotiation
  ↓
ICE Candidates Gathering (Vanilla ICE)
  ↓
P2P Media Track Connection established
  ↓
Video Rendering via <RTCView />
  ↓
Minimize (System / In-App Overlay PiP)
  ↓
End Call (SIP BYE -> teardown streams)
```

---

## ⚡ WebRTC Media & Video Track Flow

1. **UserMedia Acquisition**:
   - Audio tracks are gathered via microphone permissions.
   - Video tracks are gathered using camera permissions (defaulting to the front-facing camera).
   - If camera is disabled during a call, only the video track's enabled status is toggled (`track.enabled = false`), allowing the audio channel to continue working seamlessly.

2. **Vanilla ICE Negotiation**:
   - Local SDP offers and answers are compiled.
   - The ICE gathering state is monitored until it reaches `complete`.
   - All network candidates are embedded directly into the SDP payload before sending, avoiding trickle candidate signaling overhead and reducing connection setup times.

3. **Track Event Binding**:
   - `ontrack` triggers on the peer connection when the remote participant's media streams are negotiated.
   - The remote stream is retrieved and assigned to the `<RTCView />` component via `streamURL={remoteStream.toURL()}`.

---

## 📱 Picture-in-Picture (PiP) Architecture

The application supports both system-level PiP (Android) and in-app overlay PiP (iOS & Android).

### Android System PiP
- **Declaration**: Configured in `AndroidManifest.xml` with `android:supportsPictureInPicture="true"`.
- **Trigger**: Handled natively when the user presses the home button (`onUserLeaveHint()`) or clicks the PiP control button in the UI (`PipModule.enterPip()`).
- **Lifecycle Integration**: The Activity's state transitions are captured via `onPictureInPictureModeChanged()` and broadcasted to React Native via standard React Device Event Emitters (`onPipModeChanged`), updating the JS states to hide control buttons and render only the remote participant's video fullscreen.

### iOS PiP (In-App Overlay)
- **Concept**: Due to Apple's system restrictions limiting native system-level PiP to `AVPlayerLayer` elements (unless implementing heavy buffer sample rendering layers), iOS handles PiP through an **In-App Draggable Floating Overlay**.
- **Implementation**: Toggling minimize navigates the user back to the dashboard/debug screens while rendering a draggable `<FloatingCallOverlay />` that displays the remote feed and simple end-call/restore controls.

---

## ⚙️ Folders & Modules Added

- `Client/android/app/src/main/java/com/sipwebrtcapp/PipModule.kt`: Native Android Kotlin bridge exposing PiP triggers and active call indicators.
- `Client/src/components/FloatingCallOverlay.js`: Draggable PanResponder-based overlay component for in-app call minimization.

---

## 📝 Troubleshooting & FAQ

### Q: Why is there a "Network Error" when logging in on a physical device?
A: Android physical devices do not automatically share the host's localhost port. Always run `adb reverse tcp:3000 tcp:3000` to bind your computer's mock signaling server port to the physical device. (This is now automated in the client's `npm start` and `npm run android` scripts).

### Q: Camera fails to start, displaying a black frame. What is wrong?
A: Ensure that you have granted Camera and Microphone permissions to the application. Check that your device camera is not occupied by another app.

### Q: Does audio continue playing when the app goes into the background?
A: Yes. The background audio permission is declared, and the native `AudioManager` uses `MODE_IN_COMMUNICATION` to maintain the session active.

---

## 🛠️ Verification & Build Commands

1. **Verify Code Formatting**:
   ```bash
   npm run lint
   ```
2. **Execute Tests**:
   ```bash
   npm test
   ```
3. **Start Development metro server**:
   ```bash
   npm start
   ```
4. **Compile and Run on Android**:
   ```bash
   npm run android
   ```
