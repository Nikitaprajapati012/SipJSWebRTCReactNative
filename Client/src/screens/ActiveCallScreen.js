/**
 * Client/src/screens/ActiveCallScreen.js
 * 
 * Immersive Active Call interface (Audio and Video layout).
 */

import React from 'react';
import { StyleSheet, View, StatusBar, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { useCall } from '../hooks/useCall';
import Icon from 'react-native-vector-icons/Ionicons';

// Reusable Components
import CallHeader from '../components/CallHeader';
import CallControls from '../components/CallControls';
import LocalPreview from '../components/LocalPreview';
import VideoRenderer from '../components/VideoRenderer';
import LoadingOverlay from '../components/LoadingOverlay';

export default function ActiveCallScreen() {
  const {
    callState,
    callerName,
    isMuted,
    isSpeakerOn,
    isHold,
    isPeerOnHold,
    callDuration,
    hangup,
    toggleMute,
    toggleSpeaker,
    toggleHold,
    formatTimer,
    // Video elements
    isVideoCall,
    isCameraEnabled,
    isFrontCamera,
    isSystemPipActive,
    toggleCamera,
    switchCamera,
    remoteStream,
    remoteStreamKey,
    localStream,
    webrtcConnectionState,
  } = useCall();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  };

  // Android Picture-in-Picture layout
  if (isSystemPipActive) {
    return (
      <View style={styles.pipContainer}>
        <VideoRenderer
          stream={remoteStream}
          streamKey={remoteStreamKey}
          placeholderName={callerName}
          placeholderText="Connecting..."
          zOrder={0}
        />
      </View>
    );
  }

  // Active Audio Call layout
  const renderAudioCall = () => {
    let stateLabel = callState;
    if (callState === 'Connected') {
      if (isPeerOnHold) stateLabel = 'Placed you on Hold';
      else if (isHold) stateLabel = 'On Hold';
      else if (isMuted) stateLabel = 'Muted';
      else stateLabel = 'Connected';
    }

    return (
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>{getInitials(callerName)}</Text>
          </View>
          <Text style={styles.callerNameText}>{callerName}</Text>
          <Text style={styles.timerText}>{formatTimer(callDuration)}</Text>
          <Text style={isPeerOnHold ? styles.callStateSubtextHold : styles.callStateSubtextActive}>
            {stateLabel}
          </Text>
        </View>

        <View style={styles.controlsPanel}>
          <View style={styles.controlsGrid}>
            <TouchableOpacity
              style={[styles.controlGridBtn, isMuted && styles.controlGridBtnActive]}
              onPress={toggleMute}
            >
              <Icon name={isMuted ? 'mic-off' : 'mic'} size={24} color={isMuted ? '#38BDF8' : '#94A3B8'} style={{ marginBottom: 6 }} />
              <Text style={styles.controlGridLabel}>{isMuted ? 'Muted' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlGridBtn, isSpeakerOn && styles.controlGridBtnActive]}
              onPress={toggleSpeaker}
            >
              <Icon name={isSpeakerOn ? 'volume-high' : 'volume-mute'} size={24} color={isSpeakerOn ? '#38BDF8' : '#94A3B8'} style={{ marginBottom: 6 }} />
              <Text style={styles.controlGridLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlGridBtn, isHold && styles.controlGridBtnActive]}
              onPress={toggleHold}
            >
              <Icon name={isHold ? 'play' : 'pause'} size={24} color={isHold ? '#38BDF8' : '#94A3B8'} style={{ marginBottom: 6 }} />
              <Text style={styles.controlGridLabel}>{isHold ? 'Resume' : 'Hold'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRowSingle}>
            <TouchableOpacity style={[styles.actionButton, styles.declineBtn]} onPress={hangup}>
              <Icon name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (!isVideoCall) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <SafeAreaView style={styles.safeAreaContainer}>
          {renderAudioCall()}
        </SafeAreaView>
      </View>
    );
  }

  // Active Video Call UI Layout
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Fullscreen Video Canvas */}
      <View style={styles.videoCanvas}>
        <VideoRenderer
          stream={remoteStream}
          streamKey={remoteStreamKey}
          placeholderName={callerName}
          placeholderText="Waiting for Video..."
          zOrder={0}
        />
      </View>

      {/* Floating Draggable Local Preview */}
      <LocalPreview
        stream={localStream}
        isEnabled={isCameraEnabled}
        isFront={isFrontCamera}
      />

      {/* Floating Top Overlay Header */}
      <CallHeader
        participantName={callerName}
        isVideoCall={true}
        callDuration={callDuration}
        callState={callState}
        isPeerOnHold={isPeerOnHold}
        webrtcConnectionState={webrtcConnectionState}
      />

      {/* Loading overlay for initial negotiation steps */}
      {!remoteStream && (
        <LoadingOverlay message="Connecting video feed..." />
      )}

      {/* Absolute Bottom controls container */}
      <View style={styles.absoluteControlsContainer} pointerEvents="box-none">
        <CallControls
          callState={callState}
          isIncomingCall={false}
          isVideoCall={true}
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          isCameraEnabled={isCameraEnabled}
          isHold={isHold}
          toggleMute={toggleMute}
          toggleSpeaker={toggleSpeaker}
          toggleCamera={toggleCamera}
          switchCamera={switchCamera}
          toggleHold={toggleHold}
          hangup={hangup}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  safeAreaContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  pipContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  videoCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    zIndex: -1,
  },
  absoluteControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 35,
    zIndex: 10,
    elevation: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 40,
    zIndex: 10,
  },
  largeAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  largeAvatarText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
  },
  callerNameText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 2,
    marginBottom: 8,
  },
  callStateSubtext: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  callStateSubtextActive: {
    fontSize: 14,
    color: '#0EA5E9',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  callStateSubtextHold: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    backgroundColor: '#78350F',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  actionRowSingle: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
  },
  actionButton: {
    width: 85,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  declineBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  controlsPanel: {
    width: '100%',
    alignItems: 'center',
    zIndex: 20,
  },
  controlsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  controlGridBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  controlGridBtnActive: {
    backgroundColor: '#334155',
    borderColor: '#38BDF8',
    borderWidth: 1,
  },
  controlGridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
