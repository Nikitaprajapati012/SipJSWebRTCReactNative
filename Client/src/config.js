/**
 * Client/src/config.js
 *
 * Central configuration file for signaling and authentication endpoints.
 * Tailors hostname based on OS platform: Android Emulators must connect to host
 * machine at 10.0.2.2, whereas iOS Simulators connect to localhost (127.0.0.1).
 */

import { Platform, NativeModules } from 'react-native';

export const SERVER_HOST = (() => {
  // 1. Try to detect Metro server host dynamically (works for Wi-Fi and USB dev modes)
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)(:\d+)?/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (error) {
    // Fall back to hardcoded defaults if scriptURL is unavailable (e.g. release mode)
  }

  // 2. Hardcoded fallbacks based on device detection
  if (Platform.OS === 'android') {
    const { Brand, Model, Fingerprint } = Platform.constants || {};
    const isEmulator =
      Brand?.startsWith('generic') ||
      Model?.includes('google_sdk') ||
      Model?.includes('Emulator') ||
      Model?.includes('Android SDK built for x86') ||
      Fingerprint?.startsWith('generic') ||
      Fingerprint?.startsWith('unknown');

    return isEmulator ? '10.0.2.2' : '172.16.25.30';
  }
  return '172.16.25.30';
})();

export const API_URL = `http://${SERVER_HOST}:3000/api`;
export const SOCKET_URL = `http://${SERVER_HOST}:3000`;
export const SIP_DOMAIN = 'mock.sip.server';

// STUN/ICE Config
export const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
