/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerGlobals } from 'react-native-webrtc';

// This is the magic line that binds React Native WebRTC native modules
// into global browser primitives for SIP.js to intercept.
registerGlobals();

AppRegistry.registerComponent(appName, () => App);
