/**
 * Client/src/screens/HomeScreen.js
 * 
 * Main Dashboard Screen.
 * Lists all registered users, tracks their status in real time, and facilitates
 * triggering outgoing calls or entering the Debug Screen.
 */

import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useCall } from '../hooks/useCall';
import { useUsers } from '../hooks/useUsers';
import { useSocket } from '../hooks/useSocket';
import Icon from 'react-native-vector-icons/Ionicons';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { isSocketConnected } = useSocket();
  const { makeCall, callState } = useCall();
  const { users, isLoading, error } = useUsers();
  const [search, setSearch] = useState('');

  // Automatically steer to Call Screen if signaling starts
  React.useEffect(() => {
    if (callState !== 'Idle') {
      navigation.navigate('Call');
    }
  }, [callState, navigation]);

  // Compute initials for profile avatars
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  // Resolve status indicator colors
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ONLINE':
        return '#10B981'; // Emerald 500 (Green)
      case 'IN CALL':
        return '#F59E0B'; // Amber 500 (Orange)
      case 'FAILED':
        return '#EF4444'; // Rose 500 (Red)
      case 'OFFLINE':
      default:
        return '#64748B'; // Slate 400 (Grey)
    }
  };

  // Filter contacts based on search query
  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const handleCallUser = async (targetUsername) => {
    try {
      await makeCall(targetUsername);
    } catch (e) {
      console.log('Outgoing call execution error: ', e);
    }
  };

  const renderUserCard = ({ item }) => {
    const isMe = item.username.toLowerCase() === user?.username?.toLowerCase();
    const isOffline = item.status === 'OFFLINE';
    const isInCall = item.status === 'IN CALL';
    
    // Call is disabled if it's the current user, or target is offline/in-call
    const canCall = !isMe && !isOffline && !isInCall && isSocketConnected;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.avatarCircle, { backgroundColor: isMe ? '#0284C7' : '#334155' }]}>
            <Text style={styles.avatarText}>{getInitials(item.username)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.username} {isMe ? '(You)' : ''}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </View>

        {!isMe && (
          <TouchableOpacity
            style={[styles.callButton, !canCall && styles.callButtonDisabled]}
            disabled={!canCall}
            onPress={() => handleCallUser(item.username)}
          >
            <Icon name="call" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header Panel */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appTitle}>Dashboard</Text>
          <View style={styles.loggedInRow}>
            <Text style={styles.userLabel}>Logged in:</Text>
            <Text style={styles.userNameHeader}>{user?.username}</Text>
            <View
              style={[
                styles.netStatusDot,
                { backgroundColor: isSocketConnected ? '#10B981' : '#EF4444' },
              ]}
            />
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.debugBtn}
            onPress={() => navigation.navigate('Debug')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="document-text-outline" size={14} color="#F8FAFC" />
              <Text style={styles.debugBtnText}>Logs</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search user..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Connection warning banner if offline */}
      {!isSocketConnected && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningBannerText}>
            Offline. Connecting to signaling server...
          </Text>
        </View>
      )}

      {/* Users FlatList */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.username}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No users registered on server</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flex: 1,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#38BDF8',
  },
  loggedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  userNameHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    marginLeft: 4,
    marginRight: 6,
    textTransform: 'capitalize',
  },
  netStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  debugBtn: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  debugBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  warningBanner: {
    backgroundColor: '#7F1D1D',
    paddingVertical: 6,
    alignItems: 'center',
  },
  warningBannerText: {
    color: '#FECACA',
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  callButton: {
    backgroundColor: '#0EA5E9',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  callButtonDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  phoneIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIconText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
});
