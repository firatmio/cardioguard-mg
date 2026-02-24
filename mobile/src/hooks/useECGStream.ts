// =============================================================================
// Hook: useECGStream
// =============================================================================
// Manages real-time ECG data streaming for the ECG monitor view.
// Maintains a circular display buffer, computes heart rate, and manages
// segment creation for local storage.
//
// This hook is the bridge between the BLE data stream and the UI.
// It does NOT perform any AI inference — only basic signal processing
// for display purposes (BPM calculation, signal quality estimation).
// =============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import BLEManager from '../services/ble/BLEManager';
import LocalDatabase from '../services/storage/LocalDatabase';
import FirestoreECGSync from '../services/firebase/ecgSync';
import { estimateSignalQuality } from '../services/ble/ECGParser';
import { ECG_CONFIG } from '../constants/config';
import type { ECGStreamState, ECGSegment } from '../types';

/**
 * Lightweight state object for triggering re-renders.
 * The heavy displayBuffer lives in a ref and is read directly
 * by the ECGWaveform component via getDisplayBuffer().
 * This avoids copying 1250+ samples into React state every 80ms.
 */
interface ECGStreamInternalState {
  isStreaming: boolean;
  currentBPM: number | null;
  signalQuality: number;
  totalSamplesReceived: number;
  streamStartTime: number | null;
  /** Monotonic counter bumped on each flush — tells consumers the ref has new data */
  bufferVersion: number;
}

// Simple UUID generator (avoid importing heavy uuid lib for this)
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export interface UseECGStreamReturn {
  /** Current stream state for rendering */
  streamState: ECGStreamState;

  /**
   * Direct access to the display buffer ref.
   * ECGWaveform should call this instead of reading streamState.displayBuffer
   * to avoid expensive array copies on every render.
   */
  getDisplayBuffer: () => readonly number[];

  /** Start listening to ECG data */
  startStream: () => void;

  /** Stop listening to ECG data */
  stopStream: () => void;

  /** Whether stream is active */
  isActive: boolean;
}

