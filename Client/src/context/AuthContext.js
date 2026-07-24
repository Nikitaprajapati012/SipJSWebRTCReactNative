/**
 * Client/src/context/AuthContext.js
 * 
 * AuthContext maintains authentication states for the user.
 * Performs automatic login checks against StorageService on mount.
 */

import React, { createContext, useState, useEffect } from 'react';
import { initServerHost } from '../config';
import AuthService from '../services/AuthService';
import StorageService from '../services/StorageService';
import UserService from '../services/UserService';
import CallService from '../services/CallService';
import Logger from '../services/Logger';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check storage on boot to attempt auto-login
  useEffect(() => {
    const restoreSession = async () => {
      await initServerHost();
      const session = await StorageService.getSession();
      if (session) {
        setUser(session);
        setIsAuthenticated(true);
        UserService.setUsername(session.username);
        CallService.setUsername(session.username);
        
        Logger.log({
          username: session.username,
          module: 'AuthContext',
          method: 'restoreSession()',
          action: 'Auto Login Restored',
          result: `Restored session for ${session.username}`
        });
      }
      setIsLoading(false);
    };
    restoreSession();
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    const result = await AuthService.login(username, password);
    if (result.success) {
      await StorageService.saveSession(result.token, result.username);
      setUser({ username: result.username, token: result.token });
      setIsAuthenticated(true);
      UserService.setUsername(result.username);
      CallService.setUsername(result.username);
      setIsLoading(false);
      return { success: true };
    }
    setIsLoading(false);
    return { success: false, error: result.error };
  };

  const logout = async () => {
    setIsLoading(true);
    const currentUsername = user?.username || 'Unknown';
    await AuthService.logout(currentUsername);
    await StorageService.clearSession(currentUsername);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
