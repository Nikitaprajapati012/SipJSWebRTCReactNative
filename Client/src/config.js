/**
 * Client/src/config.js
 *
 * Central configuration for signaling, authentication, and WebRTC endpoints.
 * Automatically detects active Metro bundler IP and supports persistent user IP overrides.
 */

import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_HOST_KEY = '@app_server_host_override';

/**
 * Detect server IP automatically from Metro bundler URL or OS fallback.
 */
export const detectServerHost = () => {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)(:\d+)?/);
      if (match && match[1]) {
        // If Metro bundler runs on host IP (e.g. 192.168.x.x), use it.
        if (match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
          return match[1];
        }
      }
    }
  } catch (error) {
    // Fall back if scriptURL is unavailable
  }

  // Fallbacks
  if (Platform.OS === 'android') {
    const { Brand, Model, Fingerprint } = Platform.constants || {};
    const isEmulator =
      Brand?.startsWith('generic') ||
      Model?.includes('google_sdk') ||
      Model?.includes('Emulator') ||
      Model?.includes('Android SDK built for x86') ||
      Fingerprint?.startsWith('generic') ||
      Fingerprint?.startsWith('unknown');

    return isEmulator ? '10.0.2.2' : '192.168.1.72';
  }
  return '192.168.1.72';
};

// In-memory host cache
let activeHost = detectServerHost();

/**
 * Initialize host from saved AsyncStorage setting.
 */
export const initServerHost = async () => {
  try {
    const saved = await AsyncStorage.getItem(SERVER_HOST_KEY);
    if (saved && saved.trim()) {
      activeHost = saved.trim();
    } else {
      activeHost = detectServerHost();
    }
  } catch (e) {
    activeHost = detectServerHost();
  }
  return activeHost;
};

/**
 * Persist or clear user-defined custom server IP.
 */
export const setServerHost = async newHost => {
  try {
    const cleanHost = newHost ? newHost.trim() : '';
    if (cleanHost) {
      await AsyncStorage.setItem(SERVER_HOST_KEY, cleanHost);
      activeHost = cleanHost;
    } else {
      await AsyncStorage.removeItem(SERVER_HOST_KEY);
      activeHost = detectServerHost();
    }
  } catch (e) {
    activeHost = detectServerHost();
  }
  return activeHost;
};

/**
 * Get active server host.
 */
export const getServerHost = () => activeHost || detectServerHost();

/**
 * Dynamic URL getters
 */
export const getApiUrl = () => `http://${getServerHost()}:3000/api`;
export const getSocketUrl = () => `http://${getServerHost()}:3000`;

// Static exports for backward compatibility
export const API_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();
export const SIP_DOMAIN = 'mock.sip.server';

// STUN/ICE Config
export const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
