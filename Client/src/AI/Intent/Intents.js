/**
 * Client/src/AI/Intent/Intents.js
 *
 * Centralized Intent Constants and Standardized Action Schemas for AI Voice Assistant.
 * Used by IntentParser and ActionExecutor.
 */

export const INTENTS = {
  CALL_USER: 'CALL_USER',
  ACCEPT_CALL: 'ACCEPT_CALL',
  REJECT_CALL: 'REJECT_CALL',
  END_CALL: 'END_CALL',
  HOLD_CALL: 'HOLD_CALL',
  UNHOLD_CALL: 'UNHOLD_CALL',
  MUTE_MIC: 'MUTE_MIC',
  UNMUTE_MIC: 'UNMUTE_MIC',
  SPEAKER_ON: 'SPEAKER_ON',
  SPEAKER_OFF: 'SPEAKER_OFF',
  VIDEO_ON: 'VIDEO_ON',
  VIDEO_OFF: 'VIDEO_OFF',
  SWITCH_CAMERA: 'SWITCH_CAMERA',
  OPEN_CONTACTS: 'OPEN_CONTACTS',
  OPEN_PROFILE: 'OPEN_PROFILE',
  OPEN_SETTINGS: 'OPEN_SETTINGS',
  OPEN_DEBUG: 'OPEN_DEBUG',
  SEARCH_CONTACT: 'SEARCH_CONTACT',
  SUMMARIZE_CALL: 'SUMMARIZE_CALL',
  GENERAL_QUERY: 'GENERAL_QUERY',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Standard Spoken Voice Response templates for each Intent execution.
 */
export const INTENT_VOICE_RESPONSES = {
  [INTENTS.CALL_USER]: (contact, callType) =>
    contact ? `Calling ${contact}${callType === 'video' ? ' with video' : ''}.` : 'Who would you like to call?',
  [INTENTS.ACCEPT_CALL]: 'Answering call.',
  [INTENTS.REJECT_CALL]: 'Call rejected.',
  [INTENTS.END_CALL]: 'Ending call.',
  [INTENTS.HOLD_CALL]: 'Placing call on hold.',
  [INTENTS.UNHOLD_CALL]: 'Resuming call.',
  [INTENTS.MUTE_MIC]: 'Microphone muted.',
  [INTENTS.UNMUTE_MIC]: 'Microphone unmuted.',
  [INTENTS.SPEAKER_ON]: 'Speaker enabled.',
  [INTENTS.SPEAKER_OFF]: 'Speaker disabled.',
  [INTENTS.VIDEO_ON]: 'Camera turned on.',
  [INTENTS.VIDEO_OFF]: 'Camera turned off.',
  [INTENTS.SWITCH_CAMERA]: 'Switching camera.',
  [INTENTS.OPEN_CONTACTS]: 'Opening contacts.',
  [INTENTS.OPEN_PROFILE]: 'Opening profile.',
  [INTENTS.OPEN_SETTINGS]: 'Opening settings.',
  [INTENTS.OPEN_DEBUG]: 'Opening debug screen.',
  [INTENTS.SEARCH_CONTACT]: (query) => (query ? `Searching for ${query}.` : 'Opening contact search.'),
  [INTENTS.SUMMARIZE_CALL]: 'Here is a summary of your recent call activity.',
  [INTENTS.GENERAL_QUERY]: (ans) => ans || "I'm not sure how to assist with that.",
  [INTENTS.UNKNOWN]: "I'm sorry, I didn't catch that command. Could you repeat?",
};

export default INTENTS;
