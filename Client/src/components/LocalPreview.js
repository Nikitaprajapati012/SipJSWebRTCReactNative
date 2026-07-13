/**
 * Client/src/components/LocalPreview.js
 * 
 * Draggable Floating Local Camera Preview.
 * Uses PanResponder to handle user dragging gesture.
 */

import React, { useRef } from 'react';
import { StyleSheet, Animated, PanResponder } from 'react-native';
import VideoRenderer from './VideoRenderer';

export default function LocalPreview({
  stream,
  isEnabled = true,
  isFront = true,
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  if (!stream || !isEnabled) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <VideoRenderer
        stream={stream}
        streamKey="local"
        isVideoEnabled={isEnabled}
        isFrontCamera={isFront}
        zOrder={1}
        objectFit="cover"
        containerStyle={styles.videoContainer}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#38BDF8',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
});
