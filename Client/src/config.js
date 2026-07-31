/**
 * Client/src/config.js
 *
 * Central configuration for signaling, authentication, and WebRTC endpoints.
 * Supports smart auto-discovery across physical devices, emulators, Wi-Fi, ADB reverse, and iOS.
 */

import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_HOST_KEY = '@app_server_host_override';

// PC Local Network LAN IP (Default for Physical Phone Wi-Fi / USB debugging)
export const PC_LAN_IP = '192.168.1.72';

/**
 * Helper to sanitize host string.
 */
export const sanitizeHost = host => {
  if (!host) return '';
  return host.trim();
};

/**
 * Extract host IP from React Native Metro bundler URL if available.
 * e.g., 'http://192.168.1.72:8081/index.bundle...' -> '192.168.1.72'
 */
export const getMetroHost = () => {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)(:\d+)?/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (error) {
    // Ignore error
  }
  return null;
};

/**
 * Default fallback server host IP based on platform.
 */
export const detectServerHost = () => {
  const metroHost = getMetroHost();
  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return metroHost;
  }
  return PC_LAN_IP;
};

// In-memory active server host
let activeHost = PC_LAN_IP;

/**
 * Test if a given host IP can reach the server.js health endpoint.
 * @param {string} host - Host IP to test
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
export const checkHostHealth = async (host, timeoutMs = 1200) => {
  if (!host) return false;
  const clean = sanitizeHost(host);
  if (!clean) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`http://${clean}:3000/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      return data && data.success === true;
    }
  } catch (err) {
    // Host unreachable or timed out
  }
  return false;
};

/**
 * Smart Auto-Discovery: Probes host candidates to find a working server IP.
 * Candidate Priority:
 * 1. PC LAN IP ('192.168.1.72' - Works 100% on Physical Devices over Wi-Fi & USB)
 * 2. Metro Bundler IP
 * 3. Saved custom host from AsyncStorage
 * 4. 'localhost' (ADB reverse on Android physical phone/emulator & iOS simulator)
 * 5. Android Emulator loopback ('10.0.2.2')
 *
 * @returns {Promise<string>} The first reachable host IP
 */
export const autoDiscoverServerHost = async () => {
  const candidates = [PC_LAN_IP];

  // Metro Bundler IP
  const metro = getMetroHost();
  if (metro && !candidates.includes(metro)) {
    candidates.push(metro);
  }

  // Saved custom host from AsyncStorage
  try {
    const saved = await AsyncStorage.getItem(SERVER_HOST_KEY);
    if (saved && saved.trim() && !candidates.includes(saved.trim())) {
      candidates.push(saved.trim());
    }
  } catch (e) {}

  // Localhost & ADB Reverse
  if (!candidates.includes('localhost')) candidates.push('localhost');
  if (!candidates.includes('127.0.0.1')) candidates.push('127.0.0.1');

  // Android Emulator loopback IP
  if (Platform.OS === 'android' && !candidates.includes('10.0.2.2')) {
    candidates.push('10.0.2.2');
  }

  // Probe candidates sequentially with fast 1.2s timeout
  for (const host of candidates) {
    const isWorking = await checkHostHealth(host, 1200);
    if (isWorking) {
      activeHost = host;
      try {
        await AsyncStorage.setItem(SERVER_HOST_KEY, host);
      } catch (e) {}
      return host;
    }
  }

  // Fallback to activeHost or default if none responded
  return activeHost || detectServerHost();
};

/**
 * Initialize host setting from AsyncStorage on app launch.
 */
export const initServerHost = async () => {
  try {
    const saved = await AsyncStorage.getItem(SERVER_HOST_KEY);
    if (saved && saved.trim()) {
      activeHost = saved.trim();
    } else {
      activeHost = await autoDiscoverServerHost();
    }
  } catch (e) {
    activeHost = detectServerHost();
  }
  return activeHost;
};

/**
 * Persist user-entered custom server host IP.
 */
export const setServerHost = async newHost => {
  try {
    const cleanHost = sanitizeHost(newHost);
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
 * Get active server host IP.
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
