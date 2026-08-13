/**
 * Client/src/AI/Assistant/ActionExecutor.js
 *
 * Centralized Action Executor.
 * Maps structured intents into application business logic, calling existing
 * CallContext, Sip/WebRTC services, and Navigation routines.
 */

import INTENTS, { INTENT_VOICE_RESPONSES } from '../Intent/Intents';
import * as NavigationService from '../../services/NavigationService';
import UserService from '../../services/UserService';
import ConversationManager from '../Conversation/ConversationManager';
import Logger from '../../services/Logger';

class ActionExecutor {
  /**
   * Execute an intent using app services and context references.
   *
   * @param {Object} intentObj Structured Intent object
   * @param {Object} callContext Reference to CallContext state and actions
   * @returns {Object} Result object containing status, spokenResponse, and payload
   */
  async execute(intentObj, callContext) {
    if (!intentObj || !intentObj.intent) {
      return {
        success: false,
        spokenResponse: INTENT_VOICE_RESPONSES[INTENTS.UNKNOWN],
      };
    }

    const { intent, contact, callType, query, rawText, spokenResponse: customSpokenResponse } = intentObj;

    Logger.log({
      module: 'ActionExecutor',
      method: 'execute',
      action: 'Executing Intent Action',
      result: `Intent: ${intent}, Contact: ${contact || 'N/A'}`,
    });

    let result = { success: true, spokenResponse: '' };

    try {
      switch (intent) {
        // --- MAKE OUTGOING CALL ---
        case INTENTS.CALL_USER: {
          if (!contact) {
            result = {
              success: false,
              spokenResponse: 'Who would you like to call? Please specify a contact name.',
            };
            break;
          }

          // Search users list to find matching username
          const matchedUser = await this._findBestMatchingUser(contact);
          const targetUsername = matchedUser ? matchedUser.username : contact.toLowerCase().replace(/\s+/g, '');

          const isVideo = callType === 'video';
          if (callContext && callContext.makeCall) {
            await callContext.makeCall(targetUsername, isVideo);
            ConversationManager.setCallContext('Dialing', targetUsername);
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.CALL_USER](matchedUser ? matchedUser.displayName || matchedUser.username : targetUsername, callType);
          } else {
            result = { success: false, spokenResponse: 'Call service is unavailable.' };
          }
          break;
        }

        // --- ACCEPT INCOMING CALL ---
        case INTENTS.ACCEPT_CALL: {
          if (callContext && callContext.incomingInvitation && callContext.acceptCall) {
            await callContext.acceptCall();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.ACCEPT_CALL];
          } else if (callContext && callContext.callState === 'Ringing') {
            await callContext.acceptCall();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.ACCEPT_CALL];
          } else {
            result = { success: false, spokenResponse: 'There is no incoming call to answer.' };
          }
          break;
        }

