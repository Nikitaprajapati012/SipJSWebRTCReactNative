/**
 * Client/src/services/Logger.js
 * 
 * Centralized logging system for the SIP.js and WebRTC Audio Calling App.
 * Captures chronological runtime information for debugging and educational tracing.
 * 
 * Each log includes:
 * - Timestamp
 * - Username
 * - Screen
 * - Module
 * - Method
 * - Action
 * - Result (Description)
 */

class CentralizedLogger {
  constructor() {
    this.logs = [];
    this.listeners = new Set();
  }

  /**
   * Add a new log entry, print to console, and notify subscribers.
   * 
   * @param {Object} logParams
   * @param {string} [logParams.username] - User related to this action (e.g. 'Alice')
   * @param {string} [logParams.screen] - Screen name where log was triggered (e.g. 'Home')
   * @param {string} [logParams.module] - Architectural service name (e.g. 'SipService')
   * @param {string} [logParams.method] - Method function name (e.g. 'register()')
   * @param {string} logParams.action - Short summary of action (e.g. 'SIP Registration Started')
   * @param {string} [logParams.result] - Outcome or description (e.g. 'Registered successfully')
   */
  log({ username = 'System', screen = 'N/A', module = 'System', method = 'N/A', action, result = '' }) {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0]; // Returns "HH:MM:SS"

    const logEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp,
      username,
      screen,
      module,
      method,
      action,
      result,
    };

    // Store in-memory (cap at 1000 logs to prevent memory leaks)
    this.logs.unshift(logEntry);
    if (this.logs.length > 1000) {
      this.logs.pop();
    }

    // Print to Console in requested format
    console.log('----------------------------------------------------');
    console.log(`[${timestamp}]`);
    console.log(`User   : ${username}`);
    console.log(`Screen : ${screen}`);
    console.log(`Module : ${module}`);
    console.log(`Method : ${method}`);
    console.log(`Action : ${action}`);
    if (result) console.log(`Result : ${result}`);
    console.log('----------------------------------------------------');

    // Notify listeners (such as DebugScreen)
    this.notify(logEntry);
  }

  /**
   * Subscribe to new log notifications.
   * Called when DebugScreen mounts.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(logEntry) {
    this.listeners.forEach((listener) => {
      try {
        listener(logEntry);
      } catch (err) {
        console.error('Error triggering log listener: ', err);
      }
    });
  }

  /**
   * Retrieve all stored log entries.
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Clear all stored log entries.
   */
  clearLogs() {
    this.logs = [];
    this.notify(null); // Notify subscribers to refresh empty state
  }
}

const Logger = new CentralizedLogger();
export default Logger;
