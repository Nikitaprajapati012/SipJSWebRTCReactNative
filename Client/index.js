/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

let registerGlobals;
try {
  // Use the built commonjs entrypoint to avoid React Native resolver issues
  // with the package's TypeScript source path on some device/runtime setups.
  registerGlobals =
    require('react-native-webrtc/lib/commonjs/index.js').registerGlobals;
} catch (error) {
  console.warn('Unable to load react-native-webrtc registerGlobals:', error);
}

if (typeof registerGlobals === 'function') {
  try {
    registerGlobals();
  } catch (error) {
    console.warn('Failed to initialize WebRTC globals:', error);
  }
} else {
  console.warn('WebRTC registerGlobals() is not available.');
}

AppRegistry.registerComponent(appName, () => App);
