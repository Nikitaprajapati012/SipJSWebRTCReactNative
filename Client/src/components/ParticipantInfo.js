/**
 * Client/src/components/ParticipantInfo.js
 * 
 * Initials Avatar and participant name renderer.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function ParticipantInfo({
  name,
  isVideoCall = false,
  showAvatar = true,
  containerStyle = {},
  nameStyle = {},
}) {
  const getInitials = (val) => {
    if (!val) return '?';
    return val.slice(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {showAvatar && !isVideoCall && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
      )}
      <Text style={[styles.name, nameStyle]}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
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
  avatarText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    textTransform: 'capitalize',
  },
});
