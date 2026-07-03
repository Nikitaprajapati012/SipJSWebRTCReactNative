/**
 * Client/src/services/SocketService.js
 * 
 * Manages the Socket.IO connection to the signaling server.
 * Handles automatic reconnects, socket registration, and custom signaling listeners.
 */

import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import Logger from './Logger';

class SocketService {
  constructor() {
    this.socket = null;
    this.username = 'System';
  }

  /**
   * Initialize and connect Socket.IO connection.
   * Called after login or on app auto-launch.
   * 
   * @param {string} token - Authorization token
   * @param {string} username - Logged in username
   * @param {Function} onConnectionEstablished - Callback on successful auth ack
   * @param {Function} onDisconnect - Callback on socket disconnect
   */
  connect(token, username, onConnectionEstablished, onDisconnect) {
    this.username = username;

    Logger.log({
      username: this.username,
      module: 'SocketService',
      method: 'connect()',
      action: 'Socket Connection Started',
      result: `Connecting to ${SOCKET_URL}`
    });

    // Close any previous socket
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      Logger.log({
        username: this.username,
        module: 'SocketService',
        method: 'onConnect',
        action: 'Socket Connected',
        result: `Transport established. Socket ID: ${this.socket.id}`
      });
    });

    this.socket.on('connection-established', (data) => {
      Logger.log({
        username: this.username,
        module: 'SocketService',
        method: 'onConnectionEstablished',
        action: 'Socket Authenticated',
        result: `Acknowledge received: ${JSON.stringify(data)}`
      });
      if (onConnectionEstablished) onConnectionEstablished(data);
    });

    this.socket.on('connect_error', (error) => {
      Logger.log({
        username: this.username,
        module: 'SocketService',
        method: 'onConnectError',
        action: 'Socket Connection Failed',
        result: error.message
      });
    });

    this.socket.on('disconnect', (reason) => {
      Logger.log({
        username: this.username,
        module: 'SocketService',
        method: 'onDisconnect',
        action: 'Socket Disconnected',
        result: `Reason: ${reason}`
      });
      if (onDisconnect) onDisconnect(reason);
    });
  }

  /**
   * Listen to user list presence updates.
   */
  onUserStatusUpdate(callback) {
    if (!this.socket) return;
    this.socket.on('user-status-update', callback);
  }

  /**
   * Remove user list status listener.
   */
  offUserStatusUpdate() {
    if (!this.socket) return;
    this.socket.off('user-status-update');
  }

  /**
   * Send custom events.
   */
  emit(event, data) {
    if (!this.socket) {
      Logger.log({
        username: this.username,
        module: 'SocketService',
        method: 'emit()',
        action: 'Emit Failed',
        result: `Cannot emit '${event}', socket is not connected`
      });
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Listen for events.
   */
  on(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  /**
   * Stop listening for events.
   */
  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  /**
   * Disconnect Socket.IO server.
   */
  disconnect() {
    if (this.socket) {
      Logger.log({
        username: this.username,
        module: 'SocketService',
        method: 'disconnect()',
        action: 'Socket Disconnected Manually',
        result: 'Tearing down socket connections'
      });
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check connection status.
   */
  isConnected() {
    return this.socket ? this.socket.connected : false;
  }
}

export default new SocketService();
