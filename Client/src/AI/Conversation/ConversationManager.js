/**
 * Client/src/AI/Conversation/ConversationManager.js
 *
 * Conversation Context & Session Memory Manager.
 * Preserves multi-turn state (active screen, call status, targeted contact, history)
 * to resolve contextual voice commands seamlessly.
 */

import Logger from '../../services/Logger';

class ConversationManager {
  constructor() {
    this.sessionContext = {
      currentScreen: 'Home',
      activeCallState: 'Idle',
      currentContact: null,
      lastIntent: null,
      conversationHistory: [], // Array of { role: 'user' | 'assistant', text: string, timestamp: number }
      lastCallSummary: null,
    };
    this.maxHistoryLength = 20;
  }

  /**
   * Update active screen context.
   */
  setCurrentScreen(screenName) {
    this.sessionContext.currentScreen = screenName;
  }

  /**
   * Update active call state and target contact.
   */
  setCallContext(callState, targetContact = null) {
    this.sessionContext.activeCallState = callState;
    if (targetContact) {
      this.sessionContext.currentContact = targetContact;
    }
  }

  /**
   * Save an utterance to conversation history.
   */
  addTurn(role, text, intent = null) {
    if (!text) return;

    const entry = {
      role,
      text,
      intent,
      timestamp: Date.now(),
    };

    this.sessionContext.conversationHistory.push(entry);

    // Limit history size to prevent memory growth
    if (this.sessionContext.conversationHistory.length > this.maxHistoryLength) {
      this.sessionContext.conversationHistory.shift();
    }

    if (intent) {
      this.sessionContext.lastIntent = intent;
    }

    Logger.log({
      module: 'ConversationManager',
      method: 'addTurn',
      action: 'Turn Recorded',
      result: `Role: ${role}, Text: "${text}"`,
    });
  }

  /**
   * Get current context snapshot for NLU or AI model.
   */
  getContext() {
    return { ...this.sessionContext };
  }

  /**
   * Record summary details of completed call.
   */
  recordCallEndSummary(duration, peerUsername) {
    this.sessionContext.lastCallSummary = {
      duration,
      peerUsername,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear session history.
   */
  resetSession() {
    this.sessionContext.conversationHistory = [];
    this.sessionContext.lastIntent = null;
  }
}

export default new ConversationManager();
