/**
 * Client/src/components/CallTimer.js
 * 
 * Formatting Timer Component.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';

export default function CallTimer({ duration = 0, style = {} }) {
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const pad = (num) => (num < 10 ? `0${num}` : `${num}`);
    return `${pad(mins)}:${pad(secs)}`;
  };

  return (
    <Text style={[styles.timer, style]}>
      {formatDuration(duration)}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 20,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 2,
  },
});
