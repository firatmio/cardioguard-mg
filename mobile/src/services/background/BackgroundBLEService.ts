// =============================================================================
// Background BLE Service
// =============================================================================
// Manages foreground service notification on Android to keep BLE connection
// alive when the app is in the background. Android aggressively kills BLE
// connections and JS threads after ~30 seconds in background.
//
// Strategy:
// 1. Sticky notification acts as a pseudo-foreground-service indicator
// 2. Periodic watchdog checks BLE connection health and triggers reconnect
// 3. AppState monitoring adjusts behavior for foreground/background
// 4. Keeps track of lastDataReceived to detect stale connections
//
// iOS: Background BLE is handled by UIBackgroundModes in app.json.
// =============================================================================

import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import BLEManager from '../ble/BLEManager';

const CHANNEL_ID = 'ecg-recording';
const NOTIFICATION_ID = 'ecg-foreground-service';

// Watchdog checks BLE health every 10 seconds
const WATCHDOG_INTERVAL_MS = 10_000;

// Notification update interval (every 30s to save battery)
const NOTIFICATION_UPDATE_INTERVAL_MS = 30_000;

class BackgroundBLEService {
  private static instance: BackgroundBLEService;
  private isActive = false;
  private appStateSubscription: any = null;
  private notificationId: string | null = null;
  private watchdogInterval: ReturnType<typeof setInterval> | null = null;
  private notificationUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private lastDataReceivedAt: number = 0;
  private stateListenerUnsubscribe: (() => void) | null = null;

  // Track the device ID for reconnection
  private connectedDeviceId: string | null = null;

  private constructor() {}

  static getInstance(): BackgroundBLEService {
    if (!BackgroundBLEService.instance) {
      BackgroundBLEService.instance = new BackgroundBLEService();
    }
    return BackgroundBLEService.instance;
  }

