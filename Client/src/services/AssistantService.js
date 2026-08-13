/**
 * Client/src/services/AssistantService.js
 *
 * Facade Service Interface for AI Voice Assistant initialization & global controls.
 */

import AssistantEngine from '../AI/Assistant/AssistantEngine';
import WakeWordEngine from '../AI/WakeWord/WakeWordEngine';

class AssistantService {
  init(callContext) {
    AssistantEngine.init(callContext);
  }

  setCallContext(callContext) {
    AssistantEngine.setCallContext(callContext);
  }

  triggerWakeWordManually(keyword = 'Hey Nova') {
    WakeWordEngine.triggerWakeWord(keyword);
  }

  startListening() {
    AssistantEngine.startListening();
  }

  stopSession() {
    AssistantEngine.stopSession();
  }

  setHandsFreeEnabled(enabled) {
    AssistantEngine.setHandsFreeEnabled(enabled);
  }

  processTextInput(text) {
    AssistantEngine.processTextInput(text);
  }
}

export default new AssistantService();
