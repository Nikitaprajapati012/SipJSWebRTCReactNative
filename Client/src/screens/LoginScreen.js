/**
 * Client/src/screens/LoginScreen.js
 * 
 * Premium, dark-themed Login Screen.
 * Provides credentials inputs, editable server IP configuration for robust network connection,
 * and a tap-to-autofill quick panel featuring Alice, Bob, Charlie, David, Emily, Jack.
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getServerHost, setServerHost, detectServerHost } from '../config';

const MOCK_USERS = [
  { name: 'Alice', username: 'alice', password: '123' },
  { name: 'Bob', username: 'bob', password: '123' },
  { name: 'Charlie', username: 'charlie', password: '123' },
  { name: 'David', username: 'david', password: '123' },
  { name: 'Emily', username: 'emily', password: '123' },
  { name: 'Jack', username: 'jack', password: '123' },
];

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverHost, setServerHostState] = useState(getServerHost());
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setServerHostState(getServerHost());
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    
    // Save current server host setting before login
    await setServerHost(serverHost);

    const result = await login(username, password);
    if (!result.success) {
      setError(result.error || 'Authentication failed. Check server IP / network.');
    }
  };

  const handleResetHost = async () => {
    const autoHost = detectServerHost();
    setServerHostState(autoHost);
    await setServerHost('');
  };

  const handleQuickFill = (user) => {
    setUsername(user.username);
    setPassword(user.password);
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Header Area */}
          <View style={styles.headerContainer}>
            <Text style={styles.titleText}>Ventrilo</Text>
            <Text style={styles.subtitleText}>WebRTC & SIP.js Calling Demonstration</Text>
          </View>

          {/* Form Area */}
          <View style={styles.formContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. alice"
              placeholderTextColor="#64748B"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Server Settings Toggle */}
            <TouchableOpacity
              style={styles.serverToggleHeader}
              onPress={() => setShowServerSettings(!showServerSettings)}
            >
              <Text style={styles.serverToggleText}>
                {showServerSettings ? '▼ Server Settings' : '► Server IP: ' + serverHost}
              </Text>
            </TouchableOpacity>

            {showServerSettings && (
              <View style={styles.serverSettingsBox}>
                <Text style={styles.serverLabel}>Server Host / IP Address</Text>
                <TextInput
                  style={styles.serverInput}
                  placeholder="e.g. 192.168.1.72 or localhost"
                  placeholderTextColor="#64748B"
                  value={serverHost}
                  onChangeText={setServerHostState}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.resetButton} onPress={handleResetHost}>
                  <Text style={styles.resetButtonText}>Auto-Detect IP ({detectServerHost()})</Text>
                </TouchableOpacity>
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Fill Panel */}
          <View style={styles.quickFillContainer}>
            <Text style={styles.quickFillTitle}>Quick Tap Login</Text>
            <Text style={styles.quickFillSubtitle}>Tap a profile below to autofill credentials</Text>
            <View style={styles.quickFillGrid}>
              {MOCK_USERS.map((userObj) => (
                <TouchableOpacity
                  key={userObj.username}
                  style={[
                    styles.quickFillBadge,
                    username === userObj.username && styles.quickFillBadgeActive,
                  ]}
                  onPress={() => handleQuickFill(userObj)}
                >
                  <Text
                    style={[
                      styles.quickFillText,
                      username === userObj.username && styles.quickFillTextActive,
                    ]}
                  >
                    {userObj.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  titleText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#38BDF8', // Sky 400
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitleText: {
    fontSize: 14,
    color: '#94A3B8', // Slate 400
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#1E293B', // Slate 800
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 16,
    marginBottom: 20,
  },
  serverToggleHeader: {
    marginBottom: 16,
    paddingVertical: 6,
  },
  serverToggleText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  serverSettingsBox: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  serverLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  serverInput: {
    backgroundColor: '#1E293B',
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#38BDF8',
    fontSize: 14,
    marginBottom: 8,
  },
  resetButton: {
    alignSelf: 'flex-start',
  },
  resetButtonText: {
    color: '#64748B',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#F43F5E', // Rose 500
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#0EA5E9', // Sky 500
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickFillContainer: {
    alignItems: 'center',
  },
  quickFillTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  quickFillSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 16,
  },
  quickFillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickFillBadge: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickFillBadgeActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  quickFillText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  quickFillTextActive: {
    color: '#FFFFFF',
  },
});
