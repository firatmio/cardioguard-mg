// =============================================================================
// Hook: useDeviceConnection
// =============================================================================
// React hook that wraps BLEManager for use in components.
// Provides reactive device state and connection control methods.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import BLEManager from '../services/ble/BLEManager';
import type { DeviceState, ECGDevice } from '../types';

export interface UseDeviceConnectionReturn {
  /** Current device connection state */
  deviceState: DeviceState;

  /** List of discovered devices from last scan */
  discoveredDevices: ECGDevice[];

  /** Whether a scan is in progress */
  isScanning: boolean;

  /** Initialize BLE and check permissions */
  initialize: () => Promise<void>;

  /** Start scanning for ECG devices */
  startScan: () => Promise<void>;

  /** Stop scanning */
  stopScan: () => void;

  /** Connect to a specific device */
  connect: (deviceId: string) => Promise<void>;

  /** Disconnect from the current device */
  disconnect: () => Promise<void>;
}

export function useDeviceConnection(): UseDeviceConnectionReturn {
  const bleManager = useRef(BLEManager.getInstance());

  const [deviceState, setDeviceState] = useState<DeviceState>(
    bleManager.current.getState()
  );
  const [discoveredDevices, setDiscoveredDevices] = useState<ECGDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Subscribe to BLE state changes
  useEffect(() => {
    const unsubscribe = bleManager.current.onStateChange((state) => {
      setDeviceState(state);
    });

    return unsubscribe;
  }, []);

  const initialize = useCallback(async () => {
    try {
      await bleManager.current.initialize();
    } catch (error) {
      console.error('[useDeviceConnection] Init failed:', error);
    }
  }, []);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);

    // Register real-time discovery callback so UI updates as devices are found
    bleManager.current.onDeviceDiscovered((device) => {
      setDiscoveredDevices((prev) => {
        // Avoid duplicates — update existing or append
        const exists = prev.findIndex((d) => d.id === device.id);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = device;
          return updated;
        }
        return [...prev, device];
      });
    });

    try {
      const devices = await bleManager.current.scanForDevices();
      setDiscoveredDevices(devices);
    } catch (error) {
      console.error('[useDeviceConnection] Scan failed:', error);
    } finally {
      setIsScanning(false);
      // Clean up discovery callback
      bleManager.current.onDeviceDiscovered(null);
    }
  }, []);

  const stopScan = useCallback(() => {
    bleManager.current.stopScan();
    setIsScanning(false);
  }, []);

  const connect = useCallback(async (deviceId: string) => {
    await bleManager.current.connect(deviceId);
  }, []);

  const disconnect = useCallback(async () => {
    await bleManager.current.disconnect();
    setDiscoveredDevices([]);
  }, []);

  return {
    deviceState,
    discoveredDevices,
    isScanning,
    initialize,
    startScan,
    stopScan,
    connect,
    disconnect,
  };
}
