import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  Animated,
} from 'react-native';
import { useCall } from '../hooks/useCall';

import { RTCView } from 'react-native-webrtc';
import Icon from 'react-native-vector-icons/Ionicons';

export default function FloatingCallOverlay({ navigation }) {
  const {
    isInAppPipActive,
    toggleInAppPip,
    remoteStream,
    isVideoCall,
    callerName,
    hangup,
    formatTimer,
    callDuration,
  } = useCall();

  // Animating the coordinates of the overlay (initial position top-left)
  const pan = useRef(new Animated.ValueXY({ x: 20, y: 100 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    }),
  ).current;

  if (!isInAppPipActive) return null;

  return (
    <Animated.View
      style={[
        styles.overlayContainer,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.touchableArea}
        activeOpacity={0.9}
        onPress={() => {
          toggleInAppPip();
          navigation?.navigate?.('Call');
        }}
      >
        {isVideoCall && remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={StyleSheet.absoluteFillObject}
            objectFit="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {callerName ? callerName.slice(0, 2).toUpperCase() : '?'}
            </Text>
          </View>
        )}

        {/* Small UI Details Panel */}
        <View style={styles.infoPanel}>
          <Text style={styles.nameText} numberOfLines={1}>
            {callerName}
          </Text>
          <Text style={styles.timerText}>{formatTimer(callDuration)}</Text>
        </View>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.hangupBtn}
            onPress={e => {
              e.stopPropagation(); // Avoid triggering navigation
              hangup();
            }}
          >
            <Icon
              name="call"
              size={16}
              color="#FFFFFF"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    width: 110,
    height: 150,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  touchableArea: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 8,
  },
  avatarPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  infoPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignSelf: 'stretch',
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  timerText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hangupBtn: {
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
});
