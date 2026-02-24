// =============================================================================
// Hook: useNetworkStatus
// =============================================================================
// Monitors device network connectivity using expo-network.
// Provides real-time online/offline state for UI indicators and sync logic.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';

export interface NetworkStatus {
  isOnline: boolean;
  isWifi: boolean;
  /** Last time network status was checked */
  lastCheckedAt: number;
}

/**
 * Hook that tracks device network connectivity.
 *
 * @param pollInterval - How often to check status (ms). Default: 10 seconds.
 *                       We poll because expo-network event listeners
 *                       can be unreliable on some Android versions.
 */
export function useNetworkStatus(pollInterval: number = 10_000): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true, // Optimistic default
    isWifi: false,
    lastCheckedAt: Date.now(),
  });

  const checkStatus = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setStatus({
        isOnline: state.isInternetReachable ?? state.isConnected ?? false,
        isWifi: state.type === Network.NetworkStateType.WIFI,
        lastCheckedAt: Date.now(),
      });
    } catch (error) {
      console.warn('[useNetworkStatus] Check failed:', error);
      // Don't change status on check failure — keep last known state
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkStatus();

    // Periodic polling
    const interval = setInterval(checkStatus, pollInterval);

    return () => clearInterval(interval);
  }, [checkStatus, pollInterval]);

  return status;
}
