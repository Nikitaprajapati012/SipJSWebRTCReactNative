/**
 * Client/src/components/LoadingOverlay.js
 * 
 * Semi-transparent loading state overlay with message spinner.
 */

import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';

export default function LoadingOverlay({
  message = 'Loading...',
  containerStyle = {},
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      <ActivityIndicator size="large" color="#38BDF8" style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
