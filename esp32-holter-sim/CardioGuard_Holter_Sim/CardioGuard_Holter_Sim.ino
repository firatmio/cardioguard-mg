// =============================================================================
// CardioGuard ESP32 Holter ECG Simulator
// =============================================================================
// Bu firmware, ESP32 kartını bir BLE Holter ECG cihazı olarak simüle eder.
// Mobil uygulama (CardioGuard Patient App) ile birebir uyumludur.
//
// Arduino IDE Ayarları:
//   Board:            "ESP32 Dev Module"
//   Upload Speed:     "921600"
//   Flash Size:       "4MB (32Mb)"
//   Partition Scheme: "Default 4MB with spiffs"
//   Port:             (ESP32'nin bağlı olduğu COM portu)
//
// Eşleşme protokolü:
//   - Cihaz adı: "CardioGuard-SIM" (mobil uygulama "CardioGuard" prefix ile filtreler)
//   - Heart Rate Service (0x180D) üzerinden ECG verileri
//   - Battery Service (0x180F) ile pil seviyesi
//   - Device Information Service (0x180A) ile firmware bilgisi
//
// Paket Formatı (mobil ECGParser.ts ile birebir uyumlu):
//   [0-1]  uint16  Sıra numarası (little-endian)
//   [2-3]  uint16  Bu paketteki örnek sayısı (little-endian)
//   [4+]   int16[] Ham ADC değerleri (little-endian, her biri 2 byte)
//
// Potansiyometre (GPIO 34) ile nabız ayarlanabilir: 40-180 BPM
// Dahili LED (GPIO 2) ile kalp atışı göstergesi
// BOOT butonu (GPIO 0) ile aritmia tetikleme
// =============================================================================

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>
#include <esp_task_wdt.h>   // Watchdog kontrolu icin
//dogum günün kutlu olsun adamsın quaresma eyvallah
// ─────────────────────────────────────────────────────────────────────────────
// Configuration — Mobil uygulama ile eşleşen değerler
// ─────────────────────────────────────────────────────────────────────────────

// Cihaz adı (BLE_CONFIG.deviceNamePrefix = "CardioGuard" ile eşleşir)
#define DEVICE_NAME "CardioGuard-SIM"

// Firmware versiyonu
#define FIRMWARE_VERSION "SIM-ESP32-1.0.0"

// ─── BLE Service & Characteristic UUIDs ─────────────────────────────────────
// Bunlar mobile/src/types/device.ts → ECG_SERVICE_UUIDS ile birebir aynıdır.

// Heart Rate Service (ECG verisi bu servis üzerinden gider)
#define ECG_SERVICE_UUID        "0000180d-0000-1000-8000-00805f9b34fb"
#define ECG_DATA_CHAR_UUID      "00002a37-0000-1000-8000-00805f9b34fb"

// Battery Service
#define BATTERY_SERVICE_UUID    "0000180f-0000-1000-8000-00805f9b34fb"
#define BATTERY_LEVEL_CHAR_UUID "00002a19-0000-1000-8000-00805f9b34fb"

// Device Information Service
#define DEVICE_INFO_SERVICE_UUID    "0000180a-0000-1000-8000-00805f9b34fb"
#define FIRMWARE_VERSION_CHAR_UUID  "00002a26-0000-1000-8000-00805f9b34fb"

// ─── ECG Sinyal Konfigürasyonu ──────────────────────────────────────────────
// Bunlar mobile/src/constants/config.ts → ECG_CONFIG ile eşleşir.

#define SAMPLE_RATE       250     // Hz — sampleRate ile aynı
#define ADC_TO_MV         0.00286 // Kalibrasyon faktörü — adcToMv ile aynı
#define SAMPLES_PER_PACKET 8      // Her BLE paketinde gönderilen örnek sayısı (4+8*2=20 byte, varsayılan MTU'ya sığar)
#define PACKET_INTERVAL_MS 32     // (1000 / SAMPLE_RATE) * SAMPLES_PER_PACKET = 32ms

// ─── Donanım Pinleri ────────────────────────────────────────────────────────
// DeneyapKart A1: Dahili mavi LED = GPIO 13 (LEDB)
// Standart ESP32 DevKit kullanıyorsanız LED_PIN'i 2 yapın.
#define LED_PIN       13      // DeneyapKart A1 dahili LED (LEDB)
#define POT_PIN       34      // Potansiyometre (BPM ayarı, opsiyonel)
// DIKKAT: DeneyapKart'ta "D8" etiketi GPIO 8 DEGIL!
// GPIO 6-11 SPI Flash'a bagli — kullanmak crash yapar.
// BOOT butonu (GPIO 0) tum ESP32 kartlarda guvenlidir.
#define BUTTON_PIN    0       // BOOT butonu (GPIO 0) — aritmia tetikleme

