// =============================================================================
// ECG Domain Types
// =============================================================================
// Represents the core data structures for ECG signal capture, storage, and
// transmission. All values use SI units (mV for voltage, seconds for time)
// unless explicitly noted.
// =============================================================================

/**
 * A single ECG sample point.
 * Voltage is in millivolts (mV), relative to device baseline.
 */
export interface ECGSample {
  /** Voltage in millivolts */
  voltage: number;
  /** Unix timestamp in milliseconds */
  timestamp: number;
}

/**
 * A contiguous block of ECG samples captured in one recording window.
 * Segments are the fundamental unit of storage and sync.
 *
 * Design note: We use fixed-length segments (~10 seconds) to balance
 * storage granularity with sync efficiency. Shorter segments increase
 * metadata overhead; longer segments risk larger data loss on failure.
 */
export interface ECGSegment {
  id: string;
  patientId: string;
  deviceId: string;

  /** Raw sample values in mV, ordered chronologically */
  samples: number[];

  /** Sampling rate in Hz (typically 250 for single-lead Holter) */
  sampleRate: number;

  /** Lead identifier (e.g., "II" for standard Lead II) */
  lead: ECGLead;

  /** Unix timestamp (ms) of the first sample in this segment */
  startTime: number;

  /** Unix timestamp (ms) of the last sample in this segment */
  endTime: number;

  /** Duration in seconds */
  duration: number;

  /** Signal quality metric (0.0 = unusable, 1.0 = perfect) */
  signalQuality: number;

  /** Whether this segment has been uploaded to the backend */
  synced: boolean;

  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * Supported ECG leads.
 * Phase 1 targets single-lead (Lead II) which is standard for
 * arrhythmia detection in Holter monitors.
 */
export type ECGLead = 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF';

/**
 * Real-time streaming state for the ECG monitor view.
 */
export interface ECGStreamState {
  /** Whether data is actively flowing from the device */
  isStreaming: boolean;

  /** Current samples in the display buffer */
  displayBuffer: number[];

  /** Currently calculated heart rate in BPM */
  currentBPM: number | null;

  /** Signal quality of the current stream (0.0 - 1.0) */
  signalQuality: number;

  /** Number of samples received since stream start */
  totalSamplesReceived: number;

  /** Time (ms) when the current stream started */
  streamStartTime: number | null;

  /**
   * Monotonic counter that increments each time the display buffer is updated.
   * Used to signal re-renders without copying the buffer into React state.
   */
  bufferVersion?: number;
}

/**
 * Configuration for ECG display rendering.
 * Maps to standard clinical ECG paper conventions.
 */
export interface ECGDisplayConfig {
  /** Paper speed in mm/s (standard: 25) */
  paperSpeed: 25 | 50;

  /** Amplitude scale in mm/mV (standard: 10) */
  amplitudeScale: 10 | 20;

  /** Seconds of data visible on screen */
  visibleDuration: number;

  /** Whether to show grid lines */
  showGrid: boolean;

  /** Trace color */
  traceColor: string;
}

/**
 * Metadata for a complete recording session.
 * A session spans from device connection to disconnection,
 * and contains multiple segments.
 */
export interface RecordingSession {
  id: string;
  patientId: string;
  deviceId: string;
  startTime: string;
  endTime: string | null;
  totalDurationSeconds: number;
  segmentCount: number;
  averageBPM: number | null;
  eventCount: number;
  status: 'recording' | 'paused' | 'completed' | 'interrupted';
}
