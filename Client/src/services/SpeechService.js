/**
 * Client/src/services/SpeechService.js
 *
 * High-Level Service wrapper for Speech-to-Text & Wake Word management.
 */

import SpeechRecognitionService from '../AI/Speech/SpeechRecognitionService';
import WakeWordEngine from '../AI/WakeWord/WakeWordEngine';

class SpeechService {
  async startListening() {
    return SpeechRecognitionService.startListening();
  }

  stopListening() {
    SpeechRecognitionService.stopListening();
  }

  pauseWakeWord() {
    WakeWordEngine.pause();
  }

  resumeWakeWord() {
    WakeWordEngine.resume();
  }

  setWakeWords(wakeWordsList) {
    WakeWordEngine.setWakeWords(wakeWordsList);
  }
}

export default new SpeechService();
