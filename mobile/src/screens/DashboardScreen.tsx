// =============================================================================
// Screen: Dashboard
// =============================================================================
// The patient's home screen. Provides an at-a-glance overview of:
//   - Current heart rate (large, prominent)
//   - Device connection status
//   - Sync status
//   - Key daily metrics (avg BPM, recording hours, anomaly count)
//   - Recent alerts
//
// Designed for quick comprehension — patient should understand their
// current status within 2 seconds of looking at this screen.
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Search,
  CheckCircle,
  Stethoscope,
  UserCircle,
} from 'lucide-react-native';
import { useDevice } from '../context/DeviceContext';
import { usePatient } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import HeartRateDisplay from '../components/HeartRateDisplay';
import DeviceStatusBadge from '../components/DeviceStatusBadge';
import SyncStatusBar from '../components/SyncStatusBar';
import MetricCard from '../components/MetricCard';
import AlertCard from '../components/AlertCard';
import LocalDatabase from '../services/storage/LocalDatabase';
import type { ClinicalEvent } from '../types';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
  riskLevelColors,
} from '../constants/theme';

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { deviceState } = useDevice();
  const { status, profile, refreshStatus } = usePatient();
  const { patientData } = useAuth();
  const sync = useOfflineSync();

  const [recentEvents, setRecentEvents] = useState<ClinicalEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load recent events from local DB
  useEffect(() => {
    loadRecentEvents();
  }, []);

  const loadRecentEvents = async () => {
    try {
      const db = LocalDatabase.getInstance();
      // We need a patientId — for now use a placeholder
      // In production, this comes from PatientContext
      const events = await db.getRecentEvents('current-patient', 5);
      setRecentEvents(events);
    } catch (err) {
      console.warn('[Dashboard] Failed to load events:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refreshStatus(), loadRecentEvents()]);
    setIsRefreshing(false);
  }, [refreshStatus]);

  const riskColor = status?.riskLevel
    ? riskLevelColors[status.riskLevel]
    : colors.textTertiary;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Sync status bar at top */}
      <SyncStatusBar
        status={sync.syncStatus}
        pendingCount={sync.pendingCount}
        isOnline={sync.isOnline}
        onSyncPress={sync.triggerSync}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with device status */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>CardioGuard</Text>
            <Text style={styles.subtitle}>
              {patientData
                ? `Merhaba, ${patientData.firstName}`
                : 'Kalp monitörü paneliniz'}
            </Text>
          </View>
          <DeviceStatusBadge
            connectionState={deviceState.connectionState}
            batteryLevel={deviceState.batteryLevel}
            deviceName={deviceState.connectedDevice?.name}
            onPress={() => navigation.navigate('Device')}
          />
        </View>

        {/* Doctor info card — if linked to a doctor */}
        {profile?.doctorId ? (
          <View style={styles.doctorCard}>
            <View style={styles.doctorAvatar}>
              {profile.doctorPhotoUrl ? (
                <Image
                  source={{ uri: profile.doctorPhotoUrl }}
                  style={styles.doctorAvatarImage}
                />
              ) : (
                <Stethoscope size={20} color={colors.primary} />
              )}
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorLabel}>Doktorunuz</Text>
              <Text style={styles.doctorName}>
                {profile.doctorName || 'Doktorunuz'}
              </Text>
            </View>
            <View style={styles.doctorBadge}>
              <Text style={styles.doctorBadgeText}>Bağlı</Text>
            </View>
          </View>
        ) : (
          <View style={styles.noDoctorCard}>
            <UserCircle size={20} color={colors.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noDoctorText}>Henüz bir doktora bağlı değilsiniz</Text>
              <Text style={styles.noDoctorHint}>
                Doktorunuz sizi sisteme eklediğinde burada bilgileri görünecek.
              </Text>
            </View>
          </View>
        )}

        {/* Status summary card */}
        {status && (
          <View style={[styles.statusCard, { borderLeftColor: riskColor }]}>
            <View style={[styles.statusDot, { backgroundColor: riskColor }]} />
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>
                {status.riskLevel === 'normal'
                  ? 'Everything looks good'
                  : status.riskLevel === 'attention'
                  ? 'Something to keep an eye on'
                  : 'Please check alerts below'}
              </Text>
              <Text style={styles.statusSummary}>{status.summary}</Text>
            </View>
          </View>
        )}

        {/* Heart rate display */}
        <HeartRateDisplay
          bpm={deviceState.isRecording ? (deviceState.currentBPM ?? null) : (status?.avgBPM24h ?? null)}
          isLive={deviceState.isRecording}
          label={
            deviceState.isRecording
              ? 'Live Heart Rate'
              : '24-Hour Average'
          }
        />

        {/* Daily metrics grid */}
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Min BPM"
            value={status?.minBPM24h != null ? String(Math.round(status.minBPM24h)) : '--'}
            icon={<TrendingDown size={18} color={colors.primary} />}
            compact
          />
          <MetricCard
            label="Max BPM"
            value={status?.maxBPM24h != null ? String(Math.round(status.maxBPM24h)) : '--'}
            icon={<TrendingUp size={18} color={colors.primary} />}
            compact
          />
          <MetricCard
            label="Recording"
            value={status?.recordingHoursToday != null ? `${status.recordingHoursToday.toFixed(1)}h` : '--'}
            icon={<Clock size={18} color={colors.primary} />}
            compact
          />
          <MetricCard
            label="Anomalies"
            value={String(status?.anomaliesToday ?? 0)}
            icon={<Search size={18} color={(status?.anomaliesToday ?? 0) > 0 ? colors.warning : colors.success} />}
            valueColor={
              (status?.anomaliesToday ?? 0) > 0 ? colors.warning : colors.success
            }
            compact
          />
        </View>

        {/* Recent alerts */}
        {recentEvents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            {recentEvents.map((event) => (
              <AlertCard
                key={event.id}
                event={event}
                onPress={() =>
                  navigation.navigate('History', { eventId: event.id })
                }
              />
            ))}
          </>
        )}

        {/* Empty state */}
        {recentEvents.length === 0 && (
          <View style={styles.emptyAlerts}>
            <CheckCircle size={32} color={colors.success} />
            <Text style={styles.emptyText}>No recent alerts</Text>
            <Text style={styles.emptySubtext}>
              {deviceState.connectionState === 'connected'
                ? 'Your heart rhythm is being monitored'
                : 'Connect your device to start monitoring'}
            </Text>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  statusSummary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyAlerts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    gap: 6,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  doctorAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.3,
  },
  doctorName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    marginTop: 1,
  },
  doctorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#DCFCE7',
  },
  doctorBadgeText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  noDoctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  noDoctorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  noDoctorHint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
    lineHeight: 16,
  },
});
