// =============================================================================
// Application Configuration
// =============================================================================
// Runtime configuration values. In production, sensitive values (API URL, keys)
// should come from environment variables or a secure config service.
// =============================================================================

import type { BLEConfig, ECGDisplayConfig } from '../types';

/**
 * Backend API configuration.
 */
export const API_CONFIG = {
  /** Base URL for the backend API */
  baseUrl: __DEV__ ? 'http://192.168.1.100:8000' : 'https://api.cardioguard.com',

  /** Request timeout in milliseconds */
  timeout: 30_000,

  /** Maximum retry attempts for failed requests */
  maxRetries: 1,

  /** Base delay between retries in ms (exponential backoff) */
  retryBaseDelay: 1_000,
} as const;

/**
 * BLE device configuration.
 */
export const BLE_CONFIG: BLEConfig = {
  scanTimeout: 15_000,
  connectionTimeout: 10_000,
  autoReconnect: true,
  maxReconnectAttempts: 15,
  reconnectDelay: 2_000,
  deviceNamePrefix: 'CardioGuard',
};

/**
 * ECG signal processing configuration.
 */
export const ECG_CONFIG = {
  /** Sampling rate in Hz (must match device firmware) */
  sampleRate: 250,

  /** ADC resolution in bits */
  adcResolution: 16,

  /**
   * Conversion factor: ADC value → millivolts.
   * Depends on device hardware. Must be calibrated per device model.
   * Formula: voltage_mV = raw_value * adcToMv
   */
  adcToMv: 0.00286,

  /** Segment duration in seconds for storage chunking */
  segmentDuration: 10,

  /** Samples per segment = sampleRate * segmentDuration */
  get samplesPerSegment() {
    return this.sampleRate * this.segmentDuration;
  },

  /** Minimum signal quality threshold to consider data usable (0-1) */
  minSignalQuality: 0.3,

  /** Size of the display buffer in seconds */
  displayBufferDuration: 5,
} as const;

/**
 * Default ECG display configuration.
 */
export const DEFAULT_ECG_DISPLAY: ECGDisplayConfig = {
  paperSpeed: 25,
  amplitudeScale: 10,
  visibleDuration: 4,
  showGrid: true,
  traceColor: '#16A34A',
};

/**
 * Offline sync configuration.
 */
export const SYNC_CONFIG = {
  /** Maximum number of segments to upload in a single batch */
  batchSize: 10,

  /** Interval between sync attempts when online (ms) */
  syncInterval: 30_000,

  /** Maximum age of unsynced data before warning the user (hours) */
  maxUnsyncedAgeHours: 24,

  /** Maximum local storage before forcing older data cleanup (MB) */
  maxLocalStorageMB: 500,
} as const;

/**
 * Notification configuration.
 */
export const NOTIFICATION_CONFIG = {
  /** Channel ID for Android notifications */
  channelId: 'ecg-alerts',

  /** Channel name displayed in Android settings */
  channelName: 'ECG Alerts',
} as const;
