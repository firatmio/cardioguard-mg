// =============================================================================
// BLE Device Types
// =============================================================================
// Abstractions for Bluetooth Low Energy (BLE) device communication.
// The Holter ECG device exposes a GATT service with an ECG data characteristic
// that streams raw sample data as notifications.
// =============================================================================

/**
 * BLE connection lifecycle states.
 * Follows standard BLE connection state machine.
 */
export type DeviceConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

/**
 * Represents a discovered BLE ECG device.
 */
export interface ECGDevice {
  /** BLE peripheral UUID */
  id: string;

  /** Human-readable device name (e.g., "CardioGuard-H1-A4F2") */
  name: string;

  /** RSSI signal strength in dBm */
  rssi: number;

  /** Whether this device has been previously paired */
  isPaired: boolean;

  /** Firmware version (available after connection) */
  firmwareVersion?: string;

  /** Battery level 0-100 (available after connection) */
  batteryLevel?: number;
}

/**
 * Current state of the connected device.
 */
export interface DeviceState {
  connectionState: DeviceConnectionState;
  connectedDevice: ECGDevice | null;
  batteryLevel: number | null;
  signalStrength: number | null;
  isRecording: boolean;
  lastDataReceivedAt: number | null;

  /** Current live BPM calculated from ECG R-peak detection */
  currentBPM: number | null;

  /** Error message if connectionState is 'error' */
  error: string | null;
}

/**
 * BLE GATT service and characteristic UUIDs for the ECG device.
 *
 * These must match the firmware implementation on the Holter device.
 * Using 128-bit UUIDs to avoid conflicts with standard BLE services.
 *
 * NOTE: Replace these with actual UUIDs from the device manufacturer.
 */
export const ECG_SERVICE_UUIDS = {
  ECG_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb',
  ECG_DATA_CHARACTERISTIC: '00002a37-0000-1000-8000-00805f9b34fb',
  BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL_CHARACTERISTIC: '00002a19-0000-1000-8000-00805f9b34fb',
  DEVICE_INFO_SERVICE: '0000180a-0000-1000-8000-00805f9b34fb',
  FIRMWARE_VERSION_CHARACTERISTIC: '00002a26-0000-1000-8000-00805f9b34fb',
} as const;

/**
 * Raw BLE data packet from the ECG device.
 * The device sends ECG samples as binary data over BLE notifications.
 *
 * Packet format (assumed):
 * - Bytes 0-1: Packet sequence number (uint16, little-endian)
 * - Bytes 2-3: Sample count in this packet (uint16, little-endian)
 * - Bytes 4+:  ECG samples (int16 each, little-endian), representing raw ADC values
 *
 * NOTE: This must match the actual device firmware protocol.
 */
export interface RawECGPacket {
  sequenceNumber: number;
  sampleCount: number;
  rawSamples: Int16Array;
  receivedAt: number;
}

/**
 * Configuration for BLE scanning and connection.
 */
export interface BLEConfig {
  /** Scan timeout in milliseconds */
  scanTimeout: number;

  /** Connection timeout in milliseconds */
  connectionTimeout: number;

  /** Auto-reconnect on unexpected disconnection */
  autoReconnect: boolean;

  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;

  /** Delay between reconnection attempts in ms */
  reconnectDelay: number;

  /** Filter devices by name prefix during scanning */
  deviceNamePrefix: string;
}
