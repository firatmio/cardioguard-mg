# CardioGuard ESP32 Holter ECG Simulator

ESP32 geliştirme kartını bir **BLE Holter ECG cihazı** olarak simüle eden firmware.
CardioGuard mobil uygulamasına gerçek bir BLE cihazı gibi bağlanır ve sentetik ECG verileri gönderir.

---

## 🏗️ Mimari

```
┌──────────────────────┐         BLE          ┌──────────────────────┐
│   ESP32 Dev Board    │ ◄──────────────────► │  CardioGuard Mobile  │
│                      │                      │     (Patient App)    │
│  ┌────────────────┐  │   Heart Rate Svc     │                      │
│  │ ECG Waveform   │──┼──► 0x180D/0x2A37 ───►│  ECGParser.ts       │
│  │ Generator      │  │   (notification)     │  BLEManager.ts      │
│  └────────────────┘  │                      │                      │
│                      │   Battery Svc        │                      │
│  ┌────────────────┐  │   0x180F/0x2A19 ───►│  Battery Monitor     │
│  │ Battery Sim    │──┼──► (read + notify)   │                      │
│  └────────────────┘  │                      │                      │
│                      │   Device Info Svc    │                      │
│  ┌────────────────┐  │   0x180A/0x2A26 ───►│  Firmware Version    │
│  │ FW Version     │──┼──► (read)            │                      │
│  └────────────────┘  │                      │                      │
└──────────────────────┘                      └──────────────────────┘
```

---

## 📋 Gereksinimler

### Donanım
| Bileşen | Zorunlu | Açıklama |
|---------|---------|----------|
| **ESP32 Dev Board** | ✅ | ESP32-WROOM-32 veya benzeri (4MB flash) |
| USB Kablo | ✅ | Micro USB veya USB-C (karta göre) |
| Potansiyometre (10K) | ❌ | GPIO 34'e bağla — BPM ayarı (40-180) |
| LED | ❌ | GPIO 2 (dahili LED zaten var) — kalp atışı göstergesi |

### Yazılım
| Araç | Kurulum |
|------|---------|
| **PlatformIO** | `pip install platformio` veya VS Code PlatformIO eklentisi |
| **veya Arduino IDE** | Board Manager → ESP32 ekle |

---

## 🚀 Kurulum ve Yükleme

### Yöntem 1: PlatformIO (Önerilen)

```bash
# Proje klasörüne gir
cd esp32-holter-sim

# Derleme
pio run

# Yükleme (ESP32 USB ile bağlı olmalı)
pio run -t upload

# Seri monitor (115200 baud)
pio device monitor
```

### Yöntem 2: Arduino IDE

1. **Board Manager'da ESP32 ekle:**
   - File → Preferences → Additional Board URLs:
   - `https://dl.espressif.com/dl/package_esp32_index.json`

2. **Board ayarları:**
   - Board: `ESP32 Dev Module`
   - Upload Speed: `921600`
   - Flash Size: `4MB (32Mb)`
   - Partition Scheme: `Default 4MB with spiffs`

3. `src/main.cpp` dosyasını Arduino IDE'de aç ve yükle.

---

## 🔌 Pin Bağlantıları

```
ESP32 Dev Board
┌─────────────────────────┐
│                         │
│  GPIO 2  ──► Dahili LED │  Kalp atışı göstergesi (her R-peak'te yanar)
│                         │
│  GPIO 34 ──► POT orta   │  Potansiyometre: 0-3.3V → 40-180 BPM
│              POT uç1 → 3.3V
│              POT uç2 → GND
│                         │
│  GPIO 0  ──► BOOT Btn   │  Basınca aritmia modu (10 saniye PVC)
│                         │
│  USB     ──► PC         │  Seri monitor + güç
│                         │
└─────────────────────────┘
```

> **Not:** Potansiyometre opsiyoneldir. Bağlı değilse varsayılan 72 BPM kullanılır.
> Seri port üzerinden `+`/`-` tuşlarıyla da BPM ayarlanabilir.

---

## 📱 Mobil Uygulama ile Eşleştirme

### Ön Koşullar

1. **Development build** gerekli — Expo Go ile BLE çalışmaz:
   ```bash
   cd mobile
   npx expo run:android
   # veya
   npx expo run:ios
   ```

2. **Bluetooth açık** olmalı
3. **Konum izni** verilmeli (Android BLE taraması için gerekli)

### Eşleştirme Adımları

