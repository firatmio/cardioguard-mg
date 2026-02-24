// =============================================================================
// BLE Simulator
// =============================================================================
// Generates realistic ECG waveform data for development and testing.
// Feeds simulated data through BLEManager's ECG data listeners, allowing
// the entire streaming pipeline (useECGStream → ECGMonitorScreen → ECGWaveform)
// to work without real BLE hardware.
//
// The simulator generates a clinically realistic ECG waveform with:
//   - P wave, QRS complex, T wave morphology
//   - Configurable heart rate (40-180 BPM)
//   - Optional noise injection for testing signal quality algorithms
//   - Heart rate variability (HRV) for realism
//
// Usage:
//   const sim = BLESimulator.getInstance();
//   sim.startSimulation();     // starts feeding data to BLEManager listeners
//   sim.stopSimulation();      // stops the simulation
//   sim.setHeartRate(80);      // change simulated BPM
//   sim.setNoiseLevel(0.05);   // add noise for testing
// =============================================================================

import BLEManager from './BLEManager';
import { ECG_CONFIG } from '../../constants/config';

/** Simulated heart rate range */
const DEFAULT_BPM = 72;
const MIN_BPM = 40;
const MAX_BPM = 180;

/** How often to emit simulated samples (ms) */
const EMIT_INTERVAL_MS = 40; // ~25 times per second

/** Number of samples per emission at 250 Hz */
const SAMPLES_PER_EMIT = Math.round(ECG_CONFIG.sampleRate * (EMIT_INTERVAL_MS / 1000));

class BLESimulator {
  private static instance: BLESimulator;

  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private sampleIndex = 0;
  private heartRate = DEFAULT_BPM;
  private noiseLevel = 0.02; // mV noise amplitude
  private hrvEnabled = true;
  private currentRRInterval: number; // samples between R-peaks
  private nextRPeakAt: number;

  private constructor() {
    this.currentRRInterval = this.bpmToSamples(this.heartRate);
    this.nextRPeakAt = this.currentRRInterval;
  }

