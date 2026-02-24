// =============================================================================
// Component: ECGWaveform
// =============================================================================
// Renders ECG trace using SVG. Supports both real-time streaming and
// static review modes.
//
// Rendering approach:
//   - SVG Path element for the ECG trace (green line on light background)
//   - Grid lines matching standard ECG paper (200ms horizontal, 0.5mV vertical)
//   - Optimized for up to ~1250 sample points per frame
//
// Performance note:
//   For production at scale, consider migrating to react-native-skia
//   for hardware-accelerated rendering. SVG is adequate for single-lead
//   at 250Hz with 4-second display window.
// =============================================================================

import React, { useMemo, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../constants/theme';
import { ECG_CONFIG } from '../constants/config';

interface ECGWaveformProps {
  /** ECG sample values in millivolts */
  samples: readonly number[];

  /** Width of the component in pixels */
  width: number;

  /** Height of the component in pixels */
  height: number;

  /** Seconds of data visible on screen (default: 4) */
  visibleDuration?: number;

  /** Whether to show grid lines (default: true) */
  showGrid?: boolean;

  /** Trace line color */
  traceColor?: string;

  /** Whether the waveform is actively streaming */
  isLive?: boolean;
}

/**
 * ECG waveform visualization component.
 *
 * Standard ECG paper conventions:
 *   - Small grid: 1mm = 0.04s (horizontal), 0.1mV (vertical)
 *   - Large grid: 5mm = 0.2s (horizontal), 0.5mV (vertical)
 *   - At 25mm/s paper speed: 1 second = 25mm
 *
 * We map these to screen coordinates proportionally.
 */
export default memo(function ECGWaveform({
  samples,
  width,
  height,
  visibleDuration = 4,
  showGrid = true,
  traceColor = colors.ecgTrace,
  isLive = false,
}: ECGWaveformProps) {
  // How many samples fit in the visible window
  const visibleSamples = ECG_CONFIG.sampleRate * visibleDuration;

  // Downsample for SVG performance.
  // 1000 points on a ~350px-wide SVG is ~3 points/pixel — wasteful.
  // Use min-max bucketing: for each pixel, keep the min and max sample
  // so R-peaks and other features are preserved visually.
  const displaySamples = useMemo(() => {
    const raw = samples.length <= visibleSamples
      ? samples
      : samples.slice(samples.length - visibleSamples);

    // Target: at most 2 points per pixel (min+max per bucket)
    const maxBuckets = Math.ceil(width);
    if (raw.length <= maxBuckets * 2) return raw;

    const samplesPerBucket = raw.length / maxBuckets;
    const downsampled: number[] = [];

    for (let i = 0; i < maxBuckets; i++) {
      const start = Math.floor(i * samplesPerBucket);
      const end = Math.min(Math.floor((i + 1) * samplesPerBucket), raw.length);
      let min = raw[start];
      let max = raw[start];
      for (let j = start + 1; j < end; j++) {
        if (raw[j] < min) min = raw[j];
        if (raw[j] > max) max = raw[j];
      }
      // Push min first, then max — preserves peaks and valleys
      downsampled.push(min, max);
    }
    return downsampled;
  }, [samples, visibleSamples, width]);

  // Grid paths — combine all grid lines into two <Path> elements
  // instead of ~80 individual <Line> native views.
  // This reduces Fabric native view mount cost from ~80 to 2.
  const gridPaths = useMemo(() => {
    if (!showGrid) return { minorPath: '', majorPath: '' };

    const minorParts: string[] = [];
    const majorParts: string[] = [];

    // Vertical lines (time axis): major every 1s, minor every 0.2s
    const pixelsPerSecond = width / visibleDuration;

    for (let t = 0; t <= visibleDuration; t += 0.2) {
      const x = (t * pixelsPerSecond).toFixed(1);
      if (t % 1 < 0.01) {
        majorParts.push(`M${x} 0V${height}`);
      } else {
        minorParts.push(`M${x} 0V${height}`);
      }
    }

    // Horizontal lines (voltage axis): major every 0.5mV, minor every 0.1mV
    // Display range: -2mV to +2mV (4mV total)
    const voltageRange = 4; // mV total
    const pixelsPerMv = height / voltageRange;
    const centerY = height / 2;

    for (let v = -2; v <= 2; v += 0.1) {
      const y = centerY - v * pixelsPerMv;
      if (y >= 0 && y <= height) {
        const yStr = y.toFixed(1);
        if (Math.abs(v % 0.5) < 0.01) {
          majorParts.push(`M0 ${yStr}H${width}`);
        } else {
          minorParts.push(`M0 ${yStr}H${width}`);
        }
      }
    }

    return { minorPath: minorParts.join(''), majorPath: majorParts.join('') };
  }, [width, height, visibleDuration, showGrid]);

  // Build the SVG path for the ECG trace
  // Uses Array.join() instead of += string concatenation to avoid
  // O(n²) string allocation for 700+ path segments.
  const tracePath = useMemo(() => {
    if (displaySamples.length < 2) return '';

    const voltageRange = 4; // mV
    const pixelsPerMv = height / voltageRange;
    const centerY = height / 2;
    const xStep = width / Math.max(displaySamples.length - 1, 1);

    const parts = new Array<string>(displaySamples.length);

    for (let i = 0; i < displaySamples.length; i++) {
      const x = (i * xStep).toFixed(1);
      // Invert Y because SVG Y increases downward
      const y = centerY - displaySamples[i] * pixelsPerMv;
      // Clamp to viewport
      const clampedY = Math.max(0, Math.min(height, y)).toFixed(1);

      parts[i] = i === 0 ? `M ${x} ${clampedY}` : `L ${x} ${clampedY}`;
    }

    return parts.join(' ');
  }, [displaySamples, width, height]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Background */}
        <Rect x={0} y={0} width={width} height={height} fill={colors.ecgBackground} />

        {/* Grid lines — combined into single Path elements (~80 → 2 native views) */}
        {showGrid && gridPaths.minorPath.length > 0 && (
          <Path
            d={gridPaths.minorPath}
            fill="none"
            stroke={colors.ecgGrid}
            strokeWidth={0.5}
          />
        )}
        {showGrid && gridPaths.majorPath.length > 0 && (
          <Path
            d={gridPaths.majorPath}
            fill="none"
            stroke={colors.ecgGridMajor}
            strokeWidth={1}
          />
        )}

        {/* ECG trace */}
        {tracePath.length > 0 && (
          <Path
            d={tracePath}
            fill="none"
            stroke={traceColor}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>

      {/* Live indicator dot */}
      {isLive && displaySamples.length > 0 && (
        <View style={styles.liveDot} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.ecgBackground,
  },
  liveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
});
