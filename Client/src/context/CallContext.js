/**
 * Client/src/context/CallContext.js
 * 
 * CallContext maintains call states (Idle, Ringing, Connected, etc.),
 * local and remote streams, active timers, and controls audio toggles.
 * Starts SipService once signaling socket is ready.
 */

import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { NativeModules } from 'react-native';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';
import SipService, { SessionState } from '../services/SipService';
import CallService from '../services/CallService';
import Logger from '../services/Logger';
import SocketService from '../services/SocketService';

const { AudioRouteModule } = NativeModules;

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const { isSocketConnected } = useContext(SocketContext);

  const [callState, setCallState] = useState('Idle'); // Idle, Dialing, Ringing, Connecting, Connected, Ended, Failed
  const [incomingInvitation, setIncomingInvitation] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isHold, setIsHold] = useState(false);
  const [isPeerOnHold, setIsPeerOnHold] = useState(false); // Track if remote peer placed us on hold
  const [callDuration, setCallDuration] = useState(0);

  const timerRef = useRef(null);

  // Initialize and tear down SipService alongside socket connection status
  useEffect(() => {
    if (isSocketConnected && user) {
      SipService.start(user.username, {
        onIncomingCall: (invitation) => {
          // If we are busy, reject the call automatically
          if (CallService.activeSession || incomingInvitation) {
            Logger.log({
              username: user.username,
              module: 'CallContext',
              method: 'onIncomingCall',
              action: 'Auto Reject Ringing',
              result: 'User is busy in another session'
            });
            invitation.reject();
            return;
          }

          Logger.log({
            username: user.username,
            screen: 'IncomingCall',
            module: 'CallContext',
            method: 'onIncomingCall',
            action: 'Incoming Invitation Cached',
            result: `Ringing alert from ${invitation.remoteIdentity.uri.user}`
          });

          setIncomingInvitation(invitation);
          setCallState('Ringing');

          // Attach state listener to handle pre-answer cancellations
          invitation.stateChange.addListener((state) => {
            if (state === SessionState.Terminated) {
              Logger.log({
                username: user.username,
                module: 'CallContext',
                method: 'onIncomingCall',
                action: 'Incoming Invitation Terminated by Caller',
                result: 'Resetting UI state to Idle'
              });
              cleanupCallState();
            }
          });
        },
      });

      // Listen for hold states from the peer
      SocketService.on('call-hold-state', ({ from, isHold: peerHoldState }) => {
        Logger.log({
          username: user.username,
          module: 'CallContext',
          method: 'onCallHoldState',
          action: peerHoldState ? 'Peer Placed Us on Hold' : 'Peer Resumed Call',
          result: `From: ${from}`
        });
        setIsPeerOnHold(peerHoldState);
        CallService.setPeerHoldState(peerHoldState);
      });

      return () => {
        SipService.stop();
        SocketService.off('call-hold-state');
        cleanupCallState();
      };
    } else {
      SipService.stop();
      cleanupCallState();
    }
  }, [isSocketConnected, user]);

  // Trigger repeating system tone generator beep when peer puts us on hold
  useEffect(() => {
    let beepInterval = null;
    if (isPeerOnHold && AudioRouteModule && AudioRouteModule.playHoldBeep) {
      AudioRouteModule.playHoldBeep();
      beepInterval = setInterval(() => {
        AudioRouteModule.playHoldBeep();
      }, 4000); // Beep every 4 seconds during hold
    }

    return () => {
      if (beepInterval) {
        clearInterval(beepInterval);
      }
    };
  }, [isPeerOnHold]);

  // Handle call timer increments when connected
  useEffect(() => {
    if (callState === 'Connected') {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState]);

  const cleanupCallState = () => {
    setCallState('Idle');
    setIncomingInvitation(null);
    setRemoteStream(null);
    setLocalStream(null);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setIsHold(false);
    setIsPeerOnHold(false);
    setCallDuration(0);
    CallService.cleanup();
  };

  /**
   * Start an outgoing call.
   */
  const makeCall = async (targetUsername) => {
    try {
      cleanupCallState();
      const session = await CallService.makeCall(targetUsername, {
        onTrack: (remoteMediaStream) => {
          setRemoteStream(remoteMediaStream);
        },
        onStateChange: (state) => {
          setCallState(state);
          if (state === 'Ended') {
            // Log call termination
            Logger.log({
              username: user?.username || 'System',
              module: 'CallContext',
              method: 'onStateChange()',
              action: 'Call Ended',
              result: `Duration ${formatTimer(callDuration)}. Reason: Normal`
            });
            
            // Show Ended state briefly before going back to Idle
            setTimeout(() => {
              cleanupCallState();
            }, 2000);
          } else if (state === 'Failed') {
            setTimeout(() => {
              cleanupCallState();
            }, 2000);
          }
        },
      });

      // Track local stream reference from CallService
      if (CallService.localStreamReference) {
        setLocalStream(CallService.localStreamReference);
      }
    } catch (error) {
      Logger.log({
        username: user?.username || 'System',
        module: 'CallContext',
        method: 'makeCall()',
        action: 'Call Outgoing Error',
        result: error.message
      });
      setCallState('Failed');
      setTimeout(() => {
        cleanupCallState();
      }, 2000);
    }
  };

  /**
   * Accept incoming ringing call.
   */
  const acceptCall = async () => {
    if (!incomingInvitation) return;

    try {
      const invitation = incomingInvitation;
      setIncomingInvitation(null);

      await CallService.acceptCall(invitation, {
        onTrack: (remoteMediaStream) => {
          setRemoteStream(remoteMediaStream);
        },
        onStateChange: (state) => {
          setCallState(state);
          if (state === 'Ended') {
            Logger.log({
              username: user?.username || 'System',
              module: 'CallContext',
              method: 'onStateChange()',
              action: 'Call Ended',
              result: `Duration ${formatTimer(callDuration)}. Reason: Normal`
            });
            setTimeout(() => {
              cleanupCallState();
            }, 2000);
          } else if (state === 'Failed') {
            setTimeout(() => {
              cleanupCallState();
            }, 2000);
          }
        },
      });

      if (CallService.localStreamReference) {
        setLocalStream(CallService.localStreamReference);
      }
    } catch (error) {
      Logger.log({
        username: user?.username || 'System',
        module: 'CallContext',
        method: 'acceptCall()',
        action: 'Call Acceptance Error',
        result: error.message
      });
      setCallState('Failed');
      setTimeout(() => {
        cleanupCallState();
      }, 2000);
    }
  };

  /**
   * Reject incoming call invitation.
   */
  const rejectCall = async () => {
    if (!incomingInvitation) return;
    const invitation = incomingInvitation;
    cleanupCallState();
    await CallService.rejectCall(invitation);
  };

  /**
   * Hang up active dialing/ringing/connected call.
   */
  const hangup = async () => {
    setCallState('Ended');
    await CallService.hangupCall();
    setTimeout(() => {
      cleanupCallState();
    }, 1500);
  };

  /**
   * Toggle mute status.
   */
  const toggleMute = () => {
    const nextMuteState = !isMuted;
    setIsMuted(nextMuteState);

    Logger.log({
      username: user?.username || 'Unknown',
      screen: 'CallScreen',
      module: 'CallContext',
      method: 'toggleMute()',
      action: nextMuteState ? 'Mute Button Pressed' : 'Unmute Button Pressed',
      result: `New Mute State: ${nextMuteState}`
    });

    CallService.toggleMute(nextMuteState);
  };

  /**
   * Toggle speakerphone output route.
   */
  const toggleSpeaker = () => {
    const nextSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(nextSpeakerState);
    CallService.toggleSpeaker(nextSpeakerState);
  };

  /**
   * Toggle call hold.
   */
  const toggleHold = () => {
    const nextHoldState = !isHold;
    setIsHold(nextHoldState);

    Logger.log({
      username: user?.username || 'Unknown',
      screen: 'CallScreen',
      module: 'CallContext',
      method: 'toggleHold()',
      action: nextHoldState ? 'Hold Button Pressed' : 'Unhold Button Pressed',
      result: `New Hold State: ${nextHoldState}`
    });

    CallService.toggleHold(nextHoldState);

    // Mute/Unmute the remote stream audio tracks so we don't hear the peer during hold
    if (remoteStream) {
      remoteStream.getAudioTracks().forEach((track) => {
        track.enabled = !nextHoldState;
      });
    }

    // Send custom hold state to peer
    const peerName = getCallerName();
    if (peerName) {
      SocketService.emit('call-hold-state', { target: peerName, isHold: nextHoldState });
    }
  };

  /**
   * Format duration seconds to MM:SS string
   */
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallerName = () => {
    if (incomingInvitation) {
      return incomingInvitation.remoteIdentity.uri.user;
    }
    if (CallService.activeSession) {
      return CallService.activeSession.remoteIdentity.uri.user;
    }
    return '';
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        remoteStream,
        localStream,
        isMuted,
        isSpeakerOn,
        isHold,
        isPeerOnHold, // Expose remote peer hold state
        callDuration,
        callerName: getCallerName(),
        incomingInvitation,
        makeCall,
        acceptCall,
        rejectCall,
        hangup,
        toggleMute,
        toggleSpeaker,
        toggleHold,
        formatTimer,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