```
1. ESP32'yi çalıştır
   → Seri monitörde "Reklam başlatıldı — bağlantı bekleniyor..." mesajını gör

2. Mobil uygulamayı aç
   → Alt menüden "Cihaz" sekmesine git

3. "Cihaz Tara" butonuna bas
   → "CardioGuard-SIM" cihazı listede görünecek
   → RSSI (sinyal gücü) değeri de gösterilir

4. "CardioGuard-SIM" cihazına dokun → "Bağlan"
   → ESP32'nin LED'i hızlı yanıp sönecek
   → Serı monitörde "[BLE] Cihaz bağlandı!" mesajı

5. ECG Monitor ekranına geç
   → Canlı ECG dalga formu görünecek
   → BPM, sinyal kalitesi ve pil bilgisi güncellenecek
```

### Bağlantı Akışı (Teknik)

```
Mobil App                          ESP32
─────────                          ─────
scanForDevices()
  │
  ├─── BLE Scan (UUID: 0x180D) ──►  Advertising aktif
  │                                  Cihaz adı: "CardioGuard-SIM"
  │◄── Scan Response ────────────
  │
connect(deviceId)
  │
  ├─── Connect Request ──────────►  onConnect() callback
  │◄── Connected ─────────────────
  │
discoverAllServicesAndCharacteristics()
  │
  ├─── Service Discovery ────────►  3 servis + 3 characteristic
  │◄── Discovery Complete ───────
  │
readDeviceInfo()
  │
  ├─── Read Battery (0x2A19) ────►  95% (uint8)
  │◄── Battery Level ────────────
  │
  ├─── Read FW Version (0x2A26) ─►  "SIM-ESP32-1.0.0" (string)
  │◄── Firmware Version ─────────
  │
startECGStream()
  │
  ├─── Enable Notifications ─────►  CCCD write (0x2902)
  │◄── Notification Enabled ──────
  │
  │     ┌─── Her 40ms ──────────────┐
  │◄────┤ ECG Packet (24 byte)      │  Sürekli veri akışı
  │     │ [seq][count][10×ADC vals]  │
  │     └───────────────────────────┘
```

---

## 📡 BLE Protokolü

### Servisler ve Karakteristikler

| Servis | UUID | Karakteristik | UUID | Özellik |
|--------|------|---------------|------|---------|
| Heart Rate (ECG) | `0x180D` | ECG Data | `0x2A37` | Notify |
| Battery | `0x180F` | Battery Level | `0x2A19` | Read + Notify |
| Device Info | `0x180A` | Firmware Version | `0x2A26` | Read |

### ECG Paket Formatı

```
Byte Offset    Tür        Açıklama
──────────    ────        ────────
0-1           uint16 LE   Sıra numarası (0, 1, 2, ...)
2-3           uint16 LE   Bu paketteki örnek sayısı (10)
4-5           int16 LE    ADC değeri #1
6-7           int16 LE    ADC değeri #2
...
22-23         int16 LE    ADC değeri #10

Toplam: 24 byte/paket
Gönderim hızı: 40ms aralıkla (25 paket/saniye)
Örnekleme hızı: 10 × 25 = 250 Hz
```

### ADC → mV Dönüşümü

```
Mobil tarafta: mV = ADC_değeri × 0.00286
ESP32 tarafta: ADC_değeri = mV / 0.00286
```

---

## 🎮 Seri Port Komutları

ESP32 çalışırken seri port (115200 baud) üzerinden kontrol edebilirsiniz:

| Komut | İşlev |
|-------|-------|
| `b` | Mevcut BPM ve R-R aralığını göster |
| `a` | Aritmia modunu aç/kapat (PVC simülasyonu) |
| `r` | Pili sıfırla (→ 95%) |
| `+` | BPM +10 artır |
| `-` | BPM -10 azalt |
| `h` | Yardım menüsü |

### Aritmia Modu (PVC Simülasyonu)

- **BOOT butonu** (GPIO 0): Basınca 10 saniyelik aritmia tetiklenir
- **Seri port `a`**: Aritmia modunu açar/kapar
- PVC (Premature Ventricular Contraction) simüle eder:
  - Geniş QRS kompleksi
  - Ters T dalgası
  - Düzensiz R-R aralıkları
  - Mobil uygulamada sinyal kalitesi düşer

---

## 🫀 ECG Dalga Formu

Firmware, Gaussian fonksiyonlarıyla gerçekçi ECG dalga formu üretir:

