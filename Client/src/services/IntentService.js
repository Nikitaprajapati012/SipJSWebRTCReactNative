/**
 * Client/src/services/IntentService.js
 *
 * High-Level Service wrapper for Intent Parsing & Action Execution.
 */

import IntentParser from '../AI/Intent/IntentParser';
import ActionExecutor from '../AI/Assistant/ActionExecutor';

class IntentService {
  async parseIntent(transcript) {
    return IntentParser.parse(transcript);
  }

  async executeIntent(intentObj, callContext) {
    return ActionExecutor.execute(intentObj, callContext);
  }
}

export default new IntentService();
