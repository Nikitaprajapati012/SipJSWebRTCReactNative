/**
 * Client/src/components/NetworkIndicator.js
 * 
 * Peer connection quality indicator icon & text.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function NetworkIndicator({
  webrtcConnectionState = 'Checking',
  style = {},
}) {
  let iconName = 'cellular-outline';
  let iconColor = '#94A3B8';
  let qualityText = 'Checking';

  if (webrtcConnectionState === 'Good') {
    iconName = 'cellular';
    iconColor = '#10B981'; // Green
    qualityText = 'Excellent';
  } else if (webrtcConnectionState === 'Poor Connection') {
    iconName = 'cellular-outline';
    iconColor = '#EF4444'; // Red
    qualityText = 'Poor';
  } else if (webrtcConnectionState === 'Reconnecting') {
    iconName = 'alert-circle';
    iconColor = '#F59E0B'; // Yellow/Orange
    qualityText = 'Reconnecting';
  }

  return (
    <View style={[styles.container, style]}>
      <Icon name={iconName} size={14} color={iconColor} style={styles.icon} />
      <Text style={[styles.text, { color: iconColor }]}>
        Signal: {qualityText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(71, 85, 105, 0.4)',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