// ─── Pil Simülasyonu ────────────────────────────────────────────────────────
#define BATTERY_START_LEVEL  95
#define BATTERY_DRAIN_INTERVAL_MS 120000  // Her 2 dakikada 1% düşüş

// ─────────────────────────────────────────────────────────────────────────────
// Global Değişkenler
// ─────────────────────────────────────────────────────────────────────────────

BLEServer*         pServer         = nullptr;
BLECharacteristic* pECGChar        = nullptr;
BLECharacteristic* pBatteryChar    = nullptr;
BLECharacteristic* pFirmwareChar   = nullptr;

bool deviceConnected    = false;
bool oldDeviceConnected = false;
uint16_t sequenceNumber = 0;
uint8_t  batteryLevel   = BATTERY_START_LEVEL;

// ECG dalga formu üretimi
uint32_t sampleIndex     = 0;
float    heartRateBPM    = 72.0;
float    rrIntervalSamples;  // R-R aralığı (sample cinsinden)
float    nextRPeakAt;

// Zamanlayıcılar
unsigned long lastPacketTime   = 0;
unsigned long lastBatteryTime  = 0;
unsigned long lastLEDTime      = 0;
bool          ledState         = false;

// Aritmia simülasyonu
bool arrhythmiaMode = false;
unsigned long arrhythmiaStart = 0;
#define ARRHYTHMIA_DURATION_MS 10000  // 10 saniyelik aritmia

// ─────────────────────────────────────────────────────────────────────────────
// BLE Server Callbacks
// ─────────────────────────────────────────────────────────────────────────────

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println("[BLE] Cihaz baglandi!");
  }

  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    Serial.println("[BLE] Baglanti kesildi.");
    // Yeniden reklam yap — DELAY KULLANMA!
    // delay() burada BLE event callback'i bloklar ve stack corruption'a
    // yol acabilir. Bunun yerine reklami loop() icinde baslatiyoruz.
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ECG Dalga Formu Üreteci
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gaussian fonksiyonu — ECG dalga bilesenlerini modellemek icin.
 */
float gaussian(float x, float center, float width) {
  float diff = x - center;
  return exp(-(diff * diff) / (2.0 * width * width));
}

/**
 * Tek bir ECG ornegi uret (mV cinsinden).
 * 
 * Normal sinus ritmi modeli:
 *   - P dalgasi: QRS'den once kucuk pozitif yukselme
 *   - QRS kompleksi: Keskin R-peak, Q ve S sapmalari
 *   - T dalgasi: QRS'den sonra genis pozitif dalga
 *   - U dalgasi: Cok kucuk (gercekcilik icin)
 */
float generateECGSample(uint32_t idx) {
  // Beat icindeki konum (0.0 - 1.0)
  float beatStart = nextRPeakAt - rrIntervalSamples;
  float posInBeat = fmod((float)(idx - (uint32_t)beatStart), rrIntervalSamples) / rrIntervalSamples;
  if (posInBeat < 0) posInBeat += 1.0;

  float value = 0.0;

  if (arrhythmiaMode) {
    // PVC (Premature Ventricular Contraction) simulasyonu
    float jitter = sin(idx * 0.1) * 0.15;
    
    // Genis QRS
    value += gaussian(posInBeat, 0.20, 0.018) * 0.08;   // Kucuk P
    value -= gaussian(posInBeat, 0.22, 0.015) * 0.20;    // Derin Q
    value += gaussian(posInBeat, 0.25, 0.020) * 1.8;     // Yuksek R
    value -= gaussian(posInBeat, 0.30, 0.018) * 0.50;    // Derin S
    value += gaussian(posInBeat, 0.45, 0.060) * (-0.25); // Ters T
    value += jitter * gaussian(posInBeat, 0.60, 0.05);
  } else {
    // Normal Sinus Ritmi
    
    // P dalgasi
    value += gaussian(posInBeat, 0.12, 0.025) * 0.15;

    // Q dalgasi
    value -= gaussian(posInBeat, 0.20, 0.008) * 0.10;

    // R peak
    value += gaussian(posInBeat, 0.22, 0.010) * 1.20;

    // S dalgasi
    value -= gaussian(posInBeat, 0.24, 0.008) * 0.25;

    // T dalgasi
    value += gaussian(posInBeat, 0.38, 0.040) * 0.30;

    // U dalgasi
    value += gaussian(posInBeat, 0.50, 0.025) * 0.03;
  }

  // Bazal cizgi surüklenmesi
  value += sin((float)idx / SAMPLE_RATE * 0.3) * 0.02;

  // Gurultu ekleme
  value += ((float)random(-100, 100) / 100.0) * 0.015;

  return value;
}

