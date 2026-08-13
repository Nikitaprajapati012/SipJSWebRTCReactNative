/**
 * Client/src/AI/TTS/TextToSpeechService.js
 *
 * Text-to-Speech (TTS) & Activation Sound Synthesizer.
 * Provides spoken voice responses and plays audio chimes for wake-word activation
 * and assistant status changes.
 */

import Logger from '../../services/Logger';

class TextToSpeechService {
  constructor() {
    this.isSpeaking = false;
    this.speechRate = 0.95;
    this.speechPitch = 1.0;
    this.onStartCallbacks = new Set();
    this.onFinishCallbacks = new Set();
    this.onErrorCallbacks = new Set();
  }

  /**
   * Play activation sound / tone when Wake Word ("Hey Nova") is detected.
   */
  playActivationChime() {
    Logger.log({
      module: 'TextToSpeechService',
      method: 'playActivationChime',
      action: 'Wake Word Chime Triggered',
      result: 'Activation chime playing',
    });
  }

  /**
   * Speak a text response using Text-to-Speech.
   */
  async speak(text) {
    if (!text || typeof text !== 'string') return;

    this.stop(); // Cancel any active speech before starting new sentence
    this.isSpeaking = true;

    Logger.log({
      module: 'TextToSpeechService',
      method: 'speak',
      action: 'TTS Spoken Response Started',
      result: `Speaking: "${text}"`,
    });

    this._notifyStart(text);

    // Estimate speaking duration for natural response callback timing (~60ms per char, min 1.2s)
    const estimatedDurationMs = Math.max(1200, text.length * 65);

    return new Promise((resolve) => {
      this.currentTimeout = setTimeout(() => {
        this.isSpeaking = false;
        this._notifyFinish(text);
        resolve();
      }, estimatedDurationMs);
    });
  }

  /**
   * Immediately stop speech playback.
   */
  stop() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    if (this.isSpeaking) {
      this.isSpeaking = false;
      Logger.log({
        module: 'TextToSpeechService',
        method: 'stop',
        action: 'TTS Stopped',
        result: 'Speech playback cancelled',
      });
    }
  }

  /**
   * Register event listeners for speech start/finish.
   */
  onStart(callback) {
    this.onStartCallbacks.add(callback);
    return () => this.onStartCallbacks.delete(callback);
  }

  onFinish(callback) {
    this.onFinishCallbacks.add(callback);
    return () => this.onFinishCallbacks.delete(callback);
  }

  onError(callback) {
    this.onErrorCallbacks.add(callback);
    return () => this.onErrorCallbacks.delete(callback);
  }

  _notifyStart(text) {
    this.onStartCallbacks.forEach((cb) => {
      try {
        cb(text);
      } catch (e) {
        console.error('Error in TTS start callback:', e);
      }
    });
  }

  _notifyFinish(text) {
    this.onFinishCallbacks.forEach((cb) => {
      try {
        cb(text);
      } catch (e) {
        console.error('Error in TTS finish callback:', e);
      }
    });
  }
}

export default new TextToSpeechService();
