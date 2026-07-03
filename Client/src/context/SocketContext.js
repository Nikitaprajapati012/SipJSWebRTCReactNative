/**
 * Client/src/context/SocketContext.js
 * 
 * SocketContext manages connection states with the Socket.IO signaling server.
 * Connects automatically when AuthContext verifies login credentials.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import SocketService from '../services/SocketService';
import Logger from '../services/Logger';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect Socket
      SocketService.connect(
        user.token,
        user.username,
        () => {
          setIsSocketConnected(true);
        },
        () => {
          setIsSocketConnected(false);
        }
      );

      return () => {
        SocketService.disconnect();
        setIsSocketConnected(false);
      };
    } else {
      SocketService.disconnect();
      setIsSocketConnected(false);
    }
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider
      value={{
        isSocketConnected,
        socketService: SocketService,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
