// =============================================================================
// ECG Data Parser
// =============================================================================
// Converts raw BLE byte arrays from the Holter device into typed ECG samples.
// This module is intentionally device-protocol-specific and should be updated
// if the device firmware changes its packet format.
// =============================================================================

import { ECG_CONFIG } from '../../constants/config';
import type { RawECGPacket } from '../../types';

/** Header size in bytes: 2 (seq) + 2 (count) = 4 bytes */
const PACKET_HEADER_SIZE = 4;

/** Bytes per sample (int16 = 2 bytes) */
const BYTES_PER_SAMPLE = 2;

/**
 * Parse a raw BLE notification payload into a structured ECG packet.
 *
 * Expected binary format (little-endian):
 *   [0-1]  uint16  Packet sequence number
 *   [2-3]  uint16  Number of samples in this packet
 *   [4+]   int16[] Raw ADC values (one per sample)
 *
 * @param data - Raw bytes from BLE characteristic notification
 * @returns Parsed packet, or null if the data is malformed
 */
export function parseECGPacket(data: ArrayBuffer): RawECGPacket | null {
  if (!data || data.byteLength < PACKET_HEADER_SIZE) {
    console.warn(`[ECGParser] Packet too short or null: ${data?.byteLength ?? 0} bytes (need at least ${PACKET_HEADER_SIZE})`);
    return null;
  }

  try {
    const view = new DataView(data);
    const sequenceNumber = view.getUint16(0, true); // little-endian
    const sampleCount = view.getUint16(2, true);

    // Sanity check: sample count should be reasonable (1-100)
    if (sampleCount === 0 || sampleCount > 100) {
      console.warn(`[ECGParser] Unexpected sample count: ${sampleCount} (seq=${sequenceNumber}, size=${data.byteLength})`);
      return null;
    }

    const expectedSize = PACKET_HEADER_SIZE + sampleCount * BYTES_PER_SAMPLE;
    if (data.byteLength < expectedSize) {
      console.warn(
        `[ECGParser] Incomplete packet: expected ${expectedSize} bytes, got ${data.byteLength} (seq=${sequenceNumber}, samples=${sampleCount})`
      );
      return null;
    }

    const rawSamples = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      rawSamples[i] = view.getInt16(PACKET_HEADER_SIZE + i * BYTES_PER_SAMPLE, true);
    }

    return {
      sequenceNumber,
      sampleCount,
      rawSamples,
      receivedAt: Date.now(),
    };
  } catch (e) {
    console.error(`[ECGParser] Parse error:`, e);
    return null;
  }
}

/**
 * Convert raw ADC values to millivolts using the device calibration factor.
 *
 * @param rawSamples - Raw ADC int16 values
 * @returns Voltage values in millivolts
 */
export function adcToMillivolts(rawSamples: Int16Array): number[] {
  const result = new Array<number>(rawSamples.length);
  for (let i = 0; i < rawSamples.length; i++) {
    result[i] = rawSamples[i] * ECG_CONFIG.adcToMv;
  }
  return result;
}

/**
 * Estimate signal quality from a window of samples.
 *
 * Heuristic approach:
 * - Checks for flat-line (all zeros or constant value)
 * - Checks for excessive noise (high variance)
 * - Checks for saturation (values at ADC limits)
 *
 * Returns a value between 0.0 (unusable) and 1.0 (excellent).
 *
 * NOTE: This is a basic on-device heuristic for user feedback.
 * The backend performs more sophisticated signal quality analysis.
 */
export function estimateSignalQuality(samples: number[]): number {
  if (samples.length < 10) return 0;

  let quality = 1.0;

  // Check for flat-line (variance near zero)
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance =
    samples.reduce((sum, s) => sum + (s - mean) ** 2, 0) / samples.length;

  if (variance < 0.001) {
    // Flat line - likely electrode detached
    quality *= 0.1;
  }

  // Check for excessive noise (variance too high)
  const stdDev = Math.sqrt(variance);
  if (stdDev > 2.0) {
    // Very noisy signal - likely motion artifact
    quality *= 0.5;
  }

  // Check for saturation (values at ADC limits)
  const maxADC = (1 << (ECG_CONFIG.adcResolution - 1)) - 1;
  const minADC = -(1 << (ECG_CONFIG.adcResolution - 1));
  const saturatedCount = samples.filter(
    (s) => Math.abs(s) > maxADC * ECG_CONFIG.adcToMv * 0.95
  ).length;
  const saturationRatio = saturatedCount / samples.length;

  if (saturationRatio > 0.1) {
    quality *= 0.3;
  }

  return Math.max(0, Math.min(1, quality));
}

/**
 * Detect if a sequence gap occurred between two packets.
 * Useful for identifying data loss during BLE transmission.
 */
export function detectSequenceGap(
  prevSequence: number,
  currentSequence: number
): number {
  const expected = (prevSequence + 1) & 0xffff; // Wrap at uint16 max
  if (currentSequence === expected) return 0;

  // Calculate gap accounting for uint16 wraparound
  if (currentSequence > expected) {
    return currentSequence - expected;
  }
  return 0xffff - expected + currentSequence + 1;
}
