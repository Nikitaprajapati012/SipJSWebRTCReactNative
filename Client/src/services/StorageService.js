/**
 * Client/src/services/StorageService.js
 * 
 * Wrapper service for AsyncStorage to securely/persistently store user credentials,
 * auth tokens, and session states.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from './Logger';

const TOKEN_KEY = '@sip_app_token';
const USERNAME_KEY = '@sip_app_username';

class StorageService {
  /**
   * Save user auth token and username after login.
   * Called when AuthService.login() succeeds.
   * 
   * @param {string} token - Generated auth token
   * @param {string} username - Logged in username
   */
  async saveSession(token, username) {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [USERNAME_KEY, username]
      ]);
      Logger.log({
        username,
        module: 'StorageService',
        method: 'saveSession()',
        action: 'Session Stored',
        result: 'Saved token and username to AsyncStorage'
      });
      return true;
    } catch (error) {
      Logger.log({
        username,
        module: 'StorageService',
        method: 'saveSession()',
        action: 'Session Storage Failed',
        result: error.message
      });
      return false;
    }
  }

  /**
   * Fetch stored token and username.
   * Called on App launch to check auto-login.
   */
  async getSession() {
    try {
      const [[, token], [, username]] = await AsyncStorage.multiGet([TOKEN_KEY, USERNAME_KEY]);
      if (token && username) {
        Logger.log({
          username,
          module: 'StorageService',
          method: 'getSession()',
          action: 'Session Loaded',
          result: 'Retrieved token and username'
        });
        return { token, username };
      }
      return null;
    } catch (error) {
      Logger.log({
        module: 'StorageService',
        method: 'getSession()',
        action: 'Load Session Failed',
        result: error.message
      });
      return null;
    }
  }

  /**
   * Clear session token and username on Logout.
   */
  async clearSession(username = 'System') {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USERNAME_KEY]);
      Logger.log({
        username,
        module: 'StorageService',
        method: 'clearSession()',
        action: 'Session Cleared',
        result: 'Removed token and username from AsyncStorage'
      });
      return true;
    } catch (error) {
      Logger.log({
        username,
        module: 'StorageService',
        method: 'clearSession()',
        action: 'Clear Session Failed',
        result: error.message
      });
      return false;
    }
  }
}

export default new StorageService();
