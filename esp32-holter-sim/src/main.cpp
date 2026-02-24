// =============================================================================
// CardioGuard ESP32 Holter ECG Simulator
// =============================================================================
// This firmware simulates an ESP32 board as a BLE Holter ECG device.
// Fully compatible with the mobile app (CardioGuard Patient App).
//
// Pairing protocol:
//   - Device name: "CardioGuard-SIM" (mobile app filters by "CardioGuard" prefix)
//   - ECG data via Heart Rate Service (0x180D)
//   - Battery level via Battery Service (0x180F)
//   - Firmware info via Device Information Service (0x180A)
//
// Packet Format (exactly matches mobile ECGParser.ts):
//   [0-1]  uint16  Sequence number (little-endian)
//   [2-3]  uint16  Number of samples in this packet (little-endian)
//   [4+]   int16[] Raw ADC values (little-endian, 2 bytes each)
//
// Heart rate adjustable via potentiometer (GPIO 34): 40-180 BPM
// Heartbeat indicator via built-in LED (GPIO 2)
// =============================================================================

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>
#include <esp_task_wdt.h>   // For watchdog control

// ─────────────────────────────────────────────────────────────────────────────
// Configuration — Values matching the mobile app
// ─────────────────────────────────────────────────────────────────────────────

// Device name (matches BLE_CONFIG.deviceNamePrefix = "CardioGuard")
#define DEVICE_NAME "CardioGuard-SIM"

// Firmware version
#define FIRMWARE_VERSION "SIM-ESP32-1.0.0"

// ─── BLE Service & Characteristic UUIDs ─────────────────────────────────────
// These are identical to mobile/src/types/device.ts → ECG_SERVICE_UUIDS.

// Heart Rate Service (ECG data is sent over this service)
#define ECG_SERVICE_UUID        "0000180d-0000-1000-8000-00805f9b34fb"
#define ECG_DATA_CHAR_UUID      "00002a37-0000-1000-8000-00805f9b34fb"

// Battery Service
#define BATTERY_SERVICE_UUID    "0000180f-0000-1000-8000-00805f9b34fb"
#define BATTERY_LEVEL_CHAR_UUID "00002a19-0000-1000-8000-00805f9b34fb"

// Device Information Service
#define DEVICE_INFO_SERVICE_UUID    "0000180a-0000-1000-8000-00805f9b34fb"
#define FIRMWARE_VERSION_CHAR_UUID  "00002a26-0000-1000-8000-00805f9b34fb"

// ─── ECG Signal Configuration ───────────────────────────────────────────────
// These match mobile/src/constants/config.ts → ECG_CONFIG.

#define SAMPLE_RATE       250     // Hz — same as sampleRate
#define ADC_TO_MV         0.00286 // Calibration factor — same as adcToMv
#define SAMPLES_PER_PACKET 8      // Number of samples per BLE packet (4+8*2=20 bytes, fits default MTU)
#define PACKET_INTERVAL_MS 32     // (1000 / SAMPLE_RATE) * SAMPLES_PER_PACKET = 32ms

// ─── Hardware Pins ──────────────────────────────────────────────────────────
// DeneyapKart A1: Built-in blue LED = GPIO 13 (LEDB)
// If using standard ESP32 DevKit, set LED_PIN to 2.
#define LED_PIN       13      // DeneyapKart A1 built-in LED (LEDB)
#define POT_PIN       34      // Potentiometer (BPM adjustment, optional)
// WARNING: "D8" label on DeneyapKart is NOT GPIO 8!
// GPIO 6-11 are connected to SPI Flash — using them causes crash.
// BOOT button (GPIO 0) is safe on all ESP32 boards.
#define BUTTON_PIN    0       // BOOT button (GPIO 0) — arrhythmia trigger

// ─── Battery Simulation ─────────────────────────────────────────────────────
#define BATTERY_START_LEVEL  95
#define BATTERY_DRAIN_INTERVAL_MS 120000  // 1% drop every 2 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Global Variables
// ─────────────────────────────────────────────────────────────────────────────

