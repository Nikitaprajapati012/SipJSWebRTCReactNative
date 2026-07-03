/**
 * Client/src/hooks/useUsers.js
 * 
 * Custom hook that manages the user list state.
 * Performs the initial REST API query and sets up real-time presence listeners.
 */

import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import UserService from '../services/UserService';

export const useUsers = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const { isSocketConnected } = useContext(SocketContext);
  
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsersList = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await UserService.fetchUsers(user.token);
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // 1. Initial HTTP Fetch
      fetchUsersList();

      // 2. Setup Socket Presence Sync
      if (isSocketConnected) {
        UserService.subscribeToUserUpdates((updatedList) => {
          setUsers(updatedList);
        });
      }

      return () => {
        UserService.unsubscribeFromUserUpdates();
      };
    } else {
      setUsers([]);
    }
  }, [isAuthenticated, user, isSocketConnected, fetchUsersList]);

  return {
    users,
    isLoading,
    error,
    refetch: fetchUsersList,
  };
};
export default useUsers;
