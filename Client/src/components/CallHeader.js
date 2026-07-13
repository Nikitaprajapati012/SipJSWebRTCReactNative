/**
 * Client/src/components/CallHeader.js
 * 
 * Orchestrates ParticipantInfo, CallTimer, ConnectionStatus, and NetworkIndicator.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import ParticipantInfo from './ParticipantInfo';
import CallTimer from './CallTimer';
import ConnectionStatus from './ConnectionStatus';
import NetworkIndicator from './NetworkIndicator';

export default function CallHeader({
  participantName,
  isVideoCall = false,
  callDuration = 0,
  callState,
  isPeerOnHold = false,
  webrtcConnectionState = 'Checking',
  containerStyle = {},
}) {
  const isCallConnected = callState === 'Connected';

  if (isVideoCall) {
    return (
      <View style={[styles.videoOverlay, containerStyle]}>
        <ParticipantInfo
          name={participantName}
          isVideoCall={true}
          showAvatar={false}
          nameStyle={styles.videoNameText}
        />
        
        {isCallConnected ? (
          <CallTimer duration={callDuration} style={styles.videoTimerText} />
        ) : (
          <ConnectionStatus
            callState={callState}
            isPeerOnHold={isPeerOnHold}
            webrtcConnectionState={webrtcConnectionState}
            isVideoCall={true}
          />
        )}

        {isCallConnected && (
          <NetworkIndicator
            webrtcConnectionState={webrtcConnectionState}
            style={styles.signalMargin}
          />
        )}
      </View>
    );
  }

  // Audio Call Header Layout
  return (
    <View style={[styles.audioContainer, containerStyle]}>
      <ParticipantInfo
        name={participantName}
        isVideoCall={false}
        showAvatar={true}
        nameStyle={styles.audioNameText}
      />
      
      {isCallConnected ? (
        <CallTimer duration={callDuration} style={styles.audioTimerText} />
      ) : (
        <ConnectionStatus
          callState={callState}
          isPeerOnHold={isPeerOnHold}
          webrtcConnectionState={webrtcConnectionState}
          isVideoCall={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  videoOverlay: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    zIndex: 500,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  videoNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  videoTimerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 2,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  signalMargin: {
    marginTop: 6,
  },
  audioContainer: {
    alignItems: 'center',
    marginTop: 40,
    zIndex: 10,
  },
  audioNameText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  audioTimerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 2,
    marginBottom: 8,
  },
});
