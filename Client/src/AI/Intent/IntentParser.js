/**
 * Client/src/AI/Intent/IntentParser.js
 *
 * Hybrid Natural Language Understanding (NLU) Intent Parser.
 * Maps natural speech input into structured JSON Intent payloads.
 * Features fast offline rule-based pattern matching with AI LLM gateway fallback.
 */

import { INTENTS, INTENT_VOICE_RESPONSES } from './Intents';
import ConversationManager from '../Conversation/ConversationManager';
import AIService from '../../services/AIService';
import Logger from '../../services/Logger';

class IntentParser {
  /**
   * Parse input transcript into a structured intent object.
   * Contextually aware of active call state and active screen.
   */
  async parse(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return { intent: INTENTS.UNKNOWN, rawText: '' };
    }

    const cleanText = transcript.trim().toLowerCase();
    Logger.log({
      module: 'IntentParser',
      method: 'parse',
      action: 'Parsing Speech Input',
      result: `Input: "${transcript}"`,
    });

    // 1. Try fast local pattern matching for instant response & offline functionality
    const localIntent = this._parseLocalRules(cleanText);
    if (localIntent && localIntent.intent !== INTENTS.UNKNOWN) {
      Logger.log({
        module: 'IntentParser',
        method: 'parse',
        action: 'Local Intent Match Found',
        result: `Intent: ${localIntent.intent}, Contact: ${localIntent.contact || 'N/A'}`,
      });
      return localIntent;
    }

    // 2. Contextual Resolution: if text is short/ambiguous during active calls (e.g. "mute", "hold", "hang up")
    const contextualIntent = this._resolveContextualShortcuts(cleanText);
    if (contextualIntent) {
      return contextualIntent;
    }

    // 3. Fallback to AI Service (LLM) for complex natural language queries
    try {
      const aiIntent = await AIService.extractIntentWithAI(transcript, ConversationManager.getContext());
      if (aiIntent && aiIntent.intent) {
        Logger.log({
          module: 'IntentParser',
          method: 'parse',
          action: 'AI Model Intent Parsed',
          result: `Intent: ${aiIntent.intent}`,
        });
        return aiIntent;
      }
    } catch (err) {
      console.warn('AI intent parsing fallback error:', err);
    }