BLEServer*         pServer         = nullptr;
BLECharacteristic* pECGChar        = nullptr;
BLECharacteristic* pBatteryChar    = nullptr;
BLECharacteristic* pFirmwareChar   = nullptr;

bool deviceConnected    = false;
bool oldDeviceConnected = false;
uint16_t sequenceNumber = 0;
uint8_t  batteryLevel   = BATTERY_START_LEVEL;

// ECG waveform generation
uint32_t sampleIndex     = 0;
float    heartRateBPM    = 72.0;
float    rrIntervalSamples;  // R-R interval (in samples)
float    nextRPeakAt;

// Timers
unsigned long lastPacketTime   = 0;
unsigned long lastBatteryTime  = 0;
unsigned long lastLEDTime      = 0;
bool          ledState         = false;

// Arrhythmia simulation
bool arrhythmiaMode = false;
unsigned long arrhythmiaStart = 0;
#define ARRHYTHMIA_DURATION_MS 10000  // 10-second arrhythmia

// ─────────────────────────────────────────────────────────────────────────────
// BLE Server Callbacks
// ─────────────────────────────────────────────────────────────────────────────

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println("[BLE] Device connected!");
    // LED blinks fast → connected
  }

  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    Serial.println("[BLE] Connection lost.");
    // Re-advertise — DO NOT USE DELAY!
    // delay() here blocks the BLE event callback and can cause
    // stack corruption. Instead, we start advertising in loop().
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ECG Waveform Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gaussian function — for modeling ECG wave components.
 */
float gaussian(float x, float center, float width) {
  float diff = x - center;
  return exp(-(diff * diff) / (2.0 * width * width));
}

/**
 * Generate a single ECG sample (in mV).
 * 
 * Normal sinus rhythm model:
 *   - P wave: Small positive deflection before QRS
 *   - QRS complex: Sharp R-peak, Q and S deflections
 *   - T wave: Broad positive wave after QRS
 *   - U wave: Very small (for realism)
 */
float generateECGSample(uint32_t idx) {
  // Position within beat (0.0 - 1.0)
  float beatStart = nextRPeakAt - rrIntervalSamples;
  float posInBeat = fmod((float)(idx - (uint32_t)beatStart), rrIntervalSamples) / rrIntervalSamples;
  if (posInBeat < 0) posInBeat += 1.0;

  float value = 0.0;

  if (arrhythmiaMode) {
    // ─── Arrhythmia Mode: irregular rhythm ───
    // PVC (Premature Ventricular Contraction) simulation
    float jitter = sin(idx * 0.1) * 0.15;
    
    // Wide QRS
    value += gaussian(posInBeat, 0.20, 0.018) * 0.08;   // Small P
    value -= gaussian(posInBeat, 0.22, 0.015) * 0.20;    // Deep Q
    value += gaussian(posInBeat, 0.25, 0.020) * 1.8;     // Tall R
    value -= gaussian(posInBeat, 0.30, 0.018) * 0.50;    // Deep S
    value += gaussian(posInBeat, 0.45, 0.060) * (-0.25); // Inverted T
    value += jitter * gaussian(posInBeat, 0.60, 0.05);
  } else {
    // ─── Normal Sinus Rhythm ───
    
    // P wave (at ~12% of cycle, width ~2.5%)
    value += gaussian(posInBeat, 0.12, 0.025) * 0.15;

    // Q wave (small negative deflection before R)
    value -= gaussian(posInBeat, 0.20, 0.008) * 0.10;

    // R peak (sharp positive peak)
    value += gaussian(posInBeat, 0.22, 0.010) * 1.20;

    // S wave (negative deflection after R)
    value -= gaussian(posInBeat, 0.24, 0.008) * 0.25;

    // T wave (broad positive)
    value += gaussian(posInBeat, 0.38, 0.040) * 0.30;

    // U wave (very small)
    value += gaussian(posInBeat, 0.50, 0.025) * 0.03;
  }

  // Baseline wander (very slow sinusoidal)
  value += sin((float)idx / SAMPLE_RATE * 0.3) * 0.02;

  // Noise addition (small amount — for realism)
  value += ((float)random(-100, 100) / 100.0) * 0.015;

  return value;
}

