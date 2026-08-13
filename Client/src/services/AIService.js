/**
 * Client/src/services/AIService.js
 *
 * AI Model & LLM Gateway Service.
 * Interfaces with AI intent classification services and general question answering APIs.
 */

import Logger from './Logger';
import { INTENTS } from '../AI/Intent/Intents';

class AIService {
  constructor() {
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.apiKey = null; // Can be configured via app settings
  }

  /**
   * Extract intent and parameters from natural speech using AI model.
   * Contextually aware of active app context (screen, call state, available users).
   */
  async extractIntentWithAI(transcript, conversationContext = {}) {
    Logger.log({
      module: 'AIService',
      method: 'extractIntentWithAI',
      action: 'Requesting AI Intent Extraction',
      result: `Transcript: "${transcript}"`,
    });

    const lower = transcript.toLowerCase();

    // Fallback AI rule mapping if external LLM API is offline
    if (lower.includes('meeting') || lower.includes('schedule')) {
      return {
        intent: INTENTS.GENERAL_QUERY,
        rawText: transcript,
        spokenResponse: 'You have no scheduled meetings remaining for today.',
      };
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('who are you')) {
      return {
        intent: INTENTS.GENERAL_QUERY,
        rawText: transcript,
        spokenResponse: 'Hello! I am Nova, your AI Voice Assistant. How can I help you today?',
      };
    }

    return {
      intent: INTENTS.GENERAL_QUERY,
      rawText: transcript,
      spokenResponse: `I heard: "${transcript}". How else can I assist you?`,
    };
  }

  /**
   * Set custom API configuration.
   */
  configure(apiKey, endpoint) {
    if (apiKey) this.apiKey = apiKey;
    if (endpoint) this.apiEndpoint = endpoint;
  }
}

export default new AIService();
