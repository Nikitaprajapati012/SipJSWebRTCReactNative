/**
 * Client/src/screens/OutgoingCallScreen.js
 * 
 * Traditional Outgoing Calling Screen.
 */

import React from 'react';
import { StyleSheet, View, StatusBar, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { useCall } from '../hooks/useCall';
import Icon from 'react-native-vector-icons/Ionicons';

export default function OutgoingCallScreen() {
  const { callerName, callState, hangup } = useCall();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  };

  const getStatusLabel = () => {
    if (callState === 'Ringing') return 'Ringing...';
    if (callState === 'Trying') return 'Connecting...';
    return 'Calling...';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <SafeAreaView style={styles.safeAreaContainer}>
        <View style={styles.content}>
          <View style={styles.avatarSection}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>{getInitials(callerName)}</Text>
            </View>
            <Text style={styles.callerNameText}>{callerName}</Text>
            <Text style={styles.callStateSubtext}>{getStatusLabel()}</Text>
          </View>

          <View style={styles.controlsPanel}>
            <View style={styles.actionRowSingle}>
              <TouchableOpacity style={[styles.actionButton, styles.declineBtn]} onPress={hangup}>
                <Icon name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
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
    backgroundColor: 'transparent',
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
  callStateSubtext: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  controlsPanel: {
    width: '100%',
    alignItems: 'center',
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
    elevation: 4,
  },
  declineBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
});
