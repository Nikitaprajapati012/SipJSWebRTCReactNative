/**
 * Client/src/components/RoundButton.js
 * 
 * Reusable Circular Button component for calling screens.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function RoundButton({
  iconName,
  onPress,
  label,
  isActive = false,
  activeBackgroundColor = '#334155',
  inactiveBackgroundColor = '#1E293B',
  activeIconColor = '#38BDF8',
  inactiveIconColor = '#94A3B8',
  buttonSize = 56,
  iconSize = 24,
  style = {},
  disabled = false,
}) {
  const currentBgColor = isActive ? activeBackgroundColor : inactiveBackgroundColor;
  const currentIconColor = isActive ? activeIconColor : inactiveIconColor;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: currentBgColor,
          },
          style,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Icon name={iconName} size={iconSize} color={currentIconColor} />
      </TouchableOpacity>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