  static getInstance(): BLESimulator {
    if (!BLESimulator.instance) {
      BLESimulator.instance = new BLESimulator();
    }
    return BLESimulator.instance;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start the ECG simulation.
   * Sets BLEManager state to "connected" with a virtual device and
   * begins emitting synthetic ECG data to all registered listeners.
   */
  startSimulation(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.sampleIndex = 0;
    this.nextRPeakAt = this.bpmToSamples(this.heartRate);

    // Update BLEManager state to appear connected
    const bleManager = BLEManager.getInstance();
    const state = bleManager.getState();

    // Directly update the state to simulate a connected device
    (bleManager as any).updateState({
      connectionState: 'connected',
      connectedDevice: {
        id: 'sim-device-001',
        name: 'CardioGuard SIM',
        rssi: -45,
        isPaired: true,
        firmwareVersion: 'SIM-1.0.0',
        batteryLevel: 95,
      },
      batteryLevel: 95,
      isRecording: true,
      error: null,
    });

    // Start emitting data
    this.intervalId = setInterval(() => {
      this.emitSamples();
    }, EMIT_INTERVAL_MS);

    console.log('[BLESimulator] Simulation started at', this.heartRate, 'BPM');
  }

  /**
   * Stop the ECG simulation and reset BLEManager state.
   */
  stopSimulation(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Reset BLEManager state
    const bleManager = BLEManager.getInstance();
    (bleManager as any).updateState({
      connectionState: 'disconnected',
      connectedDevice: null,
      batteryLevel: null,
      isRecording: false,
      lastDataReceivedAt: null,
      error: null,
    });

    console.log('[BLESimulator] Simulation stopped');
  }

  /**
   * Whether the simulator is currently running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Set the simulated heart rate (BPM).
   */
  setHeartRate(bpm: number): void {
    this.heartRate = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
    this.currentRRInterval = this.bpmToSamples(this.heartRate);
  }

  /**
   * Get the current simulated heart rate.
   */
  getHeartRate(): number {
    return this.heartRate;
  }

  /**
   * Set noise amplitude (mV). 0 = clean signal, 0.1 = noisy.
   */
  setNoiseLevel(level: number): void {
    this.noiseLevel = Math.max(0, Math.min(0.5, level));
  }

  /**
   * Enable/disable heart rate variability.
   */
  setHRVEnabled(enabled: boolean): void {
    this.hrvEnabled = enabled;
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Convert BPM to samples per beat at current sample rate.
   */
  private bpmToSamples(bpm: number): number {
    return Math.round((60 / bpm) * ECG_CONFIG.sampleRate);
  }

  /**
   * Emit a batch of simulated ECG samples to BLEManager listeners.
   */
  private emitSamples(): void {
    const samples: number[] = new Array(SAMPLES_PER_EMIT);
    const timestamp = Date.now();

    for (let i = 0; i < SAMPLES_PER_EMIT; i++) {
      samples[i] = this.generateSample(this.sampleIndex);
      this.sampleIndex++;

      // Check if we've reached the next R-peak
      if (this.sampleIndex >= this.nextRPeakAt) {
        // Apply HRV: vary the R-R interval by ±5%
        let rrInterval = this.bpmToSamples(this.heartRate);
        if (this.hrvEnabled) {
          const variation = (Math.random() - 0.5) * 0.1 * rrInterval;
          rrInterval = Math.round(rrInterval + variation);
        }
        this.currentRRInterval = rrInterval;
        this.nextRPeakAt = this.sampleIndex + rrInterval;
      }
    }

    // Emit to BLEManager's ECG data listeners
    const bleManager = BLEManager.getInstance();
    const listeners = (bleManager as any).ecgDataListeners as Set<(samples: number[], timestamp: number) => void>;

    if (listeners && listeners.size > 0) {
      for (const listener of listeners) {
        try {
          listener(samples, timestamp);
        } catch (e) {
          console.error('[BLESimulator] Listener error:', e);
        }
      }
    }

    // Update last data timestamp
    (bleManager as any).updateState({
      lastDataReceivedAt: timestamp,
    });
  }

  /**
   * Generate a single ECG sample (mV) at the given sample index.
   *
   * Models a simplified but realistic ECG morphology:
   *   - P wave: small positive deflection before QRS
   *   - QRS complex: sharp R-peak with Q and S deflections
   *   - T wave: broad positive-negative deflection after QRS
   *   - Baseline: isoelectric line between complexes
   */
  private generateSample(index: number): number {
    // Position within the current R-R interval (0 to 1)
    const posInBeat = this.getPositionInBeat(index);

    let value = 0;

    // P wave (centered at ~0.12 of the cycle, width ~0.08)
    value += this.gaussian(posInBeat, 0.12, 0.025) * 0.15;

    // Q wave (small negative deflection before R)
    value -= this.gaussian(posInBeat, 0.20, 0.008) * 0.1;

    // R peak (sharp positive peak)
    value += this.gaussian(posInBeat, 0.22, 0.010) * 1.2;

    // S wave (negative deflection after R)
    value -= this.gaussian(posInBeat, 0.24, 0.008) * 0.25;

    // T wave (broad positive wave)
    value += this.gaussian(posInBeat, 0.38, 0.040) * 0.3;

    // U wave (tiny, sometimes visible — adds realism)
    value += this.gaussian(posInBeat, 0.50, 0.025) * 0.03;

    // Add noise
    if (this.noiseLevel > 0) {
      value += (Math.random() - 0.5) * 2 * this.noiseLevel;
    }

    // Baseline wander (very slow sinusoidal drift)
    value += Math.sin(index / ECG_CONFIG.sampleRate * 0.3) * 0.02;

    return value;
  }

  /**
   * Get the fractional position (0-1) of a sample within the current beat.
   */
  private getPositionInBeat(index: number): number {
    const beatStart = this.nextRPeakAt - this.currentRRInterval;
    const posInBeat = ((index - beatStart) % this.currentRRInterval) / this.currentRRInterval;
    return posInBeat < 0 ? posInBeat + 1 : posInBeat;
  }

  /**
   * Gaussian function for modeling ECG wave components.
   */
  private gaussian(x: number, center: number, width: number): number {
    const diff = x - center;
    return Math.exp(-(diff * diff) / (2 * width * width));
  }
}

export default BLESimulator;
