/**
 * Client/src/services/UserService.js
 * 
 * UserService retrieves user presence lists from the HTTP GET endpoint
 * and listens for live presence status broadcasts via SocketService.
 */

import axios from 'axios';
import { getApiUrl } from '../config';
import SocketService from './SocketService';
import Logger from './Logger';

class UserService {
  constructor() {
    this.username = 'System';
  }

  setUsername(username) {
    this.username = username;
  }

  /**
   * Fetch complete user list from Server HTTP endpoint.
   * 
   * @param {string} token - Auth token
   * @returns {Promise<Array>} List of users
   */
  async fetchUsers(token) {
    Logger.log({
      username: this.username,
      screen: 'Home',
      module: 'UserService',
      method: 'fetchUsers()',
      action: 'Fetch Users Started',
      result: 'Requesting API presence list'
    });

    try {
      const response = await axios.get(`${getApiUrl()}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.success) {
        const users = response.data.users;
        Logger.log({
          username: this.username,
          screen: 'Home',
          module: 'UserService',
          method: 'fetchUsers()',
          action: 'Fetch Users Success',
          result: `Found ${users.length} users`
        });
        return users;
      }
      throw new Error(response.data.message || 'Failed to fetch users');
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      Logger.log({
        username: this.username,
        screen: 'Home',
        module: 'UserService',
        method: 'fetchUsers()',
        action: 'Fetch Users Failed',
        result: errMsg
      });
      throw new Error(errMsg);
    }
  }

  /**
   * Register listener for real-time presence updates.
   * 
   * @param {Function} callback - Handles socket user list changes
   */
  subscribeToUserUpdates(callback) {
    SocketService.onUserStatusUpdate((updatedUserList) => {
      Logger.log({
        username: this.username,
        module: 'UserService',
        method: 'subscribeToUserUpdates',
        action: 'Presence Event Received',
        result: `Synchronized ${updatedUserList.length} users`
      });
      callback(updatedUserList);
    });
  }

  /**
   * Tear down socket presence updates listener.
   */
  unsubscribeFromUserUpdates() {
    SocketService.offUserStatusUpdate();
  }
}

export default new UserService();
