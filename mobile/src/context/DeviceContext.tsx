// =============================================================================
// Context: DeviceContext
// =============================================================================
// Provides BLE device state to the entire component tree.
// Components use this to display connection status, battery level, etc.
// Also initializes the background BLE service for continuous monitoring.
// =============================================================================

import React, { createContext, useContext, useEffect, useRef } from 'react';
import {
  useDeviceConnection,
  UseDeviceConnectionReturn,
} from '../hooks/useDeviceConnection';
import BackgroundBLEService from '../services/background/BackgroundBLEService';
import BLEManager from '../services/ble/BLEManager';
import LocalDatabase from '../services/storage/LocalDatabase';
import PipelineService from '../services/api/PipelineService';
import { estimateSignalQuality } from '../services/ble/ECGParser';
import { ECG_CONFIG } from '../constants/config';
import { useAuth } from './AuthContext';

const DeviceContext = createContext<UseDeviceConnectionReturn | null>(null);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const device = useDeviceConnection();
  const { user } = useAuth();
  const bgServiceInitialized = useRef(false);
  const ecgListenerRef = useRef<(() => void) | null>(null);
  const segmentBufferRef = useRef<number[]>([]);
  const segmentStartTimeRef = useRef<number>(Date.now());

  // ── Global ECG data listener ────────────────────────────────────────────
  // Register a persistent ECG listener at the app level so incoming BLE
  // data is always captured into LocalDatabase, even when the user is on
  // Dashboard, History, or any screen other than ECGMonitorScreen.
  // Without this, data was silently dropped ("No ECG data listeners").
  //
  // After saving to SQLite, the segment is also sent to the server pipeline
  // for real-time AI analysis. Pipeline failures are non-fatal.
  useEffect(() => {
    const samplesPerSegment = ECG_CONFIG.sampleRate * ECG_CONFIG.segmentDuration;
    const patientId = user?.uid ?? 'current-patient';

    const handleECGData = (samples: number[], timestamp: number) => {
      segmentBufferRef.current.push(...samples);

      if (!segmentStartTimeRef.current) {
        segmentStartTimeRef.current = timestamp;
      }

      // Save a full segment when enough samples accumulate
      if (segmentBufferRef.current.length >= samplesPerSegment) {
        const segmentSamples = segmentBufferRef.current.splice(0, samplesPerSegment);
        const quality = estimateSignalQuality(segmentSamples);
        const startTime = segmentStartTimeRef.current;
        segmentStartTimeRef.current = timestamp;

        const segment = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          patientId,
          deviceId: device.deviceState.connectedDevice?.id ?? 'unknown',
          samples: segmentSamples,
          sampleRate: ECG_CONFIG.sampleRate,
          lead: 'II' as const,
          startTime,
          endTime: timestamp,
          duration: samplesPerSegment / ECG_CONFIG.sampleRate,
          signalQuality: quality,
          synced: false,
          createdAt: new Date().toISOString(),
        };

        // Save to SQLite (critical — data persistence)
        LocalDatabase.getInstance()
          .saveECGSegment(segment)
          .then(() => {
            // After saving locally, send to pipeline for real-time analysis.
            // Non-blocking: don't await, pipeline failures are non-fatal.
            if (quality >= ECG_CONFIG.minSignalQuality) {
              PipelineService.getInstance()
                .analyzeSegment(segment)
                .catch(() => {
                  // Silently ignore — SyncQueue will retry later
                });
            }
          })
          .catch((err) => {
            console.warn('[DeviceProvider] Failed to save ECG segment:', err);
          });
      }
    };

    const ble = BLEManager.getInstance();
    ecgListenerRef.current = ble.onECGData(handleECGData);

    return () => {
      if (ecgListenerRef.current) {
        ecgListenerRef.current();
        ecgListenerRef.current = null;
      }
    };
  }, []);

  // Initialize BLE on mount — failures are non-fatal (e.g., Expo Go)
  useEffect(() => {
    device.initialize().catch((err) => {
      // BLE init failure is expected in Expo Go — don't crash the app
      console.warn('[DeviceProvider] BLE init failed (expected in Expo Go):', err?.message ?? err);
    });

    // Initialize background BLE service
    if (!bgServiceInitialized.current) {
      bgServiceInitialized.current = true;
      BackgroundBLEService.getInstance()
        .initialize()
        .catch((err) => {
          console.warn('[DeviceProvider] Background BLE init failed:', err?.message ?? err);
        });
    }
  }, []);

  // Start/stop background service based on connection state
  useEffect(() => {
    const bgService = BackgroundBLEService.getInstance();

    if (device.deviceState.connectionState === 'connected') {
      bgService.start().catch((err) => {
        console.warn('[DeviceProvider] Background service start failed:', err?.message ?? err);
      });
    } else if (
      device.deviceState.connectionState === 'disconnected' ||
      device.deviceState.connectionState === 'error'
    ) {
      // Only stop if we're truly done — not during reconnect attempts
      // The BackgroundBLEService watchdog handles reconnection internally
      // Give it a grace period before stopping
      const stopTimer = setTimeout(() => {
        const currentState = device.deviceState.connectionState;
        if (currentState === 'disconnected' || currentState === 'error') {
          bgService.stop().catch((err) => {
            console.warn('[DeviceProvider] Background service stop failed:', err?.message ?? err);
          });
        }
      }, 30_000); // 30s grace period for reconnection

      return () => clearTimeout(stopTimer);
    }
    // 'connecting' state: do nothing — keep background service running if it was started
  }, [device.deviceState.connectionState]);

  return (
    <DeviceContext.Provider value={device}>{children}</DeviceContext.Provider>
  );
}

/**
 * Access device connection state and controls from any component.
 */
export function useDevice(): UseDeviceConnectionReturn {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}
