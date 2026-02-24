// =============================================================================
// Component: RecordingCard
// =============================================================================
// Summary card for a past recording session in the History screen.
// Shows date, duration, BPM stats, and event count.
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { RecordingSession } from '../types';
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
} from '../constants/theme';
import { formatDate, formatTime, formatDuration, formatBPM } from '../utils/formatters';

interface RecordingCardProps {
  session: RecordingSession;
  onPress?: (session: RecordingSession) => void;
}

export default function RecordingCard({ session, onPress }: RecordingCardProps) {
  const statusConfig = getStatusConfig(session.status);

  return (
    <TouchableOpacity
      onPress={() => onPress?.(session)}
      activeOpacity={0.7}
      style={[styles.container, shadows.sm]}
    >
      {/* Top row: date and status */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.date}>{formatDate(session.startTime)}</Text>
          <Text style={styles.timeRange}>
            {formatTime(session.startTime)}
            {session.endTime ? ` – ${formatTime(session.endTime)}` : ' – ongoing'}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Metrics row */}
      <View style={styles.metricsRow}>
        <MetricItem label="Duration" value={formatDuration(session.totalDurationSeconds)} />
        <MetricItem
          label="Avg BPM"
          value={formatBPM(session.averageBPM)}
          valueColor={colors.primary}
        />
        <MetricItem label="Segments" value={String(session.segmentCount)} />
        <MetricItem
          label="Events"
          value={String(session.eventCount)}
          valueColor={session.eventCount > 0 ? colors.warning : colors.textPrimary}
        />
      </View>
    </TouchableOpacity>
  );
}

function MetricItem({
  label,
  value,
  valueColor = colors.textPrimary,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricItem}>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getStatusConfig(status: RecordingSession['status']): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'recording':
      return { label: 'Recording', color: '#DC2626', bgColor: '#FEE2E2' };
    case 'paused':
      return { label: 'Paused', color: '#D97706', bgColor: '#FEF3C7' };
    case 'completed':
      return { label: 'Completed', color: '#16A34A', bgColor: '#DCFCE7' };
    case 'interrupted':
      return { label: 'Interrupted', color: '#94A3B8', bgColor: '#F1F5F9' };
    default:
      return { label: status, color: colors.textSecondary, bgColor: colors.surfaceElevated };
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  date: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  timeRange: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