### Normal Sinüs Ritmi
```
       R
       │╲
       │ ╲
  P    │  ╲         T
 ╱╲   │   ╲       ╱╲       U
╱  ╲  │    ╲     ╱  ╲     ╱╲
─────╲─│─────╲───╱────╲───╱──╲─── Bazal çizgi
      ╲│      ╲ ╱      ╲ ╱
       Q       S
```

- **P dalgası**: Atrial depolarizasyon (küçük pozitif)
- **QRS kompleksi**: Ventriküler depolarizasyon (keskin)
- **T dalgası**: Ventriküler repolarizasyon (geniş pozitif)
- **U dalgası**: Küçük (gerçekçilik için)

### Eklenen Varyasyonlar
- **HRV (Heart Rate Variability)**: R-R aralığı ±5% varyasyon
- **Bazal çizgi sürüklenmesi**: Yavaş sinüzoidal (0.3 Hz)
- **Gürültü**: ±0.015 mV rastgele

---

## 🔋 Pil Simülasyonu

- Başlangıç: **95%**
- Düşüş hızı: **1% / 2 dakika**
- Sıfırlama: Seri portta `r` komutu
- Mobil uygulamaya: Her 2 dakikada BLE notification + 5 dakikada bir read

---

## 🐛 Sorun Giderme

### ESP32 görünmüyor (mobil tarama)

| Sorun | Çözüm |
|-------|-------|
| Bluetooth kapalı | Telefon ayarlarından BT aç |
| Konum izni yok | Uygulama → İzinler → Konum → İzin ver |
| Expo Go kullanılıyor | `npx expo run:android` ile dev build yap |
| ESP32 uzak | Cihazları yakına getir (<5m) |
| ESP32 başka cihaza bağlı | ESP32'yi resetle / diğer bağlantıyı kes |

### Bağlantı kopuyor

| Sorun | Çözüm |
|-------|-------|
| Mesafe fazla | <3m mesafeye gelin |
| Güç yetersiz | USB güç kaynağını kontrol edin |
| Wi-Fi girişimi | 2.4 GHz Wi-Fi'dan uzaklaştırın |

### ECG verisi gelmiyor

| Sorun | Çözüm |
|-------|-------|
| Notification aktif değil | Seri monitörde "Cihaz bağlandı" mesajı var mı? |
| Cihaz bağlı ama veri yok | ESP32'yi resetleyin |
| Paket formatı sorunu | Seri monitörde `seq=` çıktılarını kontrol edin |

### Seri monitör açılmıyor

```bash
# Port'u bul
# Windows:
pio device list
# Linux/Mac:
ls /dev/ttyUSB* /dev/ttyACM*

# Monitör aç (115200 baud)
pio device monitor -b 115200
```

---

## 📁 Proje Yapısı

```
esp32-holter-sim/
├── platformio.ini          # PlatformIO konfigürasyonu
├── README.md               # Bu dosya
└── src/
    └── main.cpp            # Firmware kaynak kodu
```

---

## 📐 Mobil Uygulama Uyumluluk Matrisi

| Parametre | ESP32 Firmware | Mobil Uygulama | Eşleşme |
|-----------|---------------|----------------|---------|
| Cihaz adı | `CardioGuard-SIM` | prefix: `CardioGuard` | ✅ |
| ECG Service UUID | `0x180D` | `0x180D` | ✅ |
| ECG Char UUID | `0x2A37` | `0x2A37` | ✅ |
| Battery Service UUID | `0x180F` | `0x180F` | ✅ |
| Battery Char UUID | `0x2A19` | `0x2A19` | ✅ |
| Device Info UUID | `0x180A` | `0x180A` | ✅ |
| FW Version UUID | `0x2A26` | `0x2A26` | ✅ |
| Paket header | uint16 seq + uint16 count, LE | aynı | ✅ |
| Örnek formatı | int16 LE | int16 LE | ✅ |
| Örnek/paket | 10 | Dinamik (count'tan okur) | ✅ |
| ADC kalibrasyon | mV / 0.00286 | raw × 0.00286 | ✅ |
| Örnekleme hızı | 250 Hz | 250 Hz | ✅ |

---

## 🔄 Geliştirme Fikirleri

- [ ] OLED ekran ekleme (BPM, bağlantı durumu)
- [ ] SD karta ECG kaydı
- [ ] Wi-Fi + MQTT ile bulut bağlantısı
- [ ] Farklı aritmia türleri (AF, SVT, bradikardi)
- [ ] Çoklu lead simülasyonu (Lead I, II, III)
- [ ] OTA (Over-The-Air) firmware güncelleme
