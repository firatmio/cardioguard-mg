// =============================================================================
// Notification Service
// =============================================================================
// Handles local and push notifications for the patient app.
// - Local notifications: connection status, sync warnings
// - Push notifications: anomaly alerts from the backend
//
// IMPORTANT: Push notification tokens must be registered with the backend
// so the AI pipeline can send event notifications to the correct device.
// =============================================================================

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { NOTIFICATION_CONFIG } from '../../constants/config';
import type { ClinicalEvent, EventSeverity } from '../../types';

/**
 * Check if we're running inside Expo Go (not a dev build).
 * Some notification features are unavailable in Expo Go since SDK 53.
 */
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification behavior when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data;
      const severity = data?.severity as EventSeverity | undefined;

      return {
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: severity === 'urgent' || severity === 'critical',
        shouldSetBadge: true,
      };
    },
  });
} catch (error) {
  console.warn('[NotificationService] Could not set notification handler:', error);
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service: request permissions, set up channels,
   * and obtain push token.
   */
  async initialize(): Promise<void> {
    // Request permissions
    let finalStatus: string = 'undetermined';
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
    } catch (error) {
      console.warn('[NotificationService] Permission request failed (Expo Go?):', error);
      return;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Notification permissions not granted');
      return;
    }

    // Create Android notification channel
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync(
          NOTIFICATION_CONFIG.channelId,
          {
            name: NOTIFICATION_CONFIG.channelName,
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF0000',
            sound: 'default',
          }
        );
      } catch (error) {
        console.warn('[NotificationService] Could not create channel:', error);
      }
    }

    // Get push token for backend registration
    // Push tokens are NOT available in Expo Go since SDK 53 — skip gracefully
    if (isExpoGo) {
      console.info('[NotificationService] Running in Expo Go — push tokens unavailable. Use a dev build for full functionality.');
      return;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        ...(projectId ? { projectId } : {}),
      });
      this.expoPushToken = tokenData.data;
    } catch (error) {
      console.warn('[NotificationService] Could not get push token:', error);
    }
  }

  /**
   * Get the Expo push token for backend registration.
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Display a local notification for a clinical event.
   * Used when the app receives an event via API polling (not push).
   */
  async showEventNotification(event: ClinicalEvent): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: event.title,
        body: event.description,
        data: {
          eventId: event.id,
          severity: event.severity,
          type: 'event',
        },
        sound: event.severity === 'urgent' || event.severity === 'critical'
          ? 'default'
          : undefined,
        priority:
          event.severity === 'critical'
            ? Notifications.AndroidNotificationPriority.MAX
            : event.severity === 'urgent'
            ? Notifications.AndroidNotificationPriority.HIGH
            : Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Display a device connection status notification.
   */
  async showDeviceNotification(
    title: string,
    body: string,
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'device' },
      },
      trigger: null,
    });
  }

  /**
   * Display a sync warning notification.
   */
  async showSyncWarning(pendingCount: number): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Data Sync Pending',
        body: `${pendingCount} recording segments are waiting to be uploaded. Please connect to the internet.`,
        data: { type: 'sync_warning' },
      },
      trigger: null,
    });
  }

  /**
   * Set up listeners for notification interactions.
   * Returns cleanup function.
   */
  addNotificationResponseListener(
    handler: (eventId: string | undefined) => void,
  ): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        handler(data?.eventId as string | undefined);
      }
    );

    return () => subscription.remove();
  }

  /**
   * Clear all displayed notifications.
   */
  async clearAll(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get current badge count.
   */
  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count.
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export default NotificationService;
