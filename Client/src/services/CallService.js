/**
 * Client/src/services/CallService.js
 * 
 * Coordinates the full lifecycle of audio calling.
 * Interfaces with SipService to invoke SIP signals (INVITE, BYE, CANCEL, ACCEPT, DECLINE),
 * and hooks them into WebRTCService to control media channels.
 */

import { Inviter, UserAgent } from 'sip.js';
import SipService, { SessionState } from './SipService';
import WebRTCService from './WebRTCService';
import Logger from './Logger';
import { SIP_DOMAIN } from '../config';

class CallService {
  constructor() {
    this.activeSession = null;
    this.pcReference = null;
    this.localStreamReference = null;
    this.username = 'System';
  }

  setUsername(username) {
    this.username = username;
    WebRTCService.setUsername(username);
  }

  /**
   * Start an outgoing call.
   * Called when caller clicks the "Call" button on HomeScreen.
   * 
   * @param {string} targetUsername - Callee username (e.g. 'bob')
   * @param {Object} hookHandlers - Call callbacks:
   *   - `onTrack`: Triggers when remote audio stream is ready.
   *   - `onStateChange`: Triggers during dialing, ringing, answered, ended phases.
   * @returns {Promise<Inviter>} SIP.js Inviter session
   */
  async makeCall(targetUsername, { onTrack, onStateChange, isVideoCall, onConnectionStateChange }) {
    if (!SipService.userAgent) {
      throw new Error('SIP UserAgent is not initialized');
    }

    const calleeUri = UserAgent.makeURI(`sip:${targetUsername.toLowerCase()}@${SIP_DOMAIN}`);
    
    Logger.log({
      username: this.username,
      screen: 'Home',
      module: 'CallService',
      method: 'makeCall()',
      action: 'Call Initiated',
      result: `Calling Bob/Callee: ${targetUsername}. Video Call: ${isVideoCall}`
    });

    onStateChange('Dialing');

    // Configure CustomSessionDescriptionHandler options so we can hook track/pc creation
    const sessionDescriptionHandlerOptions = {
      constraints: {
        audio: true,
        video: isVideoCall,
      },
      onTrackCallback: (remoteStream) => {
        this.remoteStreamReference = remoteStream;
        Logger.log({
          username: this.username,
          module: 'CallService',
          method: 'onTrack',
          action: 'Media Connected',
          result: 'Remote track active'
        });
        onTrack(remoteStream);
      },
      onPeerConnectionCreated: (pc, localStream) => {
        this.pcReference = pc;
        this.localStreamReference = localStream;
        
        pc.onconnectionstatechange = () => {
          if (onConnectionStateChange) onConnectionStateChange(pc.connectionState);
        };
        pc.oniceconnectionstatechange = () => {
          if (onConnectionStateChange) onConnectionStateChange(pc.iceConnectionState);
        };
      }
    };

    // Statically assign callbacks to SipService singleton to ensure they are captured during description generation
    SipService.onPeerConnectionCreated = sessionDescriptionHandlerOptions.onPeerConnectionCreated;
    SipService.onTrackCallback = sessionDescriptionHandlerOptions.onTrackCallback;
    SipService.constraints = sessionDescriptionHandlerOptions.constraints;

    const inviter = new Inviter(SipService.userAgent, calleeUri, {
      sessionDescriptionHandlerOptions,
    });

    this.activeSession = inviter;
    this.attachSessionStateListeners(inviter, onStateChange);

    try {
      await inviter.invite({ sessionDescriptionHandlerOptions });
      Logger.log({
        username: this.username,
        module: 'CallService',
        method: 'makeCall()',
        action: 'Invite Sent',
        result: `SIP INVITE sent to ${targetUsername}`
      });
      return inviter;
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'CallService',
        method: 'makeCall()',
        action: 'Invite Failed',
        result: error.message
      });
      onStateChange('Failed');
      this.cleanup();
      throw error;
    }
  }

  /**
   * Accept an incoming call.
   * Called when callee clicks "Accept" on incoming call layout.
   * 
   * @param {Invitation} invitation - Active SIP.js incoming session
   * @param {Object} hookHandlers - Call callbacks: { onTrack, onStateChange }
   */
  async acceptCall(invitation, { onTrack, onStateChange, isVideoCall, onConnectionStateChange }) {
    Logger.log({
      username: this.username,
      screen: 'CallScreen',
      module: 'CallService',
      method: 'acceptCall()',
      action: 'Accepting Call',
      result: `Answering incoming call from ${invitation.remoteIdentity.uri.user}. Video Call: ${isVideoCall}`
    });

    onStateChange('Connecting');

    const sessionDescriptionHandlerOptions = {
      constraints: {
        audio: true,
        video: isVideoCall,
      },
      onTrackCallback: (remoteStream) => {
        this.remoteStreamReference = remoteStream;
        Logger.log({
          username: this.username,
          module: 'CallService',
          method: 'onTrack',
          action: 'Media Connected',
          result: 'Remote stream active'
        });
        onTrack(remoteStream);
      },
      onPeerConnectionCreated: (pc, localStream) => {
        this.pcReference = pc;
        this.localStreamReference = localStream;
        
        pc.onconnectionstatechange = () => {
          if (onConnectionStateChange) onConnectionStateChange(pc.connectionState);
        };
        pc.oniceconnectionstatechange = () => {
          if (onConnectionStateChange) onConnectionStateChange(pc.iceConnectionState);
        };
      }
    };

    // Statically assign callbacks to SipService singleton to ensure they are captured during description generation
    SipService.onPeerConnectionCreated = sessionDescriptionHandlerOptions.onPeerConnectionCreated;
    SipService.onTrackCallback = sessionDescriptionHandlerOptions.onTrackCallback;
    SipService.constraints = sessionDescriptionHandlerOptions.constraints;

    this.activeSession = invitation;
    this.attachSessionStateListeners(invitation, onStateChange);

    try {
      await invitation.accept({ sessionDescriptionHandlerOptions });
      Logger.log({
        username: this.username,
        module: 'CallService',
        method: 'acceptCall()',
        action: 'Call Answered (200 OK Sent)'
      });
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'CallService',
        method: 'acceptCall()',
        action: 'Answer Call Failed',
        result: error.message
      });
      onStateChange('Failed');
      this.cleanup();
    }
  }

  /**
   * Reject an incoming call (SIP DECLINE).
   * 
   * @param {Invitation} invitation - Active incoming session
   */
  async rejectCall(invitation) {
    if (!invitation) return;

    Logger.log({
      username: this.username,
      screen: 'CallScreen',
      module: 'CallService',
      method: 'rejectCall()',
      action: 'Call Rejected',
      result: `Declinining call from ${invitation.remoteIdentity.uri.user}`
    });

    try {
      await invitation.reject();
      this.cleanup();
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'CallService',
        method: 'rejectCall()',
        action: 'Reject Failed',
        result: error.message
      });
      this.cleanup();
    }
  }

  /**
   * Terminate active call session (SIP BYE / CANCEL).
   */
  async hangupCall() {
    const session = this.activeSession;
    if (!session) return;

    Logger.log({
      username: this.username,
      screen: 'CallScreen',
      module: 'CallService',
      method: 'hangupCall()',
      action: 'Call Hangup Triggered',
      result: `Terminating session state: ${session.state}`
    });

    try {
      if (session.state === SessionState.Established) {
        await session.bye();
      } else {
        await session.cancel();
      }
    } catch (error) {
      Logger.log({
        username: this.username,
        module: 'CallService',
        method: 'hangupCall()',
        action: 'Hangup Failed',
        result: error.message
      });
    } finally {
      this.cleanup();
    }
  }

  /**
   * Control microphone muting.
   */
  toggleMute(isMuted) {
    Logger.log({
      username: this.username,
      screen: 'CallScreen',
      module: 'CallService',
      method: 'toggleMute()',
      action: isMuted ? 'Mute Mic Triggered' : 'Unmute Mic Triggered',
      result: `Local stream reference present: ${!!this.localStreamReference}`
    });
    WebRTCService.toggleMute(this.localStreamReference, isMuted);
  }

  /**
   * Control audio routes.
   */
  toggleSpeaker(useSpeaker) {
    WebRTCService.toggleSpeaker(useSpeaker);
  }

  /**
   * Mocks hold operation by muting audio tracks on the PeerConnection (UI hold).
   */
  toggleHold(isHold) {
    Logger.log({
      username: this.username,
      screen: 'CallScreen',
      module: 'CallService',
      method: 'toggleHold()',
      action: isHold ? 'Hold Triggered' : 'Resume Triggered',
      result: `localStreamReference exists: ${!!this.localStreamReference}, remoteStreamReference exists: ${!!this.remoteStreamReference}`
    });

    if (this.localStreamReference) {
      this.localStreamReference.getAudioTracks().forEach((track) => {
        track.enabled = !isHold;
      });
    }

    if (this.remoteStreamReference) {
      this.remoteStreamReference.getAudioTracks().forEach((track) => {
        track.enabled = !isHold;
      });
    }
  }

  /**
   * Toggle remote stream routing when peer places us on hold.
   */
  setPeerHoldState(isHold) {
    if (this.remoteStreamReference) {
      this.remoteStreamReference.getAudioTracks().forEach((track) => {
        track.enabled = !isHold;
      });
    }
  }

  /**
   * Clean up cached sessions and stream configurations.
   */
  cleanup() {
    this.activeSession = null;
    this.pcReference = null;
    this.localStreamReference = null;
    this.remoteStreamReference = null;
    if (SipService) {
      SipService.onPeerConnectionCreated = null;
      SipService.onTrackCallback = null;
    }
  }

  /**
   * Connect session listener state updates to UI status callbacks.
   */
  attachSessionStateListeners(session, onStateChange) {
    session.stateChange.addListener((state) => {
      Logger.log({
        username: this.username,
        module: 'CallService',
        method: 'attachSessionStateListeners',
        action: 'SIP Session State Change',
        result: `State: ${state}`
      });

      switch (state) {
        case SessionState.Establishing:
          // INVITE in progress, wait for ringing responses
          onStateChange('Ringing');
          break;
        case SessionState.Established:
          onStateChange('Connected');
          break;
        case SessionState.Terminating:
          onStateChange('Disconnecting');
          break;
        case SessionState.Terminated:
          onStateChange('Ended');
          this.cleanup();
          break;
        default:
          break;
      }
    });
  }
}

export default new CallService();
export { SessionState };
