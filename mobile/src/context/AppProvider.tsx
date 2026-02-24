// =============================================================================
// Root App Provider
// =============================================================================
// Composes all context providers into a single wrapper.
// Initializes core services (database, notifications) on app startup.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { DeviceProvider } from './DeviceContext';
import { PatientProvider } from './PatientContext';
import { useAuth } from './AuthContext';
import LocalDatabase from '../services/storage/LocalDatabase';
import NotificationService from '../services/notifications/NotificationService';
import ApiClient from '../services/api/ApiClient';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { colors, fontSize } from '../constants/theme';

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    initializeServices();
  }, []);

  // ── FCM Token Registration ──────────────────────────────────────────────
  // Save push token to Firestore users/{uid} document.
  // The server side uses this token when sending FCM notifications.
  useEffect(() => {
    if (!isReady || !user) return;

    const registerFCMToken = async () => {
      try {
        const notifService = NotificationService.getInstance();
        const pushToken = notifService.getPushToken();
        if (!pushToken) return;

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          fcm_token: pushToken,
          fcm_token_updated_at: serverTimestamp(),
          platform: require('react-native').Platform.OS,
        });

        console.log('[AppProvider] FCM token registered for user:', user.uid);
      } catch (err) {
        // Non-fatal: token registration failure shouldn't crash the app
        console.warn('[AppProvider] FCM token registration failed:', err);
      }
    };

    registerFCMToken();
  }, [isReady, user]);

  async function initializeServices() {
    try {
      // Initialize core services in parallel where possible
      // Notification init may fail in Expo Go — don't block the app
      const [dbResult, tokenResult, notifResult] = await Promise.allSettled([
        LocalDatabase.getInstance().initialize(),
        ApiClient.getInstance().loadTokens(),
        NotificationService.getInstance().initialize(),
      ]);

      // DB is critical — if it fails, re-throw
      if (dbResult.status === 'rejected') {
        throw dbResult.reason;
      }

      // Log non-critical failures
      if (tokenResult.status === 'rejected') {
        console.warn('[AppProvider] Token load failed:', tokenResult.reason);
      }
      if (notifResult.status === 'rejected') {
        console.warn('[AppProvider] Notification init failed:', notifResult.reason);
      }

      setIsReady(true);
    } catch (error: any) {
      console.error('[AppProvider] Initialization failed:', error);
      setInitError(error.message || 'Failed to initialize app');
    }
  }

  if (initError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorText}>{initError}</Text>
        <Text style={styles.errorHint}>Please restart the app.</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Starting CardioGuard...</Text>
      </View>
    );
  }

  return (
    <PatientProvider>
      <DeviceProvider>{children}</DeviceProvider>
    </PatientProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: 8,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
