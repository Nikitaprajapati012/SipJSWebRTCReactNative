/**
 * Client/index.js
 * 
 * Main entry point for the React Native application.
 * Initializes WebRTC globals and registers the root application component.
 */

import { AppRegistry } from 'react-native';
import { registerGlobals } from 'react-native-webrtc';
import App from './App';
import { name as appName } from './app.json';

// Initialize WebRTC globals (RTCPeerConnection, RTCSessionDescription, etc.)
try {
  registerGlobals();
} catch (error) {
  console.warn('Failed to initialize WebRTC globals:', error);
}

AppRegistry.registerComponent(appName, () => App);