        // --- REJECT INCOMING CALL ---
        case INTENTS.REJECT_CALL: {
          if (callContext && callContext.rejectCall) {
            callContext.rejectCall();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.REJECT_CALL];
          } else {
            result = { success: false, spokenResponse: 'No incoming call to reject.' };
          }
          break;
        }

        // --- END ACTIVE CALL ---
        case INTENTS.END_CALL: {
          if (callContext && callContext.hangupCall) {
            callContext.hangupCall();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.END_CALL];
          } else {
            result = { success: false, spokenResponse: 'No active call to end.' };
          }
          break;
        }

        // --- HOLD CALL ---
        case INTENTS.HOLD_CALL: {
          if (callContext && callContext.toggleHold) {
            if (!callContext.isHold) {
              callContext.toggleHold();
              result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.HOLD_CALL];
            } else {
              result.spokenResponse = 'Call is already on hold.';
            }
          } else {
            result = { success: false, spokenResponse: 'No active call to hold.' };
          }
          break;
        }

        // --- UNHOLD / RESUME CALL ---
        case INTENTS.UNHOLD_CALL: {
          if (callContext && callContext.toggleHold) {
            if (callContext.isHold) {
              callContext.toggleHold();
              result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.UNHOLD_CALL];
            } else {
              result.spokenResponse = 'Call is not on hold.';
            }
          } else {
            result = { success: false, spokenResponse: 'No call to resume.' };
          }
          break;
        }

        // --- MUTE MIC ---
        case INTENTS.MUTE_MIC: {
          if (callContext && callContext.toggleMute) {
            if (!callContext.isMuted) callContext.toggleMute();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.MUTE_MIC];
          } else {
            result = { success: false, spokenResponse: 'Microphone control available during call.' };
          }
          break;
        }

        // --- UNMUTE MIC ---
        case INTENTS.UNMUTE_MIC: {
          if (callContext && callContext.toggleMute) {
            if (callContext.isMuted) callContext.toggleMute();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.UNMUTE_MIC];
          } else {
            result = { success: false, spokenResponse: 'Microphone control available during call.' };
          }
          break;
        }

        // --- SPEAKER ON ---
        case INTENTS.SPEAKER_ON: {
          if (callContext && callContext.toggleSpeaker) {
            if (!callContext.isSpeakerOn) callContext.toggleSpeaker();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.SPEAKER_ON];
          } else {
            result = { success: false, spokenResponse: 'Speaker control available during call.' };
          }
          break;
        }

        // --- SPEAKER OFF ---
        case INTENTS.SPEAKER_OFF: {
          if (callContext && callContext.toggleSpeaker) {
            if (callContext.isSpeakerOn) callContext.toggleSpeaker();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.SPEAKER_OFF];
          } else {
            result = { success: false, spokenResponse: 'Speaker control available during call.' };
          }
          break;
        }

        // --- VIDEO ON ---
        case INTENTS.VIDEO_ON: {
          if (callContext && callContext.toggleCamera) {
            if (!callContext.isCameraEnabled) callContext.toggleCamera();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.VIDEO_ON];
          } else {
            result = { success: false, spokenResponse: 'Camera control available during call.' };
          }
          break;
        }

        // --- VIDEO OFF ---
        case INTENTS.VIDEO_OFF: {
          if (callContext && callContext.toggleCamera) {
            if (callContext.isCameraEnabled) callContext.toggleCamera();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.VIDEO_OFF];
          } else {
            result = { success: false, spokenResponse: 'Camera control available during call.' };
          }
          break;
        }

        // --- SWITCH CAMERA ---
        case INTENTS.SWITCH_CAMERA: {
          if (callContext && callContext.switchCamera) {
            callContext.switchCamera();
            result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.SWITCH_CAMERA];
          } else {
            result = { success: false, spokenResponse: 'Camera switch available during video call.' };
          }
          break;
        }

        // --- OPEN SCREENS ---
        case INTENTS.OPEN_CONTACTS: {
          NavigationService.navigate('Home');
          result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.OPEN_CONTACTS];
          break;
        }

        case INTENTS.OPEN_PROFILE: {
          NavigationService.navigate('Home', { tab: 'profile' });
          result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.OPEN_PROFILE];
          break;
        }

        case INTENTS.OPEN_SETTINGS: {
          NavigationService.navigate('Debug');
          result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.OPEN_SETTINGS];
          break;
        }

        case INTENTS.OPEN_DEBUG: {
          NavigationService.navigate('Debug');
          result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.OPEN_DEBUG];
          break;
        }

        // --- SEARCH CONTACT ---
        case INTENTS.SEARCH_CONTACT: {
          NavigationService.navigate('Home', { searchQuery: query });
          result.spokenResponse = INTENT_VOICE_RESPONSES[INTENTS.SEARCH_CONTACT](query);
          break;
        }

        // --- SUMMARIZE CALL ---
        case INTENTS.SUMMARIZE_CALL: {
          const summary = ConversationManager.getContext().lastCallSummary;
          if (summary) {
            const mins = Math.floor(summary.duration / 60);
            const secs = summary.duration % 60;
            result.spokenResponse = `Your last call with ${summary.peerUsername} lasted ${mins > 0 ? `${mins} minutes and ` : ''}${secs} seconds.`;
          } else {
            result.spokenResponse = 'No recent completed calls to summarize.';
          }
          break;
        }

        // --- GENERAL AI QUERY ---
        case INTENTS.GENERAL_QUERY: {
          result.spokenResponse = customSpokenResponse || INTENT_VOICE_RESPONSES[INTENTS.GENERAL_QUERY]();
          break;
        }

        default: {
          result = {
            success: false,
            spokenResponse: INTENT_VOICE_RESPONSES[INTENTS.UNKNOWN],
          };
          break;
        }
      }
    } catch (err) {
      console.error('Error executing intent action:', err);
      result = {
        success: false,
        spokenResponse: 'An error occurred while executing the voice command.',
      };
    }

    return result;
  }

  /**
   * Helper to match spoken contact names to existing users list.
   */
  async _findBestMatchingUser(searchTerm) {
    if (!searchTerm) return null;
    try {
      const users = await UserService.getCachedUsers();
      if (!users || users.length === 0) return null;

      const term = searchTerm.toLowerCase().trim();
      return (
        users.find(
          (u) =>
            u.username.toLowerCase() === term ||
            term.includes(u.username.toLowerCase()) ||
            u.username.toLowerCase().includes(term) ||
            (u.displayName && u.displayName.toLowerCase().includes(term))
        ) || null
      );
    } catch (e) {
      return null;
    }
  }
}

export default new ActionExecutor();