/**
 * Convert mV value to raw ADC value.
 * Mobile app does the reverse: raw * adcToMv = mV
 * So we do: mV / adcToMv = raw
 */
int16_t mvToADC(float mv) {
  return (int16_t)(mv / ADC_TO_MV);
}

// ─────────────────────────────────────────────────────────────────────────────
// BLE Packet Sending
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build ECG packet and send as BLE notification.
 * 
 * Packet format (exactly matches ECGParser.ts):
 *   Byte 0-1: uint16 sequence number (little-endian)
 *   Byte 2-3: uint16 sample count (little-endian)
 *   Byte 4+:  int16[] ADC values (little-endian)
 */
void sendECGPacket() {
  // Packet size: 4 byte header + (samples * 2 bytes)
  const int packetSize = 4 + SAMPLES_PER_PACKET * 2;
  uint8_t packet[packetSize];

  // Header: sequence number (uint16 LE)
  packet[0] = sequenceNumber & 0xFF;
  packet[1] = (sequenceNumber >> 8) & 0xFF;

  // Header: sample count (uint16 LE)
  packet[2] = SAMPLES_PER_PACKET & 0xFF;
  packet[3] = (SAMPLES_PER_PACKET >> 8) & 0xFF;

  // Generate samples and write to packet
  for (int i = 0; i < SAMPLES_PER_PACKET; i++) {
    float mv = generateECGSample(sampleIndex);
    int16_t adcValue = mvToADC(mv);

    // int16 little-endian
    int offset = 4 + i * 2;
    packet[offset]     = adcValue & 0xFF;
    packet[offset + 1] = (adcValue >> 8) & 0xFF;

    sampleIndex++;

    // R-peak check — new beat
    if (sampleIndex >= (uint32_t)nextRPeakAt) {
      // HRV: vary R-R interval by ±5%
      float variation = ((float)random(-50, 50) / 1000.0) * rrIntervalSamples;
      float newRR = rrIntervalSamples + variation;
      
      // Irregular R-R in arrhythmia mode
      if (arrhythmiaMode) {
        float extraVariation = ((float)random(-200, 200) / 1000.0) * rrIntervalSamples;
        newRR += extraVariation;
      }
      
      nextRPeakAt = sampleIndex + newRR;

      // Turn on LED (heartbeat indicator)
      digitalWrite(LED_PIN, HIGH);
      ledState = true;
      lastLEDTime = millis();
    }
  }

  sequenceNumber++;

  // Send BLE notification
  pECGChar->setValue(packet, packetSize);
  pECGChar->notify();
}

// ─────────────────────────────────────────────────────────────────────────────
// BLE Service Setup
// ─────────────────────────────────────────────────────────────────────────────

