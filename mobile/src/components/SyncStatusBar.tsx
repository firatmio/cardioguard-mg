// =============================================================================
// Component: SyncStatusBar
// =============================================================================
// Persistent bar showing data sync status. Appears at the top of screens
// when there are pending items or sync issues.
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, fontSize, fontWeight } from '../constants/theme';
import type { SyncStatus } from '../services/storage/SyncQueue';

interface SyncStatusBarProps {
  /** Current sync status */
  status: SyncStatus;

  /** Number of pending upload items */
  pendingCount: number;

  /** Whether the device is online */
  isOnline: boolean;

  /** Called when user taps "Sync Now" */
  onSyncPress?: () => void;
}

export default function SyncStatusBar({
  status,
  pendingCount,
  isOnline,
  onSyncPress,
}: SyncStatusBarProps) {
  // Don't show the bar if everything is synced and online
  if (status === 'idle' && pendingCount === 0 && isOnline) {
    return null;
  }

  const config = getBarConfig(status, pendingCount, isOnline);

  return (
    <View
      style={[styles.container, { backgroundColor: config.bgColor }]}
      accessibilityRole="alert"
    >
      {status === 'syncing' && (
        <ActivityIndicator size="small" color={config.textColor} style={styles.spinner} />
      )}

      <Text style={[styles.text, { color: config.textColor }]}>
        {config.message}
      </Text>

      {config.showSyncButton && onSyncPress && (
        <TouchableOpacity onPress={onSyncPress} style={styles.syncButton}>
          <Text style={[styles.syncButtonText, { color: config.textColor }]}>
            Sync Now
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function getBarConfig(
  status: SyncStatus,
  pendingCount: number,
  isOnline: boolean,
): {
  message: string;
  bgColor: string;
  textColor: string;
  showSyncButton: boolean;
} {
  if (!isOnline) {
    return {
      message: `Offline · ${pendingCount} item${pendingCount !== 1 ? 's' : ''} waiting`,
      bgColor: '#FEF3C7', // Amber-50
      textColor: '#92400E', // Amber-800
      showSyncButton: false,
    };
  }

  if (status === 'syncing') {
    return {
      message: 'Uploading data...',
      bgColor: '#DBEAFE', // Blue-50
      textColor: '#1E40AF', // Blue-800
      showSyncButton: false,
    };
  }

  if (status === 'error') {
    return {
      message: `Sync error · ${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending`,
      bgColor: '#FEE2E2', // Red-50
      textColor: '#991B1B', // Red-800
      showSyncButton: true,
    };
  }

  if (pendingCount > 0) {
    return {
      message: `${pendingCount} item${pendingCount !== 1 ? 's' : ''} to upload`,
      bgColor: '#DBEAFE',
      textColor: '#1E40AF',
      showSyncButton: true,
    };
  }

  return {
    message: 'All data synced',
    bgColor: '#DCFCE7', // Green-50
    textColor: '#166534', // Green-800
    showSyncButton: false,
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textDecorationLine: 'underline',
  },
});
