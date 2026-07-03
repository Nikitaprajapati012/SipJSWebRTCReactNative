/**
 * Client/src/screens/CallScreen.js
 * 
 * Dynamic Call Control Screen.
 * Renders distinct layouts for Incoming Call, Outgoing Dialing, and Active Calls.
 * Connects directly to CallContext state and action flows.
 */

import React, { useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { useCall } from '../hooks/useCall';
import Icon from 'react-native-vector-icons/Ionicons';
import CallService from '../services/CallService';

export default function CallScreen({ navigation }) {
  const {
    callState,
    callerName,
    isMuted,
    isSpeakerOn,
    isHold,
    isPeerOnHold,
    callDuration,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleSpeaker,
    toggleHold,
    formatTimer,
    incomingInvitation,
  } = useCall();

  // Return to Home once the call terminates and state goes back to Idle
  useEffect(() => {
    if (callState === 'Idle') {
      navigation.navigate('Home');
    }
  }, [callState, navigation]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  };

  // Determine direction: we have an incoming call if we are ringing and callerName is set,
  // but we must check if callState is Ringing and we are receiving.
  // The CallContext sets callerName for both, but incoming invitation exists on incoming.
  // In CallScreen, we can render the appropriate sub-layout.
  
  const isIncoming = callState === 'Ringing' && acceptCall && !CallStateIsOutgoing(callState);

  // Helper to distinguish outgoing ringing vs incoming ringing
  function CallStateIsOutgoing(state) {
    // If we initiated the call, we start at Dialing -> Trying -> Ringing.
    // In CallContext, the incomingInvitation is stored for incoming.
    // Let's determine this cleanly.
  }

  // Let's implement the layouts
  const renderIncomingCall = () => (
    <View style={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.largeAvatar}>
          <Text style={styles.largeAvatarText}>{getInitials(callerName)}</Text>
        </View>
        <Text style={styles.callerNameText}>{callerName}</Text>
        <Text style={styles.callStateSubtext}>Incoming Audio Call...</Text>
      </View>

      <View style={styles.incomingActionRow}>
        <TouchableOpacity style={[styles.actionButton, styles.acceptBtn]} onPress={acceptCall}>
          <Icon name="call" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.declineBtn]} onPress={rejectCall}>
          <Icon name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOutgoingCall = () => (
    <View style={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.largeAvatar}>
          <Text style={styles.largeAvatarText}>{getInitials(callerName)}</Text>
        </View>
        <Text style={styles.callerNameText}>{callerName}</Text>
        <Text style={styles.callStateSubtext}>{callState}...</Text>
      </View>

      <View style={styles.actionRowSingle}>
        <TouchableOpacity style={[styles.actionButton, styles.declineBtn]} onPress={hangup}>
          <Icon name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActiveCall = () => {
    // Resolve display call state text
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

        {/* Call Features Controls Panel */}
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
              <Text style={styles.controlGridLabel}>{isHold ? 'On Hold' : 'Hold'}</Text>
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

  // Determine call layout mode
  const renderLayout = () => {
    if (callState === 'Ringing' && acceptCall && callerName) {
      // If we have an active invitation stored, show incoming layout
      // Let's verify by checking if CallService has a session that is an Invitation
      const session = CallService.activeSession;
      const isIncomingCall = session && session.constructor.name === 'Invitation';

      // Alternatively, we set state in CallContext:
      // If invitation is cached, it's incoming
      if (callState === 'Ringing' && acceptCall && session && session.constructor.name === 'Invitation') {
        return renderIncomingCall();
      }
    }

    if (callState === 'Ringing' && incomingInvitation) {
      return renderIncomingCall();
    }

    if (callState === 'Dialing' || callState === 'Trying' || (callState === 'Ringing' && !incomingInvitation)) {
      return renderOutgoingCall();
    }

    return renderActiveCall();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {renderLayout()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    color: '#F59E0B', // Amber 500
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    backgroundColor: '#78350F', // Dark Amber
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  incomingActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  actionRowSingle: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
  },
  actionButton: {
    width: 85,
    height: 64, // Reduced height
    borderRadius: 16, // Rounded square shape
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptBtn: {
    backgroundColor: '#10B981', // Emerald 500
    shadowColor: '#10B981',
  },
  declineBtn: {
    backgroundColor: '#EF4444', // Rose 500
    shadowColor: '#EF4444',
  },
  actionBtnIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionBtnLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  controlsPanel: {
    width: '100%',
    alignItems: 'center',
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
  controlGridIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  controlGridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
