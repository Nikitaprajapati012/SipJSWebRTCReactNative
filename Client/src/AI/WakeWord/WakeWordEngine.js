/**
 * Client/src/AI/WakeWord/WakeWordEngine.js
 *
 * Continuous low-overhead Wake Word Engine.
 * Listens in the background for trigger words ("Hey Nova", "Hey Assistant", etc.)
 * without locking CPU or causing battery drain.
 */

import { AppState, NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import WAKE_WORD_CONFIG from './WakeWordConfig';
import SpeechRecognitionService from '../Speech/SpeechRecognitionService';
import Logger from '../../services/Logger';

class WakeWordEngine {
  constructor() {
    this.isListening = false;
    this.isEnabled = true;
    this.listeners = new Set();
    this.appStateSubscription = null;
    this.configuredWakeWords = [...WAKE_WORD_CONFIG.wakeWords];
    this.audioProcessingInterval = null;
    this.simulationKeywordDetector = null;
    this._setupNativeEventListeners();
  }

  /**
   * Listen to native Android speech recognition events for continuous wake-word detection.
   */
  _setupNativeEventListeners() {
    if (DeviceEventEmitter) {
      DeviceEventEmitter.addListener('onSpeechPartialResults', (data) => {
        if (this.isListening && data && data.text) {
          this.processSpeechText(data.text);
        }
      });

      DeviceEventEmitter.addListener('onSpeechResults', (data) => {
        if (this.isListening && data && data.text) {
          this.processSpeechText(data.text);
        }
      });
    }
  }

  /**
   * Initialize engine and setup AppState listeners.
   */
  init(customWakeWords = []) {
    if (customWakeWords.length > 0) {
      this.configuredWakeWords = Array.from(
        new Set([...customWakeWords.map((w) => w.toLowerCase()), ...this.configuredWakeWords])
      );
    }

    Logger.log({
      module: 'WakeWordEngine',
      method: 'init',
      action: 'Engine Initialized',
      result: `Wake Words: ${this.configuredWakeWords.join(', ')}`,
    });

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange);
  }

  _handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active' && this.isEnabled && !this.isListening) {
      this.start();
    } else if (nextAppState.match(/inactive|background/) && this.isListening) {
      Logger.log({
        module: 'WakeWordEngine',
        method: '_handleAppStateChange',
        action: 'App Backgrounded',
        result: 'Adjusting wake-word engine state',
      });
    }
  };

  /**
   * Register a listener callback for wake word detection.
   */
  addWakeWordListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Start listening for wake words.
   */
  start() {
    if (this.isListening || !this.isEnabled) return;
    this.isListening = true;

    Logger.log({
      module: 'WakeWordEngine',
      method: 'start',
      action: 'Wake Word Engine Listening',
      result: 'Active and awaiting trigger phrase ("Hey Nova")',
    });

    this._startBackgroundListeningStream();
  }

  _startBackgroundListeningStream() {
    // Start microphone speech recognition for hands-free wake word detection
    SpeechRecognitionService.startListening().catch((err) => {
      console.warn('Failed to start background wake word recognition:', err);
    });

    // Web Speech Recognition fallback for browser runtime
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition && !this.backgroundRecognizer) {
        try {
          this.backgroundRecognizer = new SpeechRecognition();
          this.backgroundRecognizer.continuous = true;
          this.backgroundRecognizer.interimResults = true;
          this.backgroundRecognizer.lang = 'en-US';

          this.backgroundRecognizer.onresult = (event) => {
            if (!this.isListening) return;
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcript = event.results[i][0].transcript;
              if (transcript) {
                this.processSpeechText(transcript);
              }
            }
          };

          this.backgroundRecognizer.onend = () => {
            if (this.isListening) {
              try {
                this.backgroundRecognizer.start();
              } catch (e) {}
            }
          };

          try {
            this.backgroundRecognizer.start();
          } catch (e) {}
        } catch (e) {
          console.warn('Background wake word recognition initialization error:', e);
        }
      }
    }
  }

  /**
   * Temporarily pause wake word engine (e.g. while Assistant is speaking or actively processing STT).
   */
  pause() {
    if (!this.isListening) return;
    this.isListening = false;
    if (this.backgroundRecognizer) {
      try {
        this.backgroundRecognizer.stop();
      } catch (e) {}
    }
    if (this.audioProcessingInterval) {
      clearInterval(this.audioProcessingInterval);
      this.audioProcessingInterval = null;
    }
    Logger.log({
      module: 'WakeWordEngine',
      method: 'pause',
      action: 'Wake Word Engine Paused',
      result: 'Paused during active conversation',
    });
  }

  /**
   * Resume listening after processing finishes.
   */
  resume() {
    if (this.isEnabled && !this.isListening) {
      this.start();
    }
  }

  /**
   * Stop wake word engine completely.
   */
  stop() {
    this.isListening = false;
    if (this.backgroundRecognizer) {
      try {
        this.backgroundRecognizer.stop();
        this.backgroundRecognizer = null;
      } catch (e) {}
    }
    if (this.audioProcessingInterval) {
      clearInterval(this.audioProcessingInterval);
      this.audioProcessingInterval = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    Logger.log({
      module: 'WakeWordEngine',
      method: 'stop',
      action: 'Wake Word Engine Stopped',
      result: 'Engine turned off',
    });
  }

  /**
   * Test or process text input to match wake words (for speech stream parser).
   */
  processSpeechText(text) {
    if (!this.isListening || !text) return false;

    const cleanText = text.toLowerCase().trim();
    const matchedKeyword = this.configuredWakeWords.find((keyword) =>
      cleanText.includes(keyword)
    );

    if (matchedKeyword) {
      Logger.log({
        module: 'WakeWordEngine',
        method: 'processSpeechText',
        action: 'Wake Word Triggered',
        result: `Matched Keyword: "${matchedKeyword}" in text: "${text}"`,
      });

      // Extract command after wake word if user spoke wake word + command together (e.g., "Hey Nova call Bob")
      const regex = new RegExp(matchedKeyword, 'i');
      const commandAfterWakeWord = text.replace(regex, '').trim();

      this.triggerWakeWord(matchedKeyword, commandAfterWakeWord);
      return true;
    }

    return false;
  }

  /**
   * Manually or programmatically trigger the wake word event.
   */
  triggerWakeWord(keyword = 'Hey Nova', rawText = '') {
    this.pause();
    this.listeners.forEach((callback) => {
      try {
        callback({ keyword, rawText, timestamp: Date.now() });
      } catch (err) {
        console.error('Error in wake word listener:', err);
      }
    });
  }

  /**
   * Configure wake word engine settings.
   */
  setWakeWords(wakeWordsList) {
    if (Array.isArray(wakeWordsList) && wakeWordsList.length > 0) {
      this.configuredWakeWords = wakeWordsList.map((w) => w.toLowerCase());
    }
  }
}

export default new WakeWordEngine();
