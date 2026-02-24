// =============================================================================
// Component: DeviceStatusBadge
// =============================================================================
// Compact badge showing the current BLE device connection state.
// Used in the header/navigation bar for persistent status visibility.
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { DeviceConnectionState } from '../types';
import { colors, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface DeviceStatusBadgeProps {
  /** Current connection state */
  connectionState: DeviceConnectionState;

  /** Battery level (0-100), null if unknown */
  batteryLevel: number | null;

  /** Device name, shown when connected */
  deviceName?: string;

  /** Called when user taps the badge */
  onPress?: () => void;
}

const STATE_CONFIG: Record<
  DeviceConnectionState,
  { label: string; color: string; bgColor: string }
> = {
  disconnected: {
    label: 'No Device',
    color: colors.textTertiary,
    bgColor: colors.surfaceElevated,
  },
  scanning: {
    label: 'Scanning...',
    color: colors.deviceSearching,
    bgColor: '#FEF3C7', // Amber-50
  },
  connecting: {
    label: 'Connecting...',
    color: colors.primary,
    bgColor: '#DBEAFE', // Blue-50
  },
  connected: {
    label: 'Connected',
    color: colors.deviceConnected,
    bgColor: '#DCFCE7', // Green-50
  },
  disconnecting: {
    label: 'Disconnecting...',
    color: colors.textSecondary,
    bgColor: colors.surfaceElevated,
  },
  error: {
    label: 'Error',
    color: colors.deviceError,
    bgColor: '#FEE2E2', // Red-50
  },
};

export default function DeviceStatusBadge({
  connectionState,
  batteryLevel,
  deviceName,
  onPress,
}: DeviceStatusBadgeProps) {
  const config = STATE_CONFIG[connectionState];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: config.bgColor }]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Device status: ${config.label}${
        batteryLevel != null ? `, battery ${batteryLevel}%` : ''
      }`}
    >
      {/* Status dot */}
      <View style={[styles.dot, { backgroundColor: config.color }]} />

      {/* Status text */}
      <Text style={[styles.label, { color: config.color }]} numberOfLines={1}>
        {connectionState === 'connected' && deviceName
          ? deviceName
          : config.label}
      </Text>

      {/* Battery indicator (only when connected) */}
      {connectionState === 'connected' && batteryLevel != null && (
        <Text
          style={[
            styles.battery,
            { color: getBatteryColor(batteryLevel) },
          ]}
        >
          {batteryLevel}%
        </Text>
      )}
    </TouchableOpacity>
  );
}

function getBatteryColor(level: number): string {
  if (level > 50) return colors.batteryGood;
  if (level > 20) return colors.batteryMedium;
  return colors.batteryLow;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    minHeight: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  battery: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginLeft: 8,
  },
});
