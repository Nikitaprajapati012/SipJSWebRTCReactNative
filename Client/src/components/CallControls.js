/**
 * Client/src/components/CallControls.js
 *
 * Grid Controls Overlay Component.
 * Dynamically switches buttons depending on Call State (Incoming, Outgoing, Active).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import RoundButton from './RoundButton';

export default function CallControls({
  callState,
  isIncomingCall = false,
  isVideoCall = false,
  isMuted = false,
  isSpeakerOn = false,
  isCameraEnabled = true,
  isHold = false,
  toggleMute,
  toggleSpeaker,
  toggleCamera,
  switchCamera,
  toggleHold,
  acceptCall,
  rejectCall,
  hangup,
  containerStyle = {},
}) {
  // Render layout for incoming ringing calls
  if (isIncomingCall && callState === 'Ringing') {
    return (
      <View style={[styles.incomingRow, containerStyle]}>
        <RoundButton
          iconName="call"
          onPress={acceptCall}
          label="Accept"
          inactiveBackgroundColor="#10B981"
          inactiveIconColor="#FFFFFF"
          buttonSize={64}
          iconSize={28}
        />
        <RoundButton
          iconName="call"
          onPress={rejectCall}
          label="Decline"
          inactiveBackgroundColor="#EF4444"
          inactiveIconColor="#FFFFFF"
          buttonSize={64}
          iconSize={28}
          style={styles.declineIcon}
        />
      </View>
    );
  }

  // Render layout for outgoing dialing/trying calls
  const isOutgoing =
    callState === 'Dialing' ||
    callState === 'Trying' ||
    callState === 'Ringing';
  if (isOutgoing && !isIncomingCall) {
    return (
      <View style={[styles.activePanel, containerStyle]}>
        {/* Outgoing Call controls grid */}
        <View
          style={[styles.controlsGrid, isVideoCall && styles.controlsGridVideo]}
        >
          <RoundButton
            iconName={isMuted ? 'mic-off' : 'mic'}
            onPress={toggleMute}
            label={isMuted ? 'Muted' : 'Mute'}
            isActive={isMuted}
          />
          <RoundButton
            iconName={isSpeakerOn ? 'volume-high' : 'volume-mute'}
            onPress={toggleSpeaker}
            label={isSpeakerOn ? 'Speaker' : 'Earpiece'}
            isActive={isSpeakerOn}
          />
          {isVideoCall && (
            <>
              <RoundButton
                iconName={isCameraEnabled ? 'videocam' : 'videocam-off'}
                onPress={toggleCamera}
                label={isCameraEnabled ? 'Cam On' : 'Cam Off'}
                isActive={!isCameraEnabled}
              />
              <RoundButton
                iconName="camera-reverse"
                onPress={switchCamera}
                label="Flip"
              />
            </>
          )}
        </View>

        <View style={styles.singleRow}>
          <RoundButton
            iconName="call"
            onPress={hangup}
            label="Cancel"
            inactiveBackgroundColor="#EF4444"
            inactiveIconColor="#FFFFFF"
            buttonSize={64}
            iconSize={28}
            style={styles.declineIcon}
          />
        </View>
      </View>
    );
  }

  // Render layout for active call
  return (
    <View style={[styles.activePanel, containerStyle]}>
      <View
        style={[styles.controlsGrid, isVideoCall && styles.controlsGridVideo]}
      >
        <RoundButton
          iconName={isMuted ? 'mic-off' : 'mic'}
          onPress={toggleMute}
          // label={isMuted ? 'Muted' : 'Mute'}
          isActive={isMuted}
        />

        <RoundButton
          iconName={isSpeakerOn ? 'volume-high' : 'volume-mute'}
          onPress={toggleSpeaker}
          // label={isSpeakerOn ? 'Speaker' : 'Earpiece'}
          isActive={isSpeakerOn}
        />

        {isVideoCall && (
          <>
            <RoundButton
              iconName={isCameraEnabled ? 'videocam' : 'videocam-off'}
              onPress={toggleCamera}
              // label={isCameraEnabled ? 'Cam On' : 'Cam Off'}
              isActive={!isCameraEnabled}
            />

            <RoundButton
              iconName="camera-reverse"
              onPress={switchCamera}
              // label="Flip"
            />
          </>
        )}

        {!isVideoCall && (
          <RoundButton
            iconName={isHold ? 'play' : 'pause'}
            onPress={toggleHold}
            label={isHold ? 'Resume' : 'Hold'}
            isActive={isHold}
          />
        )}
      </View>

      <View style={styles.singleRow}>
        <RoundButton
          iconName="call"
          onPress={hangup}
          // label="End Call"
          inactiveBackgroundColor="#EF4444"
          inactiveIconColor="#FFFFFF"
          buttonSize={64}
          iconSize={28}
          style={styles.declineIcon}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  incomingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 32,
    marginBottom: 40,
  },
  activePanel: {
    width: '100%',
    alignItems: 'center',
  },
  controlsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    elevation: 4,
  },
  controlsGridVideo: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  singleRow: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  declineIcon: {
    transform: [{ rotate: '135deg' }],
  },
});
