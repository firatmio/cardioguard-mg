// =============================================================================
// Screen: ECG Monitor
// =============================================================================
// Full-screen real-time ECG waveform display.
// Shows live ECG trace, current BPM, signal quality, and recording status.
//
// This screen is the primary monitoring view when the device is connected.
// No AI inference happens here — only real-time visualization and
// basic BPM estimation for immediate user feedback.
// =============================================================================

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Radio } from "lucide-react-native";
import ECGWaveform from "../components/ECGWaveform";
import HeartRateDisplay from "../components/HeartRateDisplay";
import { useDevice } from "../context/DeviceContext";
import { useAuth } from "../context/AuthContext";
import { useECGStream } from "../hooks/useECGStream";
import { formatSignalQuality, formatDuration } from "../utils/formatters";
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../constants/theme";

export default function ECGMonitorScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const waveformWidth = screenWidth - spacing.lg * 2;
  const waveformHeight = 220;
  const { deviceState } = useDevice();
  const { user } = useAuth();

  // Use authenticated user's UID as patient ID
  const patientId = user?.uid ?? "unknown-patient";
  const { streamState, getDisplayBuffer, startStream, stopStream } = useECGStream(
    patientId,
    deviceState.connectedDevice?.id ?? "unknown",
  );

  const [elapsedTime, setElapsedTime] = useState(0);

  // Start streaming when device is connected.
  // Use a ref to track connection state so cleanup works correctly
  // (avoids stale closure reading the old connectionState value).
  const connectionStateRef = React.useRef(deviceState.connectionState);
  connectionStateRef.current = deviceState.connectionState;

  useEffect(() => {
    let mountTimer: ReturnType<typeof setTimeout> | null = null;

    if (deviceState.connectionState === "connected") {
      // Delay startStream so Fabric native views (SVG grid, icons) finish
      // mounting before BLE data triggers rapid state updates.
      // Without this, concurrent SVG mount + setState causes crash.
      mountTimer = setTimeout(() => {
        mountTimer = null;
        try {
          startStream();
        } catch (e) {
          console.warn('[ECGMonitor] startStream failed:', e);
        }
      }, 300);
    }

    return () => {
      if (mountTimer) clearTimeout(mountTimer);
      // Use ref to read the CURRENT connection state, not the stale closure value
      if (connectionStateRef.current !== "connected") {
        try {
          stopStream();
        } catch (e) {
          console.warn('[ECGMonitor] stopStream failed:', e);
        }
      }
    };
  }, [deviceState.connectionState]);

  // Elapsed time counter
  useEffect(() => {
    if (!streamState.isStreaming) return;

    const interval = setInterval(() => {
      if (streamState.streamStartTime) {
        setElapsedTime(
          Math.floor((Date.now() - streamState.streamStartTime) / 1000),
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [streamState.isStreaming, streamState.streamStartTime]);

  const signalInfo = formatSignalQuality(streamState.signalQuality);

  // Treat both 'connected' and 'connecting' (during brief reconnect) as connected
  // to prevent the ECG UI from flashing off during transient BLE reconnections.
  // The stream data keeps flowing via BLE notifications even during reconnect attempts.
  const isConnected =
    deviceState.connectionState === "connected" ||
    (deviceState.connectionState === "connecting" && streamState.isStreaming);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Signal</Text>
          <View style={styles.signalRow}>
            <View
              style={[styles.signalDot, { backgroundColor: signalInfo.color }]}
            />
            <Text style={[styles.infoValue, { color: signalInfo.color }]}>
              {signalInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Lead</Text>
          <Text style={styles.infoValue}>II</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Duration</Text>
          <Text style={styles.infoValue}>{formatDuration(elapsedTime)}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>25mm/s</Text>
          <Text style={styles.infoValue}>10mm/mV</Text>
        </View>
      </View>

      {/* ECG Waveform */}
      {isConnected && (
        <View style={styles.waveformContainer}>
          {isConnected && streamState.isStreaming ? (
            <ECGWaveform
              samples={getDisplayBuffer()}
              width={waveformWidth}
              height={waveformHeight}
              visibleDuration={4}
              showGrid={true}
              isLive={true}
            />
          ) : (
            <View
              style={[
                styles.emptyWaveform,
                { width: waveformWidth, height: waveformHeight },
              ]}
            >
              <Radio size={32} color={colors.textTertiary} />
              <Text style={styles.emptyText}>
                {!isConnected
                  ? "Connect your device to view ECG"
                  : "Waiting for data..."}
              </Text>
            </View>
          )}

          {/* Recording indicator */}
          {streamState.isStreaming && (
            <View style={styles.recordingBadge}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>REC</Text>
            </View>
          )}
        </View>
      )}

      {/* Heart Rate */}
      {isConnected && (
        <View style={styles.bpmSection}>
          <HeartRateDisplay
            bpm={streamState.currentBPM}
            isLive={streamState.isStreaming}
            label={
              streamState.isStreaming ? "Real-time Heart Rate" : "Heart Rate"
            }
          />
        </View>
      )}

      {/* Stream controls */}
      <View style={styles.controls}>
        {isConnected && (
          <TouchableOpacity
            style={[
              styles.controlButton,
              streamState.isStreaming ? styles.stopButton : styles.startButton,
            ]}
            onPress={streamState.isStreaming ? stopStream : startStream}
            activeOpacity={0.7}
          >
            <Text style={styles.controlButtonText}>
              {streamState.isStreaming ? "Stop Monitoring" : "Start Monitoring"}
            </Text>
          </TouchableOpacity>
        )}

        {!isConnected && (
          <View style={styles.disconnectedMessage}>
            <Text style={styles.disconnectedText}>Device not connected</Text>
            <Text style={styles.disconnectedHint}>
              Go to the Device tab to connect your ECG monitor
            </Text>
          </View>
        )}
      </View>

      {/* Bottom stats */}
      {streamState.isStreaming && (
        <View style={styles.bottomStats}>
          <Text style={styles.statText}>
            Samples: {streamState.totalSamplesReceived.toLocaleString()}
          </Text>
          <Text style={styles.statText}>
            Quality: {Math.round(streamState.signalQuality * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoItem: {
    alignItems: "center",
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  signalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  waveformContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    position: "relative",
  },
  emptyWaveform: {
    backgroundColor: colors.ecgBackground,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  recordingBadge: {
    position: "absolute",
    top: spacing.md + 8,
    left: spacing.lg + 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 4,
  },
  recordingText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  bpmSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    alignItems: "center",
  },
  controlButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    minWidth: 200,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  stopButton: {
    backgroundColor: colors.danger,
  },
  controlButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  disconnectedMessage: {
    alignItems: "center",
    padding: spacing.lg,
    height: "100%",
    justifyContent: "center",
  },
  disconnectedText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  disconnectedHint: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 4,
    textAlign: "center",
  },
  bottomStats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingTop: spacing.md,
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
