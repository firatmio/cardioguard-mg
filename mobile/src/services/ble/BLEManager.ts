// =============================================================================
// BLE Device Manager
// =============================================================================
// Manages Bluetooth Low Energy communication with the Holter ECG device.
// Wraps react-native-ble-plx with ECG-specific logic including:
//   - Device discovery and filtering
//   - Connection lifecycle with auto-reconnect
//   - ECG data streaming via characteristic notifications
//   - Battery level monitoring
//
// IMPORTANT: BLE requires a development build (not Expo Go).
//            Use `npx expo run:android` or `npx expo run:ios`.
// =============================================================================

import Constants from 'expo-constants';
import { BLE_CONFIG } from '../../constants/config';
import type {
  DeviceConnectionState,
  ECGDevice,
  DeviceState,
} from '../../types';
import { parseECGPacket, adcToMillivolts, detectSequenceGap } from './ECGParser';
import { ECG_SERVICE_UUIDS } from '../../types/device';

/**
 * Check if running in Expo Go — BLE native modules are NOT available there.
 * A development build (npx expo run:android) is required for BLE.
 */
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Decode a base64-encoded string to a Uint8Array.
 * React Native does not have Node's Buffer, so we use atob.
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode a base64-encoded string to a UTF-8 string.
 */
function base64ToString(base64: string): string {
  return atob(base64);
}

// Type for event listeners
type ECGDataListener = (samples: number[], timestamp: number) => void;
type StateChangeListener = (state: DeviceState) => void;
type BatteryListener = (level: number) => void;

/**
 * Singleton BLE manager for ECG device communication.
 *
 * Usage:
 *   const ble = BLEManager.getInstance();
 *   ble.onECGData((samples, ts) => { ... });
 *   await ble.startScan();
 *   await ble.connect(deviceId);
 */
class BLEManager {
  private static instance: BLEManager;

  // BLE library instance (react-native-ble-plx)
  // Lazily initialized to avoid import errors in environments without native modules
  private bleManager: any = null;

  private state: DeviceState = {
    connectionState: 'disconnected',
    connectedDevice: null,
    batteryLevel: null,
    signalStrength: null,
    isRecording: false,
    lastDataReceivedAt: null,
    currentBPM: null,
    error: null,
  };

  private ecgDataListeners: Set<ECGDataListener> = new Set();
  private stateChangeListeners: Set<StateChangeListener> = new Set();
  private batteryListeners: Set<BatteryListener> = new Set();

  private lastSequenceNumber: number = -1;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isReconnecting: boolean = false;
  private scanSubscription: any = null;
  private ecgSubscription: any = null;
  private disconnectSubscription: any = null;
  private batteryInterval: ReturnType<typeof setInterval> | null = null;
  private batteryNotificationSubscription: any = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private batteryMonitoringDelayTimer: ReturnType<typeof setTimeout> | null = null;

  // ECG notification retry guard — prevents infinite retry stacking
  private ecgRetryAttempts: number = 0;
  private static readonly MAX_ECG_RETRY_ATTEMPTS = 5;

  // ECG state broadcast throttle — prevents 31 re-renders/sec on consumers
  private lastEcgStateBroadcastMs: number = 0;
  private ecgStateBroadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly ECG_STATE_BROADCAST_INTERVAL = 500; // 2 Hz max

  // R-peak detection for live BPM calculation
  private rPeakTimes: number[] = [];
  private lastPeakSampleIndex: number = 0;
  private totalSamplesForBPM: number = 0;

  // Store the connected device reference at class level
  // to prevent Android GC from killing the connection
  private connectedDeviceRef: any = null;

