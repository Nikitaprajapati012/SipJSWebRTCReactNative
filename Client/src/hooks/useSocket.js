/**
 * Client/src/hooks/useSocket.js
 * 
 * Custom hook to consume SocketContext properties (socket instance, connection state).
 */

import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
