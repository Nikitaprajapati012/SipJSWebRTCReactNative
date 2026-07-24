/**
 * Client/src/context/CallContext.js
 * 
 * CallContext maintains call states (Idle, Ringing, Connected, etc.),
 * local and remote streams, active timers, and controls audio toggles.
 * Starts SipService once signaling socket is ready.
 */

import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { NativeModules, DeviceEventEmitter } from 'react-native';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';
import SipService, { SessionState } from '../services/SipService';
import CallService from '../services/CallService';
import WebRTCService from '../services/WebRTCService';
import Logger from '../services/Logger';
import SocketService from '../services/SocketService';
import * as NavigationService from '../services/NavigationService';

const { AudioRouteModule, PipModule } = NativeModules;

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const { isSocketConnected } = useContext(SocketContext);

  const [callState, setCallState] = useState('Idle'); // Idle, Dialing, Ringing, Connecting, Connected, Ended, Failed
  const [incomingInvitation, _setIncomingInvitation] = useState(null);
  const incomingInvitationRef = useRef(null);
  const setIncomingInvitation = (val) => {
    incomingInvitationRef.current = val;
    _setIncomingInvitation(val);
  };
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isHold, setIsHold] = useState(false);
  const [isPeerOnHold, setIsPeerOnHold] = useState(false); // Track if remote peer placed us on hold
  const [callDuration, setCallDuration] = useState(0);

  // New Video Calling and PiP states
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSystemPipActive, setIsSystemPipActive] = useState(false);
  const [isInAppPipActive, setIsInAppPipActive] = useState(false);
  const [remoteStreamKey, setRemoteStreamKey] = useState('');
  const [webrtcConnectionState, setWebrtcConnectionState] = useState('Checking');

  const timerRef = useRef(null);

  const cleanupCallState = useCallback(() => {
    setCallState('Idle');
    setIncomingInvitation(null);
    setRemoteStream(null);
    setLocalStream(null);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setIsHold(false);
    setIsPeerOnHold(false);
    setCallDuration(0);

    setIsVideoCall(false);
    setIsCameraEnabled(true);
    setIsFrontCamera(true);
    setIsSystemPipActive(false);
    setIsInAppPipActive(false);
    setRemoteStreamKey('');
    setWebrtcConnectionState('Checking');
    SipService.localStream = null;

    if (PipModule && PipModule.setIsVideoCallActive) {
      PipModule.setIsVideoCallActive(false);
    }

    CallService.cleanup();
    if (AudioRouteModule && AudioRouteModule.clearAudioRoute) {
      AudioRouteModule.clearAudioRoute();
    }
  }, []);

  const cleanupCallStateRef = useRef(cleanupCallState);
  useEffect(() => {
    cleanupCallStateRef.current = cleanupCallState;
  }, [cleanupCallState]);

  // Initialize and tear down SipService alongside socket connection status
  useEffect(() => {
    const currentUsername = user?.username;
    if (isSocketConnected && currentUsername) {
      SipService.start(currentUsername, {
        onIncomingCall: (invitation) => {
          // If we are busy, reject the call automatically
          if (CallService.activeSession || incomingInvitationRef.current) {
            Logger.log({
              username: currentUsername,
              module: 'CallContext',
              method: 'onIncomingCall',
              action: 'Auto Reject Ringing',
              result: 'User is busy in another session'
            });
            invitation.reject();
            return;
          }

          const bodyContent = invitation.request.body
            ? (typeof invitation.request.body === 'string' ? invitation.request.body : (invitation.request.body.content || ''))
            : '';
          const isVideo = /m=video/i.test(bodyContent);
          setIsVideoCall(isVideo);

          Logger.log({
            username: currentUsername,
            screen: 'IncomingCall',
            module: 'CallContext',
            method: 'onIncomingCall',
            action: 'Incoming Invitation Cached',
            result: `Ringing alert from ${invitation.remoteIdentity.uri.user}. Call Type: ${isVideo ? 'Video' : 'Audio'}`
          });

          setIncomingInvitation(invitation);
          setCallState('Ringing');

          // Attach state listener to handle pre-answer cancellations
          invitation.stateChange.addListener((state) => {
            if (state === SessionState.Terminated) {
              Logger.log({
                username: currentUsername,
                module: 'CallContext',
                method: 'onIncomingCall',
                action: 'Incoming Invitation Terminated by Caller',
                result: 'Resetting UI state to Idle'
              });
              if (cleanupCallStateRef.current) cleanupCallStateRef.current();
            }
          });
        },
      });

      // Listen for hold states from the peer
      SocketService.on('call-hold-state', ({ from, isHold: peerHoldState }) => {
        Logger.log({
          username: currentUsername,
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
        if (cleanupCallStateRef.current) cleanupCallStateRef.current();
      };
    }
  }, [isSocketConnected, user?.username]);

  // Listen for Picture-in-Picture mode changes from native code (Android)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onPipModeChanged', (event) => {
      setIsSystemPipActive(event.isInPictureInPictureMode);
      
      Logger.log({
        username: user?.username || 'System',
        module: 'CallContext',
        method: 'onPipModeChanged',
        action: event.isInPictureInPictureMode ? 'Entered PiP Mode' : 'Returned from PiP',
        result: `isInPictureInPictureMode: ${event.isInPictureInPictureMode}`
      });
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  // Handle global screen routing based on callState transitions
  useEffect(() => {
    if (!isAuthenticated) return;

    if (callState === 'Dialing' || callState === 'Trying') {
      NavigationService.navigate('OutgoingCall');
    } else if (callState === 'Ringing') {
      // Determine if we are receiving the call (incoming) or placing the call (outgoing)
      const isIncoming =
        CallService.activeSession?.constructor.name === 'Invitation' ||
        incomingInvitationRef.current;
      
      if (isIncoming) {
        NavigationService.navigate('IncomingCall');
      } else {
        NavigationService.navigate('OutgoingCall');
      }
    } else if (callState === 'Connected') {
      NavigationService.navigate('ActiveCall');
    } else if (callState === 'Idle') {
      NavigationService.navigate('Home');
    }
  }, [callState, isAuthenticated]);

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

  // Handle system audio route initialization and PiP registration when call connects
  useEffect(() => {
    if (callState === 'Connected') {
      if (AudioRouteModule && AudioRouteModule.setSpeakerphoneOn) {
        AudioRouteModule.setSpeakerphoneOn(isSpeakerOn);
      }
      if (PipModule && PipModule.setIsVideoCallActive) {
        PipModule.setIsVideoCallActive(isVideoCall);
      }
    }
  }, [callState, isSpeakerOn, isVideoCall]);



  /**
   * Start an outgoing call.
   */
  const makeCall = async (targetUsername, isVideo = false) => {
    try {
      cleanupCallState();
      setIsVideoCall(isVideo);
      setCallState('Dialing');

      if (isVideo) {
        Logger.log({
          username: user?.username || 'System',
          screen: 'OutgoingCall',
          module: 'CallContext',
          method: 'makeCall()',
          action: 'Opening Camera',
          result: 'Success',
          isVideoCall: true,
          callState: 'Dialing',
        });

        const preStream = await WebRTCService.getLocalStream({ audio: true, video: true });

        Logger.log({
          username: user?.username || 'System',
          screen: 'OutgoingCall',
          module: 'CallContext',
          method: 'makeCall()',
          action: 'Camera Stream Created',
          result: `Video Track Count: ${preStream.getVideoTracks().length}, Audio Track Count: ${preStream.getAudioTracks().length}`,
          isVideoCall: true,
          callState: 'Dialing',
        });

        setLocalStream(preStream);
        SipService.localStream = preStream;
        CallService.localStreamReference = preStream;

        Logger.log({
          username: user?.username || 'System',
          screen: 'OutgoingCall',
          module: 'CallContext',
          method: 'makeCall()',
          action: 'Local Preview Attached',
          result: 'RTCView Updated',
          isVideoCall: true,
          callState: 'Dialing',
        });
      } else {
        const preStream = await WebRTCService.getLocalStream({ audio: true, video: false });
        setLocalStream(preStream);
        SipService.localStream = preStream;
        CallService.localStreamReference = preStream;
      }

      await CallService.makeCall(targetUsername, {
        isVideoCall: isVideo,
        onTrack: (remoteMediaStream) => {
          Logger.log({
            username: user?.username || 'System',
            screen: 'CallScreen',
            module: 'CallContext',
            method: 'onTrack',
            action: 'Remote Track Received',
            result: `Track ID: ${remoteMediaStream.getVideoTracks()[0]?.id || 'N/A'}`,
            isVideoCall: isVideo,
            callState: 'Connected',
          });
          setRemoteStream(remoteMediaStream);
          setRemoteStreamKey(Date.now().toString());
          Logger.log({
            username: user?.username || 'System',
            screen: 'CallScreen',
            module: 'CallContext',
            method: 'onTrack',
            action: 'Remote Stream Attached',
            result: 'RTCView Updated',
            isVideoCall: isVideo,
            callState: 'Connected',
          });
        },
        onStateChange: (state) => {
          setCallState(state);
          if (state === 'Connected') {
            Logger.log({
              username: user?.username || 'System',
              screen: 'CallScreen',
              module: 'CallContext',
              method: 'onStateChange()',
              action: 'Call Connected',
              result: 'Signaling and PeerConnection established',
              isVideoCall: isVideo,
              callState: 'Connected',
            });
          } else if (state === 'Ended') {
            Logger.log({
              username: user?.username || 'System',
              screen: 'CallScreen',
              module: 'CallContext',
              method: 'onStateChange()',
              action: 'Call Ended',
              result: `Duration: ${formatTimer(callDuration)}`,
              isVideoCall: isVideo,
              callState: 'Ended',
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
        onConnectionStateChange: (netState) => {
          if (netState === 'connected' || netState === 'completed') {
            setWebrtcConnectionState('Good');
          } else if (netState === 'checking') {
            setWebrtcConnectionState('Checking');
          } else if (netState === 'disconnected') {
            setWebrtcConnectionState('Poor Connection');
          } else if (netState === 'failed') {
            setWebrtcConnectionState('Reconnecting');
          }
        }
      });
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
      setCallState('Connecting');

      if (isVideoCall) {
        Logger.log({
          username: user?.username || 'System',
          screen: 'IncomingCall',
          module: 'CallContext',
          method: 'acceptCall()',
          action: 'Opening Camera',
          result: 'Success',
          isVideoCall: true,
          callState: 'Connecting',
        });

        const preStream = await WebRTCService.getLocalStream({ audio: true, video: true });

        Logger.log({
          username: user?.username || 'System',
          screen: 'IncomingCall',
          module: 'CallContext',
          method: 'acceptCall()',
          action: 'Camera Stream Created',
          result: `Video Track Count: ${preStream.getVideoTracks().length}, Audio Track Count: ${preStream.getAudioTracks().length}`,
          isVideoCall: true,
          callState: 'Connecting',
        });

        setLocalStream(preStream);
        SipService.localStream = preStream;
        CallService.localStreamReference = preStream;

        Logger.log({
          username: user?.username || 'System',
          screen: 'IncomingCall',
          module: 'CallContext',
          method: 'acceptCall()',
          action: 'Local Preview Attached',
          result: 'RTCView Updated',
          isVideoCall: true,
          callState: 'Connecting',
        });
      } else {
        const preStream = await WebRTCService.getLocalStream({ audio: true, video: false });
        setLocalStream(preStream);
        SipService.localStream = preStream;
        CallService.localStreamReference = preStream;
      }

      await CallService.acceptCall(invitation, {
        isVideoCall: isVideoCall,
        onTrack: (remoteMediaStream) => {
          Logger.log({
            username: user?.username || 'System',
            screen: 'CallScreen',
            module: 'CallContext',
            method: 'onTrack',
            action: 'Remote Track Received',
            result: `Track ID: ${remoteMediaStream.getVideoTracks()[0]?.id || 'N/A'}`,
            isVideoCall: isVideoCall,
            callState: 'Connected',
          });
          setRemoteStream(remoteMediaStream);
          setRemoteStreamKey(Date.now().toString());
          Logger.log({
            username: user?.username || 'System',
            screen: 'CallScreen',
            module: 'CallContext',
            method: 'onTrack',
            action: 'Remote Stream Attached',
            result: 'RTCView Updated',
            isVideoCall: isVideoCall,
            callState: 'Connected',
          });
        },
        onStateChange: (state) => {
          setCallState(state);
          if (state === 'Connected') {
            Logger.log({
              username: user?.username || 'System',
              screen: 'CallScreen',
              module: 'CallContext',
              method: 'onStateChange()',
              action: 'Call Connected',
              result: 'Signaling and PeerConnection established',
              isVideoCall: isVideoCall,
              callState: 'Connected',
            });
          } else if (state === 'Ended') {
            Logger.log({
              username: user?.username || 'System',
              screen: 'CallScreen',
              module: 'CallContext',
              method: 'onStateChange()',
              action: 'Call Ended',
              result: `Duration: ${formatTimer(callDuration)}`,
              isVideoCall: isVideoCall,
              callState: 'Ended',
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
        onConnectionStateChange: (netState) => {
          if (netState === 'connected' || netState === 'completed') {
            setWebrtcConnectionState('Good');
          } else if (netState === 'checking') {
            setWebrtcConnectionState('Checking');
          } else if (netState === 'disconnected') {
            setWebrtcConnectionState('Poor Connection');
          } else if (netState === 'failed') {
            setWebrtcConnectionState('Reconnecting');
          }
        }
      });
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
   * Toggle camera feed on/off.
   */
  const toggleCamera = () => {
    const nextState = !isCameraEnabled;
    setIsCameraEnabled(nextState);
    WebRTCService.setVideoEnabled(localStream, nextState);
  };

  /**
   * Switch between front and rear cameras.
   */
  const switchCamera = () => {
    const nextState = !isFrontCamera;
    setIsFrontCamera(nextState);
    WebRTCService.switchCamera(localStream);
  };

  /**
   * Toggle system-level PiP mode (Android only).
   */
  const toggleSystemPip = () => {
    if (PipModule && PipModule.enterPip) {
      PipModule.enterPip();
    }
  };

  /**
   * Toggle in-app PiP mode (for overlay navigation).
   */
  const toggleInAppPip = () => {
    setIsInAppPipActive(!isInAppPipActive);
  };

  /**
   * Format duration seconds to MM:SS string
   */
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const pad = (num) => (num < 10 ? `0${num}` : `${num}`);
    return `${pad(mins)}:${pad(secs)}`;
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
        // Video specific exports
        isVideoCall,
        isCameraEnabled,
        isFrontCamera,
        isSystemPipActive,
        isInAppPipActive,
        setIsInAppPipActive,
        toggleCamera,
        switchCamera,
        toggleSystemPip,
        toggleInAppPip,
        remoteStreamKey,
        webrtcConnectionState,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
