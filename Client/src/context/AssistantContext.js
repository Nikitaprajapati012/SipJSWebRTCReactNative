/**
 * Client/src/context/AssistantContext.js
 *
 * Global React Context for AI Voice Assistant.
 * Connects AssistantEngine with CallContext and supplies voice state,
 * transcript, status indicators, and controls across the application.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AssistantEngine, { ASSISTANT_STATES } from '../AI/Assistant/AssistantEngine';
import WAKE_WORD_CONFIG from '../AI/WakeWord/WakeWordConfig';
import { CallContext } from './CallContext';
import Logger from '../services/Logger';

export const AssistantContext = createContext();

export const AssistantProvider = ({ children }) => {
  const callContext = useContext(CallContext);

  const [assistantState, setAssistantState] = useState(ASSISTANT_STATES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [spokenResponse, setSpokenResponse] = useState('');
  const [isHandsFreeEnabled, setIsHandsFreeEnabled] = useState(true);
  const [primaryWakeWord, setPrimaryWakeWord] = useState(WAKE_WORD_CONFIG.primaryWakeWord);

  // Synchronize CallContext reference with AssistantEngine
  useEffect(() => {
    AssistantEngine.setCallContext(callContext);
  }, [callContext]);

  // Initialize Assistant Engine on app mount
  useEffect(() => {
    // The voice assistant must never block the core calling UI from starting.
    // Native audio capabilities can be unavailable on a particular device.
    try {
      AssistantEngine.init();
    } catch (error) {
      console.warn('Assistant initialization failed:', error);
      setAssistantState(ASSISTANT_STATES.ERROR);
    }

    const removeStateSub = AssistantEngine.addStateChangeListener((newState) => {
      setAssistantState(newState);
      if (newState === ASSISTANT_STATES.SPEAKING) {
        setSpokenResponse(AssistantEngine.lastSpokenResponse);
      }
    });

    const removeTranscriptSub = AssistantEngine.addTranscriptListener((text) => {
      setTranscript(text);
    });

    return () => {
      removeStateSub();
      removeTranscriptSub();
    };
  }, []);

  const toggleHandsFree = () => {
    const nextState = !isHandsFreeEnabled;
    setIsHandsFreeEnabled(nextState);
    AssistantEngine.setHandsFreeEnabled(nextState);
    Logger.log({
      module: 'AssistantContext',
      method: 'toggleHandsFree',
      action: 'Hands-Free Toggled',
      result: `Hands-free mode: ${nextState ? 'ON' : 'OFF'}`,
    });
  };

  const startListening = () => {
    AssistantEngine.startListening();
  };

  const stopSession = () => {
    AssistantEngine.stopSession();
  };

  const triggerWakeWord = (keyword = primaryWakeWord) => {
    AssistantEngine._handleWakeWordTrigger({ keyword });
  };

  const processTextInput = (text) => {
    AssistantEngine.processTextInput(text);
  };

  return (
    <AssistantContext.Provider
      value={{
        assistantState,
        transcript,
        spokenResponse,
        isHandsFreeEnabled,
        primaryWakeWord,
        toggleHandsFree,
        startListening,
        stopSession,
        triggerWakeWord,
        processTextInput,
        ASSISTANT_STATES,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};