void setupBLE() {
  Serial.println("[BLE] Starting...");

  // BLEDevice::init() starts the Bluedroid stack — this operation
  // can take 1-2 seconds and may trigger the watchdog.
  // We increase the timeout with esp_task_wdt.
  BLEDevice::init(DEVICE_NAME);
  delay(100);  // BLE stack settle
  Serial.println("[BLE] BLEDevice::init() completed");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // ═══ ECG Service (Heart Rate Service 0x180D) ═══════════════════════════
  BLEService* ecgService = pServer->createService(ECG_SERVICE_UUID);
  
  pECGChar = ecgService->createCharacteristic(
    ECG_DATA_CHAR_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pECGChar->addDescriptor(new BLE2902());  // CCCD — notification enable
  
  ecgService->start();

  // ═══ Battery Service (0x180F) ══════════════════════════════════════════
  BLEService* batteryService = pServer->createService(BATTERY_SERVICE_UUID);
  
  pBatteryChar = batteryService->createCharacteristic(
    BATTERY_LEVEL_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pBatteryChar->addDescriptor(new BLE2902());
  pBatteryChar->setValue(&batteryLevel, 1);
  
  batteryService->start();

  // ═══ Device Information Service (0x180A) ═══════════════════════════════
  BLEService* deviceInfoService = pServer->createService(DEVICE_INFO_SERVICE_UUID);
  
  pFirmwareChar = deviceInfoService->createCharacteristic(
    FIRMWARE_VERSION_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  pFirmwareChar->setValue(FIRMWARE_VERSION);
  
  deviceInfoService->start();

  // ═══ Advertising ══════════════════════════════════════════════════════
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(ECG_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // Min connection interval (7.5ms)
  pAdvertising->setMaxPreferred(0x12);  // Max connection interval (22.5ms)
  
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Advertising started - waiting for connection...");
  Serial.printf("[BLE] Device name: %s\n", DEVICE_NAME);
}

// ─────────────────────────────────────────────────────────────────────────────
// BPM Adjustment via Potentiometer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read potentiometer value and convert to BPM.
 * ADC 0-4095 → 40-180 BPM
 * If no potentiometer is connected, default 72 BPM is used.
 */
void updateHeartRateFromPot() {
  int potValue = analogRead(POT_PIN);
  
  // Floating pin check (if no potentiometer connected)
  static int lastPotValue = -1;
  if (abs(potValue - lastPotValue) < 50 && lastPotValue != -1) {
    lastPotValue = potValue;
    return; // No change
  }
  lastPotValue = potValue;
  
  // 0-4095 → 40-180 BPM
  float newBPM = 40.0 + (potValue / 4095.0) * 140.0;
  
  // Smooth out sudden changes
  heartRateBPM = heartRateBPM * 0.9 + newBPM * 0.1;
  rrIntervalSamples = (60.0 / heartRateBPM) * SAMPLE_RATE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arduino Setup & Loop
// ─────────────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(1000);  // Wait for serial port + PSRAM stabilization
  Serial.println();
  Serial.println("========================================");
  Serial.println("  CardioGuard ESP32 Holter ECG Simulator");
  Serial.println("  DeneyapKart 1A | BLE Ready");
  Serial.println("========================================");
  Serial.println();

  // PSRAM check
  if (psramFound()) {
    Serial.printf("[SYS] PSRAM: %u KB available\n", ESP.getFreePsram() / 1024);
  } else {
    Serial.println("[SYS] PSRAM not found (not an issue, not required)");
  }
  Serial.printf("[SYS] Free Heap: %u KB\n", ESP.getFreeHeap() / 1024);

  // Pin configuration
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  analogReadResolution(12);  // ESP32 ADC 12-bit

  // Initialize ECG parameters
  heartRateBPM = 72.0;
  rrIntervalSamples = (60.0 / heartRateBPM) * SAMPLE_RATE;
  nextRPeakAt = rrIntervalSamples;

  // Start BLE
  Serial.println("[BLE] Starting... (this may take 2-3 seconds)");
  delay(100);  // Give the watchdog a breather
  setupBLE();

  Serial.println();
  Serial.println("[INFO] Commands:");
  Serial.println("  - Potentiometer (GPIO 34):  BPM setting (40-180)");
  Serial.println("  - D8 button:                Arrhythmia mode");
  Serial.println("  - Serial 'b' + Enter:       Print BPM");
  Serial.println("  - Serial 'a' + Enter:       Trigger arrhythmia");
  Serial.println();
}

void loop() {
  unsigned long now = millis();

  // Feed the watchdog
  esp_task_wdt_reset();

  // ─── Connection status change ─────────────────────────────────
  if (deviceConnected && !oldDeviceConnected) {
    // New connection
    sequenceNumber = 0;
    sampleIndex = 0;
    nextRPeakAt = rrIntervalSamples;
    Serial.println("[ECG] Streaming starting...");
    oldDeviceConnected = deviceConnected;
  }
  if (!deviceConnected && oldDeviceConnected) {
    // Connection lost
    Serial.println("[ECG] Streaming stopped.");
    oldDeviceConnected = false;
    // Restart advertising — we do it here instead of the
    // onDisconnect callback because delay() inside the callback
    // blocks the BLE stack and causes broken disconnect/reconnect loops.
    delay(100);  // Minimal wait for BLE stack cleanup
    BLEDevice::startAdvertising();
    Serial.println("[BLE] Advertising restarted.");
  }

  // ─── ECG Packet Transmission ──────────────────────────────────
  if (deviceConnected && (now - lastPacketTime >= PACKET_INTERVAL_MS)) {
    lastPacketTime = now;
    sendECGPacket();

    // Print status every 250 packets (10 seconds)
    if (sequenceNumber % 250 == 0) {
      Serial.printf("[ECG] seq=%u  BPM=%.0f  battery=%u%%  arrhythmia=%s\n",
        sequenceNumber, heartRateBPM, batteryLevel,
        arrhythmiaMode ? "YES" : "no");
    }
  }

  // ─── Battery Simulation ────────────────────────────────────────
  if (now - lastBatteryTime >= BATTERY_DRAIN_INTERVAL_MS) {
    lastBatteryTime = now;
    if (batteryLevel > 5) batteryLevel--;
    
    if (deviceConnected) {
      pBatteryChar->setValue(&batteryLevel, 1);
      pBatteryChar->notify();
    }
    
    Serial.printf("[BAT] Battery: %u%%\n", batteryLevel);
  }

  // ─── LED Control ─────────────────────────────────────────────
  if (ledState && (now - lastLEDTime > 50)) {
    digitalWrite(LED_PIN, LOW);
    ledState = false;
  }

  // ─── Potentiometer (every 500ms) ───────────────────────────────
  static unsigned long lastPotRead = 0;
  if (now - lastPotRead >= 500) {
    lastPotRead = now;
    updateHeartRateFromPot();
  }

  // ─── BOOT Button → Arrhythmia Trigger ──────────────────────────
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (!arrhythmiaMode) {
      arrhythmiaMode = true;
      arrhythmiaStart = now;
      Serial.println("[ECG] ⚡ Arrhythmia mode ACTIVE (PVC simulation)");
    }
  }
  
  // Check arrhythmia duration
  if (arrhythmiaMode && (now - arrhythmiaStart >= ARRHYTHMIA_DURATION_MS)) {
    arrhythmiaMode = false;
    Serial.println("[ECG] ✓ Normal rhythm");
  }

  // ─── Serial Port Commands ──────────────────────────────────────
  if (Serial.available()) {
    char cmd = Serial.read();
    switch (cmd) {
      case 'b':
      case 'B':
        Serial.printf("[INFO] BPM: %.1f  R-R: %.0f samples\n",
          heartRateBPM, rrIntervalSamples);
        break;
      case 'a':
      case 'A':
        arrhythmiaMode = !arrhythmiaMode;
        arrhythmiaStart = now;
        Serial.printf("[ECG] Arrhythmia: %s\n", arrhythmiaMode ? "ACTIVE" : "disabled");
        break;
      case 'r':
      case 'R':
        batteryLevel = BATTERY_START_LEVEL;
        Serial.println("[BAT] Battery reset → 95%");
        break;
      case '+':
        heartRateBPM = min(180.0f, heartRateBPM + 10.0f);
        rrIntervalSamples = (60.0 / heartRateBPM) * SAMPLE_RATE;
        Serial.printf("[ECG] BPM increased → %.0f\n", heartRateBPM);
        break;
      case '-':
        heartRateBPM = max(40.0f, heartRateBPM - 10.0f);
        rrIntervalSamples = (60.0 / heartRateBPM) * SAMPLE_RATE;
        Serial.printf("[ECG] BPM decreased → %.0f\n", heartRateBPM);
        break;
      case 'h':
      case 'H':
        Serial.println();
        Serial.println("═══ Commands ═══");
        Serial.println("  b: Show BPM");
        Serial.println("  a: Toggle arrhythmia");
        Serial.println("  r: Reset battery");
        Serial.println("  +: BPM +10");
        Serial.println("  -: BPM -10");
        Serial.println("  h: Help");
        Serial.println();
        break;
    }
  }
}
