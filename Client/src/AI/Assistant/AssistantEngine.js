/**
 * Client/src/AI/Assistant/AssistantEngine.js
 *
 * Master State Machine Orchestrator for hands-free AI Voice Assistant.
 * Controls seamless state transitions:
 * IDLE -> WAKEWORD_DETECTED -> LISTENING -> PROCESSING -> EXECUTING -> SPEAKING -> IDLE
 */

import WakeWordEngine from '../WakeWord/WakeWordEngine';
import SpeechRecognitionService from '../Speech/SpeechRecognitionService';
import TextToSpeechService from '../TTS/TextToSpeechService';
import IntentParser from '../Intent/IntentParser';
import ActionExecutor from './ActionExecutor';
import ConversationManager from '../Conversation/ConversationManager';
import Logger from '../../services/Logger';

export const ASSISTANT_STATES = {
  IDLE: 'IDLE',
  WAKEWORD_DETECTED: 'WAKEWORD_DETECTED',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  EXECUTING: 'EXECUTING',
  SPEAKING: 'SPEAKING',
  ERROR: 'ERROR',
};

class AssistantEngine {
  constructor() {
    this.state = ASSISTANT_STATES.IDLE;
    this.transcript = '';
    this.lastSpokenResponse = '';
    this.stateChangeListeners = new Set();
    this.transcriptListeners = new Set();
    this.callContextRef = null;
    this.isHandsFreeEnabled = true;
  }

  /**
   * Initialize assistant engine subsystems and register listeners.
   */
  init(callContext = null) {
    this.callContextRef = callContext;

    // 1. Setup Wake Word Engine
    WakeWordEngine.init();
    WakeWordEngine.addWakeWordListener(this._handleWakeWordTrigger);

    // 2. Setup STT Listeners
    SpeechRecognitionService.onResult(this._handleSpeechResult);
    SpeechRecognitionService.onEnd(this._handleSpeechEnd);
    SpeechRecognitionService.onError(this._handleSpeechError);

    // 3. Setup TTS Finish Listener
    TextToSpeechService.onFinish(this._handleTTSFinish);

    // Start hands-free wake word listening automatically
    if (this.isHandsFreeEnabled) {
      WakeWordEngine.start();
    }

    Logger.log({
      module: 'AssistantEngine',
      method: 'init',
      action: 'Assistant Master Engine Ready',
      result: `Hands-free status: ${this.isHandsFreeEnabled ? 'Enabled' : 'Disabled'}`,
    });
  }

  /**
   * Bind/update reference to active CallContext.
   */
  setCallContext(callContext) {
    this.callContextRef = callContext;
  }

  /**
   * State Machine transition handler.
   */
  _setState(newState) {
    if (this.state === newState) return;
    this.state = newState;

    Logger.log({
      module: 'AssistantEngine',
      method: '_setState',
      action: 'Assistant State Transition',
      result: `State: ${newState}`,
    });

    this.stateChangeListeners.forEach((cb) => {
      try {
        cb(newState);
      } catch (e) {
        console.error('Error in assistant state listener:', e);
      }
    });
  }

  /**
   * Triggered when Wake Word ("Hey Nova", "Hey Assistant") is detected hands-free.
   */
  _handleWakeWordTrigger = async ({ keyword = 'Hey Nova', rawText = '' } = {}) => {
    Logger.log({
      module: 'AssistantEngine',
      method: '_handleWakeWordTrigger',
      action: 'Wake Word Detected',
      result: `Trigger phrase: "${keyword}", rawText: "${rawText}"`,
    });

    this._setState(ASSISTANT_STATES.WAKEWORD_DETECTED);
    TextToSpeechService.playActivationChime();

    // If user spoke wake word + command together (e.g. "Hey Nova call Bob"), execute command directly
    if (rawText && rawText.trim().length > 0) {
      setTimeout(() => {
        this.processTextInput(rawText.trim());
      }, 400);
      return;
    }

    // Small delay to allow chime sound, then start listening
    setTimeout(() => {
      this.startListening();
    }, 400);
  };

  /**
   * Start listening for voice prompt.
   */
  async startListening() {
    this.transcript = '';
    this._notifyTranscript('');
    WakeWordEngine.pause();

    const success = await SpeechRecognitionService.startListening();
    if (success) {
      this._setState(ASSISTANT_STATES.LISTENING);
    } else {
      this._setState(ASSISTANT_STATES.ERROR);
      this._resetToIdle();
    }
  }

