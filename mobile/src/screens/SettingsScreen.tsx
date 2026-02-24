// =============================================================================
// Screen: Settings
// =============================================================================
// Patient settings and preferences:
//   - Notification preferences
//   - Data sync status overview
//   - Device info
//   - About / Legal
//   - Logout
//
// Design note: Settings are stored in AsyncStorage for non-sensitive items
// and SecureStore for sensitive data (tokens, PIN).
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stethoscope, LogOut } from 'lucide-react-native';
import { usePatient } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/firebase/auth';
import { useOfflineSync } from '../hooks/useOfflineSync';
import LocalDatabase from '../services/storage/LocalDatabase';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  shadows,
} from '../constants/theme';

const PREFS_KEY = 'notification_preferences';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePatient();
  const { user, patientData } = useAuth();
  const sync = useOfflineSync();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    loadPreferences();
    loadUnsyncedCount();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        setNotificationsEnabled(prefs.enabled === true);
        setSoundEnabled(prefs.soundEnabled === true);
      }
    } catch {
      // Use defaults
    }
  };

  const loadUnsyncedCount = async () => {
    try {
      const db = LocalDatabase.getInstance();
      const count = await db.getUnsyncedCount();
      setUnsyncedCount(count);
    } catch {
      // Non-fatal
    }
  };

  const savePreference = async (key: string, value: boolean) => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_KEY);
      const prefs = stored ? JSON.parse(stored) : {};
      prefs[key] = value;
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Non-fatal
    }
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Delete Local Data',
      'This will remove all locally stored ECG recordings that have already been uploaded. Unsynced data will be preserved. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = LocalDatabase.getInstance();
              const deleted = await db.pruneOldData(0); // Delete all synced
              Alert.alert('Done', `Removed ${deleted} synced segments.`);
              loadUnsyncedCount();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Profile section */}
        <Text style={styles.sectionTitle}>PROFILE</Text>
        <View style={[styles.card, shadows.sm]}>
          <SettingRow
            label="Full Name"
            value={
              patientData
                ? `${patientData.firstName} ${patientData.lastName}`
                : profile?.displayName ?? 'Not specified'
            }
          />
          <SettingRow
            label="Email"
            value={user?.email ?? '--'}
          />
          <SettingRow
            label="Patient ID"
            value={profile?.id ?? user?.uid?.slice(0, 8) ?? '--'}
          />
        </View>

        {/* Doctor section */}
        <Text style={styles.sectionTitle}>DOCTOR INFO</Text>
        <View style={[styles.card, shadows.sm]}>
          {profile?.doctorId ? (
            <>
              <View style={styles.doctorRow}>
                <View style={styles.doctorAvatar}>
                  {profile.doctorPhotoUrl ? (
                    <Image
                      source={{ uri: profile.doctorPhotoUrl }}
                      style={styles.doctorAvatarImg}
                    />
                  ) : (
                    <Stethoscope size={18} color={colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorName}>{profile.doctorName || 'Your Doctor'}</Text>
                  <Text style={styles.doctorSub}>Registered Doctor</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Status</Text>
              <Text style={[styles.settingValue, { color: colors.textTertiary }]}>
                Not assigned yet
              </Text>
            </View>
          )}
        </View>

        {/* Notification settings */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={[styles.card, shadows.sm]}>
          <SettingToggle
            label="Enable Notifications"
            description="Receive alerts about your heart rhythm"
            value={notificationsEnabled}
            onValueChange={(v) => {
              setNotificationsEnabled(v);
              savePreference('enabled', v);
            }}
          />
          <View style={styles.separator} />
          <SettingToggle
            label="Sound"
            description="Play sound for urgent alerts"
            value={soundEnabled}
            onValueChange={(v) => {
              setSoundEnabled(v);
              savePreference('soundEnabled', v);
            }}
          />
        </View>

        {/* Data section */}
        <Text style={styles.sectionTitle}>DATA</Text>
        <View style={[styles.card, shadows.sm]}>
          <SettingRow
            label="Sync Status"
            value={sync.isOnline ? 'Online' : 'Offline'}
            valueColor={sync.isOnline ? colors.success : colors.warning}
          />
          <View style={styles.separator} />
          <SettingRow
            label="Pending Uploads"
            value={`${sync.pendingCount} segments`}
          />
          <View style={styles.separator} />
          <SettingRow
            label="Unsynced Recordings"
            value={`${unsyncedCount} segments`}
          />
          <View style={styles.separator} />
          <TouchableOpacity style={styles.settingAction} onPress={handleDeleteData}>
            <Text style={styles.actionText}>Clear Synced Data</Text>
            <Text style={styles.actionSubtext}>
              Remove uploaded recordings from this device
            </Text>
          </TouchableOpacity>
        </View>

        {/* About section */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={[styles.card, shadows.sm]}>
          <SettingRow label="Version" value="1.0.0" />
          <View style={styles.separator} />
          <SettingRow label="Build" value="2026.02.06" />
        </View>

        {/* Logout button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: () => signOut(),
                },
              ],
            );
          }}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            CardioGuard is a monitoring tool and does not provide medical diagnosis.
            Always consult your healthcare provider for medical decisions.
            In case of emergency, call your local emergency number.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Setting Row Components
// ---------------------------------------------------------------------------

function SettingRow({
  label,
  value,
  valueColor = colors.textPrimary,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={[styles.settingValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function SettingToggle({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.toggleTextContainer}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textTertiary,
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 48,
  },
  settingLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  settingValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  settingDescription: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  settingAction: {
    paddingVertical: 14,
  },
  actionText: {
    fontSize: fontSize.md,
    color: colors.danger,
    fontWeight: fontWeight.medium,
  },
  actionSubtext: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  disclaimer: {
    marginTop: 32,
    paddingHorizontal: 8,
  },
  disclaimerText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  doctorAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  doctorName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  doctorSub: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.danger,
    marginTop: 24,
    gap: 8,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
  },
});
