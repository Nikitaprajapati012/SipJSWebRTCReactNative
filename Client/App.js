/**
 * Client/App.js
 *
 * Main Entry Point for the React Native Application.
 * Sets up global Context Providers and React Navigation.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { CallProvider } from './src/context/CallContext';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import OutgoingCallScreen from './src/screens/OutgoingCallScreen';
import ActiveCallScreen from './src/screens/ActiveCallScreen';
import DebugScreen from './src/screens/DebugScreen';

import FloatingCallOverlay from './src/components/FloatingCallOverlay';

import { useAuth } from './src/hooks/useAuth';
import { navigationRef } from './src/services/NavigationService';

const Stack = createNativeStackNavigator();

/**
 * AppNavigator dynamically switches stacks based on user authentication.
 * Unauthorized users are locked to the LoginScreen.
 * Authorized users can navigate to HomeScreen, Calling screens, and DebugScreen.
 */
function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="IncomingCall"
              component={IncomingCallScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="OutgoingCall"
              component={OutgoingCallScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="ActiveCall"
              component={ActiveCallScreen}
              options={{ gestureEnabled: false }}
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
          <FloatingCallOverlay />
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