/**
 * mV degerini ADC ham degerine cevir.
 * Mobil uygulama tersi yapar: raw * adcToMv = mV
 * Yani biz: mV / adcToMv = raw
 */
int16_t mvToADC(float mv) {
  return (int16_t)(mv / ADC_TO_MV);
}

// ─────────────────────────────────────────────────────────────────────────────
// BLE Paket Gönderimi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ECG paketini olustur ve BLE notification olarak gonder.
 * 
 * Paket formati (ECGParser.ts ile birebir uyumlu):
 *   Byte 0-1: uint16 sira numarasi (little-endian)
 *   Byte 2-3: uint16 ornek sayisi (little-endian)
 *   Byte 4+:  int16[] ADC degerleri (little-endian)
 */
void sendECGPacket() {
  // Guard: baglanti veya characteristic yoksa cik
  if (!deviceConnected || pECGChar == nullptr) return;

  const int packetSize = 4 + SAMPLES_PER_PACKET * 2;
  uint8_t packet[packetSize];

  // Header: sira numarasi (uint16 LE)
  packet[0] = sequenceNumber & 0xFF;
  packet[1] = (sequenceNumber >> 8) & 0xFF;

  // Header: ornek sayisi (uint16 LE)
  packet[2] = SAMPLES_PER_PACKET & 0xFF;
  packet[3] = (SAMPLES_PER_PACKET >> 8) & 0xFF;

  // Ornekleri uret ve pakete yaz
  for (int i = 0; i < SAMPLES_PER_PACKET; i++) {
    float mv = generateECGSample(sampleIndex);
    int16_t adcValue = mvToADC(mv);

    int offset = 4 + i * 2;
    packet[offset]     = adcValue & 0xFF;
    packet[offset + 1] = (adcValue >> 8) & 0xFF;

    sampleIndex++;

    // R-peak kontrolu — yeni beat
    if (sampleIndex >= (uint32_t)nextRPeakAt) {
      // HRV: R-R araligini varyasyonla degistir
      float variation = ((float)random(-50, 50) / 1000.0) * rrIntervalSamples;
      float newRR = rrIntervalSamples + variation;
      
      // Aritmia modunda duzensiz R-R
      if (arrhythmiaMode) {
        float extraVariation = ((float)random(-200, 200) / 1000.0) * rrIntervalSamples;
        newRR += extraVariation;
      }
      
      nextRPeakAt = sampleIndex + newRR;

      // LED'i yak (kalp atisi gostergesi)
      digitalWrite(LED_PIN, HIGH);
      ledState = true;
      lastLEDTime = millis();
    }
  }

  sequenceNumber++;

  // BLE notification gonder
  pECGChar->setValue(packet, packetSize);
  pECGChar->notify();
}

// ─────────────────────────────────────────────────────────────────────────────
// BLE Servis Kurulumu
// ─────────────────────────────────────────────────────────────────────────────

