// =============================================================================
// Component: HeartRateDisplay
// =============================================================================
// Large, prominent BPM display for the dashboard.
// Shows current heart rate with a pulsing animation indicator.
// Designed for quick glanceability — the most important metric.
// =============================================================================

import React, { useEffect, useRef, useState, memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors, fontSize, fontWeight, shadows } from '../constants/theme';
import { formatBPM } from '../utils/formatters';

interface HeartRateDisplayProps {
  /** Current BPM value, null if unavailable */
  bpm: number | null;

  /** Whether the device is actively streaming data */
  isLive: boolean;

  /** Optional label below the BPM */
  label?: string;
}

/**
 * HeartRateDisplay — wrapped in React.memo to prevent unnecessary re-renders
 * from parent state changes that don't affect this component's props.
 */
const HeartRateDisplay = memo(function HeartRateDisplay({
  bpm,
  isLive,
  label = 'Current Heart Rate',
}: HeartRateDisplayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Only restart animation when BPM changes by >= 5 beats.
  // Restarting on every 1-BPM fluctuation (e.g. 72→73→72) creates/destroys
  // native animations too frequently, contributing to JS thread exhaustion.
  const stableAnimBPM = useRef<number | null>(bpm);
  const [animBPM, setAnimBPM] = useState<number | null>(bpm);

  useEffect(() => {
    if (bpm == null) {
      stableAnimBPM.current = null;
      setAnimBPM(null);
      return;
    }
    if (stableAnimBPM.current == null || Math.abs(bpm - stableAnimBPM.current) >= 5) {
      stableAnimBPM.current = bpm;
      setAnimBPM(bpm);
    }
  }, [bpm]);

  // Pulse animation when live and BPM is available
  useEffect(() => {
    if (!isLive || animBPM == null) {
      pulseAnim.setValue(1);
      return;
    }

    // Pulse interval based on BPM (realistic heartbeat timing)
    const intervalMs = animBPM > 0 ? (60 / animBPM) * 1000 : 1000;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: intervalMs * 0.15,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: intervalMs * 0.85,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [isLive, animBPM]);

  const bpmColor = getBPMColor(bpm);

  return (
    <View style={[styles.container, shadows.md]}>
      {/* Heart icon centered with pulse animation */}
      <Animated.View
        style={[
          styles.heartIconContainer,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Heart size={24} color={bpmColor} fill={bpmColor} />
      </Animated.View>
      
      {/* BPM value row */}
      <View style={styles.bpmRow}>
        <Text style={[styles.bpmValue, { color: bpmColor }]}>
          {formatBPM(bpm)}
        </Text>
        <Text style={styles.bpmUnit}>BPM</Text>
      </View>


      <Text style={styles.label}>{label}</Text>

      {/* Live indicator */}
      {isLive && (
        <View style={styles.liveContainer}>
          <View style={[styles.liveDot, { backgroundColor: bpmColor }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
    </View>
  );
});

export default HeartRateDisplay;

/**
 * Get display color based on BPM range.
 * Normal resting: 60-100 BPM
 */
function getBPMColor(bpm: number | null): string {
  if (bpm == null) return colors.textTertiary;
  if (bpm < 50) return colors.danger;    // Severe bradycardia
  if (bpm < 60) return colors.warning;   // Mild bradycardia
  if (bpm <= 100) return colors.success;  // Normal range
  if (bpm <= 120) return colors.warning;  // Mild tachycardia
  return colors.danger;                    // Significant tachycardia
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  heartIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  bpmValue: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    lineHeight: 52,
    letterSpacing: -1,
  },
  bpmUnit: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginLeft: 6,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  liveText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
});
