// =============================================================================
// Hook: useOfflineSync
// =============================================================================
// Connects the SyncQueue to the network status and provides
// sync state for UI components (e.g., SyncStatusBar).
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import SyncQueue, { SyncStatus, SyncResult } from '../services/storage/SyncQueue';
import { useNetworkStatus } from './useNetworkStatus';

export interface UseOfflineSyncReturn {
  /** Current sync status */
  syncStatus: SyncStatus;

  /** Number of items waiting to be uploaded */
  pendingCount: number;

  /** Whether the device is online */
  isOnline: boolean;

  /** Last sync result */
  lastResult: SyncResult | null;

  /** Manually trigger a sync attempt */
  triggerSync: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const network = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const syncQueue = SyncQueue.getInstance();

  // Update SyncQueue with network status
  useEffect(() => {
    syncQueue.setOnline(network.isOnline);
  }, [network.isOnline]);

  // Listen to sync status changes
  useEffect(() => {
    const unsubscribe = syncQueue.onStatusChange((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  // Start periodic sync and poll pending count
  useEffect(() => {
    syncQueue.startPeriodicSync();

    const countInterval = setInterval(async () => {
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);
    }, 5_000);

    return () => {
      syncQueue.stopPeriodicSync();
      clearInterval(countInterval);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    const result = await syncQueue.processQueue();
    setLastResult(result);
    const count = await syncQueue.getPendingCount();
    setPendingCount(count);
  }, []);

  return {
    syncStatus,
    pendingCount,
    isOnline: network.isOnline,
    lastResult,
    triggerSync,
  };
}
