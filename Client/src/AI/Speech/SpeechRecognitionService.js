/**
 * Client/src/AI/Speech/SpeechRecognitionService.js
 *
 * Streaming Speech-to-Text (STT) Service.
 * Manages audio stream capture, continuous transcription, silence timeout detection,
 * and permissions for hands-free AI voice interaction.
 */

import { NativeModules, DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import Logger from '../../services/Logger';

class SpeechRecognitionService {
  constructor() {
    this.isRecognizing = false;
    this.currentTranscript = '';
    this.onResultCallbacks = new Set();
    this.onErrorCallbacks = new Set();
    this.onEndCallbacks = new Set();
    this.silenceTimer = null;
    this.silenceTimeoutMs = 3500; // 3.5 sec silence auto-finishes utterance
    this.webSpeechRecognizer = null;
    this.nativeModule = null;
    this._initRecognizer();
  }

  /**
   * Initialize native or Web SpeechRecognition instance if available in runtime environment.
   */
  _initRecognizer() {
    // 1. Native Android SpeechRecognitionModule listener setup
    const { SpeechRecognitionModule } = NativeModules;
    this.nativeModule = SpeechRecognitionModule;

    if (DeviceEventEmitter) {
      DeviceEventEmitter.addListener('onSpeechPartialResults', (data) => {
        if (data && data.text) {
          this.handleSpeechResult(data.text, false);
        }
      });

      DeviceEventEmitter.addListener('onSpeechResults', (data) => {
        if (data && data.text) {
          this.handleSpeechResult(data.text, true);
        }
      });

      DeviceEventEmitter.addListener('onSpeechError', (data) => {
        if (data && data.message) {
          console.warn('Native Speech Recognition error:', data.message);
          this._notifyError(new Error(data.message));
        }
      });
    }

    // 2. Web Speech Recognition fallback for browser runtime
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.webSpeechRecognizer = new SpeechRecognition();
          this.webSpeechRecognizer.continuous = true;
          this.webSpeechRecognizer.interimResults = true;
          this.webSpeechRecognizer.lang = 'en-US';

          this.webSpeechRecognizer.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }
            const transcript = finalTranscript || interimTranscript;
            if (transcript) {
              this.handleSpeechResult(transcript, !!finalTranscript);
            }
          };

          this.webSpeechRecognizer.onerror = (event) => {
            console.warn('Web Speech Recognition error:', event.error);
            this._notifyError(new Error(event.error));
          };

          this.webSpeechRecognizer.onend = () => {
            if (this.isRecognizing) {
              try {
                this.webSpeechRecognizer.start();
              } catch (e) {}
            }
          };
        } catch (e) {
          console.warn('Failed to initialize Web Speech Recognition:', e);
        }
      }
    }
  }

  /**
   * Check and request Microphone permissions cross-platform.
   */
  async requestMicrophonePermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission Required',
            message: 'AI Voice Assistant needs access to your microphone to listen to voice commands.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Microphone permission error:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Start listening to voice input for STT.
   */
  async startListening() {
    if (this.isRecognizing) {
      this.stopListening();
    }

    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      const err = new Error('Microphone permission denied');
      this._notifyError(err);
      return false;
    }

    this.isRecognizing = true;
    this.currentTranscript = '';
    this._resetSilenceTimer();

    if (this.nativeModule && this.nativeModule.startListening) {
      try {
        this.nativeModule.startListening('en-US');
      } catch (e) {
        console.warn('Failed to start native SpeechRecognitionModule:', e);
      }
    } else if (this.webSpeechRecognizer) {
      try {
        this.webSpeechRecognizer.start();
      } catch (e) {}
    }

    Logger.log({
      module: 'SpeechRecognitionService',
      method: 'startListening',
      action: 'STT Started',
      result: 'Listening for spoken commands',
    });

    return true;
  }

  /**
   * Process partial/final recognized text chunk from native STT or Web Speech stream.
   */
  handleSpeechResult(partialText, isFinal = false) {
    if (!this.isRecognizing || !partialText) return;

    this.currentTranscript = partialText;
    this._resetSilenceTimer();

    Logger.log({
      module: 'SpeechRecognitionService',
      method: 'handleSpeechResult',
      action: 'Transcript Chunk Received',
      result: `Transcript: "${partialText}", isFinal: ${isFinal}`,
    });

    this.onResultCallbacks.forEach((cb) => {
      try {
        cb({ text: partialText, isFinal });
      } catch (e) {
        console.error('Error in STT result callback:', e);
      }
    });

    if (isFinal) {
      this.stopListening();
    }
  }

  /**
   * Stop listening and finalize current speech transcript.
   */
  stopListening() {
    if (!this.isRecognizing) return;

    this.isRecognizing = false;
    this._clearSilenceTimer();

    if (this.nativeModule && this.nativeModule.stopListening) {
      try {
        this.nativeModule.stopListening();
      } catch (e) {}
    }

    if (this.webSpeechRecognizer) {
      try {
        this.webSpeechRecognizer.stop();
      } catch (e) {}
    }

    Logger.log({
      module: 'SpeechRecognitionService',
      method: 'stopListening',
      action: 'STT Stopped',
      result: `Final Transcript: "${this.currentTranscript}"`,
    });

    const finalTranscript = this.currentTranscript;
    this.onEndCallbacks.forEach((cb) => {
      try {
        cb(finalTranscript);
      } catch (e) {
        console.error('Error in STT end callback:', e);
      }
    });
  }

  /**
   * Silence detector automatically stops STT after a period of user silence.
   */
  _resetSilenceTimer() {
    this._clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.isRecognizing && this.currentTranscript.trim().length > 0) {
        Logger.log({
          module: 'SpeechRecognitionService',
          method: '_resetSilenceTimer',
          action: 'Silence Timeout Triggered',
          result: 'Auto-completing speech input',
        });
        this.stopListening();
      }
    }, this.silenceTimeoutMs);
  }

  _clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Register callbacks for STT results, errors, and end events.
   */
  onResult(callback) {
    this.onResultCallbacks.add(callback);
    return () => this.onResultCallbacks.delete(callback);
  }

  onError(callback) {
    this.onErrorCallbacks.add(callback);
    return () => this.onErrorCallbacks.delete(callback);
  }

  onEnd(callback) {
    this.onEndCallbacks.add(callback);
    return () => this.onEndCallbacks.delete(callback);
  }

  _notifyError(error) {
    this.isRecognizing = false;
    this._clearSilenceTimer();
    this.onErrorCallbacks.forEach((cb) => {
      try {
        cb(error);
      } catch (e) {
        console.error('Error in STT error callback:', e);
      }
    });
  }
}

export default new SpeechRecognitionService();
