/**
 * Client/src/components/VideoRenderer.js
 * 
 * Flexible WebRTC Stream Renderer.
 * Handles RTCView binding, mirroring, and empty placeholder states.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { RTCView } from 'react-native-webrtc';

export default function VideoRenderer({
  stream,
  streamKey,
  isVideoEnabled = true,
  isFrontCamera = true,
  zOrder = 0,
  objectFit = 'cover',
  placeholderName = 'User',
  placeholderText = 'Waiting for Video...',
  containerStyle = {},
  rtcViewStyle = {},
}) {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  };

  // Render video stream if stream exists and video is enabled
  if (stream && isVideoEnabled) {
    return (
      <View style={[styles.container, containerStyle]}>
        <RTCView
          key={streamKey}
          streamURL={stream.toURL()}
          style={[styles.video, rtcViewStyle]}
          objectFit={objectFit}
          zOrder={zOrder}
          mirror={isFrontCamera}
        />
      </View>
    );
  }

  // Fallback Placeholder Layout
  return (
    <View style={[styles.placeholderContainer, containerStyle]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(placeholderName)}</Text>
      </View>
      <Text style={styles.placeholderLabel}>{placeholderText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#475569',
    marginBottom: 16,
  },
  avatarText: {
    color: '#F1F5F9',
    fontSize: 38,
    fontWeight: '800',
  },
  placeholderLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
