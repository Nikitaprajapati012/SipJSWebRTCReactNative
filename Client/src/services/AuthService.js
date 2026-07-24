/**
 * Client/src/services/AuthService.js
 * 
 * AuthService coordinates API-based mock authentication.
 * Relies on Axios to call the backend server and StorageService to persist the token.
 */

import axios from 'axios';
import { getApiUrl } from '../config';
import StorageService from './StorageService';
import Logger from './Logger';

class AuthService {
  /**
   * Log in user with mock credentials.
   * Called by LoginScreen.
   * 
   * @param {string} username - User login name (e.g. 'alice')
   * @param {string} password - User password (e.g. '123')
   * @returns {Promise<Object>} - `{ success: true, user }` or `{ success: false, error }`
   */
  async login(username, password) {
    const formattedUsername = username.trim().toLowerCase();
    
    Logger.log({
      username: username || 'Unknown',
      screen: 'Login',
      module: 'AuthService',
      method: 'login()',
      action: 'Login Started',
      result: `Attempting auth for ${formattedUsername}`
    });

    try {
      const response = await axios.post(`${getApiUrl()}/auth/login`, {
        username: formattedUsername,
        password,
      });

      if (response.data && response.data.success) {
        const { token, username: returnedUsername } = response.data;
        
        // Persist token and username
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
        throw new Error(response.data.message || 'Login Failed');
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      
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
   * Called by HomeScreen or on authorization revocation.
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
