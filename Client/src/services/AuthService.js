/**
 * Client/src/services/AuthService.js
 * 
 * AuthService coordinates API-based mock authentication.
 * Relies on Axios to call the backend server and StorageService to persist the token.
 * Features automatic server host IP discovery and fallback retry on network errors.
 */

import axios from 'axios';
import { getApiUrl, getServerHost, autoDiscoverServerHost } from '../config';
import StorageService from './StorageService';
import Logger from './Logger';

class AuthService {
  /**
   * Log in user with mock credentials using configured server IP.
   * Auto-probes and recovers if the target server host is unreachable.
   * 
   * @param {string} username - User login name (e.g. 'alice')
   * @param {string} password - User password (e.g. '123')
   * @param {boolean} [isRetry=false] - Prevent infinite retry loop
   * @returns {Promise<Object>} - `{ success: true, user }` or `{ success: false, error }`
   */
  async login(username, password, isRetry = false) {
    const formattedUsername = username.trim().toLowerCase();
    // Do not let a stale manually selected emulator address (10.0.2.2) block
    // a phone. Probe the current Android routes before the first login call.
    if (!isRetry) {
      await autoDiscoverServerHost();
    }

    const apiUrl = getApiUrl();
    const currentHost = getServerHost();
    
    Logger.log({
      username: username || 'Unknown',
      screen: 'Login',
      module: 'AuthService',
      method: 'login()',
      action: 'Login Started',
      result: `Attempting auth for ${formattedUsername} at ${apiUrl}`
    });

    try {
      const response = await axios.post(
        `${apiUrl}/auth/login`,
        { username: formattedUsername, password },
        { timeout: 2500 }
      );

      if (response.data && response.data.success) {
        const { token, username: returnedUsername } = response.data;
        await StorageService.saveSession(token, returnedUsername);

        Logger.log({
          username: returnedUsername,
          screen: 'Login',
          module: 'AuthService',
          method: 'login()',
          action: 'Login Success',
          result: `Token saved: ${token.substring(0, 15)}...`
        });

        return { success: true, username: returnedUsername, token };
      } else {
        throw new Error(response.data?.message || 'Login Failed');
      }
    } catch (error) {
      // Handle network reachability failures with Smart Auto-Discovery
      const isNetworkError = !error.response && (error.code === 'ECONNABORTED' || error.message?.includes('Network Error') || error.message?.includes('timeout'));

      if (!isRetry && isNetworkError) {
        Logger.log({
          username: username || 'Unknown',
          screen: 'Login',
          module: 'AuthService',
          method: 'login()',
          action: 'Auto Discovery Triggered',
          result: `Connection to ${currentHost}:3000 failed. Probing candidate IPs...`
        });

        const discoveredHost = await autoDiscoverServerHost();
        if (discoveredHost && discoveredHost !== currentHost) {
          Logger.log({
            username: username || 'Unknown',
            screen: 'Login',
            module: 'AuthService',
            method: 'login()',
            action: 'Auto Discovery Succeeded',
            result: `Discovered working server IP: ${discoveredHost}`
          });
          return this.login(username, password, true);
        }
      }

      let errMsg = error.response?.data?.message || error.message;
      if (isNetworkError) {
        const loopbackNote = currentHost === '127.0.0.1' || currentHost === 'localhost'
          ? `\n\n${currentHost} is the phone's own loopback address unless USB ADB reverse is active. Run:\nadb reverse tcp:3000 tcp:3000`
          : '';
        errMsg = `Unable to connect to server at ${currentHost}:3000.\n\n` +
                 `Quick Troubleshooting:\n` +
                 `1. Ensure server is running: npm run server\n` +
                 `2. Start Metro with: npm start\n` +
                 `3. Phone and computer must be on the same Wi-Fi; allow TCP port 3000 through the firewall.` +
                 loopbackNote;
      }

      Logger.log({
        username: username || 'Unknown',
        screen: 'Login',
        module: 'AuthService',
        method: 'login()',
        action: 'Login Failed',
        result: errMsg
      });

      return { success: false, error: errMsg };
    }
  }

  /**
   * Log out current user, clear session.
   * 
   * @param {string} username - Current logged-in user
   */
  async logout(username) {
    Logger.log({
      username,
      screen: 'Home',
      module: 'AuthService',
      method: 'logout()',
      action: 'Logout Started',
      result: `Clearing credentials for ${username}`
    });

    await StorageService.clearSession(username);

    Logger.log({
      username,
      screen: 'Home',
      module: 'AuthService',
      method: 'logout()',
      action: 'Logout Completed',
      result: 'Session wiped successfully'
    });
  }
}

export default new AuthService();
