// =============================================================================
// Component: AlertCard
// =============================================================================
// Displays a clinical event/alert in patient-friendly language.
// Color-coded by severity with clear, non-clinical descriptions.
//
// IMPORTANT: All text shown to patients uses simple language.
// Clinical terminology is intentionally avoided.
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Info, AlertTriangle, Bell, AlertOctagon, CheckCircle } from 'lucide-react-native';
import type { ClinicalEvent } from '../types';
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  severityColors,
} from '../constants/theme';
import { formatRelativeTime } from '../utils/formatters';

interface AlertCardProps {
  event: ClinicalEvent;
  onPress?: (event: ClinicalEvent) => void;
}

const SEVERITY_ICON_MAP: Record<string, React.ComponentType<any>> = {
  info: Info,
  warning: AlertTriangle,
  urgent: Bell,
  critical: AlertOctagon,
};

export default function AlertCard({ event, onPress }: AlertCardProps) {
  const severityColor = severityColors[event.severity] || colors.info;

  return (
    <TouchableOpacity
      onPress={() => onPress?.(event)}
      activeOpacity={0.7}
      style={[
        styles.container,
        shadows.sm,
        !event.isRead && styles.unread,
        { borderLeftColor: severityColor },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${event.severity} alert: ${event.title}`}
    >
      <View style={styles.header}>
        <View style={styles.icon}>
          {React.createElement(
            SEVERITY_ICON_MAP[event.severity] || Info,
            { size: 18, color: severityColor }
          )}
        </View>
        <View style={styles.headerText}>
          <Text
            style={[
              styles.title,
              !event.isRead && styles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          <Text style={styles.time}>
            {formatRelativeTime(event.occurredAt)}
          </Text>
        </View>

        {/* Unread indicator */}
        {!event.isRead && <View style={[styles.unreadDot, { backgroundColor: severityColor }]} />}
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {event.description}
      </Text>

      {/* Patient action recommendation */}
      {event.patientAction && (
        <View style={styles.actionContainer}>
          <Text style={styles.actionText}>{event.patientAction}</Text>
        </View>
      )}

      {/* Optional BPM/Duration info */}
      {(event.measuredBPM != null || event.durationSeconds != null) && (
        <View style={styles.metaRow}>
          {event.measuredBPM != null && (
            <Text style={styles.metaText}>
              {Math.round(event.measuredBPM)} BPM
            </Text>
          )}
          {event.durationSeconds != null && (
            <Text style={styles.metaText}>
              Duration: {event.durationSeconds}s
            </Text>
          )}
        </View>
      )}

      {event.doctorNotified && (
        <View style={styles.doctorNotifiedRow}>
          <CheckCircle size={12} color={colors.success} />
          <Text style={styles.doctorNotified}>
            Your doctor has been notified
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  unread: {
    backgroundColor: '#FAFBFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    width: 18,
    height: 18,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  titleUnread: {
    fontWeight: fontWeight.semibold,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  doctorNotifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  doctorNotified: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
});
