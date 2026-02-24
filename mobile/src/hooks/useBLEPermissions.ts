// =============================================================================
// Hook: useBLEPermissions
// =============================================================================
// Handles runtime Bluetooth permission requests for Android 12+ (API 31+).
// On Android 12+, BLUETOOTH_SCAN and BLUETOOTH_CONNECT are required.
// On Android 11 and below, ACCESS_FINE_LOCATION is required for BLE scanning.
// iOS permissions are handled via Info.plist entries in app.json.
// =============================================================================

import { useState, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert, Linking, type Permission } from 'react-native';

export type BLEPermissionStatus = 'unknown' | 'granted' | 'denied' | 'blocked';

export interface UseBLEPermissionsReturn {
  /** Current permission status */
  status: BLEPermissionStatus;

  /** Whether permissions have been checked at least once */
  checked: boolean;

  /** Request BLE permissions. Returns true if all granted. */
  requestPermissions: () => Promise<boolean>;

  /** Check current permission status without prompting */
  checkPermissions: () => Promise<boolean>;
}

/**
 * Android 12+ (API 31) requires separate BLUETOOTH_SCAN and BLUETOOTH_CONNECT permissions.
 * Older versions require ACCESS_FINE_LOCATION for BLE scanning.
 */
const ANDROID_12_PERMISSIONS: Permission[] = [
  'android.permission.BLUETOOTH_SCAN' as Permission,
  'android.permission.BLUETOOTH_CONNECT' as Permission,
];

const ANDROID_LEGACY_PERMISSIONS: Permission[] = [
  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
];

function getRequiredPermissions(): Permission[] {
  if (Platform.OS !== 'android') return [];

  // Android 12+ (API 31+)
  if (Platform.Version >= 31) {
    return ANDROID_12_PERMISSIONS;
  }

  // Android 6-11 (API 23-30)
  return ANDROID_LEGACY_PERMISSIONS;
}

export function useBLEPermissions(): UseBLEPermissionsReturn {
  const [status, setStatus] = useState<BLEPermissionStatus>('unknown');
  const [checked, setChecked] = useState(false);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    // iOS: permissions are handled declaratively via Info.plist
    if (Platform.OS === 'ios') {
      setStatus('granted');
      setChecked(true);
      return true;
    }

    // Web or other platforms
    if (Platform.OS !== 'android') {
      setStatus('granted');
      setChecked(true);
      return true;
    }

    const permissions = getRequiredPermissions();
    if (permissions.length === 0) {
      setStatus('granted');
      setChecked(true);
      return true;
    }

    try {
      const results = await Promise.all(
        permissions.map((p: Permission) => PermissionsAndroid.check(p))
      );

      const allGranted = results.every((r) => r === true);
      setStatus(allGranted ? 'granted' : 'denied');
      setChecked(true);
      return allGranted;
    } catch (error) {
      console.error('[useBLEPermissions] Check failed:', error);
      setStatus('denied');
      setChecked(true);
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    // iOS: permissions are handled declaratively via Info.plist
    if (Platform.OS === 'ios') {
      setStatus('granted');
      setChecked(true);
      return true;
    }

    if (Platform.OS !== 'android') {
      setStatus('granted');
      setChecked(true);
      return true;
    }

    const permissions = getRequiredPermissions();
    if (permissions.length === 0) {
      setStatus('granted');
      setChecked(true);
      return true;
    }

    try {
      const results = await PermissionsAndroid.requestMultiple(permissions);

      const allGranted = Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED
      );

      const anyNeverAskAgain = Object.values(results).some(
        (r) => r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      );

      if (allGranted) {
        setStatus('granted');
        setChecked(true);
        return true;
      }

      if (anyNeverAskAgain) {
        setStatus('blocked');
        setChecked(true);

        // Guide user to app settings
        Alert.alert(
          'Bluetooth İzni Gerekli',
          'CardioGuard, EKG cihazınızla iletişim kurmak için Bluetooth iznine ihtiyaç duyar. ' +
          'Lütfen Ayarlar\'dan Bluetooth iznini etkinleştirin.',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Ayarları Aç',
              onPress: () => Linking.openSettings(),
            },
          ]
        );

        return false;
      }

      setStatus('denied');
      setChecked(true);
      return false;
    } catch (error) {
      console.error('[useBLEPermissions] Request failed:', error);
      setStatus('denied');
      setChecked(true);
      return false;
    }
  }, []);

  return {
    status,
    checked,
    requestPermissions,
    checkPermissions,
  };
}
