<div align="center">

# ❤️ CardioGuard

### AI-Powered Cardiac Monitoring Platform

<p>
  <img src="https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/AI-MedGemma-red?style=for-the-badge" alt="AI" />
  <img src="https://img.shields.io/badge/License-Apache_2.0_(Commercial)-blue?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Status-In%20Development-orange?style=for-the-badge" alt="Status" />
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<br />

<p><strong>CardioGuard</strong> is an end-to-end health technology platform that collects real-time cardiac data from Holter ECG devices, <br /> performs anomaly detection using Google's <a href="https://deepmind.google/models/gemma/medgemma/">MedGemma</a> model, <br /> and provides clinical-grade monitoring.</p>

<br />

<table>
  <tr>
    <td align="center"><strong>📱 Mobile App</strong><br /><sub>Patient-side ECG monitoring</sub></td>
    <td align="center"><strong>🌐 Web</strong><br /><sub>Marketing & promotional website</sub></td>
    <td align="center"><strong>⚙️ Server</strong><br /><sub>API, AI inference & data processing</sub></td>
  </tr>
</table>

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [System Architecture](#-system-architecture)
- [Processing Logic](#-processing-logic)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Mobile Application](#-mobile-application)
- [Website](#-website)
- [Server (Backend)](#-server-backend)
- [Installation](#-installation)
- [Contributing](#-contributing)

---

## 🎯 About the Project

<table>
<tr>
<td width="60%">

CardioGuard is being developed to democratize early diagnosis of cardiovascular diseases. The platform consists of three core layers:

1. **Patient Mobile Application** — Connects to Holter ECG device via BLE, displays real-time ECG waveform, stores data locally, and synchronizes to the server.

2. **AI Backend Server** — Analyzes ECG data using the MedGemma model; detects arrhythmia, ST-segment changes, and other cardiac anomalies, sending instant alerts.

3. **Web Promotional Site** — Professional marketing website providing information about the platform, with pricing, download, and contact pages.

</td>
<td width="40%">

<div align="center">

**Target Users**

| Role | Usage |
|-----|----------|
| 🧑‍⚕️ **Doctors** | Remote monitoring of patient ECGs |
| 🫀 **Patients** | Daily cardiac health tracking |
| 🏥 **Clinics** | Bulk patient management |

</div>

</td>
</tr>
</table>

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CardioGuard Platform                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐         ┌──────────────────┐                      │
│  │  Holter ECG  │ ◄─BLE──►│   Mobile App     │                      │
│  │   Device     │         │  (React Native)  │                      │
│  └──────────────┘         │                  │                      │
│                           │ • ECG Waveform   │                      │
│                           │ • BPM Monitoring │                      │
│                           │ • Offline Storage│                      │
│                           │ • Auto Sync      │                      │
│                           └────────┬─────────┘                      │
│                                    │ REST API                       │
│                                    ▼                                │
│                           ┌──────────────────┐                      │
│                           │   FastAPI Server │                      │
│                           │                  │                      │
│                           │ • JWT Auth       │                      │
│                           │ • ECG Ingest     │                      │
│                           │ • MedGemma AI    │◄──── AI Inference    │
│                           │ • Push Alerts    │                      │
│                           │ • PostgreSQL     │                      │
│                           │ • Redis/Celery   │                      │
│                           └────────┬─────────┘                      │
│                                    │                                │
│                           ┌────────▼─────────┐                      │
│                           │   Web Frontend   │                      │
│                           │    (Next.js)     │                      │
│                           │                  │                      │
│                           │ • Landing Page   │                      │
│                           │ • Pricing        │                      │
│                           │ • Download       │                      │
│                           └──────────────────┘                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Processing Logic

The end-to-end data flow of the system occurs through the following steps:

### 1️⃣ Data Collection (Mobile ↔ BLE Device)

```
Holter ECG → BLE Notification → BLEManager → ECGParser → UI + SQLite
```

<table>
<tr>
<td width="50">📡</td>
<td>
The Holter ECG device continuously generates ECG signals at a <strong>250 Hz</strong> sampling rate, <strong>16-bit ADC</strong>, <strong>Lead II</strong> format. The device transmits raw binary data to the mobile application via BLE 4.2+ GATT service using <code>characteristic notification</code>.
</td>
</tr>
</table>

### 2️⃣ Data Processing (Mobile — On-Device)

<table>
<tr>
<td width="50">🔧</td>
<td>
<strong>ECGParser</strong> converts incoming raw byte data into structured ECG packets using little-endian binary parsing. ADC values are converted to millivolts (mV), signal quality estimation is performed (flat-line, noise, saturation checks). Data is divided into <strong>10-second segments</strong> and written to SQLite.
</td>
</tr>
</table>

### 3️⃣ Real-time Visualization

<table>
<tr>
<td width="50">📊</td>
<td>
The ECG waveform is drawn in real-time via a <strong>5-second circular display buffer</strong>. Instantaneous BPM (heart rate) is calculated using an <strong>R-peak detection</strong> algorithm and displayed to the user. Data reliability is reported with a signal quality indicator.
</td>
</tr>
</table>

### 4️⃣ Offline-First Synchronization

<table>
<tr>
<td width="50">🔄</td>
<td>
All data is written <strong>first to the local SQLite database</strong> — the application works seamlessly even without internet connection. The <strong>SyncQueue</strong> service sends accumulated segments to the server via <strong>batch upload</strong> when the device is online. An <strong>exponential backoff</strong> retry mechanism is triggered for failed transfers.
</td>
</tr>
</table>

### 5️⃣ AI Analysis (Server — MedGemma)

<table>
<tr>
<td width="50">🧠</td>
<td>
On the server side, received ECG segments are fed into Google's <strong>MedGemma</strong> medical AI model. The model detects the following anomalies:
<br /><br />
<code>bradycardia</code> · <code>tachycardia</code> · <code>irregular_rhythm</code> · <code>ST-segment changes</code> · <code>signal_loss</code> · <code>pause</code>
<br /><br />
Detected anomalies are classified by severity (<strong>info / warning / urgent / critical</strong>).
</td>
</tr>
</table>

### 6️⃣ Alert & Notification

<table>
<tr>
<td width="50">🔔</td>
<td>
When an anomaly is detected, the server notifies the patient and the relevant doctor via <strong>push notification</strong>. Notifications exhibit different sound and visual behaviors based on severity. Critical alerts are sent immediately, while informational alerts are sent in batches.
</td>
</tr>
</table>

## 🛠 Technology Stack

### Mobile Application (Patient App)

<table>
<tr>
<th align="left">Category</th>
<th align="left">Technology</th>
<th align="left">Description</th>
</tr>
<tr><td>Framework</td><td><img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?logo=react&logoColor=black" /></td><td>Cross-platform mobile development</td></tr>
<tr><td>Toolchain</td><td><img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" /></td><td>Development build, OTA updates</td></tr>
<tr><td>Language</td><td><img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" /></td><td>Type-safe development</td></tr>
<tr><td>BLE</td><td><code>react-native-ble-plx</code></td><td>Bluetooth Low Energy communication</td></tr>
<tr><td>Navigation</td><td><code>@react-navigation 7.x</code></td><td>Bottom Tab navigation</td></tr>
<tr><td>Database</td><td><code>expo-sqlite</code></td><td>Offline-first local storage</td></tr>
<tr><td>Security</td><td><code>expo-secure-store</code></td><td>Encrypted JWT token storage</td></tr>
<tr><td>Notifications</td><td><code>expo-notifications</code></td><td>Local + Push notification</td></tr>
<tr><td>Icons</td><td><code>lucide-react-native</code></td><td>Consistent icon set</td></tr>
</table>

### Website (Marketing)

<table>
<tr>
<th align="left">Category</th>
<th align="left">Technology</th>
<th align="left">Description</th>
</tr>
<tr><td>Framework</td><td><img src="https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js" /></td><td>App Router, SSR/SSG</td></tr>
<tr><td>UI Library</td><td><img src="https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react" /></td><td>React Compiler enabled</td></tr>
<tr><td>Language</td><td><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" /></td><td>Type-safe development</td></tr>
<tr><td>Styling</td><td>CSS Modules</td><td>Scoped, performant styles</td></tr>
<tr><td>Animation</td><td><code>framer-motion</code></td><td>Page and component animations</td></tr>
<tr><td>Images</td><td><code>next/image</code></td><td>Automatic AVIF/WebP conversion</td></tr>
<tr><td>Font</td><td>Inter (Google Fonts)</td><td>Optimized with <code>next/font</code></td></tr>
<tr><td>Icons</td><td><code>lucide-react</code></td><td>Consistent icon set</td></tr>
<tr><td>Deploy</td><td><img src="https://img.shields.io/badge/Vercel-black?logo=vercel" /></td><td>Edge CDN, automatic deployment</td></tr>
</table>

### Server (Backend API)

<table>
<tr>
<th align="left">Category</th>
<th align="left">Technology</th>
<th align="left">Description</th>
</tr>
<tr><td>Framework</td><td><img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" /></td><td>Async REST API</td></tr>
<tr><td>Language</td><td><img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" /></td><td>Async/await support</td></tr>
<tr><td>ASGI Server</td><td><code>uvicorn</code></td><td>Hot-reload development</td></tr>
<tr><td>Database</td><td><img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" /></td><td>SQLAlchemy ORM + Alembic migration</td></tr>
<tr><td>Cache / Queue</td><td><img src="https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white" /></td><td>Celery task queue</td></tr>
<tr><td>AI Model</td><td><img src="https://img.shields.io/badge/MedGemma-4285F4?logo=google&logoColor=white" /></td><td>Medical ECG analysis</td></tr>
<tr><td>ML Stack</td><td><code>PyTorch</code> · <code>NumPy</code> · <code>SciPy</code> · <code>scikit-learn</code></td><td>Signal processing & model inference</td></tr>
<tr><td>Auth</td><td><code>python-jose</code> · <code>passlib</code></td><td>JWT + bcrypt</td></tr>
<tr><td>Logging</td><td><code>loguru</code></td><td>Structured logging</td></tr>
</table>

---

## 📁 Project Structure

```
cardioguard/
│
├── mobile/                     # 📱 React Native patient application
│   ├── App.tsx                 # Application entry point
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ECGWaveform.tsx       # Real-time ECG waveform
│   │   │   ├── HeartRateDisplay.tsx  # Live BPM display
│   │   │   ├── AlertCard.tsx         # Anomaly alert card
│   │   │   ├── MetricCard.tsx        # Metric display card
│   │   │   ├── DeviceStatusBadge.tsx # Device status indicator
│   │   │   ├── RecordingCard.tsx     # Recording session card
│   │   │   └── SyncStatusBar.tsx     # Synchronization status
│   │   ├── screens/            # Screens (5 tabs)
│   │   │   ├── DashboardScreen.tsx   # Main dashboard — metrics & alerts
│   │   │   ├── ECGMonitorScreen.tsx  # Live ECG monitoring
│   │   │   ├── HistoryScreen.tsx     # Past recordings & events
│   │   │   ├── DeviceScreen.tsx      # BLE device management
│   │   │   └── SettingsScreen.tsx    # Application settings
│   │   ├── services/           # Business logic services (Singleton)
│   │   │   ├── ble/
│   │   │   │   ├── BLEManager.ts     # BLE connection management
│   │   │   │   └── ECGParser.ts      # Raw byte → ECG converter
│   │   │   ├── api/
│   │   │   │   └── ApiClient.ts      # JWT auth, retry, offline-aware
│   │   │   ├── storage/
│   │   │   │   ├── LocalDatabase.ts  # SQLite offline storage
│   │   │   │   └── SyncQueue.ts      # Batch synchronization queue
│   │   │   └── notifications/
│   │   │       └── NotificationService.ts
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useECGStream.ts       # ECG data stream hook
│   │   │   ├── useDeviceConnection.ts
│   │   │   ├── useNetworkStatus.ts
│   │   │   └── useOfflineSync.ts
│   │   ├── context/            # React Context providers
│   │   │   ├── AppProvider.tsx       # Main context composer
│   │   │   ├── DeviceContext.tsx      # BLE device state
│   │   │   └── PatientContext.tsx     # Patient profile
│   │   ├── types/              # TypeScript type definitions
│   │   ├── constants/          # Theme & configuration constants
│   │   ├── navigation/         # Bottom tab navigation
│   │   └── utils/              # Helper functions
│   └── package.json
│
├── web/                        # 🌐 Next.js marketing website
│   ├── app/
│   │   ├── page.tsx            # Homepage (Hero, Stats, Features...)
│   │   ├── layout.tsx          # Root layout + metadata
│   │   ├── globals.css         # Global styles & CSS variables
│   │   ├── about/              # About page
│   │   ├── features/           # Features page
│   │   ├── pricing/            # Pricing (Free / Pro / Enterprise)
│   │   ├── download/           # Download page (iOS & Android)
│   │   ├── contact/            # Contact form
│   │   ├── get-started/        # Role selection (Patient / Doctor)
│   │   ├── privacy/            # Privacy policy
│   │   ├── terms/              # Terms of service
│   │   └── components/         # Shared UI components
│   │       ├── Header/
│   │       ├── Footer/
│   │       ├── Hero/
│   │       ├── Features/
│   │       ├── HowItWorks/
│   │       ├── Stats/
│   │       ├── CallToAction/
│   │       └── ...
│   ├── next.config.ts
│   └── package.json
│
├── server/                     # ⚙️ FastAPI backend server
│   ├── main.py                 # API endpoints
│   ├── storage.py              # Database layer
│   └── requirements.txt        # Python dependencies
│
└── README.md                   # 📄 This file
```

---

## 📱 Mobile Application

<details>
<summary><strong>📐 Architecture Patterns</strong></summary>
<br />

| Pattern | Usage |
|-------|----------|
| **Singleton** | All services (`BLEManager`, `ApiClient`, `LocalDatabase`, `SyncQueue`, `NotificationService`) |
| **Context/Provider** | `DeviceContext` (BLE state) + `PatientContext` (patient info) |
| **Custom Hooks** | Service abstraction layer (`useECGStream`, `useDeviceConnection`, etc.) |
| **Offline-First** | Data written to local first, then synchronized |
| **Observer/Listener** | Event listener for BLE data stream and sync status |
| **Batch Processing** | ECG segments uploaded to backend in batches |

</details>

<details>
<summary><strong>📱 Screens</strong></summary>
<br />

| Screen | Description |
|-------|----------|
| **Dashboard** | Live BPM, device status, daily metrics (avg BPM, recording duration, anomaly count), recent alerts |
| **ECG Monitor** | 250 Hz real-time waveform, live BPM, signal quality indicator, recording controls |
| **History** | Past recording sessions and clinical events. Two tabs: Recordings / Events |
| **Device** | BLE device scanning, connect/disconnect, battery & firmware info, troubleshooting |
| **Settings** | Notification preferences, sync status, device info, about/legal, logout |

</details>

<details>
<summary><strong>📦 Database Schema (SQLite)</strong></summary>
<br />

```sql
-- 10-second ECG data segments
ecg_segments     (id, session_id, start_time, end_time, data_blob, sample_rate, synced)

-- Clinical events (anomaly, alert, etc.)
clinical_events  (id, type, severity, timestamp, details, acknowledged, synced)

-- Recording sessions
recording_sessions (id, start_time, end_time, duration, avg_bpm, quality_score)

-- Offline synchronization queue
sync_queue       (id, entity_type, entity_id, action, retry_count, last_attempt)
```

</details>

---

## 🌐 Website

Marketing website built with Next.js 16 App Router, fully pre-rendered statically.

<details>
<summary><strong>📄 Pages</strong></summary>
<br />

| Page | Route | Description |
|-------|-------|----------|
| Homepage | `/` | Hero, stats, features, app visuals, how it works, testimonials, CTA |
| About | `/about` | Mission, technology, values, team |
| Features | `/features` | Detailed feature categories (Monitoring, AI, Security) |
| Pricing | `/pricing` | 3 plans: Personal (Free), Professional, Enterprise |
| Download | `/download` | iOS/Android store links, system requirements |
| Contact | `/contact` | Contact form + info |
| Get Started | `/get-started` | Role selection → Patient (download) / Doctor (pricing) |
| Privacy | `/privacy` | HIPAA & GDPR compliant privacy policy |
| Terms | `/terms` | Terms of service |

</details>

<details>
<summary><strong>⚡ Performance Optimizations</strong></summary>
<br />

- **LCP Optimization** — CSS `@keyframes` animations instead of framer-motion in Hero component; LCP image preload with `<Image priority>`
- **Lazy Loading** — Below-fold components code-split with `next/dynamic`
- **Image Optimization** — Automatic AVIF/WebP conversion with `next/image`, responsive `srcset`
- **React Compiler** — Automatic memoization to prevent unnecessary re-renders
- **Static Generation** — All pages pre-rendered at build-time (SSG)
- **WCAG AA** — Color contrast ≥ 4.5:1, semantic HTML, heading order

</details>

---

## ⚙️ Server (Backend)

<details>
<summary><strong>🔌 API Endpoints</strong></summary>
<br />

| Method | Endpoint | Description |
|--------|----------|----------|
| `GET` | `/health` | Server health check |
| `GET` | `/ingest/ecg` | ECG data ingestion |
| `GET` | `/ingest/features` | Feature data ingestion |
| `GET` | `/patient/{id}/status` | Patient status query |
| `GET` | `/doctor/{id}/patients` | Doctor's patient list |

</details>

<details>
<summary><strong>🧠 AI Pipeline (Planned)</strong></summary>
<br />

```
ECG Segment (10s)
      │
      ▼
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│  Preprocessing │────►│   MedGemma    │────►│ Classification│
│  (SciPy)       │     │  AI Model     │     │  + Scoring    │
│                │     │               │     │               │
│ • Filter       │     │ • Feature     │     │ • Anomaly     │
│ • Normalize    │     │   Extraction  │     │   Type        │
│ • Segment      │     │ • Inference   │     │ • Severity    │
└─────────────┘     └───────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │ Notification │
                                          │ Delivery     │
                                          │ (Push/SMS)   │
                                          └──────────────┘
```

</details>

---

## 🚀 Installation

### Requirements

<table>
<tr>
<td>

**Mobile Development**
- Node.js ≥ 18
- Expo CLI
- Android Studio / Xcode
- Physical device with BLE 4.2+ support

</td>
<td>

**Web Development**
- Node.js ≥ 18
- Bun or npm

</td>
<td>

**Backend Development**
- Python ≥ 3.11
- PostgreSQL 15+
- Redis

</td>
</tr>
</table>

### Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-org/cardioguard.git
cd cardioguard
```

<table>
<tr>
<td>

**📱 Mobile**
```bash
cd mobile
npm install
npx expo start
```

</td>
<td>

**🌐 Web**
```bash
cd web
npm install
npm run dev
```

</td>
<td>

**⚙️ Server**
```bash
cd server
pip install -r requirements.txt
uvicorn server.main:app --reload
```

</td>
</tr>
</table>

---

## 🔒 Security & Compliance

<table>
<tr>
<td align="center">🏥<br /><strong>HIPAA</strong></td>
<td align="center">🇪🇺<br /><strong>GDPR</strong></td>
<td align="center">🔐<br /><strong>JWT + bcrypt</strong></td>
<td align="center">📱<br /><strong>SecureStore</strong></td>
<td align="center">🗄️<br /><strong>AES-256</strong></td>
</tr>
<tr>
<td align="center"><sub>Health data<br />compliance</sub></td>
<td align="center"><sub>Data protection<br />regulation</sub></td>
<td align="center"><sub>Token-based<br />authentication</sub></td>
<td align="center"><sub>Encrypted<br />local storage</sub></td>
<td align="center"><sub>Sensitive data<br />encryption</sub></td>
</tr>
</table>

---

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<div align="center">

<br />

**CardioGuard** makes cardiac health tracking accessible to everyone.

<br />

<img src="https://img.shields.io/badge/Made_with-❤️-red?style=for-the-badge" alt="Made with love" />
<img src="https://img.shields.io/badge/Powered_by-InNova-4285F4?style=for-the-badge&logo=google" alt="Powered by InNova" />

<br />
<br />

<sub>© 2026 CardioGuard. All rights reserved.</sub>

</div>