  /**
   * Initialize the background service.
   * Sets up notification channel and handlers.
   */
  async initialize(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'ECG Recording',
        description: 'Shown while ECG recording continues in the background',
        importance: Notifications.AndroidImportance.LOW,
        sound: undefined,
        vibrationPattern: [0],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: false,
      });
    }

    // Suppress alerts for our own foreground-service notification
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const channelId = notification.request.content.data?.channelId;
        if (channelId === CHANNEL_ID) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: false,
            shouldShowList: false,
          };
        }
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });

    console.log('[BackgroundBLE] Initialized');
  }

  /**
   * Start background service: notification, watchdog, app-state listener.
   */
  async start(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;

    // Save connected device ID for watchdog reconnect
    const ble = BLEManager.getInstance();
    const state = ble.getState();
    this.connectedDeviceId = state.connectedDevice?.id ?? null;
    this.lastDataReceivedAt = Date.now();

    // Listen for BLE state changes to track data freshness
    this.stateListenerUnsubscribe = ble.onStateChange((newState) => {
      if (newState.lastDataReceivedAt) {
        this.lastDataReceivedAt = newState.lastDataReceivedAt;
      }
      // Track device ID even through reconnections
      if (newState.connectedDevice?.id) {
        this.connectedDeviceId = newState.connectedDevice.id;
      }
    });

    // App state listener
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );

    // Show persistent notification
    if (Platform.OS === 'android') {
      await this.showForegroundNotification();
    }

    // Start connection watchdog
    this.startWatchdog();

    // Periodic notification updates (battery %, status, etc.)
    this.startNotificationUpdater();

    console.log('[BackgroundBLE] Service started');
  }

  /**
   * Stop background service: clean up all intervals, listeners, notifications.
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;
    this.isActive = false;

    this.stopWatchdog();
    this.stopNotificationUpdater();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.stateListenerUnsubscribe) {
      this.stateListenerUnsubscribe();
      this.stateListenerUnsubscribe = null;
    }

    this.connectedDeviceId = null;

    await this.dismissForegroundNotification();
    console.log('[BackgroundBLE] Service stopped');
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  // ---------------------------------------------------------------------------
  // Watchdog — monitors BLE connection health
  // ---------------------------------------------------------------------------

  private startWatchdog(): void {
    this.stopWatchdog();

    this.watchdogInterval = setInterval(async () => {
      if (!this.isActive) return;

      const ble = BLEManager.getInstance();
      const state = ble.getState();

      if (state.connectionState === 'connected') {
        // Check if data is still flowing
        const timeSinceData = Date.now() - this.lastDataReceivedAt;

        if (timeSinceData > 30_000) {
          console.warn(
            `[BackgroundBLE] Watchdog: No data for ${Math.round(timeSinceData / 1000)}s — checking connection...`,
          );

          try {
            const connectedDevice = state.connectedDevice as any;
            if (connectedDevice) {
              const isConnected = await connectedDevice.isConnected();
              if (!isConnected) {
                console.warn('[BackgroundBLE] Watchdog: Device reports disconnected — BLEManager auto-reconnect will handle it');
                // Do NOT call ble.connect() here — let BLEManager's
                // disconnect handler and attemptReconnect() handle it.
                // Calling connect() from multiple places causes race conditions
                // and connection thrashing that leads to crashes.
              }
            }
          } catch (e: any) {
            console.warn('[BackgroundBLE] Watchdog: Connection check failed:', e?.message);
          }
        }
      } else if (
        state.connectionState === 'disconnected' &&
        this.connectedDeviceId
      ) {
        // Device disconnected and BLEManager's auto-reconnect has given up
        // (state is 'disconnected' not 'connecting' or 'error').
        // Only attempt reconnect if BLEManager is NOT already reconnecting.
        if (!ble.getIsReconnecting()) {
          console.log('[BackgroundBLE] Watchdog: BLEManager reconnect exhausted, attempting background reconnect...');
          try {
            await ble.connect(this.connectedDeviceId);
          } catch (e: any) {
            // Catch ALL errors including NullPointerException from
            // react-native-ble-plx cancelTransaction during reconnect.
            // This prevents the watchdog from crashing the app.
            console.warn('[BackgroundBLE] Watchdog: Background reconnect failed (non-fatal):', e?.message);
          }
        } else {
          console.log('[BackgroundBLE] Watchdog: BLEManager is already reconnecting, skipping...');
        }
      } else if (state.connectionState === 'connecting') {
        // BLEManager is actively reconnecting — do nothing
        console.log('[BackgroundBLE] Watchdog: BLEManager is connecting, waiting...');
      } else if (state.connectionState === 'error' && this.connectedDeviceId) {
        // BLEManager ended in error state (max reconnects reached).
        // Don't aggressively retry — let user manually reconnect to avoid
        // infinite crash loops from stale device references.
        console.log('[BackgroundBLE] Watchdog: BLEManager in error state, waiting for manual reconnect');
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  private stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Notification updater — keeps notification content fresh
  // ---------------------------------------------------------------------------

  private startNotificationUpdater(): void {
    this.stopNotificationUpdater();

    this.notificationUpdateInterval = setInterval(() => {
      if (!this.isActive) return;
      this.showForegroundNotification().catch(() => {});
    }, NOTIFICATION_UPDATE_INTERVAL_MS);
  }

  private stopNotificationUpdater(): void {
    if (this.notificationUpdateInterval) {
      clearInterval(this.notificationUpdateInterval);
      this.notificationUpdateInterval = null;
    }
  }

  // ---------------------------------------------------------------------------
  // App state handling
  // ---------------------------------------------------------------------------

  private handleAppStateChange(nextState: AppStateStatus): void {
    if (!this.isActive) return;

    if (nextState === 'background' || nextState === 'inactive') {
      console.log('[BackgroundBLE] App went to background — watchdog active');
      // Re-show notification to ensure it's sticky
      if (Platform.OS === 'android') {
        this.showForegroundNotification().catch(() => {});
      }
    } else if (nextState === 'active') {
      console.log('[BackgroundBLE] App returned to foreground');

      // Check if BLE connection survived background
      const ble = BLEManager.getInstance();
      const state = ble.getState();
      if (state.connectionState !== 'connected' && this.connectedDeviceId) {
        // Only attempt reconnect if BLEManager is NOT already handling it.
        // Competing reconnect attempts from multiple places cause
        // connection thrashing and app crashes.
        if (!ble.getIsReconnecting() && state.connectionState !== 'connecting') {
          console.log('[BackgroundBLE] Connection lost during background — triggering reconnect...');
          ble.connect(this.connectedDeviceId).catch((e) => {
            console.warn('[BackgroundBLE] Foreground reconnect failed:', e?.message);
          });
        } else {
          console.log('[BackgroundBLE] BLEManager is already reconnecting — skipping foreground reconnect');
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Notification management
  // ---------------------------------------------------------------------------

  private async showForegroundNotification(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const ble = BLEManager.getInstance();
      const state = ble.getState();

      const deviceName = state.connectedDevice?.name ?? 'ECG Device';
      const battery = state.batteryLevel != null ? `Battery: ${state.batteryLevel}%` : '';
      const status =
        state.connectionState === 'connected'
          ? '🟢 Connected'
          : state.connectionState === 'connecting'
            ? '🟡 Connecting...'
            : '🔴 Disconnected';

      const bodyParts = [status, deviceName, battery].filter(Boolean);

      this.notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '❤️ CardioGuard ECG Recording',
          body: bodyParts.join(' • '),
          data: { channelId: CHANNEL_ID, type: 'foreground-service' },
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.LOW,
        },
        trigger: null,
        identifier: NOTIFICATION_ID,
      });
    } catch (error) {
      console.warn('[BackgroundBLE] Notification error:', error);
    }
  }

  private async dismissForegroundNotification(): Promise<void> {
    try {
      await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
      this.notificationId = null;
    } catch {
      // Already dismissed
    }
  }
}

export default BackgroundBLEService;
