// =============================================================================
// Screen: History
// =============================================================================
// Shows past recording sessions and clinical events.
// Patient can browse historical data, view event details, and review
// past ECG recordings.
//
// Data is loaded from local SQLite (offline-first).
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, CheckCircle } from 'lucide-react-native';
import RecordingCard from '../components/RecordingCard';
import AlertCard from '../components/AlertCard';
import LocalDatabase from '../services/storage/LocalDatabase';
import type { RecordingSession, ClinicalEvent } from '../types';
import { colors, fontSize, fontWeight, spacing, borderRadius } from '../constants/theme';

type Tab = 'recordings' | 'events';

export default function HistoryScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('recordings');
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // If navigated with an eventId, switch to events tab
  useEffect(() => {
    if (route?.params?.eventId) {
      setActiveTab('events');
    }
  }, [route?.params?.eventId]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const db = LocalDatabase.getInstance();
      const [sessionsData, eventsData] = await Promise.all([
        db.getRecordingSessions('current-patient', 30),
        db.getRecentEvents('current-patient', 50),
      ]);
      setSessions(sessionsData);
      setEvents(eventsData);
    } catch (err) {
      console.warn('[History] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, []);

  const handleEventPress = async (event: ClinicalEvent) => {
    // Mark as read
    if (!event.isRead) {
      try {
        const db = LocalDatabase.getInstance();
        await db.markEventRead(event.id);
        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, isRead: true } : e))
        );
      } catch (err) {
        console.warn('[History] Failed to mark event read:', err);
      }
    }

    // TODO: Navigate to event detail screen
  };

  const renderRecordingsEmpty = () => (
    <View style={styles.emptyState}>
      <ClipboardList size={40} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>No recordings yet</Text>
      <Text style={styles.emptySubtext}>
        Connect your device and start monitoring to see recordings here.
      </Text>
    </View>
  );

  const renderEventsEmpty = () => (
    <View style={styles.emptyState}>
      <CheckCircle size={40} color={colors.success} />
      <Text style={styles.emptyTitle}>No events</Text>
      <Text style={styles.emptySubtext}>
        When our system detects something noteworthy, it will appear here.
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Screen title */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recordings' && styles.activeTab]}
          onPress={() => setActiveTab('recordings')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'recordings' && styles.activeTabText,
            ]}
          >
            Recordings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.activeTab]}
          onPress={() => setActiveTab('events')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'events' && styles.activeTabText,
            ]}
          >
            Events
            {events.filter((e) => !e.isRead).length > 0 && (
              <Text style={styles.badge}>
                {' '}
                ({events.filter((e) => !e.isRead).length})
              </Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'recordings' ? (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecordingCard session={item} onPress={() => {}} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={isLoading ? null : renderRecordingsEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AlertCard event={item} onPress={handleEventPress} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={isLoading ? null : renderEventsEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.textOnPrimary,
  },
  badge: {
    fontWeight: fontWeight.bold,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
