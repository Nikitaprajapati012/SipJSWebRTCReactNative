/**
 * Client/App.js
 * 
 * Main Entry Point for the React Native Application.
 * Sets up global Context Providers and React Navigation.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { CallProvider } from './src/context/CallContext';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CallScreen from './src/screens/CallScreen';
import DebugScreen from './src/screens/DebugScreen';

import { useAuth } from './src/hooks/useAuth';

const Stack = createNativeStackNavigator();

/**
 * AppNavigator dynamically switches stacks based on user authentication.
 * Unauthorized users are locked to the LoginScreen.
 * Authorized users can navigate to HomeScreen, CallScreen, and DebugScreen.
 */
function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen 
              name="Call" 
              component={CallScreen} 
              options={{ gestureEnabled: false }} // Prevent swipe-back during calling
            />
            <Stack.Screen name="Debug" component={DebugScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CallProvider>
          <AppNavigator />
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
