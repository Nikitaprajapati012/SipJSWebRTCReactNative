/**
 * Client/src/components/ConnectionStatus.js
 * 
 * Text Status Indicator matching WhatsApp call states.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';

export default function ConnectionStatus({
  callState,
  isPeerOnHold = false,
  webrtcConnectionState = 'Checking',
  isVideoCall = false,
}) {
  // Resolve user-friendly status text
  let statusText = '';
  let statusStyle = styles.normalText;

  if (callState === 'Dialing') {
    statusText = 'Calling...';
  } else if (callState === 'Trying') {
    statusText = 'Connecting...';
  } else if (callState === 'Ringing') {
    statusText = 'Ringing...';
  } else if (callState === 'Connecting') {
    statusText = 'Connecting Media...';
  } else if (callState === 'Connected') {
    if (isPeerOnHold) {
      statusText = 'Placed you on Hold';
      statusStyle = styles.holdText;
    } else if (webrtcConnectionState === 'Poor Connection') {
      statusText = 'Poor Connection';
      statusStyle = styles.warningText;
    } else if (webrtcConnectionState === 'Reconnecting') {
      statusText = 'Reconnecting...';
      statusStyle = styles.warningText;
    } else {
      statusText = 'Connected';
      statusStyle = isVideoCall ? styles.activeVideoText : styles.activeAudioText;
    }
  } else if (callState === 'Ended') {
    statusText = 'Call Ended';
    statusStyle = styles.endedText;
  } else if (callState === 'Failed') {
    statusText = 'Call Failed';
    statusStyle = styles.failedText;
  } else {
    statusText = callState;
  }

  return (
    <Text style={[styles.status, statusStyle]}>
      {statusText}
    </Text>
  );
}

const styles = StyleSheet.create({
  status: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  normalText: {
    color: '#94A3B8',
  },
  holdText: {
    color: '#F59E0B',
  },
  warningText: {
    color: '#EF4444',
  },
  activeAudioText: {
    color: '#0EA5E9',
  },
  activeVideoText: {
    color: '#38BDF8',
  },
  endedText: {
    color: '#94A3B8',
  },
  failedText: {
    color: '#EF4444',
  },
});