  // Initialization state tracking
  private initPromise: Promise<void> | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): BLEManager {
    if (!BLEManager.instance) {
      BLEManager.instance = new BLEManager();
    }
    return BLEManager.instance;
  }

  /**
   * Initialize the BLE manager. Must be called before any BLE operations.
   * Checks if Bluetooth is available and powered on.
   * Safe to call multiple times — deduplicates concurrent calls.
   */
  async initialize(): Promise<void> {
    // Already initialized
    if (this.isInitialized && this.bleManager) {
      console.log('[BLEManager] Already initialized');
      return;
    }

    // If init is already in progress, wait for it
    if (this.initPromise) {
      console.log('[BLEManager] Init already in progress, waiting...');
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _doInitialize(): Promise<void> {
    // BLE is NOT available in Expo Go — requires a dev build
    if (isExpoGo) {
      console.info(
        '[BLEManager] Running in Expo Go — BLE is unavailable. ' +
        'Use `npx expo run:android` or `npx expo run:ios` for full BLE functionality.'
      );
      this.updateState({
        connectionState: 'disconnected',
        error: 'BLE requires a development build (not Expo Go)',
      });
      return;
    }

    try {
      // Dynamic import to avoid crashes in environments without native BLE
      const { BleManager } = require('react-native-ble-plx');
      this.bleManager = new BleManager();
      console.log('[BLEManager] BleManager created, waiting for PoweredOn...');

      // Wait for BLE to be powered on
      await new Promise<void>((resolve, reject) => {
        const subscription = this.bleManager.onStateChange((bleState: string) => {
          console.log(`[BLEManager] BLE state: ${bleState}`);
          if (bleState === 'PoweredOn') {
            subscription.remove();
            this.isInitialized = true;
            console.log('[BLEManager] Initialized successfully — ready to scan');
            resolve();
          }
        }, true);

        // Timeout if Bluetooth doesn't activate
        setTimeout(() => {
          subscription.remove();
          reject(new Error('Bluetooth activation timeout. Please enable Bluetooth.'));
        }, 10_000);
      });
    } catch (error) {
      console.error('[BLEManager] Failed to initialize:', error);
      this.updateState({ connectionState: 'error', error: 'Bluetooth not available' });
      throw error;
    }
  }

  // Callback for real-time device discovery updates (fired as each device is found)
  private onDeviceDiscoveredCallback: ((device: ECGDevice) => void) | null = null;

  /**
   * Register a callback that fires each time a new device is discovered during scan.
   * This allows the UI to update in real-time instead of waiting for scan to complete.
   */
  onDeviceDiscovered(callback: ((device: ECGDevice) => void) | null): void {
    this.onDeviceDiscoveredCallback = callback;
  }

  /**
   * Scan for nearby ECG devices.
   * Filters by device name prefix defined in BLE_CONFIG.
   *
   * NOTE: Service UUID filter removed — on many Android devices/versions,
   * UUID-based scan filtering is unreliable. Instead we scan for ALL BLE
   * devices and filter by name prefix in the callback.
   *
   * @returns Promise that resolves with discovered devices.
   *          Rejects on timeout or BLE error.
   */
  async scanForDevices(): Promise<ECGDevice[]> {
    // Auto-initialize if not yet done
    if (!this.bleManager || !this.isInitialized) {
      console.log('[BLEManager] Not initialized yet — auto-initializing before scan...');
      await this.initialize();
    }

    if (!this.bleManager) {
      throw new Error(
        'Bluetooth is not available. Please turn on Bluetooth and try again. ' +
        '(Requires development build, not Expo Go)'
      );
    }

    // If already connected, do NOT overwrite connectionState to 'scanning'.
    // Only update UI-relevant scanning state — the connected state must be
    // preserved so BackgroundBLE watchdog doesn't misinterpret it as a
    // disconnect and trigger a reconnect cycle that crashes the app.
    if (this.state.connectionState !== 'connected' && this.state.connectionState !== 'connecting') {
      this.updateState({ connectionState: 'scanning', error: null });
    }
    const discovered: Map<string, ECGDevice> = new Map();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopScan();
        // Check CURRENT state at timeout time, not state from scan start.
        // The user may have connected to a device during the scan — if so,
        // we must NOT overwrite the 'connected' state to 'disconnected'.
        // That would trigger BackgroundBLE watchdog → reconnect → native
        // cancelTransaction → NullPointerException crash.
        const currentState = this.state.connectionState;
        if (currentState !== 'connected' && currentState !== 'connecting') {
          this.updateState({ connectionState: 'disconnected' });
        }
        console.log(`[BLEManager] Scan complete — ${discovered.size} device(s) found`);
        resolve(Array.from(discovered.values()));
      }, BLE_CONFIG.scanTimeout);

      // Scan ALL devices (null = no UUID filter) for maximum Android compatibility
      this.scanSubscription = this.bleManager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error: any, device: any) => {
          if (error) {
            clearTimeout(timeout);
            this.stopScan();
            console.error('[BLEManager] Scan error:', error.message);
            // Don't overwrite 'connected' state on scan error
            const currentState = this.state.connectionState;
            if (currentState !== 'connected' && currentState !== 'connecting') {
              this.updateState({ connectionState: 'error', error: error.message });
            }
            reject(error);
            return;
          }

          if (!device) return;

          // Debug: log all devices with a name (helps troubleshooting)
          if (device.name) {
            console.log(`[BLEManager] Found: "${device.name}" (${device.id}) RSSI=${device.rssi}`);
          }

          // Filter by name prefix — matches "CardioGuard-SIM", "CardioGuard-H1-xxx" etc.
          if (device.name?.startsWith(BLE_CONFIG.deviceNamePrefix)) {
            const ecgDevice: ECGDevice = {
              id: device.id,
              name: device.name || 'Unknown Device',
              rssi: device.rssi ?? -100,
              isPaired: false,
            };

            if (!discovered.has(device.id)) {
              console.log(`[BLEManager] ✓ CardioGuard device discovered: "${device.name}" (${device.id})`);
            }

            discovered.set(device.id, ecgDevice);

            // Notify real-time listener so UI updates immediately
            if (this.onDeviceDiscoveredCallback) {
              this.onDeviceDiscoveredCallback(ecgDevice);
            }
          }
        }
      );
    });
  }

  /**
   * Stop an active BLE scan.
   */
  stopScan(): void {
    if (this.bleManager) {
      this.bleManager.stopDeviceScan();
    }
    if (this.scanSubscription) {
      this.scanSubscription = null;
    }
  }

  /**
   * Connect to a specific ECG device by its BLE peripheral ID.
   * After connection, automatically starts ECG data streaming.
   */
  async connect(deviceId: string): Promise<void> {
    if (!this.bleManager) {
      throw new Error('BLE not initialized. Call initialize() first.');
    }

    // ── Guard: skip if already connected to this device ──────────────────
    // BackgroundBLE watchdog or scan-complete state glitches can trigger a
    // redundant connect() to an already-connected device.  Reconnecting
    // tears down the active ECG subscription via native cancelTransaction,
    // which triggers a NullPointerException in react-native-ble-plx and
    // crashes the app.
    if (
      this.state.connectionState === 'connected' &&
      (this.state.connectedDevice?.id === deviceId || this.connectedDeviceRef?.id === deviceId)
    ) {
      console.log('[BLEManager] Already connected to this device — skipping redundant connect()');
      return;
    }

    this.stopScan();

    // ── Defensive cleanup before connecting ──────────────────────────────
    // During auto-reconnect, the disconnect handler already cleaned up most
    // resources, but timers and stale subscriptions can survive. Clear them
    // here to prevent double-subscription and state corruption.
    //
    // IMPORTANT: Do NOT call ecgSubscription.remove()!
    // It calls native cancelTransaction() which triggers a NullPointerException
    // in react-native-ble-plx (SafePromise.reject with null error code).
    // This is a native crash that JS try-catch CANNOT intercept.
    // Instead, just null out the reference — the native subscription will die
    // naturally when the old connection drops or when a new monitoring
    // subscription is created for the same characteristic.
    if (this.ecgSubscription) {
      this.ecgSubscription = null;
    }
    if (this.ecgStateBroadcastTimer) {
      clearTimeout(this.ecgStateBroadcastTimer);
      this.ecgStateBroadcastTimer = null;
    }
    if (this.batteryMonitoringDelayTimer) {
      clearTimeout(this.batteryMonitoringDelayTimer);
      this.batteryMonitoringDelayTimer = null;
    }
    this.stopBatteryMonitoring();
    this.stopKeepAlive();

    this.updateState({ connectionState: 'connecting', error: null });

    try {
      // Connect with timeout for initial connection attempt.
      // IMPORTANT: autoConnect MUST be false.
      // autoConnect:true activates Android OS-level reconnection which
      // conflicts with our app-level attemptReconnect() — both try to
      // reconnect simultaneously, causing connection thrashing and the
      // "10s connect → disconnect → crash" pattern.
      const device = await this.bleManager.connectToDevice(deviceId, {
        timeout: BLE_CONFIG.connectionTimeout,
        autoConnect: false,
        requestMTU: 512,
      });

      // Discover services and characteristics
      await device.discoverAllServicesAndCharacteristics();
      console.log('[BLEManager] Services discovered');

      // Store device reference at class level to prevent GC from killing connection
      this.connectedDeviceRef = device;

      // Negotiate larger MTU — ESP32 sends 24-byte packets which exceed
      // the default 20-byte BLE payload. Without this, packets get dropped.
      try {
        const negotiatedMTU = await device.requestMTU(512);
        console.log(`[BLEManager] MTU negotiated: ${negotiatedMTU}`);
      } catch (mtuErr: any) {
        console.warn('[BLEManager] MTU negotiation failed (non-fatal):', mtuErr?.message);
      }

      // Delay to let BLE stack settle after service discovery + MTU change.
      // 500ms was too short for many Android devices — increased to 1500ms to
      // prevent truncated packets that cause parse failures and crashes.
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Read device info
      const deviceInfo = await this.readDeviceInfo(device);
      console.log('[BLEManager] Device info:', JSON.stringify(deviceInfo));

      this.updateState({
        connectionState: 'connected',
        connectedDevice: {
          id: device.id,
          name: device.name || 'ECG Device',
          rssi: device.rssi ?? -100,
          isPaired: true,
          firmwareVersion: deviceInfo.firmwareVersion,
          batteryLevel: deviceInfo.batteryLevel,
        },
        batteryLevel: deviceInfo.batteryLevel,
        error: null,
      });

      this.reconnectAttempts = 0;

      // Set up disconnection handler
      this.setupDisconnectionHandler(device);

      // Start ECG data streaming
      await this.startECGStream(device);

      // Delay battery monitoring by 3 seconds to avoid GATT queue collision.
      // Android BLE GATT queue is single-threaded — opening a second
      // monitorCharacteristicForService while ECG notifications are flowing
      // causes "GATT operation already in progress" crashes.
      this.batteryMonitoringDelayTimer = setTimeout(() => {
        this.batteryMonitoringDelayTimer = null;
        if (this.state.connectionState === 'connected') {
          this.startBatteryMonitoring(device);
        }
      }, 3000);

      // Start keep-alive: periodically read RSSI to keep connection active
      // Android aggressively kills idle BLE connections after ~30s
      this.startKeepAlive(device);

    } catch (error: any) {
      console.error('[BLEManager] Connection failed:', error);
      this.updateState({
        connectionState: 'error',
        error: `Connection failed: ${error.message}`,
      });
      throw error;
    }
  }

  /**
   * Disconnect from the current device.
   */
  async disconnect(): Promise<void> {
    this.clearReconnectTimer();
    this.stopBatteryMonitoring();
    this.stopKeepAlive();

    // Cancel pending battery monitoring delay timer
    if (this.batteryMonitoringDelayTimer) {
      clearTimeout(this.batteryMonitoringDelayTimer);
      this.batteryMonitoringDelayTimer = null;
    }

    // Remove disconnect listener to prevent auto-reconnect
    if (this.disconnectSubscription) {
      try { this.disconnectSubscription.remove(); } catch (_) {}
      this.disconnectSubscription = null;
    }

    // Do NOT call ecgSubscription.remove() — it triggers a native NPE crash
    // in react-native-ble-plx cancelTransaction. The cancelDeviceConnection()
    // call below will kill the BLE link, which naturally terminates the
    // native characteristic monitoring subscription.
    this.ecgSubscription = null;

    const deviceId = this.state.connectedDevice?.id || this.connectedDeviceRef?.id;
    if (deviceId && this.bleManager) {
      try {
        this.updateState({ connectionState: 'disconnecting' });
        await this.bleManager.cancelDeviceConnection(deviceId);
      } catch (error) {
        console.warn('[BLEManager] Disconnect error (non-fatal):', error);
      }
    }

    this.connectedDeviceRef = null;
    this.resetBPMState();

    this.updateState({
      connectionState: 'disconnected',
      connectedDevice: null,
      batteryLevel: null,
      signalStrength: null,
      isRecording: false,
      lastDataReceivedAt: null,
      currentBPM: null,
      error: null,
    });
  }

  // ---------------------------------------------------------------------------
  // Event Listeners
  // ---------------------------------------------------------------------------

  /**
   * Register a callback for incoming ECG data.
   * @returns Unsubscribe function
   */
  onECGData(listener: ECGDataListener): () => void {
    this.ecgDataListeners.add(listener);
    return () => this.ecgDataListeners.delete(listener);
  }

  /**
   * Register a callback for device state changes.
   * @returns Unsubscribe function
   */
  onStateChange(listener: StateChangeListener): () => void {
    this.stateChangeListeners.add(listener);
    // Immediately emit current state
    listener({ ...this.state });
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Register a callback for battery level updates.
   * @returns Unsubscribe function
   */
  onBatteryUpdate(listener: BatteryListener): () => void {
    this.batteryListeners.add(listener);
    return () => this.batteryListeners.delete(listener);
  }

  /**
   * Get the current device state (snapshot).
   */
  getState(): Readonly<DeviceState> {
    return { ...this.state };
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private async readDeviceInfo(device: any): Promise<{
    firmwareVersion?: string;
    batteryLevel?: number;
  }> {
    const result: { firmwareVersion?: string; batteryLevel?: number } = {};

    try {
      const batteryChar = await device.readCharacteristicForService(
        ECG_SERVICE_UUIDS.BATTERY_SERVICE,
        ECG_SERVICE_UUIDS.BATTERY_LEVEL_CHARACTERISTIC
      );
      if (batteryChar?.value) {
        // Battery level is a single uint8 (0-100)
        const bytes = base64ToBytes(batteryChar.value);
        result.batteryLevel = bytes[0];
      }
    } catch {
      console.warn('[BLEManager] Could not read battery level');
    }

    try {
      const fwChar = await device.readCharacteristicForService(
        ECG_SERVICE_UUIDS.DEVICE_INFO_SERVICE,
        ECG_SERVICE_UUIDS.FIRMWARE_VERSION_CHARACTERISTIC
      );
      if (fwChar?.value) {
        result.firmwareVersion = base64ToString(fwChar.value);
      }
    } catch {
      console.warn('[BLEManager] Could not read firmware version');
    }

    return result;
  }

  // Counter for debug logging (only log first N packets to avoid spam)
  private debugPacketCount: number = 0;
  private static readonly DEBUG_LOG_PACKETS = 10;

  private async startECGStream(device: any): Promise<void> {
    this.lastSequenceNumber = -1;
    this.debugPacketCount = 0;
    this.ecgRetryAttempts = 0;

    console.log('[BLEManager] Starting ECG stream...');
    console.log(`[BLEManager]   Service UUID: ${ECG_SERVICE_UUIDS.ECG_SERVICE}`);
    console.log(`[BLEManager]   Char UUID:    ${ECG_SERVICE_UUIDS.ECG_DATA_CHARACTERISTIC}`);
    console.log(`[BLEManager]   Listeners:    ${this.ecgDataListeners.size}`);

    // Verify characteristic exists and supports NOTIFY before subscribing
    try {
      const services = await device.services();
      console.log(`[BLEManager] Device has ${services.length} services`);
      for (const svc of services) {
        console.log(`[BLEManager]   Service: ${svc.uuid}`);
        const chars = await svc.characteristics();
        for (const ch of chars) {
          console.log(`[BLEManager]     Char: ${ch.uuid} (notify=${ch.isNotifiable}, read=${ch.isReadable}, write=${ch.isWritableWithResponse})`);
        }
      }
    } catch (e: any) {
      console.warn('[BLEManager] Could not enumerate services:', e?.message);
    }

    this.ecgSubscription = device.monitorCharacteristicForService(
      ECG_SERVICE_UUIDS.ECG_SERVICE,
      ECG_SERVICE_UUIDS.ECG_DATA_CHARACTERISTIC,
      (error: any, characteristic: any) => {
        if (error) {
          console.error('[BLEManager] ECG stream error:', error?.message || error);
          // If notification subscription failed, try to re-subscribe after delay
          if (error?.errorCode === 205 || error?.message?.includes('notify')) {
            // Guard against infinite retry stacking — max 5 attempts
            this.ecgRetryAttempts++;
            if (this.ecgRetryAttempts > BLEManager.MAX_ECG_RETRY_ATTEMPTS) {
              console.error(`[BLEManager] ECG subscription failed after ${BLEManager.MAX_ECG_RETRY_ATTEMPTS} retries — giving up`);
              this.updateState({
                error: 'ECG data stream could not be started. Please reconnect the device.',
              });
              return;
            }
            console.log(`[BLEManager] Retrying notification subscription in 1s... (attempt ${this.ecgRetryAttempts}/${BLEManager.MAX_ECG_RETRY_ATTEMPTS})`);
            // Clean up the current (failed) subscription reference.
            // Do NOT call ecgSubscription.remove() — triggers native NPE.
            // The subscription already errored out so the native side is
            // not actively monitoring; just null the JS reference.
            this.ecgSubscription = null;
            setTimeout(() => this.startECGStream(device), 1000);
          }
          return;
        }

        if (!characteristic?.value) {
          if (this.debugPacketCount < BLEManager.DEBUG_LOG_PACKETS) {
            console.warn('[BLEManager] Received notification with null value');
          }
          return;
        }

        // Decode base64 → Uint8Array
        const bytes = base64ToBytes(characteristic.value);

        // Debug: log first few raw packets
        if (this.debugPacketCount < BLEManager.DEBUG_LOG_PACKETS) {
          const hexStr = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log(`[BLEManager] ECG packet #${this.debugPacketCount} (${bytes.length} bytes): ${hexStr}`);
          this.debugPacketCount++;
          if (this.debugPacketCount === BLEManager.DEBUG_LOG_PACKETS) {
            console.log('[BLEManager] (further packet logs suppressed)');
          }
        }

        // Create a clean ArrayBuffer from the Uint8Array to avoid byteOffset issues
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const packet = parseECGPacket(buffer);

        if (!packet) {
          console.warn(`[BLEManager] Failed to parse ECG packet (${bytes.length} bytes)`);
          return;
        }

        // Detect packet loss
        if (this.lastSequenceNumber >= 0) {
          const gap = detectSequenceGap(this.lastSequenceNumber, packet.sequenceNumber);
          if (gap > 0) {
            console.warn(`[BLEManager] Packet loss: ${gap} packets missing (seq ${this.lastSequenceNumber} → ${packet.sequenceNumber})`);
          }
        }
        this.lastSequenceNumber = packet.sequenceNumber;

        // Convert to millivolts and emit
        const millivolts = adcToMillivolts(packet.rawSamples);
        const timestamp = packet.receivedAt;

        // Simple R-peak detection for live BPM
        const bpm = this.estimateBPMFromSamples(millivolts, timestamp);

        // Update internal state silently (for keep-alive checks etc.)
        this.state.lastDataReceivedAt = timestamp;
        this.state.isRecording = true;
        if (bpm !== null) this.state.currentBPM = bpm;

        // Throttle full state broadcast to ~2 Hz to prevent 31 re-renders/sec
        // on all DeviceContext consumers (Dashboard, ECGMonitor, etc.)
        const now = Date.now();
        if (now - this.lastEcgStateBroadcastMs >= BLEManager.ECG_STATE_BROADCAST_INTERVAL) {
          this.lastEcgStateBroadcastMs = now;
          if (this.ecgStateBroadcastTimer) {
            clearTimeout(this.ecgStateBroadcastTimer);
            this.ecgStateBroadcastTimer = null;
          }
          this.updateState({
            isRecording: true,
            lastDataReceivedAt: timestamp,
            ...(bpm !== null ? { currentBPM: bpm } : {}),
          });
        } else if (!this.ecgStateBroadcastTimer) {
          this.ecgStateBroadcastTimer = setTimeout(() => {
            this.ecgStateBroadcastTimer = null;
            this.lastEcgStateBroadcastMs = Date.now();
            this.updateState({
              isRecording: true,
              lastDataReceivedAt: this.state.lastDataReceivedAt,
              currentBPM: this.state.currentBPM,
            });
          }, BLEManager.ECG_STATE_BROADCAST_INTERVAL);
        }

        // Notify all listeners
        if (this.ecgDataListeners.size === 0 && this.debugPacketCount <= BLEManager.DEBUG_LOG_PACKETS && this.debugPacketCount > 0) {
          // Only warn once on the first packet, not every ~32ms
          if (this.debugPacketCount === 1) {
            console.warn('[BLEManager] No ECG data listeners registered yet — data is buffered internally but UI is not consuming it.');
          }
        }
        for (const listener of this.ecgDataListeners) {
          try {
            listener(millivolts, timestamp);
          } catch (e) {
            console.error('[BLEManager] ECG data listener error:', e);
          }
        }
      }
    );

    console.log('[BLEManager] ECG notification subscription set up — waiting for data...');
  }

  private setupDisconnectionHandler(device: any): void {
    // Remove previous disconnect listener to prevent stacking
    if (this.disconnectSubscription) {
      this.disconnectSubscription.remove();
      this.disconnectSubscription = null;
    }

    this.disconnectSubscription = this.bleManager.onDeviceDisconnected(
      device.id,
      (error: any, disconnectedDevice: any) => {
        console.warn('[BLEManager] Device disconnected:', error?.message);

        // Clean up ECG subscription reference.
        // Do NOT call ecgSubscription.remove() — it triggers a native NPE
        // crash via cancelTransaction in react-native-ble-plx.
        // The subscription is already dead because the device disconnected;
        // just null out the JS reference.
        this.ecgSubscription = null;

        // Cancel pending ECG state broadcast timer — otherwise it fires
        // AFTER disconnect and overwrites isRecording:false with isRecording:true,
        // corrupting the UI state and causing ghost "connected" indicators.
        if (this.ecgStateBroadcastTimer) {
          clearTimeout(this.ecgStateBroadcastTimer);
          this.ecgStateBroadcastTimer = null;
        }

        // Cancel pending battery monitoring delay timer — if disconnect
        // happens before the 3s delay fires, the timer would call
        // startBatteryMonitoring() with a stale device reference.
        if (this.batteryMonitoringDelayTimer) {
          clearTimeout(this.batteryMonitoringDelayTimer);
          this.batteryMonitoringDelayTimer = null;
        }

        this.stopBatteryMonitoring();
        this.stopKeepAlive();
        this.resetBPMState();

        // Save device ID before clearing state — use class-level ref as fallback
        const deviceId = this.state.connectedDevice?.id || this.connectedDeviceRef?.id;
        this.connectedDeviceRef = null;

        // During auto-reconnect, set state to 'connecting' not 'disconnected'
        // This prevents UI from flashing disconnected state
        const willReconnect = BLE_CONFIG.autoReconnect &&
          deviceId &&
          !this.isReconnecting &&
          this.reconnectAttempts < BLE_CONFIG.maxReconnectAttempts;

        this.updateState({
          connectionState: willReconnect ? 'connecting' : 'disconnected',
          connectedDevice: willReconnect ? this.state.connectedDevice : null,
          isRecording: false,
          lastDataReceivedAt: null,
          currentBPM: null,
          error: willReconnect ? 'Reconnecting...' : null,
        });

        // Auto-reconnect if enabled
        if (willReconnect && deviceId) {
          this.attemptReconnect(deviceId);
        }
      }
    );
  }

  private attemptReconnect(deviceId: string): void {
    if (this.isReconnecting) {
      console.log('[BLEManager] Reconnect already in progress, skipping');
      return;
    }

    if (this.reconnectAttempts >= BLE_CONFIG.maxReconnectAttempts) {
      console.warn('[BLEManager] Max reconnect attempts reached');
      this.isReconnecting = false;
      this.updateState({
        connectionState: 'error',
        error: 'Connection lost. Please reconnect manually.',
      });
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = BLE_CONFIG.reconnectDelay * this.reconnectAttempts;

    console.log(
      `[BLEManager] Reconnect attempt ${this.reconnectAttempts}/${BLE_CONFIG.maxReconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(deviceId);
        // Success — reset reconnect state
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        console.log('[BLEManager] Reconnect successful');
      } catch (error) {
        console.warn('[BLEManager] Reconnect failed:', (error as Error)?.message);
        this.isReconnecting = false;
        // Try again — the disconnect handler will check remaining attempts
        if (this.reconnectAttempts < BLE_CONFIG.maxReconnectAttempts) {
          this.attemptReconnect(deviceId);
        } else {
          this.updateState({
            connectionState: 'error',
            connectedDevice: null,
            error: 'Connection lost. Please reconnect manually.',
          });
        }
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
  }

  private startBatteryMonitoring(device: any): void {
    this.stopBatteryMonitoring();

    // !! IMPORTANT: Do NOT use monitorCharacteristicForService for battery !!
    // Running two concurrent BLE notification subscriptions (ECG + battery)
    // causes Android GATT queue collision:
    //   - ECG notifications fire every 32ms (31×/sec)
    //   - Adding a second monitor subscription saturates the single-threaded
    //     GATT queue, leading to "GATT operation already in progress" errors
    //   - This manifests as a clean disconnect after ~3-5 seconds
    // Solution: Use polling only (readCharacteristic) at a low frequency.
    // A single read every 60s is negligible vs the ECG notification stream.

    console.log('[BLEManager] Battery monitoring started (polling only — no notifications to avoid GATT collision)');

    // Initial read
    this.readBatteryLevel(device);

    // Poll every 60 seconds
    this.batteryInterval = setInterval(() => {
      this.readBatteryLevel(device);
    }, 60_000);
  }

  private async readBatteryLevel(device: any): Promise<void> {
    try {
      const dev = this.connectedDeviceRef || device;
      if (!dev || this.state.connectionState !== 'connected') return;

      const char = await dev.readCharacteristicForService(
        ECG_SERVICE_UUIDS.BATTERY_SERVICE,
        ECG_SERVICE_UUIDS.BATTERY_LEVEL_CHARACTERISTIC
      );
      if (char?.value) {
        const bytes = base64ToBytes(char.value);
        const level = bytes[0];
        this.updateState({ batteryLevel: level });
        for (const listener of this.batteryListeners) {
          listener(level);
        }
      }
    } catch {
      // Non-fatal: battery read can fail during heavy ECG data transfer
    }
  }

  private stopBatteryMonitoring(): void {
    if (this.batteryNotificationSubscription) {
      try { this.batteryNotificationSubscription.remove(); } catch (_) {}
      this.batteryNotificationSubscription = null;
    }
    if (this.batteryInterval) {
      clearInterval(this.batteryInterval);
      this.batteryInterval = null;
    }
  }

  /**
   * Keep-alive: monitors connection health using data freshness.
   *
   * Previous implementation used periodic readRSSI() calls every 15 seconds,
   * but this caused GATT queue collisions with the ECG notification stream
   * on Android, leading to spurious disconnection events at exactly ~15s.
   *
   * New approach:
   * - If ECG data is flowing (lastDataReceivedAt is recent), the connection
   *   is provably alive — no RSSI read needed.
   * - Only attempt RSSI read when NO data has arrived for 10+ seconds,
   *   which indicates a possible stale connection that needs prodding.
   * - Interval is 10s but RSSI read is skipped when data is fresh.
   */
  private startKeepAlive(device: any): void {
    this.stopKeepAlive();

    this.keepAliveInterval = setInterval(async () => {
      try {
        const dev = this.connectedDeviceRef || device;
        if (!dev) return;

        // If ECG data arrived recently, connection is alive — skip RSSI read
        // to avoid GATT queue collisions with the notification stream.
        const timeSinceData = this.state.lastDataReceivedAt
          ? Date.now() - this.state.lastDataReceivedAt
          : Infinity;

        if (timeSinceData < 10_000) {
          // Data is fresh — connection is healthy, no RSSI read needed
          return;
        }

        // No data for 10+ seconds — check if device is still connected
        const isConnected = await dev.isConnected();
        if (!isConnected) {
          console.warn('[BLEManager] Keep-alive: device no longer connected (no data for ' + Math.round(timeSinceData / 1000) + 's)');
          return;
        }

        // Connection is alive but no data flowing — read RSSI to keep it alive
        const rssi = await dev.readRSSI();
        if (rssi !== null && rssi !== undefined) {
          this.updateState({ signalStrength: rssi });
        }
      } catch (e: any) {
        // Non-fatal — just log it
        console.warn('[BLEManager] Keep-alive check failed:', e?.message);
      }
    }, 10_000); // Check every 10 seconds, but skip RSSI read when data is flowing
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Check if a reconnection attempt is currently in progress.
   * Used by BackgroundBLEService to avoid duplicate reconnect attempts.
   */
  getIsReconnecting(): boolean {
    return this.isReconnecting;
  }

  /**
   * Simple R-peak detection for live BPM estimation.
   * Detects peaks above a dynamic threshold and computes BPM from R-R intervals.
   */
  private estimateBPMFromSamples(samples: number[], timestamp: number): number | null {
    const SAMPLE_RATE = 250; // Must match ECG_CONFIG.sampleRate
    const MIN_RR_SAMPLES = SAMPLE_RATE * 0.3; // Minimum 300ms between peaks (~200 BPM max)

    // Simple threshold-based R-peak detection
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    const threshold = mean + 0.3; // 0.3 mV above mean as R-peak threshold

    for (let i = 1; i < samples.length - 1; i++) {
      const globalIndex = this.totalSamplesForBPM + i;

      // Peak: higher than neighbors and above threshold
      if (
        samples[i] > threshold &&
        samples[i] > samples[i - 1] &&
        samples[i] >= samples[i + 1] &&
        (globalIndex - this.lastPeakSampleIndex) > MIN_RR_SAMPLES
      ) {
        this.rPeakTimes.push(globalIndex);
        this.lastPeakSampleIndex = globalIndex;

        // Keep only last 10 peaks for rolling average
        if (this.rPeakTimes.length > 10) {
          this.rPeakTimes.shift();
        }
      }
    }

    this.totalSamplesForBPM += samples.length;

    // Need at least 2 peaks to calculate BPM
    if (this.rPeakTimes.length < 2) return null;

    // Compute average R-R interval from recent peaks
    const intervals: number[] = [];
    for (let i = 1; i < this.rPeakTimes.length; i++) {
      intervals.push(this.rPeakTimes[i] - this.rPeakTimes[i - 1]);
    }

    const avgRR = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const bpm = (60 * SAMPLE_RATE) / avgRR;

    // Sanity check: 30-220 BPM range
    if (bpm < 30 || bpm > 220) return this.state.currentBPM;

    return Math.round(bpm);
  }

  private resetBPMState(): void {
    this.rPeakTimes = [];
    this.lastPeakSampleIndex = 0;
    this.totalSamplesForBPM = 0;
  }

  private updateState(partial: Partial<DeviceState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.stateChangeListeners) {
      try {
        listener({ ...this.state });
      } catch (e) {
        console.error('[BLEManager] State listener error:', e);
      }
    }
  }

  /**
   * Clean up all resources. Call when the app is terminating.
   */
  async destroy(): Promise<void> {
    this.stopKeepAlive();
    // Cancel any pending battery monitoring delay
    if (this.batteryMonitoringDelayTimer) {
      clearTimeout(this.batteryMonitoringDelayTimer);
      this.batteryMonitoringDelayTimer = null;
    }
    // Cancel pending ECG state broadcast
    if (this.ecgStateBroadcastTimer) {
      clearTimeout(this.ecgStateBroadcastTimer);
      this.ecgStateBroadcastTimer = null;
    }
    await this.disconnect();
    if (this.bleManager) {
      this.bleManager.destroy();
      this.bleManager = null;
    }
    this.connectedDeviceRef = null;
    this.ecgDataListeners.clear();
    this.stateChangeListeners.clear();
    this.batteryListeners.clear();
    this.resetBPMState();
  }
}

export default BLEManager;