export function useECGStream(
  patientId: string,
  deviceId: string,
): UseECGStreamReturn {
  // ── Refs FIRST (must be declared before any code that reads them) ──
  const isActive = useRef(false);
  const isActiveState = useRef(false);  // reactive mirror for return value
  const bufferVersionRef = useRef(0);

  // Fixed-size circular buffer — eliminates push/splice GC pressure.
  // Write pointer wraps around; buffer is always exactly maxDisplaySamples.
  const maxDisplaySamples = ECG_CONFIG.sampleRate * ECG_CONFIG.displayBufferDuration;
  const displayRingRef = useRef<Float32Array>(new Float32Array(maxDisplaySamples));
  const displayWritePtrRef = useRef<number>(0);
  const displayFilledRef = useRef<number>(0); // how many valid samples are in the ring

  // Legacy display buffer ref — lazily rebuilt from ring for consumers
  const displayBufferRef = useRef<number[]>([]);
  const segmentBufferRef = useRef<number[]>([]);

  // Lightweight state that triggers re-renders (NO heavy displayBuffer)
  const [internalState, setInternalState] = useState<ECGStreamInternalState>({
    isStreaming: false,
    currentBPM: null,
    signalQuality: 0,
    totalSamplesReceived: 0,
    streamStartTime: null,
    bufferVersion: 0,
  });

  // Expose a ECGStreamState-compatible object for backward compat,
  // but displayBuffer comes from the ref (zero-copy read).
  // Wrapped in useMemo — only recreated when internalState changes,
  // not on every parent re-render (e.g. elapsedTime timer).
  const streamState: ECGStreamState = useMemo(() => ({
    ...internalState,
    displayBuffer: displayBufferRef.current,
  }), [internalState]);
  const segmentStartTimeRef = useRef<number>(0);
  const totalSamplesRef = useRef<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const streamStartTimeRef = useRef<number | null>(null);
  const firestoreDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BPM calculation state
  const rPeakTimesRef = useRef<number[]>([]);
  const lastSampleIndexRef = useRef<number>(0);

  // Throttle state updates to avoid excessive re-renders (~12 FPS)
  const lastStateUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const STATE_UPDATE_INTERVAL_MS = 80; // ~12 FPS

  const samplesPerSegment = ECG_CONFIG.sampleRate * ECG_CONFIG.segmentDuration;

  // Refs to hold latest patientId/deviceId for use inside callbacks
  // without causing useCallback dependency churn.
  const patientIdRef = useRef(patientId);
  patientIdRef.current = patientId;
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  /**
   * Process incoming ECG samples from the BLE manager.
   *
   * All mutable data is accessed via refs — this callback has a STABLE
   * identity (empty dependency array) so the BLE listener never needs to
   * be re-subscribed when patientId/deviceId change.
   */
  const handleECGData = useCallback(
    (samples: number[], timestamp: number) => {
      if (!isActive.current) return;

      // Write to fixed-size circular ring buffer — zero allocation.
      // Replaces push(...samples) + splice() which caused heavy GC.
      const ring = displayRingRef.current;
      const capacity = ring.length;
      let wp = displayWritePtrRef.current;
      for (let i = 0; i < samples.length; i++) {
        ring[wp] = samples[i];
        wp = (wp + 1) % capacity;
      }
      displayWritePtrRef.current = wp;
      displayFilledRef.current = Math.min(
        displayFilledRef.current + samples.length,
        capacity,
      );

      // Append to segment buffer for storage
      segmentBufferRef.current.push(...samples);

      // Track total samples
      totalSamplesRef.current += samples.length;

      // Set stream start time on first data
      if (!streamStartTimeRef.current) {
        streamStartTimeRef.current = timestamp;
      }

      // Simple R-peak detection for BPM estimation
      const bpm = estimateBPM(samples, timestamp);

      // Check if we have a full segment to save
      if (segmentBufferRef.current.length >= samplesPerSegment) {
        saveSegment(timestamp);
      }

      // Throttle state updates to reduce re-renders
      const now = Date.now();
      if (now - lastStateUpdateRef.current < STATE_UPDATE_INTERVAL_MS) {
        // Schedule a deferred update if not already scheduled
        if (!pendingUpdateRef.current) {
          pendingUpdateRef.current = setTimeout(() => {
            pendingUpdateRef.current = null;
            if (!isActive.current) return;
            flushStateUpdate(bpm);
          }, STATE_UPDATE_INTERVAL_MS);
        }
        return;
      }

      flushStateUpdate(bpm);
    },
    // Stable deps — patientId/deviceId are read from refs
    [maxDisplaySamples, samplesPerSegment],
  );

  /**
   * Actually commit the state update to trigger a re-render.
   *
   * IMPORTANT: We do NOT copy displayBuffer into state. Instead we bump a
   * version counter that tells consumers the ref has new data.
   * This eliminates the ~1250-element array copy that was happening 12×/sec
   * and causing GC pressure → JS thread stall → crash after ~8 seconds.
   */
  const flushStateUpdate = useCallback((bpm: number | null) => {
    lastStateUpdateRef.current = Date.now();

    // Rebuild linear display array from ring buffer (one alloc per flush, ~12×/sec).
    // This is far cheaper than push+splice on every packet (~31×/sec).
    const ring = displayRingRef.current;
    const filled = displayFilledRef.current;
    const wp = displayWritePtrRef.current;
    const capacity = ring.length;
    const linearBuf = new Array<number>(filled);
    const readStart = (wp - filled + capacity) % capacity;
    for (let i = 0; i < filled; i++) {
      linearBuf[i] = ring[(readStart + i) % capacity];
    }
    displayBufferRef.current = linearBuf;

    // Estimate signal quality on latest 1 second (avoid slice — use tail of linear)
    const qualitySamples = filled >= ECG_CONFIG.sampleRate
      ? linearBuf.slice(filled - ECG_CONFIG.sampleRate)
      : linearBuf;
    const quality = estimateSignalQuality(qualitySamples);

    bufferVersionRef.current += 1;

    setInternalState({
      isStreaming: true,
      currentBPM: bpm,
      signalQuality: quality,
      totalSamplesReceived: totalSamplesRef.current,
      streamStartTime: streamStartTimeRef.current,
      bufferVersion: bufferVersionRef.current,
    });

    // Sync live status to Firestore (rate-limited internally)
    try {
      const ecgSync = FirestoreECGSync.getInstance();
      ecgSync.updateLiveStatus({
        bpm,
        signalQuality: quality,
        deviceId: deviceIdRef.current,
        isRecording: true,
        batteryLevel: BLEManager.getInstance().getState().batteryLevel,
      });
    } catch (e) {
      console.warn('[useECGStream] Firestore sync error:', e);
    }
  }, []);  // Stable — reads deviceId from ref

  /**
   * Basic BPM estimation using simple peak detection.
   * This is for display only — the backend performs accurate BPM analysis.
   */
  const estimateBPM = (samples: number[], timestamp: number): number | null => {
    // Simple threshold-based R-peak detection
    const threshold = 0.5; // mV — adjust based on device calibration
    const minPeakDistance = ECG_CONFIG.sampleRate * 0.3; // Min 300ms between beats

    for (let i = 1; i < samples.length - 1; i++) {
      const idx = lastSampleIndexRef.current + i;

      if (
        samples[i] > threshold &&
        samples[i] > samples[i - 1] &&
        samples[i] >= samples[i + 1]
      ) {
        const lastPeak = rPeakTimesRef.current[rPeakTimesRef.current.length - 1] ?? 0;
        if (idx - lastPeak >= minPeakDistance) {
          rPeakTimesRef.current.push(idx);
        }
      }
    }

    lastSampleIndexRef.current += samples.length;

    // Keep only recent peaks (last 15 seconds)
    const maxPeaks = 30;
    if (rPeakTimesRef.current.length > maxPeaks) {
      rPeakTimesRef.current = rPeakTimesRef.current.slice(-maxPeaks);
    }

    // Calculate BPM from R-R intervals
    const peaks = rPeakTimesRef.current;
    if (peaks.length < 3) return null;

    // Use last 5 R-R intervals for stable estimate
    const recentPeaks = peaks.slice(-6);
    let totalInterval = 0;
    let count = 0;

    for (let i = 1; i < recentPeaks.length; i++) {
      totalInterval += recentPeaks[i] - recentPeaks[i - 1];
      count++;
    }

    if (count === 0) return null;

    const avgIntervalSamples = totalInterval / count;
    const avgIntervalSeconds = avgIntervalSamples / ECG_CONFIG.sampleRate;
    const bpm = 60 / avgIntervalSeconds;

    // Sanity check: normal human heart rate range
    if (bpm < 30 || bpm > 220) return null;

    return Math.round(bpm);
  };

  /**
   * Save accumulated segment buffer to local database.
   *
   * FIX: Copies samples BEFORE splicing so data isn't lost on save failure.
   * Uses refs for patientId/deviceId to avoid stale closure values.
   */
  const saveSegment = async (timestamp: number) => {
    // Copy FIRST, splice AFTER successful save to prevent data loss
    const samples = segmentBufferRef.current.slice(0, samplesPerSegment);
    const quality = estimateSignalQuality(samples);

    const segment: ECGSegment = {
      id: generateId(),
      patientId: patientIdRef.current,
      deviceId: deviceIdRef.current,
      samples,
      sampleRate: ECG_CONFIG.sampleRate,
      lead: 'II',
      startTime: segmentStartTimeRef.current || timestamp - (samplesPerSegment / ECG_CONFIG.sampleRate) * 1000,
      endTime: timestamp,
      duration: samplesPerSegment / ECG_CONFIG.sampleRate,
      signalQuality: quality,
      synced: false,
      createdAt: new Date().toISOString(),
    };

    segmentStartTimeRef.current = timestamp;

    try {
      const db = LocalDatabase.getInstance();
      await db.saveECGSegment(segment);
      // Only remove from buffer after successful save
      segmentBufferRef.current.splice(0, samplesPerSegment);
    } catch (error) {
      console.error('[useECGStream] Failed to save segment — data retained in buffer for retry:', error);
    }
  };

  const startStream = useCallback(() => {
    if (isActive.current) return;

    isActive.current = true;
    isActiveState.current = true;
    displayRingRef.current = new Float32Array(maxDisplaySamples);
    displayWritePtrRef.current = 0;
    displayFilledRef.current = 0;
    displayBufferRef.current = [];
    segmentBufferRef.current = [];
    totalSamplesRef.current = 0;
    rPeakTimesRef.current = [];
    lastSampleIndexRef.current = 0;
    segmentStartTimeRef.current = Date.now();
    streamStartTimeRef.current = null;
    lastStateUpdateRef.current = 0;
    bufferVersionRef.current = 0;

    // Clear any pending throttled update
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }

    // Delay Firestore ECG sync initialization by 5 seconds.
    // Starting Firestore queries (getDocs) immediately alongside the BLE
    // stream causes JS thread contention and potential unhandled rejections
    // when the network is slow/offline, contributing to early crashes.
    if (firestoreDelayTimerRef.current) {
      clearTimeout(firestoreDelayTimerRef.current);
    }
    firestoreDelayTimerRef.current = setTimeout(() => {
      firestoreDelayTimerRef.current = null;
      if (!isActive.current) return;
      const ecgSync = FirestoreECGSync.getInstance();
      ecgSync
        .initialize(patientIdRef.current)
        .then(() => ecgSync.start())
        .catch((e) => {
          console.warn('[useECGStream] Firestore ECG sync init failed (non-fatal):', e);
        });
    }, 5000);

    const ble = BLEManager.getInstance();
    unsubscribeRef.current = ble.onECGData(handleECGData);

    setInternalState({
      isStreaming: true,
      currentBPM: null,
      signalQuality: 0,
      totalSamplesReceived: 0,
      streamStartTime: Date.now(),
      bufferVersion: 0,
    });
  }, [handleECGData]);  // handleECGData is now stable — no patientId dep needed

  const stopStream = useCallback(() => {
    isActive.current = false;
    isActiveState.current = false;

    // Clear pending throttled update
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }

    // Clear pending Firestore delay timer
    if (firestoreDelayTimerRef.current) {
      clearTimeout(firestoreDelayTimerRef.current);
      firestoreDelayTimerRef.current = null;
    }

    // Stop Firestore sync
    try {
      const ecgSync = FirestoreECGSync.getInstance();
      ecgSync.stop();
      ecgSync.updateDeviceStatus('disconnected');
    } catch (e) {
      console.warn('[useECGStream] Firestore stop error:', e);
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Save any remaining samples as a partial segment
    if (segmentBufferRef.current.length > ECG_CONFIG.sampleRate) {
      saveSegment(Date.now());
    }

    setInternalState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  // handleECGData is now stable (reads patientId/deviceId from refs),
  // so we no longer need to re-subscribe when those values change.
  // Removing this effect eliminates the transient data loss that occurred
  // every time the BLE listener was unsubscribed and re-subscribed.

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
      if (firestoreDelayTimerRef.current) {
        clearTimeout(firestoreDelayTimerRef.current);
        firestoreDelayTimerRef.current = null;
      }
    };
  }, []);

  /** Direct ref access for ECGWaveform — avoids array copy */
  const getDisplayBuffer = useCallback((): readonly number[] => {
    return displayBufferRef.current;
  }, []);

  return {
    streamState,
    getDisplayBuffer,
    startStream,
    stopStream,
    isActive: isActiveState.current,
  };
}
