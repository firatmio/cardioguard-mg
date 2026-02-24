// =============================================================================
// Screen: Device
// =============================================================================
// BLE device management screen.
// Allows the patient to:
//   - Scan for nearby ECG devices
//   - Connect/disconnect
//   - View device details (battery, firmware, signal)
//   - See connection troubleshooting tips
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Smartphone, Radio, ShieldAlert, Zap } from 'lucide-react-native';
import { useDevice } from '../context/DeviceContext';
import DeviceStatusBadge from '../components/DeviceStatusBadge';
import { useBLEPermissions } from '../hooks/useBLEPermissions';
import BLESimulator from '../services/ble/BLESimulator';
import type { ECGDevice } from '../types';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  shadows,
  MIN_TOUCH_TARGET,
} from '../constants/theme';
import { formatBatteryLevel } from '../utils/formatters';

export default function DeviceScreen() {
  const insets = useSafeAreaInsets();
  const {
    deviceState,
    discoveredDevices,
    isScanning,
    startScan,
    stopScan,
    connect,
    disconnect,
  } = useDevice();

  const { status: permStatus, requestPermissions, checkPermissions } = useBLEPermissions();
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const handleScan = async () => {
    // Request permissions before scanning (Android)
    if (Platform.OS === 'android' && permStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) return;
    }
    startScan();
  };

  const handleConnect = async (device: ECGDevice) => {
    setConnectingTo(device.id);
    try {
      await connect(device.id);
    } catch (error: any) {
      Alert.alert(
        'Bağlantı Başarısız',
        error.message || 'Cihaza bağlanılamadı. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }],
      );
    } finally {
      setConnectingTo(null);
    }
  };

  // Simulation mode (for development/testing without real hardware)
  const handleStartSimulation = () => {
    const simulator = BLESimulator.getInstance();
    simulator.startSimulation();
    setIsSimulating(true);
  };

  const handleStopSimulation = () => {
    const simulator = BLESimulator.getInstance();
    simulator.stopSimulation();
    setIsSimulating(false);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Cihaz Bağlantısını Kes',
      'Bağlantıyı kesmek istediğinize emin misiniz? Kayıt durduracaktır.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Bağlantıyı Kes',
          style: 'destructive',
          onPress: () => disconnect(),
        },
      ],
    );
  };

  const isConnected = deviceState.connectionState === 'connected';
  const battery = formatBatteryLevel(deviceState.batteryLevel);
  const showPermissionWarning = Platform.OS === 'android' && permStatus === 'blocked';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Cihaz</Text>

        {/* Permission blocked warning */}
        {showPermissionWarning && (
          <View style={styles.permissionWarning}>
            <ShieldAlert size={20} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.permWarningTitle}>Bluetooth İzni Gerekli</Text>
              <Text style={styles.permWarningText}>
                BLE cihazları taramak için Bluetooth iznini etkinleştirmeniz gerekiyor. Ayarlar'dan iznleri kontrol edin.
              </Text>
            </View>
          </View>
        )}

        {/* Connected device card */}
        {isConnected && deviceState.connectedDevice && (
          <View style={[styles.connectedCard, shadows.md]}>
            <View style={styles.connectedHeader}>
              <View style={styles.connectedIconContainer}>
                <Smartphone size={28} color={colors.primary} />
              </View>
              <View style={styles.connectedInfo}>
                <Text style={styles.deviceName}>
                  {deviceState.connectedDevice.name}
                </Text>
                <DeviceStatusBadge
                  connectionState="connected"
                  batteryLevel={deviceState.batteryLevel}
                />
              </View>
            </View>

            {/* Device details */}
            <View style={styles.detailsGrid}>
              <DetailItem label="Battery" value={battery.label} valueColor={battery.color} />
              <DetailItem
                label="Signal"
                value={`${deviceState.signalStrength ?? '--'} dBm`}
              />
              <DetailItem
                label="Firmware"
                value={deviceState.connectedDevice.firmwareVersion ?? 'N/A'}
              />
              <DetailItem
                label="Recording"
                value={deviceState.isRecording ? 'Active' : 'Idle'}
                valueColor={deviceState.isRecording ? colors.success : colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnect}
              activeOpacity={0.7}
            >
              <Text style={styles.disconnectButtonText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan section */}
        {!isConnected && (
          <>
            <Text style={styles.sectionTitle}>Cihazınızı Bulun</Text>
            <Text style={styles.sectionSubtext}>
              EKG monitörünüzün açık ve menzil içinde olduğundan emin olun.
            </Text>

            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonActive]}
              onPress={isScanning ? stopScan : handleScan}
              activeOpacity={0.7}
            >
              {isScanning ? (
                <>
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                  <Text style={styles.scanButtonText}>Taranıyor...</Text>
                </>
              ) : (
                <Text style={styles.scanButtonText}>
                  {discoveredDevices.length > 0 ? 'Tekrar Tara' : 'Taramayı Başlat'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Simulation mode for development/testing */}
            {__DEV__ && (
              <TouchableOpacity
                style={[
                  styles.simulationButton,
                  isSimulating && styles.simulationButtonActive,
                ]}
                onPress={isSimulating ? handleStopSimulation : handleStartSimulation}
                activeOpacity={0.7}
              >
                <Zap size={18} color={isSimulating ? colors.textOnPrimary : colors.warning} />
                <Text
                  style={[
                    styles.simulationButtonText,
                    isSimulating && styles.simulationButtonTextActive,
                  ]}
                >
                  {isSimulating ? 'Simülasyonu Durdur' : 'Simülasyon Modu'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Discovered devices list */}
            {discoveredDevices.length > 0 && (
              <View style={styles.deviceList}>
                <Text style={styles.listLabel}>
                  Yakındaki Cihazlar ({discoveredDevices.length})
                </Text>
                {discoveredDevices.map((device) => (
                  <TouchableOpacity
                    key={device.id}
                    style={[styles.deviceItem, shadows.sm]}
                    onPress={() => handleConnect(device)}
                    disabled={connectingTo !== null}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deviceItemInfo}>
                      <Text style={styles.deviceItemName}>{device.name}</Text>
                      <Text style={styles.deviceItemSignal}>
                        Sinyal: {device.rssi} dBm
                        {device.isPaired ? ' · Daha önce eşleştirildi' : ''}
                      </Text>
                    </View>

                    {connectingTo === device.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.connectText}>Bağlan</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Empty scan result */}
            {!isScanning && discoveredDevices.length === 0 && (
              <View style={styles.emptyState}>
                <Radio size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>Cihaz bulunamadı</Text>
                <Text style={styles.emptySubtext}>
                  Holter cihazınızın açık ve yakınlarda olduğundan emin olun.
                  Telefonunuzda Bluetooth etkin olmalıdır.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Troubleshooting tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Sorun Giderme</Text>
          <TipItem text="Telefonunuzda Bluetooth'un etkin olduğundan emin olun" />
          <TipItem text="Cihazı telefonunuzun 3 metre yakınında tutun" />
          <TipItem text="EKG monitöründe yeterli pil olduğundan emin olun" />
          <TipItem text="Monitörü kapatıp tekrar açmayı deneyin" />
          <TipItem text="Sorun devam ederse sağlık uzmanınıza başvurun" />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function DetailItem({
  label,
  value,
  valueColor = colors.textPrimary,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <View style={styles.tipItem}>
      <Text style={styles.tipBullet}>•</Text>
      <Text style={styles.tipText}>{text}</Text>
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

  // Connected device card
  connectedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
    marginBottom: 24,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  connectedIconContainer: {
    marginRight: 12,
  },
  connectedInfo: {
    flex: 1,
    gap: 6,
  },
  deviceName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  detailItem: {
    width: '45%',
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  disconnectButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: '#FEE2E2',
    minHeight: MIN_TOUCH_TARGET,
  },
  disconnectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
  },

  // Scan section
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  scanButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  scanButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  deviceList: {
    marginTop: 20,
  },
  listLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 16,
    marginBottom: 8,
    minHeight: MIN_TOUCH_TARGET,
  },
  deviceItemInfo: {
    flex: 1,
  },
  deviceItemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  deviceItemSignal: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  connectText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    paddingLeft: 12,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Tips
  tipsContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  tipBullet: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginRight: 8,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Permission warning
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  permWarningTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#92400E',
    marginBottom: 2,
  },
  permWarningText: {
    fontSize: fontSize.xs,
    color: '#78350F',
    lineHeight: 18,
  },

  // Simulation mode
  simulationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.warning,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    minHeight: MIN_TOUCH_TARGET,
    marginTop: 10,
  },
  simulationButtonActive: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  simulationButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  simulationButtonTextActive: {
    color: colors.textOnPrimary,
  },
});