    // Fallback response for general query / unrecognized intent
    return {
      intent: INTENTS.GENERAL_QUERY,
      rawText: transcript,
      spokenResponse: INTENT_VOICE_RESPONSES[INTENTS.UNKNOWN],
    };
  }

  /**
   * Local Rule-Based Pattern Matching for commands and natural variations.
   */
  _parseLocalRules(text) {
    // --- CALL USER / START VIDEO CALL ---
    const callMatch =
      text.match(/(?:call|phone|ring|dial|connect to|get me|reach|i want to call|can you call|please call)\s+([a-z0-9\s._-]+)/i) ||
      text.match(/start (?:a )?(?:video )?call with ([a-z0-9\s._-]+)/i);

    if (callMatch && callMatch[1]) {
      let targetName = callMatch[1].trim();
      // Filter out trailing words like "please", "now"
      targetName = targetName.replace(/\b(please|now|on video|video)\b/gi, '').trim();

      const isVideo = /video/i.test(text);
      return {
        intent: INTENTS.CALL_USER,
        contact: targetName,
        callType: isVideo ? 'video' : 'audio',
        rawText: text,
      };
    }

    // --- ACCEPT CALL ---
    if (/\b(accept|answer|pick up|receive|take (the )?call)\b/i.test(text)) {
      return { intent: INTENTS.ACCEPT_CALL, rawText: text };
    }

    // --- REJECT CALL ---
    if (/\b(reject|decline|ignore|dismiss)\b/i.test(text)) {
      return { intent: INTENTS.REJECT_CALL, rawText: text };
    }

    // --- END CALL / HANG UP ---
    if (/\b(end call|hang up|disconnect|stop call|finish call|cancel call|end the call)\b/i.test(text)) {
      return { intent: INTENTS.END_CALL, rawText: text };
    }

    // --- HOLD CALL / PAUSE CALL ---
    if (/\b(hold|hold call|put on hold|place on hold|pause call|hold the call)\b/i.test(text)) {
      return { intent: INTENTS.HOLD_CALL, rawText: text };
    }

    // --- UNHOLD CALL / RESUME CALL ---
    if (/\b(unhold|unhold call|resume|resume call|take off hold|back to call)\b/i.test(text)) {
      return { intent: INTENTS.UNHOLD_CALL, rawText: text };
    }

    // --- MUTE MICROPHONE ---
    if (/\b(mute|mute mic|mute microphone|silence mic|turn off mic|quiet)\b/i.test(text) && !/unmute/i.test(text)) {
      return { intent: INTENTS.MUTE_MIC, rawText: text };
    }

    // --- UNMUTE MICROPHONE ---
    if (/\b(unmute|unmute mic|unmute microphone|turn on mic|enable mic)\b/i.test(text)) {
      return { intent: INTENTS.UNMUTE_MIC, rawText: text };
    }

    // --- SPEAKER CONTROL ---
    if (/\b(speaker on|turn on speaker|enable speaker|switch to speaker|loudspeaker|use speaker)\b/i.test(text)) {
      return { intent: INTENTS.SPEAKER_ON, rawText: text };
    }
    if (/\b(speaker off|turn off speaker|disable speaker|earpiece|normal speaker)\b/i.test(text)) {
      return { intent: INTENTS.SPEAKER_OFF, rawText: text };
    }

    // --- VIDEO / CAMERA CONTROLS ---
    if (/\b(turn on video|turn on camera|enable video|enable camera|start video)\b/i.test(text)) {
      return { intent: INTENTS.VIDEO_ON, rawText: text };
    }
    if (/\b(turn off video|turn off camera|disable video|disable camera|stop video)\b/i.test(text)) {
      return { intent: INTENTS.VIDEO_OFF, rawText: text };
    }
    if (/\b(switch camera|flip camera|toggle camera|change camera)\b/i.test(text)) {
      return { intent: INTENTS.SWITCH_CAMERA, rawText: text };
    }

    // --- NAVIGATION / SCREEN OPENING ---
    if (/\b(open|go to|show|view)\b/i.test(text)) {
      if (/contacts?|users?|people|directory/i.test(text)) {
        return { intent: INTENTS.OPEN_CONTACTS, rawText: text };
      }
      if (/profile|account|my profile/i.test(text)) {
        return { intent: INTENTS.OPEN_PROFILE, rawText: text };
      }
      if (/settings?|preferences|config/i.test(text)) {
        return { intent: INTENTS.OPEN_SETTINGS, rawText: text };
      }
      if (/debug|logs|diagnostics/i.test(text)) {
        return { intent: INTENTS.OPEN_DEBUG, rawText: text };
      }
    }

    // --- SEARCH CONTACT ---
    const searchMatch = text.match(/(?:search|find|look up)\s+(?:for\s+)?([a-z0-9\s._-]+)/i);
    if (searchMatch && searchMatch[1]) {
      return { intent: INTENTS.SEARCH_CONTACT, query: searchMatch[1].trim(), rawText: text };
    }

    // --- SUMMARIZE CALL ---
    if (/summarize|summary|last call|call details|recent call/i.test(text)) {
      return { intent: INTENTS.SUMMARIZE_CALL, rawText: text };
    }

    return null;
  }

  /**
   * Resolve contextually ambiguous single-word commands based on active call state.
   */
  _resolveContextualShortcuts(text) {
    const context = ConversationManager.getContext();
    const isCallActive = context.activeCallState && context.activeCallState !== 'Idle';

    if (isCallActive) {
      if (text === 'mute') return { intent: INTENTS.MUTE_MIC, rawText: text };
      if (text === 'unmute') return { intent: INTENTS.UNMUTE_MIC, rawText: text };
      if (text === 'hold') return { intent: INTENTS.HOLD_CALL, rawText: text };
      if (text === 'unhold' || text === 'resume') return { intent: INTENTS.UNHOLD_CALL, rawText: text };
      if (text === 'speaker') return { intent: INTENTS.SPEAKER_ON, rawText: text };
      if (text === 'hangup' || text === 'end') return { intent: INTENTS.END_CALL, rawText: text };
    }

    return null;
  }
}

export default new IntentParser();