void setupBLE() {
  Serial.println("[BLE] Baslatiliyor...");

  // ── Watchdog'u BLE init suresi boyunca devre disi birak ──
  // BLEDevice::init() Bluedroid stack'i baslatiyor ve bu islem
  // 2-4 saniye surebilir. Varsayilan WDT timeout (5s) yetmiyor
  // cunku ardindan 3 servis + advertising de kurulmali.
  esp_task_wdt_deinit();  // WDT tamamen kapat
  Serial.println("[BLE] Watchdog gecici olarak devre disi");

  BLEDevice::init(DEVICE_NAME);
  Serial.println("[BLE] BLEDevice::init() OK");
  delay(200);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  Serial.println("[BLE] Server olusturuldu");
  delay(100);

  // === ECG Servisi (Heart Rate Service 0x180D) ===
  BLEService* ecgService = pServer->createService(ECG_SERVICE_UUID);
  
  pECGChar = ecgService->createCharacteristic(
    ECG_DATA_CHAR_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pECGChar->addDescriptor(new BLE2902());
  ecgService->start();
  Serial.println("[BLE] ECG servisi OK");
  delay(100);

  // === Battery Servisi (0x180F) ===
  BLEService* batteryService = pServer->createService(BATTERY_SERVICE_UUID);
  
  pBatteryChar = batteryService->createCharacteristic(
    BATTERY_LEVEL_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pBatteryChar->addDescriptor(new BLE2902());
  pBatteryChar->setValue(&batteryLevel, 1);
  batteryService->start();
  Serial.println("[BLE] Battery servisi OK");
  delay(100);

  // === Device Information Servisi (0x180A) ===
  BLEService* deviceInfoService = pServer->createService(DEVICE_INFO_SERVICE_UUID);
  
  pFirmwareChar = deviceInfoService->createCharacteristic(
    FIRMWARE_VERSION_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  pFirmwareChar->setValue(FIRMWARE_VERSION);
  deviceInfoService->start();
  Serial.println("[BLE] DeviceInfo servisi OK");
  delay(100);

  // === Reklam (Advertising) ===
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(ECG_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Reklam baslatildi — baglanti bekleniyor...");
  Serial.print("[BLE] Cihaz adi: ");
  Serial.println(DEVICE_NAME);

  // ── Watchdog'u yeniden etkinlestir ──
  esp_task_wdt_init(10, true);  // 10 saniye timeout, panic=true
  esp_task_wdt_add(NULL);       // Mevcut task'i WDT'ye ekle
  Serial.println("[BLE] Watchdog yeniden aktif (10s)");
}

// ─────────────────────────────────────────────────────────────────────────────
// Potansiyometre ile BPM Ayarlama
// ─────────────────────────────────────────────────────────────────────────────

void updateHeartRateFromPot() {
  int potValue = analogRead(POT_PIN);
  
  // Floating pin kontrolu (potansiyometre yoksa dalgalanmayi yoksay)
  static int lastPotValue = -1;
  if (lastPotValue != -1 && abs(potValue - lastPotValue) < 200) {
    return;  // Kucuk degisimler floating pin gurultusu — yoksay
  }
  lastPotValue = potValue;
  
  // 0-4095 → 40-180 BPM
  float newBPM = 40.0 + (potValue / 4095.0) * 140.0;
  
  // Ani degisimleri yumusat
  heartRateBPM = heartRateBPM * 0.9 + newBPM * 0.1;
  rrIntervalSamples = (60.0 / heartRateBPM) * SAMPLE_RATE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arduino Setup & Loop
// ─────────────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(1000);  // Seri port + PSRAM stabilizasyonu icin bekle
  Serial.println();
  Serial.println("========================================");
  Serial.println("  CardioGuard ESP32 Holter ECG Simulator");
  Serial.println("  DeneyapKart 1A | BLE Hazir");
  Serial.println("========================================");
  Serial.println();

  // PSRAM kontrolu
  if (psramFound()) {
    Serial.printf("[SYS] PSRAM: %u KB kullanilabilir\n", ESP.getFreePsram() / 1024);
  } else {
    Serial.println("[SYS] PSRAM bulunamadi (sorun degil, gerekli degil)");
  }
  Serial.printf("[SYS] Free Heap: %u KB\n", ESP.getFreeHeap() / 1024);

  // Pin ayarlari
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  analogReadResolution(12);  // ESP32 ADC 12-bit

  // ECG parametreleri baslat
  heartRateBPM = 72.0;
  rrIntervalSamples = (60.0 / heartRateBPM) * SAMPLE_RATE;
  nextRPeakAt = rrIntervalSamples;

  // BLE baslat
  Serial.println("[BLE] Baslatiliyor... (bu 2-3 sn surabilir)");
  delay(100);  // Watchdog'a nefes aldir
  setupBLE();

  Serial.println();
  Serial.println("[INFO] Komutlar:");
  Serial.println("  Potansiyometre (GPIO 34): BPM ayari (40-180)");
  Serial.println("  D8 butonu:                Aritmia modu");
  Serial.println("  Seri port 'b' + Enter:    BPM yazdir");
  Serial.println("  Seri port 'a' + Enter:    Aritmia tetikle");
  Serial.println("  Seri port '+' / '-':       BPM +10 / -10");
  Serial.println("  Seri port 'r':             Pil sifirla");
  Serial.println("  Seri port 'h':             Yardim");
  Serial.println();
}

void loop() {
  unsigned long now = millis();

  // Watchdog'u besle — loop dongusu 10s icinde donmezse reset olur
  esp_task_wdt_reset();

  // Baglanti durumu degisimi
  if (deviceConnected && !oldDeviceConnected) {
    sequenceNumber = 0;
    sampleIndex = 0;
    nextRPeakAt = rrIntervalSamples;
    Serial.println("[ECG] Streaming basliyor...");
    oldDeviceConnected = true;
  }
  if (!deviceConnected && oldDeviceConnected) {
    Serial.println("[ECG] Streaming durduruldu.");
    oldDeviceConnected = false;
    // Yeniden reklam baslatma — onDisconnect callback'i yerine
    // burada yapiyoruz cunku callback icindeki delay() BLE stack'i
    // bloklar ve bozuk disconnect/reconnect dongusune yol acar.
    delay(100);  // BLE stack cleanup icin minimal bekleme
    BLEDevice::startAdvertising();
    Serial.println("[BLE] Yeniden reklam baslatildi.");
  }

  // ECG Paket Gonderimi
  if (deviceConnected && (now - lastPacketTime >= PACKET_INTERVAL_MS)) {
    lastPacketTime = now;
    sendECGPacket();

    // Her 250 pakette (10 saniye) durum yazdir
    if (sequenceNumber % 250 == 0) {
      Serial.print("[ECG] seq=");
      Serial.print(sequenceNumber);
      Serial.print("  BPM=");
      Serial.print(heartRateBPM, 0);
      Serial.print("  pil=");
      Serial.print(batteryLevel);
      Serial.print("%  aritmia=");
      Serial.println(arrhythmiaMode ? "EVET" : "hayir");
    }
  }

  // Pil Simulasyonu
  if (now - lastBatteryTime >= BATTERY_DRAIN_INTERVAL_MS) {
    lastBatteryTime = now;
    if (batteryLevel > 5) batteryLevel--;
    
    if (deviceConnected) {
      pBatteryChar->setValue(&batteryLevel, 1);
      pBatteryChar->notify();
    }
    
    Serial.print("[BAT] Pil: ");
    Serial.print(batteryLevel);
    Serial.println("%");
  }

  // LED Kontrolu
  if (ledState && (now - lastLEDTime > 50)) {
    digitalWrite(LED_PIN, LOW);
    ledState = false;
  }

  // Potansiyometre (her 500ms)
  static unsigned long lastPotRead = 0;
  if (now - lastPotRead >= 500) {
    lastPotRead = now;
    updateHeartRateFromPot();
  }

  // BOOT Butonu -> Aritmia Tetikleme
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (!arrhythmiaMode) {
      arrhythmiaMode = true;
      arrhythmiaStart = now;
      Serial.println("[ECG] Aritmia modu AKTIF (PVC simulasyonu)");
    }
  }
  
  // Aritmia suresini kontrol et
  if (arrhythmiaMode && (now - arrhythmiaStart >= ARRHYTHMIA_DURATION_MS)) {
    arrhythmiaMode = false;
    Serial.println("[ECG] Normal ritim");
  }

  // Seri Port Komutlari
  if (Serial.available()) {
    char cmd = Serial.read();
    switch (cmd) {
      case 'b':
      case 'B':
        Serial.print("[INFO] BPM: ");
        Serial.print(heartRateBPM, 1);
        Serial.print("  R-R: ");
        Serial.print(rrIntervalSamples, 0);
        Serial.println(" samples");
        break;
      case 'a':
      case 'A':
        arrhythmiaMode = !arrhythmiaMode;
        arrhythmiaStart = now;
        Serial.print("[ECG] Aritmia: ");
        Serial.println(arrhythmiaMode ? "AKTIF" : "kapatildi");
        break;
      case 'r':
      case 'R':
        batteryLevel = BATTERY_START_LEVEL;
        if (deviceConnected && pBatteryChar) {
          pBatteryChar->setValue(&batteryLevel, 1);
          pBatteryChar->notify();
        }
        Serial.println("[BAT] Pil sifirlandi -> 95%");
        break;
      case '+':
        heartRateBPM = min(180.0f, heartRateBPM + 10.0f);
        rrIntervalSamples = (60.0 / heartRateBPM) * SAMPLE_RATE;
        Serial.print("[ECG] BPM artirildi -> ");
        Serial.println(heartRateBPM, 0);
        break;
      case '-':
        heartRateBPM = max(40.0f, heartRateBPM - 10.0f);
        rrIntervalSamples = (60.0 / heartRateBPM) * SAMPLE_RATE;
        Serial.print("[ECG] BPM azaltildi -> ");
        Serial.println(heartRateBPM, 0);
        break;
      case 'h':
      case 'H':
        Serial.println();
        Serial.println("=== Komutlar ===");
        Serial.println("  b: BPM goster");
        Serial.println("  a: Aritmia tetikle/kapat");
        Serial.println("  r: Pil sifirla");
        Serial.println("  +: BPM +10");
        Serial.println("  -: BPM -10");
        Serial.println("  h: Yardim");
        Serial.println();
        break;
    }
  }
}
