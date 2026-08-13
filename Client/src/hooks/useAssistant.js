/**
 * Client/src/hooks/useAssistant.js
 *
 * Custom React hook for accessing the AI Voice Assistant state & controls.
 */

import { useContext } from 'react';
import { AssistantContext } from '../context/AssistantContext';

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};

export default useAssistant;
