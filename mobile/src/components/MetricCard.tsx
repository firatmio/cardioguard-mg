// =============================================================================
// Component: MetricCard
// =============================================================================
// Generic card for displaying a single health metric on the dashboard.
// Used for: avg BPM, recording hours, anomaly count, etc.
// =============================================================================

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
} from "../constants/theme";

interface MetricCardProps {
  /** Metric label (e.g., "Avg Heart Rate") */
  label: string;

  /** Primary value to display */
  value: string;

  /** Unit or suffix (e.g., "BPM", "hours") */
  unit?: string;

  /** Optional icon — accepts a Lucide icon element or any React node */
  icon?: React.ReactNode;

  /** Accent color for the value */
  valueColor?: string;

  /** Compact mode for grid layout */
  compact?: boolean;
}

export default function MetricCard({
  label,
  value,
  unit,
  icon,
  valueColor = colors.textPrimary,
  compact = false,
}: MetricCardProps) {
  return (
    <View style={[styles.container, shadows.sm, compact && styles.compact]}>
      {icon && <View style={styles.icon}>{icon}</View>}

      <Text
        style={[
          compact ? styles.valueCompact : styles.value,
          { color: valueColor },
        ]}
      >
        {value}
        {unit && <Text style={styles.unit}> {unit}</Text>}
      </Text>

      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 14,
    height: 120,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  compact: {
    padding: 12,
  },
  icon: {
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  valueCompact: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  unit: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    color: colors.textTertiary,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.2,
  },
});
