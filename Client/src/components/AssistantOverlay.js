/**
 * Client/src/components/AssistantOverlay.js
 *
 * Modern Visual Voice Assistant Overlay & Floating Orb Component.
 * Renders dynamic visual feedback, animated waveforms, transcript banners,
 * and hands-free status badges across all app screens.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  Platform,
  PanResponder,
  Dimensions,
  TextInput,
} from 'react-native';
import useAssistant from '../hooks/useAssistant';
import Icon from 'react-native-vector-icons/Ionicons';

export const AssistantOverlay = () => {
  const {
    assistantState,
    transcript,
    spokenResponse,
    isHandsFreeEnabled,
    primaryWakeWord,
    toggleHandsFree,
    stopSession,
    triggerWakeWord,
    processTextInput,
    ASSISTANT_STATES,
  } = useAssistant();

  const [inputText, setInputText] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.4)).current;
  const waveAnim2 = useRef(new Animated.Value(0.7)).current;
  const waveAnim3 = useRef(new Animated.Value(0.3)).current;

  // Draggable Floating Widget PanResponder Setup (Positioned top right safely above Search Bar)
  const screenWidth = Dimensions.get('window').width;
  const defaultX = Math.max(12, screenWidth - 195);
  const defaultY = Platform.OS === 'ios' ? 48 : 16;

  const pan = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;
  const isDraggingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        isDraggingRef.current = false;
      },
    })
  ).current;

  const isActive =
    assistantState === ASSISTANT_STATES.WAKEWORD_DETECTED ||
    assistantState === ASSISTANT_STATES.LISTENING ||
    assistantState === ASSISTANT_STATES.PROCESSING ||
    assistantState === ASSISTANT_STATES.EXECUTING ||
    assistantState === ASSISTANT_STATES.SPEAKING;

  // Pulse & Waveform Animation Loops
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(waveAnim1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim2, { toValue: 1, duration: 550, useNativeDriver: true }),
          Animated.timing(waveAnim2, { toValue: 0.2, duration: 550, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim3, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(waveAnim3, { toValue: 0.4, duration: 350, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim1.setValue(0.4);
      waveAnim2.setValue(0.7);
      waveAnim3.setValue(0.3);
    }
  }, [isActive, pulseAnim, waveAnim1, waveAnim2, waveAnim3]);

  const handleSendInput = () => {
    if (inputText.trim()) {
      processTextInput(inputText.trim());
      setInputText('');
    }
  };

  const handleChipPress = (cmd) => {
    processTextInput(cmd);
  };

  const getStatusText = () => {
    switch (assistantState) {
      case ASSISTANT_STATES.WAKEWORD_DETECTED:
        return 'Wake Word Detected!';
      case ASSISTANT_STATES.LISTENING:
        return 'Listening...';
      case ASSISTANT_STATES.PROCESSING:
        return 'Thinking...';
      case ASSISTANT_STATES.EXECUTING:
        return 'Executing command...';
      case ASSISTANT_STATES.SPEAKING:
        return 'Nova';
      case ASSISTANT_STATES.ERROR:
        return 'Listening Error';
      default:
        return `Hands-Free Active ("${primaryWakeWord}")`;
    }
  };

  const getStatusColor = () => {
    switch (assistantState) {
      case ASSISTANT_STATES.WAKEWORD_DETECTED:
        return '#00F2FE'; // Neon Blue
      case ASSISTANT_STATES.LISTENING:
        return '#00E676'; // Vibrant Emerald Green
      case ASSISTANT_STATES.PROCESSING:
      case ASSISTANT_STATES.EXECUTING:
        return '#FFAB00'; // Amber Glow
      case ASSISTANT_STATES.SPEAKING:
        return '#7C4DFF'; // Deep Purple Neon
      case ASSISTANT_STATES.ERROR:
        return '#FF5252'; // Coral Red
      default:
        return '#4FC3F7';
    }
  };

  return (
    <>
      {/* 1. Floating Hands-Free Widget when Assistant is Idle (Draggable) */}
      {!isActive && (
        <Animated.View
          style={[
            styles.floatingWidgetContainer,
            {
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Drag Handle Indicator */}
          <View style={styles.dragHandle}>
            <Icon name="reorder-two-outline" size={16} color="#64748B" />
          </View>

          <TouchableOpacity
            style={[
              styles.floatingBadge,
              { borderColor: isHandsFreeEnabled ? '#00E676' : '#757575' },
            ]}
            onPress={() => {
              if (!isDraggingRef.current) triggerWakeWord();
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.handsFreeDot,
                { backgroundColor: isHandsFreeEnabled ? '#00E676' : '#9E9E9E' },
              ]}
            />
            <Icon
              name="sparkles"
              size={16}
              color={isHandsFreeEnabled ? '#00E676' : '#B0BEC5'}
            />
            <Text style={styles.floatingBadgeText}>
              {isHandsFreeEnabled ? `Say "${primaryWakeWord}"` : 'Voice Off'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.handsFreeToggleBtn}
            onPress={() => {
              if (!isDraggingRef.current) toggleHandsFree();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name={isHandsFreeEnabled ? 'mic' : 'mic-off'}
              size={16}
              color={isHandsFreeEnabled ? '#00E676' : '#E0E0E0'}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* 2. Active Assistant Overlay Banner / Modal */}
      <Modal
        visible={isActive}
        transparent
        animationType="fade"
        onRequestClose={stopSession}
      >
        <View style={styles.overlayBackdrop}>
          <View style={styles.assistantCard}>
            {/* Top Bar / Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerTitleRow}>
                <Icon name="sparkles" size={20} color={getStatusColor()} />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
              <TouchableOpacity onPress={stopSession} style={styles.closeBtn}>
                <Icon name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Glowing Orb & Animated Waveform */}
            <View style={styles.orbContainer}>
              <Animated.View
                style={[
                  styles.glowingOrb,
                  {
                    borderColor: getStatusColor(),
                    transform: [{ scale: pulseAnim }],
                    shadowColor: getStatusColor(),
                  },
                ]}
              >
                <Icon name="mic-outline" size={36} color="#FFFFFF" />
              </Animated.View>

              {/* Sound Wave Indicators */}
              <View style={styles.waveformRow}>
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      backgroundColor: getStatusColor(),
                      transform: [{ scaleY: waveAnim1 }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      backgroundColor: getStatusColor(),
                      transform: [{ scaleY: waveAnim2 }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      backgroundColor: getStatusColor(),
                      transform: [{ scaleY: waveAnim3 }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      backgroundColor: getStatusColor(),
                      transform: [{ scaleY: waveAnim1 }],
                    },
                  ]}
                />
              </View>
            </View>

            {/* Live Spoken Transcript & Response Display (Google Assistant Style) */}
            <View style={styles.transcriptBox}>
              {transcript ? (
                <View style={styles.userTranscriptBubble}>
                  <Text style={styles.userTranscriptText}>{transcript}</Text>
                </View>
              ) : assistantState === ASSISTANT_STATES.LISTENING ? (
                <Text style={styles.placeholderText}>Listening for voice commands...</Text>
              ) : null}

              {spokenResponse && assistantState === ASSISTANT_STATES.SPEAKING ? (
                <View style={styles.responseBubble}>
                  <Text style={styles.spokenResponseText}>{spokenResponse}</Text>
                </View>
              ) : null}
            </View>

            {/* Interactive Command Input Box */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Type command (e.g. 'Call Bob')..."
                placeholderTextColor="#64748B"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendInput}
                returnKeyType="send"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !inputText.trim() && styles.sendBtnDisabled,
                ]}
                onPress={handleSendInput}
                disabled={!inputText.trim()}
              >
                <Icon name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Floating Hands-Free Badge Styles (Draggable)
  floatingWidgetContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 24, 38, 0.92)',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  dragHandle: {
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  handsFreeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  floatingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  handsFreeToggleBtn: {
    marginLeft: 6,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Active Overlay Modal Styles
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 23, 0.78)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 36,
  },
  assistantCard: {
    width: '92%',
    backgroundColor: '#161D2B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    alignItems: 'center',
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  closeBtn: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  glowingOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    height: 24,
  },
  waveBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginHorizontal: 3,
  },
  transcriptBox: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  userTranscriptBubble: {
    backgroundColor: 'rgba(0, 226, 254, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.35)',
    marginVertical: 4,
  },
  userTranscriptText: {
    color: '#00F2FE',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  placeholderText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  responseBubble: {
    marginTop: 10,
    backgroundColor: 'rgba(124, 77, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.3)',
  },
  spokenResponseText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 14,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: '#0EA5E9',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
  },
});

export default AssistantOverlay;