  /**
   * Process partial/final STT text.
   */
  _handleSpeechResult = ({ text }) => {
    // Only capture active speech text when assistant has been triggered by "Hey Nova"
    if (this.state === ASSISTANT_STATES.IDLE) return;

    this.transcript = text;
    this._notifyTranscript(text);
  };

  /**
   * Speech input finished -> process intent & execute action.
   */
  _handleSpeechEnd = async (finalTranscript) => {
    // Ignore speech completion if assistant is IDLE, or already processing/executing
    if (
      this.state === ASSISTANT_STATES.IDLE ||
      this.state === ASSISTANT_STATES.PROCESSING ||
      this.state === ASSISTANT_STATES.EXECUTING
    ) {
      return;
    }

    const trimmed = (finalTranscript || '').trim().toLowerCase();
    const NOISE_WORDS = ['in', 'a', 'an', 'the', 'uh', 'um', 'ah', 'in head', 'layout', 'head', 'it', 'is', 'to'];
    if (!trimmed || trimmed.length <= 2 || NOISE_WORDS.includes(trimmed)) {
      Logger.log({
        module: 'AssistantEngine',
        method: '_handleSpeechEnd',
        action: 'Noise Transcript Ignored',
        result: `Ignored background noise: "${finalTranscript}"`,
      });
      this._resetToIdle();
      return;
    }

    this._setState(ASSISTANT_STATES.PROCESSING);
    ConversationManager.addTurn('user', finalTranscript);

    // 1. Parse Intent
    const parsedIntent = await IntentParser.parse(finalTranscript);

    // 2. Execute Action
    this._setState(ASSISTANT_STATES.EXECUTING);
    const executionResult = await ActionExecutor.execute(parsedIntent, this.callContextRef);

    // 3. Speak Spoken Response
    this.lastSpokenResponse = executionResult.spokenResponse;
    ConversationManager.addTurn('assistant', executionResult.spokenResponse, parsedIntent.intent);

    if (executionResult.spokenResponse) {
      this._setState(ASSISTANT_STATES.SPEAKING);
      await TextToSpeechService.speak(executionResult.spokenResponse);
    } else {
      this._resetToIdle();
    }
  };

  /**
   * STT error callback handler.
   */
  _handleSpeechError = (error) => {
    Logger.log({
      module: 'AssistantEngine',
      method: '_handleSpeechError',
      action: 'Speech Recognition Failed',
      result: error.message || 'Unknown error',
    });
    this._setState(ASSISTANT_STATES.ERROR);
    this._resetToIdle();
  };

  /**
   * TTS finished speaking -> reset state back to IDLE / resume hands-free listening.
   */
  _handleTTSFinish = () => {
    if (this.state === ASSISTANT_STATES.SPEAKING) {
      this._resetToIdle();
    }
  };

  /**
   * Stop active session and return to IDLE hands-free mode.
   */
  stopSession() {
    SpeechRecognitionService.stopListening();
    TextToSpeechService.stop();
    this._resetToIdle();
  }

  _resetToIdle() {
    this._setState(ASSISTANT_STATES.IDLE);
    if (this.isHandsFreeEnabled) {
      WakeWordEngine.resume();
    }
  }

  /**
   * Enable or disable hands-free wake word listening.
   */
  setHandsFreeEnabled(enabled) {
    this.isHandsFreeEnabled = enabled;
    if (enabled) {
      WakeWordEngine.start();
    } else {
      WakeWordEngine.stop();
    }
  }

  /**
   * Process manual text or spoken voice command input.
   */
  async processTextInput(text) {
    if (!text || !text.trim()) return;
    this.transcript = text.trim();
    this._notifyTranscript(this.transcript);

    // Ensure state is set to LISTENING so state machine transitions cleanly
    if (this.state === ASSISTANT_STATES.IDLE || this.state === ASSISTANT_STATES.WAKEWORD_DETECTED) {
      this._setState(ASSISTANT_STATES.LISTENING);
    }

    await this._handleSpeechEnd(this.transcript);
  }

  // --- Event Subscription Handlers ---
  addStateChangeListener(cb) {
    this.stateChangeListeners.add(cb);
    return () => this.stateChangeListeners.delete(cb);
  }

  addTranscriptListener(cb) {
    this.transcriptListeners.add(cb);
    return () => this.transcriptListeners.delete(cb);
  }

  _notifyTranscript(text) {
    this.transcriptListeners.forEach((cb) => {
      try {
        cb(text);
      } catch (e) {}
    });
  }
}

export default new AssistantEngine();
