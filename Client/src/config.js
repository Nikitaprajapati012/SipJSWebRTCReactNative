/**
 * Network configuration for the REST API, Socket.IO, and WebRTC services.
 *
 * `generatedServerHosts.js` is refreshed every time the client is started.
 * It contains the development computer's current LAN addresses, so changing
 * Wi-Fi networks does not require editing this file or rebuilding the app.
 */

import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_HOSTS } from './generatedServerHosts';

const SERVER_HOST_KEY = '@app_server_host_override';
const ANDROID_EMULATOR_HOST = '10.0.2.2';
const ANDROID_ADB_REVERSE_HOST = '127.0.0.1';

const isLoopbackHost = host => host === 'localhost' || host === '127.0.0.1';

export const sanitizeHost = host => {
  if (!host) return '';

  // Accept a plain host/IP or a pasted http://host:port URL. The API port is
  // controlled by this app, so remove the pasted protocol, path, and port.
  return host
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
};

/**
 * Return Metro's host only when it is a LAN address. A localhost Metro URL is
 * local to the Android target and cannot be used to reach the PC's API.
 */
export const getMetroHost = () => {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    const match = scriptURL?.match(/^https?:\/\/([^:/]+)(?::\d+)?/);
    const host = match?.[1] ? sanitizeHost(match[1]) : '';
    return host && !isLoopbackHost(host) ? host : null;
  } catch (error) {
    return null;
  }
};

const uniqueHosts = hosts => [...new Set(hosts.map(sanitizeHost).filter(Boolean))];

/**
 * On Android, every target receives an individual `adb reverse` rule during
 * `npm start`/`npm run android`. Therefore 127.0.0.1 is the first route for
 * both a USB phone and an emulator. It is a tunnel to the development PC, not
 * the phone's own server. LAN and 10.0.2.2 remain no-tunnel fallbacks.
 */
const getRuntimeCandidates = async () => {
  let savedHost = '';
  try {
    savedHost = sanitizeHost(await AsyncStorage.getItem(SERVER_HOST_KEY));
  } catch (error) {}

  // A saved loopback address from an old app version is not a valid LAN
  // preference. Loopback is added below only as an explicit ADB-reverse path.
  if (Platform.OS === 'android' && isLoopbackHost(savedHost)) savedHost = '';

  const metroHost = getMetroHost();
  const generatedHosts = Array.isArray(SERVER_HOSTS) ? SERVER_HOSTS : [];
  const platformFallback = Platform.OS === 'android'
    ? [ANDROID_ADB_REVERSE_HOST, ANDROID_EMULATOR_HOST]
    : ['localhost'];

  return uniqueHosts([
    ...(Platform.OS === 'android' ? [ANDROID_ADB_REVERSE_HOST] : []),
    metroHost,
    ...generatedHosts,
    savedHost,
    ...platformFallback,
  ]);
};

/**
 * Initial display value. Android starts with its per-device ADB tunnel; it
 * falls back to the generated current LAN IP if no tunnel is available.
 */
export const detectServerHost = () => {
  const metroHost = getMetroHost();
  const generatedHosts = Array.isArray(SERVER_HOSTS) ? SERVER_HOSTS : [];
  const lanHost = uniqueHosts([metroHost, ...generatedHosts])[0];
  if (Platform.OS === 'android') return lanHost || ANDROID_ADB_REVERSE_HOST;
  return lanHost || 'localhost';
};

let activeHost = detectServerHost();

export const checkHostHealth = async (host, timeoutMs = 2500) => {
  const cleanHost = sanitizeHost(host);
  if (!cleanHost) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`http://${cleanHost}:3000/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.success === true;
  } catch (error) {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Check every current candidate concurrently. This handles both emulator and
 * phone without waiting for unreachable virtual-network adapters to time out.
 * Returns null when nothing is reachable; it never silently retains a stale IP.
 */
export const autoDiscoverServerHost = async () => {
  const candidates = await getRuntimeCandidates();
  if (!candidates.length) return null;

  const findReachable = hosts => new Promise(resolve => {
    if (!hosts.length) {
      resolve(null);
      return;
    }

    let pending = hosts.length;

    hosts.forEach(host => {
      checkHostHealth(host).then(isHealthy => {
        if (isHealthy) {
          resolve(host);
          return;
        }

        pending -= 1;
        if (pending === 0) resolve(null);
      });
    });
  });

  // Prefer a real PC LAN address for a physical phone. Loopback and
  // 10.0.2.2 are transport-specific fallbacks and are checked only after LAN
  // candidates fail, so Auto-Detect displays a useful Wi-Fi IP when possible.
  const tunnelHosts = candidates.filter(host => isLoopbackHost(host) || host === ANDROID_EMULATOR_HOST);
  const lanHosts = candidates.filter(host => !tunnelHosts.includes(host));
  const discovered = await findReachable(lanHosts) || await findReachable(tunnelHosts);

  if (discovered) activeHost = discovered;
  return discovered;
};

export const initServerHost = async () => {
  const discovered = await autoDiscoverServerHost();
  activeHost = discovered || detectServerHost();
  return activeHost;
};

export const setServerHost = async newHost => {
  const cleanHost = sanitizeHost(newHost);
  if (cleanHost) {
    activeHost = cleanHost;
    await AsyncStorage.setItem(SERVER_HOST_KEY, cleanHost);
  } else {
    await AsyncStorage.removeItem(SERVER_HOST_KEY);
    activeHost = detectServerHost();
  }
  return activeHost;
};

export const getServerHost = () => activeHost || detectServerHost();
export const getApiUrl = () => `http://${getServerHost()}:3000/api`;
export const getSocketUrl = () => `http://${getServerHost()}:3000`;

// Static exports are retained for compatibility. New requests use the dynamic getters.
export const API_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();
export const SIP_DOMAIN = 'mock.sip.server';

export const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
