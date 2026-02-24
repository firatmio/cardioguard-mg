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
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FFCA28?logo=firebase" alt="Firebase" />
</p>

<br />

<p><strong>CardioGuard</strong> is an end-to-end health technology platform that collects real-time cardiac data from Holter ECG devices, <br /> performs anomaly detection using a multi-layer AI pipeline (CNN + Rule Engine + <a href="https://deepmind.google/models/gemma/medgemma/">MedGemma</a>), <br /> and provides clinical-grade monitoring for patients and doctors.</p>

<br />

<table>
  <tr>
    <td align="center"><strong>📱 Mobile App</strong><br /><sub>Patient-side ECG monitoring<br />BLE connection &amp; offline-first</sub></td>
    <td align="center"><strong>🌐 Web App</strong><br /><sub>Doctor dashboard &amp; marketing site<br />Patient management &amp; alerts</sub></td>
    <td align="center"><strong>⚙️ Server</strong><br /><sub>3-layer AI pipeline<br />REST API &amp; real-time webhooks</sub></td>
    <td align="center"><strong>🔧 ESP32 Simulator</strong><br /><sub>Holter ECG device simulator<br />BLE GATT service</sub></td>
  </tr>
</table>

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [System Architecture](#-system-architecture)
- [AI Pipeline](#-ai-pipeline)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Mobile Application](#-mobile-application)
- [Web Application](#-web-application)
- [Server (Backend)](#-server-backend)
- [ESP32 Holter Simulator](#-esp32-holter-simulator)
- [Installation](#-installation)
- [API Reference](#-api-reference)
- [Security & Compliance](#-security--compliance)
- [Contributing](#-contributing)

---

## 🎯 About the Project

<table>
<tr>
<td width="70%">

CardioGuard is being developed to democratize early diagnosis of cardiovascular diseases. The platform consists of four core components:

1. **Patient Mobile Application** — Connects to a Holter ECG device via BLE, renders real-time ECG waveforms, stores data offline-first in SQLite, and synchronizes to the server through a pipeline API.

2. **AI Backend Server** — Processes ECG data through a 3-layer AI pipeline: CNN-based signal analysis, rule-based decision engine, and MedGemma LLM for human-readable report generation. Sends real-time alerts via push notifications, SMS, and WebSocket.

3. **Web Application** — Dual-purpose Next.js app serving both a professional marketing website and a fully functional doctor dashboard with patient management, alert monitoring, and analytics.

4. **ESP32 Holter Simulator** — Hardware simulator that generates realistic ECG waveforms (normal sinus, tachycardia, bradycardia, arrhythmia, noise) via BLE, enabling development without physical medical devices.

</td>
<td width="30%">

<div align="center">

**Target Users**

| Role | Usage |
|------|-------|
| 🫀 **Patients** | Daily cardiac health tracking via mobile app |
| 🧑‍⚕️ **Doctors** | Remote patient monitoring via web dashboard |
| 🏥 **Clinics** | Bulk patient management |
| 👨‍👩‍👧 **Emergency Contacts** | SMS alerts for critical events |

</div>

</td>
</tr>
</table>

---

## 🏗 System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CardioGuard Platform                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌───────────────────────┐                          │
│  │  Holter ECG  │◄──BLE──►│    Mobile App         │                          │
│  │  Device /    │         │  (React Native/Expo)  │                          │
│  │  ESP32 Sim   │         │                       │                          │
│  └──────────────┘         │ • Real-time ECG       │                          │
│                           │ • BPM Monitoring      │                          │
│                           │ • Offline SQLite      │                          │
│                           │ • Auth (Google/Email) │                          │
│                           │ • 4-step Onboarding   │                          │
│                           └───────────┬───────────┘                          │
│                                       │ REST API                             │
│                                       ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────┐      │
│  │                      FastAPI Server                                │      │
│  │                                                                    │      │
│  │  ┌─────────────┐   ┌──────────────────┐   ┌───────────────────┐    │      │
│  │  │ Signal AI   │──►│ Decision Engine  │──►│  MedGemma LLM     │    │      │
│  │  │ (CNN +      │   │ (Rule-based +    │   │  (Report          │    │      │
│  │  │ Autoencoder)│   │  Threshold)      │   │   Generation)     │    │      │
│  │  └─────────────┘   └──────────────────┘   └───────────────────┘    │      │
│  │                                                                    │      │
│  │  • Firebase Auth (JWT)          • Webhooks (FCM / SMS / WS)        │      │
│  │  • Firestore Database           • Prometheus Metrics               │      │
│  │  • Celery + Redis Workers       • Rate Limiting                    │      │
│  └────────────────────────────────────┬───────────────────────────────┘      │
│                                       │                                      │
│                           ┌───────────▼───────────┐                          │
│                           │    Web Application    │                          │
│                           │     (Next.js 16)      │                          │
│                           │                       │                          │
│                           │ • Doctor Dashboard    │                          │
│                           │ • Patient Management  │                          │
│                           │ • Alert Monitoring    │                          │
│                           │ • Marketing Pages     │                          │
│                           └───────────────────────┘                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 AI Pipeline

The server implements a **3-layer AI architecture** where each layer has a distinct responsibility and data flows strictly in one direction:

```
[ECG Data] ──► [Signal AI] ──► [Decision Engine] ──► [MedGemma LLM]
                  Layer 1          Layer 2               Layer 3
```

### Layer 1 — Signal AI (`ai_signal/`)

<table>
<tr>
<td width="50">🔬</td>
<td>
<strong>Type:</strong> 1D CNN + Autoencoder (or Threshold Analyzer in simplified mode)<br />
<strong>Task:</strong> ECG signal analysis, feature extraction, anomaly scoring<br />
<strong>Output:</strong> Structured analysis result — anomaly score, pattern type, cardiac features (HR, HRV, SDNN, RMSSD, ectopic beats)<br />
<strong>Detected Patterns:</strong> <code>normal</code> · <code>tachycardia</code> · <code>bradycardia</code> · <code>irregular_rr</code> · <code>pvc</code> · <code>pac</code> · <code>afib_suspect</code> · <code>artifact</code> · <code>noise</code>
</td>
</tr>
</table>

### Layer 2 — Decision Engine (`decision_engine/`)

<table>
<tr>
<td width="50">⚖️</td>
<td>
<strong>Type:</strong> Rule-based evaluation + temporal analysis + patient baseline comparison<br />
<strong>Task:</strong> Determines severity, triggers actions, tracks trends over time<br />
<strong>Rules:</strong> 10 configurable rules including HR thresholds, anomaly scoring, HRV analysis, AFib pattern detection, persistent anomaly tracking, worsening trend detection, and personal baseline deviation<br />
<strong>Output:</strong> EventDecision with severity level (<code>info</code> / <code>low</code> / <code>moderate</code> / <code>high</code> / <code>critical</code>), action recommendations, notification targets
</td>
</tr>
</table>

### Layer 3 — MedGemma LLM (`llm_layer/`)

<table>
<tr>
<td width="50">📝</td>
<td>
<strong>Model:</strong> Google MedGemma (medgemma-1.5-4b-it) via API, or Mock mode for development<br />
<strong>Task:</strong> Generates human-readable clinical reports. Separate prompts for doctor (technical) and patient (simplified) audiences<br />
<strong>Important:</strong> MedGemma does NOT analyze or make decisions — it only formats existing analysis into readable reports<br />
<strong>Output:</strong> Doctor report (clinical findings, baseline comparison, recommendations) + Patient-friendly explanation
</td>
</tr>
</table>

### Emergency Contact Chain

When a **critical** or **high** severity event is detected:
1. **Emergency Contact SMS** — Patient's designated contact receives an alert via Twilio
2. **Doctor FCM Push** — Attending physician gets an urgent push notification
3. **Firestore Record** — Emergency alert record is created for audit trail

---

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
<tr><td>Auth</td><td><code>Firebase Auth</code> + <code>Google Sign-In</code></td><td>Email/password + Google OAuth</td></tr>
<tr><td>BLE</td><td><code>react-native-ble-plx</code></td><td>Bluetooth Low Energy communication</td></tr>
<tr><td>Navigation</td><td><code>@react-navigation 7.x</code></td><td>Stack + Bottom Tab navigation</td></tr>
<tr><td>Database</td><td><code>expo-sqlite</code></td><td>Offline-first local storage</td></tr>
<tr><td>Security</td><td><code>expo-secure-store</code></td><td>Encrypted token storage</td></tr>
<tr><td>Notifications</td><td><code>expo-notifications</code></td><td>Local + Push notifications</td></tr>
<tr><td>Icons</td><td><code>lucide-react-native</code></td><td>Consistent icon set</td></tr>
</table>

### Web Application (Dashboard + Marketing)

<table>
<tr>
<th align="left">Category</th>
<th align="left">Technology</th>
<th align="left">Description</th>
</tr>
<tr><td>Framework</td><td><img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" /></td><td>App Router, SSR/SSG</td></tr>
<tr><td>UI Library</td><td><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" /></td><td>React Compiler enabled</td></tr>
<tr><td>Language</td><td><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" /></td><td>Type-safe development</td></tr>
<tr><td>Auth</td><td><code>Firebase Auth</code></td><td>Doctor login with role verification</td></tr>
<tr><td>Database</td><td><code>Firebase Firestore</code> + <code>Realtime DB</code></td><td>Patient data, alerts, analytics</td></tr>
<tr><td>Styling</td><td>CSS Modules</td><td>Scoped, performant styles</td></tr>
<tr><td>Animation</td><td><code>framer-motion</code></td><td>Page and component animations</td></tr>
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
<tr><td>Framework</td><td><img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" /></td><td>Async REST API + WebSocket</td></tr>
<tr><td>Language</td><td><img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" /></td><td>Async/await support</td></tr>
<tr><td>Database</td><td><img src="https://img.shields.io/badge/Firebase_Firestore-FFCA28?logo=firebase&logoColor=black" /></td><td>NoSQL document database</td></tr>
<tr><td>Auth</td><td><code>Firebase Admin SDK</code></td><td>Token verification + role-based access</td></tr>
<tr><td>AI / ML</td><td><code>PyTorch</code> · <code>NumPy</code> · <code>SciPy</code> · <code>scikit-learn</code></td><td>Signal processing & model inference</td></tr>
<tr><td>Medical Signal</td><td><code>NeuroKit2</code> · <code>BioSPPy</code></td><td>R-peak detection, HRV analysis</td></tr>
<tr><td>LLM</td><td><img src="https://img.shields.io/badge/MedGemma-4285F4?logo=google&logoColor=white" /></td><td>Medical report generation</td></tr>
<tr><td>Queue</td><td><code>Celery</code> + <code>Redis</code></td><td>Background task processing</td></tr>
<tr><td>SMS</td><td><code>Twilio</code></td><td>Emergency SMS notifications</td></tr>
<tr><td>Monitoring</td><td><code>Prometheus</code></td><td>Metrics & performance tracking</td></tr>
<tr><td>Server</td><td><code>Uvicorn</code></td><td>ASGI server with hot-reload</td></tr>
</table>

### ESP32 Holter Simulator

<table>
<tr>
<th align="left">Category</th>
<th align="left">Technology</th>
<th align="left">Description</th>
</tr>
<tr><td>Platform</td><td><img src="https://img.shields.io/badge/ESP32-333?logo=espressif&logoColor=white" /></td><td>BLE-capable microcontroller</td></tr>
<tr><td>Framework</td><td>Arduino / PlatformIO</td><td>Embedded development</td></tr>
<tr><td>Protocol</td><td>BLE 4.2+ GATT</td><td>ECG data streaming via notifications</td></tr>
<tr><td>Scenarios</td><td>5 ECG patterns</td><td>Normal, tachycardia, bradycardia, arrhythmia, noise</td></tr>
</table>

---

## 📁 Project Structure

```
cardioguard/
│
├── mobile/                          # 📱 React Native patient application
│   ├── App.tsx                      # Application entry point
│   ├── src/
│   │   ├── screens/
│   │   │   ├── auth/                # Authentication screens
│   │   │   │   ├── WelcomeScreen.tsx     # Welcome + social login
│   │   │   │   ├── LoginScreen.tsx       # Email/password login
│   │   │   │   └── RegisterScreen.tsx    # New account registration
│   │   │   ├── onboarding/         # Patient onboarding (4-step)
│   │   │   │   ├── PersonalInfoScreen.tsx    # Name, DOB, gender
│   │   │   │   ├── MedicalHistoryScreen.tsx  # Conditions & allergies
│   │   │   │   ├── MedicationsScreen.tsx     # Current medications
│   │   │   │   └── EmergencyContactScreen.tsx # Emergency contact info
│   │   │   ├── DashboardScreen.tsx      # Main dashboard — metrics & alerts
│   │   │   ├── ECGMonitorScreen.tsx     # Live ECG waveform monitoring
│   │   │   ├── HistoryScreen.tsx        # Past recordings & events
│   │   │   ├── DeviceScreen.tsx         # BLE device management
│   │   │   └── SettingsScreen.tsx       # App settings & preferences
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ECGWaveform.tsx          # Real-time ECG waveform renderer
│   │   │   ├── HeartRateDisplay.tsx     # Live BPM display
│   │   │   ├── AlertCard.tsx            # Anomaly alert card
│   │   │   ├── MetricCard.tsx           # Metric display card
│   │   │   ├── DeviceStatusBadge.tsx    # Device connection status
│   │   │   ├── RecordingCard.tsx        # Recording session card
│   │   │   └── SyncStatusBar.tsx        # Sync progress indicator
│   │   ├── services/                # Business logic (Singleton pattern)
│   │   │   ├── ble/
│   │   │   │   ├── BLEManager.ts        # BLE connection lifecycle
│   │   │   │   ├── BLESimulator.ts      # Software BLE simulator
│   │   │   │   └── ECGParser.ts         # Raw bytes → ECG data
│   │   │   ├── api/
│   │   │   │   ├── ApiClient.ts         # HTTP client with JWT & retry
│   │   │   │   └── PipelineService.ts   # Server AI pipeline integration
│   │   │   ├── storage/
│   │   │   │   ├── LocalDatabase.ts     # SQLite offline storage
│   │   │   │   └── SyncQueue.ts         # Batch sync queue
│   │   │   ├── background/
│   │   │   │   └── BackgroundBLEService.ts  # Background BLE monitoring
│   │   │   ├── firebase/
│   │   │   │   └── auth.ts              # Firebase auth service
│   │   │   └── notifications/
│   │   │       └── NotificationService.ts
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useECGStream.ts          # ECG data stream
│   │   │   ├── useDeviceConnection.ts   # BLE device management
│   │   │   ├── useGoogleAuth.ts         # Google Sign-In hook
│   │   │   ├── useBLEPermissions.ts     # BLE permission handling
│   │   │   ├── useNetworkStatus.ts      # Network connectivity
│   │   │   └── useOfflineSync.ts        # Offline sync management
│   │   ├── context/                 # React Context providers
│   │   │   ├── AppProvider.tsx          # Root context composer
│   │   │   ├── AuthContext.tsx          # Authentication state
│   │   │   ├── DeviceContext.tsx        # BLE device state
│   │   │   └── PatientContext.tsx       # Patient profile
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx         # Stack + Bottom Tab routing
│   │   ├── types/                   # TypeScript definitions
│   │   ├── constants/               # Theme & config constants
│   │   └── utils/                   # Helper functions
│   └── package.json
│
├── web/                             # 🌐 Next.js web application
│   ├── app/
│   │   ├── page.tsx                 # Homepage (Hero, Stats, Features)
│   │   ├── layout.tsx               # Root layout + metadata
│   │   ├── globals.css              # Global styles & CSS variables
│   │   ├── login/                   # Doctor login page
│   │   ├── dashboard/               # 🏥 Doctor Dashboard
│   │   │   ├── page.tsx                 # Overview — stats & charts
│   │   │   ├── layout.tsx               # Dashboard shell + sidebar
│   │   │   ├── patients/               # Patient management
│   │   │   │   ├── page.tsx                # Patient list + add modal
│   │   │   │   └── [id]/page.tsx           # Patient detail + ECG data
│   │   │   ├── alerts/                  # Alert monitoring
│   │   │   │   └── page.tsx                # Alert list + acknowledge
│   │   │   └── settings/               # Dashboard settings
│   │   │       └── page.tsx                # Preferences & profile
│   │   ├── about/                   # About page
│   │   ├── features/                # Features page
│   │   ├── pricing/                 # Pricing (Free / Pro / Enterprise)
│   │   ├── download/                # Download (iOS & Android)
│   │   ├── contact/                 # Contact form
│   │   ├── get-started/             # Role selection → onboarding
│   │   ├── privacy/                 # HIPAA & GDPR privacy policy
│   │   ├── terms/                   # Terms of service
│   │   └── components/              # Shared UI components
│   ├── lib/
│   │   ├── api.ts                   # Backend API client
│   │   └── firebase/                # Firebase integration
│   │       ├── config.ts                # Firebase app initialization
│   │       ├── auth.ts                  # Auth helpers (role check)
│   │       ├── firestore.ts             # Firestore CRUD operations
│   │       ├── realtime.ts              # Realtime DB subscriptions
│   │       ├── hooks.ts                 # React hooks for Firebase
│   │       └── types.ts                 # Firebase data types
│   ├── scripts/
│   │   └── seed.ts                  # Test data seeding script
│   └── package.json
│
├── server/                          # ⚙️ FastAPI backend server
│   ├── main.py                      # App entry point, middleware, health
│   ├── requirements.txt             # Python dependencies
│   ├── api/                         # REST API endpoints
│   │   ├── auth.py                      # Firebase Auth middleware
│   │   ├── users.py                     # User profile management
│   │   ├── patients.py                  # Patient CRUD + status
│   │   ├── alerts.py                    # Alert management
│   │   ├── ingest.py                    # ECG data ingestion
│   │   ├── results.py                   # Analysis result queries
│   │   ├── pipeline.py                  # AI pipeline endpoint
│   │   └── webhooks.py                  # Push, SMS, WebSocket notifications
│   ├── ai_signal/                   # Layer 1: Signal AI
│   │   ├── model.py                     # CNN + Autoencoder architecture
│   │   ├── preprocessing.py             # ECG signal preprocessing
│   │   ├── features.py                  # Feature extraction (HR, HRV)
│   │   ├── inference.py                 # Model inference engine
│   │   └── threshold_analyzer.py        # Threshold-based analyzer
│   ├── decision_engine/             # Layer 2: Decision Engine
│   │   ├── rules.py                     # 10 configurable evaluation rules
│   │   ├── evaluator.py                 # Rule evaluation & event creation
│   │   └── history.py                   # Temporal analysis & baselines
│   ├── llm_layer/                   # Layer 3: MedGemma LLM
│   │   ├── medgemma_client.py           # LLM client (API / Mock)
│   │   ├── prompt_templates.py          # Doctor & patient prompts
│   │   └── report_generator.py          # Report generation & validation
│   ├── core/                        # Shared core modules
│   │   ├── config.py                    # Settings (Pydantic)
│   │   ├── metrics.py                   # Prometheus metrics
│   │   └── schemas/                     # Pydantic data models
│   │       ├── ecg.py                       # ECG data schemas
│   │       ├── ai_output.py                 # AI analysis output
│   │       ├── events.py                    # Event & decision schemas
│   │       └── reports.py                   # Report schemas
│   ├── db/                          # Database layer
│   │   ├── firebase_db.py               # Firestore service
│   │   └── models.py                    # Data models
│   └── workers/                     # Background workers
│       ├── celery_app.py                # Celery configuration
│       └── tasks.py                     # Async processing tasks
│
├── esp32-holter-sim/                # 🔧 ESP32 Holter ECG simulator
│   ├── src/
│   │   └── main.cpp                 # PlatformIO entry point
│   ├── CardioGuard_Holter_Sim/
│   │   └── CardioGuard_Holter_Sim.ino   # Arduino IDE entry point
│   ├── platformio.ini               # PlatformIO configuration
│   └── README.md
│
└── README.md                        # 📄 This file
```

---

## 📱 Mobile Application

### Authentication & Onboarding

The mobile app includes a complete auth flow and 4-step patient onboarding:

| Step | Screen | Data Collected |
|------|--------|---------------|
| — | Welcome | Social login (Google) or email |
| — | Login / Register | Email & password authentication |
| 1 | Personal Info | Name, date of birth, gender, height, weight |
| 2 | Medical History | Pre-existing conditions, allergies |
| 3 | Medications | Current medications list |
| 4 | Emergency Contact | Name, phone, relationship |

### Main Screens (Bottom Tab Navigation)

| Tab | Screen | Description |
|-----|--------|-------------|
| 🏠 | **Dashboard** | Live BPM, device status, assigned doctor, daily metrics (avg BPM, recording duration, anomaly count), recent alerts |
| 📊 | **ECG Monitor** | 250 Hz real-time waveform, live BPM, signal quality indicator, recording start/stop controls |
| 📋 | **History** | Past recording sessions and clinical events, dual tabs: Recordings / Events |
| 📱 | **Device** | BLE device scanning, connect/disconnect, battery & firmware info, troubleshooting tips |
| ⚙️ | **Settings** | Notification preferences, sync status, device info, about/legal, sign out |

<details>
<summary><strong>📐 Architecture Patterns</strong></summary>
<br />

| Pattern | Usage |
|---------|-------|
| **Singleton** | All services (`BLEManager`, `ApiClient`, `LocalDatabase`, `SyncQueue`, `NotificationService`) |
| **Context/Provider** | `AuthContext` + `DeviceContext` + `PatientContext` wrapped by `AppProvider` |
| **Custom Hooks** | Service abstraction (`useECGStream`, `useDeviceConnection`, `useGoogleAuth`, etc.) |
| **Offline-First** | Data written to SQLite first, synced to server when online |
| **Observer/Listener** | BLE data stream, sync status, network state changes |
| **Batch Processing** | ECG segments uploaded in batches via `SyncQueue` → `PipelineService` |

</details>

<details>
<summary><strong>📦 Database Schema (SQLite)</strong></summary>
<br />

```sql
-- 10-second ECG data segments
ecg_segments       (id, session_id, start_time, end_time, data_blob, sample_rate, synced)

-- Clinical events (anomaly, alert, etc.)
clinical_events    (id, type, severity, timestamp, details, acknowledged, synced)

-- Recording sessions
recording_sessions (id, start_time, end_time, duration, avg_bpm, quality_score)

-- Offline synchronization queue
sync_queue         (id, entity_type, entity_id, action, retry_count, last_attempt)
```

</details>

---

## 🌐 Web Application

The Next.js web application serves two distinct purposes:

### Doctor Dashboard (`/dashboard`)

A fully functional clinical dashboard accessible after login with doctor-role verification:

| Page | Description |
|------|-------------|
| **Overview** | Patient count, active alerts, anomaly statistics, recent activity |
| **Patients** | Searchable patient list, add patients manually or from registered users, detailed patient view with ECG analytics |
| **Alerts** | Real-time alert feed with severity filtering, acknowledge/dismiss actions |
| **Settings** | Doctor profile, notification preferences |

### Marketing Website

| Page | Route | Description |
|------|-------|-------------|
| Homepage | `/` | Hero section, stats, features, how it works, testimonials, CTA |
| About | `/about` | Mission statement, technology overview, team |
| Features | `/features` | Feature categories: Monitoring, AI Analysis, Security |
| Pricing | `/pricing` | 3-tier plans: Personal (Free), Professional, Enterprise |
| Download | `/download` | iOS/Android store links, system requirements |
| Contact | `/contact` | Contact form + company info |
| Get Started | `/get-started` | Role selection → Patient (download) / Doctor (pricing) |
| Privacy | `/privacy` | HIPAA & GDPR compliant privacy policy |
| Terms | `/terms` | Terms of service |

<details>
<summary><strong>⚡ Performance Optimizations</strong></summary>
<br />

- **LCP Optimization** — CSS `@keyframes` instead of JS animations in Hero; `<Image priority>` preload
- **Lazy Loading** — Below-fold components code-split with `next/dynamic`
- **Image Optimization** — Automatic AVIF/WebP with `next/image`, responsive `srcset`
- **React Compiler** — Automatic memoization to prevent unnecessary re-renders
- **Static Generation** — Marketing pages pre-rendered at build-time (SSG)
- **WCAG AA** — Color contrast ≥ 4.5:1, semantic HTML, heading hierarchy

</details>

---

## ⚙️ Server (Backend)

### API Endpoints

All endpoints are prefixed with `/api/v1`.

<details>
<summary><strong>🔌 Full API Reference</strong></summary>
<br />

| Group | Method | Endpoint | Description |
|-------|--------|----------|-------------|
| **Health** | `GET` | `/` | Server info |
| | `GET` | `/health` | Health check |
| | `GET` | `/health/detailed` | Detailed component health |
| | `GET` | `/metrics` | Prometheus metrics |
| **Auth** | — | Middleware | Firebase token verification |
| **Users** | `POST` | `/api/v1/users/profile` | Create/update user profile |
| | `PUT` | `/api/v1/users/profile/onboarding` | Save onboarding data |
| | `GET` | `/api/v1/users/{uid}/role` | Check user role |
| | `GET` | `/api/v1/users/search` | Search patients |
| **Patients** | `GET` | `/api/v1/patients/doctor/{doctorId}` | List doctor's patients |
| | `POST` | `/api/v1/patients/doctor/{doctorId}` | Add patient manually |
| | `POST` | `/api/v1/patients/doctor/{doctorId}/from-user` | Add from registered user |
| | `GET` | `/api/v1/patients/{patientId}` | Patient details |
| | `PUT` | `/api/v1/patients/{patientId}` | Update patient |
| | `DELETE` | `/api/v1/patients/{patientId}` | Delete patient |
| | `GET` | `/api/v1/patients/{patientId}/status` | Patient status summary |
| **Alerts** | `GET` | `/api/v1/alerts/doctor/{doctorId}` | Doctor's alerts |
| | `POST` | `/api/v1/alerts/` | Create alert |
| | `PUT` | `/api/v1/alerts/{alertId}/acknowledge` | Acknowledge alert |
| **ECG Ingest** | `POST` | `/api/v1/ecg/chunk` | Submit ECG chunk |
| **Results** | `GET` | `/api/v1/results/analysis/session/{id}` | Session analysis |
| | `GET` | `/api/v1/results/analysis/patient/{id}` | Patient analyses |
| | `GET` | `/api/v1/results/events/patient/{id}` | Patient events |
| | `GET` | `/api/v1/results/reports/event/{id}` | MedGemma report |
| **Pipeline** | `POST` | `/api/v1/pipeline/analyze` | Full AI pipeline analysis |
| | `POST` | `/api/v1/pipeline/test` | Test with synthetic data |
| | `GET` | `/api/v1/pipeline/baseline/{patientId}` | Patient baseline |
| | `GET` | `/api/v1/pipeline/history/{patientId}` | Analysis history |
| | `GET` | `/api/v1/pipeline/health` | Pipeline health check |
| **Webhooks** | `POST` | `/api/v1/webhooks/register` | Register webhook |
| | `DELETE` | `/api/v1/webhooks/{id}` | Remove webhook |
| | `GET` | `/api/v1/webhooks/list` | List webhooks |
| | `POST` | `/api/v1/webhooks/test` | Send test notification |
| | `WS` | `/api/v1/webhooks/ws/{channel}` | Real-time WebSocket |

</details>

---

## 🔧 ESP32 Holter Simulator

The ESP32 simulator mimics a real Holter ECG device over BLE, allowing full development and testing without medical hardware.

| Feature | Detail |
|---------|--------|
| **BLE Service** | Custom GATT service with ECG characteristic (notify) |
| **Sampling Rate** | 250 Hz, 16-bit ADC, Lead II format |
| **ECG Scenarios** | Normal sinus rhythm (~72 bpm), Tachycardia (~140 bpm), Bradycardia (~42 bpm), Arrhythmia, Noisy signal |
| **Auto-cycling** | Rotates through scenarios automatically |
| **Battery Simulation** | Reports simulated battery level via BLE |

---

## 🚀 Installation

### Prerequisites

<table>
<tr>
<td>

**📱 Mobile**
- Node.js ≥ 18
- Expo CLI
- Android Studio / Xcode
- Physical device with BLE 4.2+

</td>
<td>

**🌐 Web**
- Node.js ≥ 18
- npm or Bun

</td>
<td>

**⚙️ Server**
- Python ≥ 3.11
- Redis (for Celery workers)
- Firebase project + service account

</td>
<td>

**🔧 ESP32**
- ESP32 dev board
- PlatformIO or Arduino IDE

</td>
</tr>
</table>

### Quick Start

```bash
# Clone the repository
git clone https://github.com/firatmio/cardioguard.git
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
# or: npx expo run:android
```

</td>
<td>

**🌐 Web**
```bash
cd web
npm install
npm run dev
# Opens at http://localhost:3000
```

</td>
<td>

**⚙️ Server**
```bash
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

</td>
</tr>
</table>

### Environment Variables

<details>
<summary><strong>Server (.env)</strong></summary>
<br />

```env
# Firebase
FIREBASE_CREDENTIALS_PATH=path/to/serviceAccountKey.json

# AI Configuration
USE_THRESHOLD_ANALYZER=true          # true = threshold mode, false = CNN model
MEDGEMMA_PROVIDER=mock               # mock | vertex | huggingface

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8081

# SMS (optional)
ENABLE_SMS_NOTIFICATIONS=false
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...

# Celery (optional)
CELERY_BROKER_URL=redis://localhost:6379/0
```

</details>

---

## 🔒 Security & Compliance

<table>
<tr>
<td align="center">🏥<br /><strong>HIPAA</strong></td>
<td align="center">🇪🇺<br /><strong>GDPR</strong></td>
<td align="center">🔐<br /><strong>Firebase Auth</strong></td>
<td align="center">📱<br /><strong>SecureStore</strong></td>
<td align="center">🛡️<br /><strong>Role-Based Access</strong></td>
</tr>
<tr>
<td align="center"><sub>Health data<br />compliance</sub></td>
<td align="center"><sub>Data protection<br />regulation</sub></td>
<td align="center"><sub>Token-based<br />authentication</sub></td>
<td align="center"><sub>Encrypted<br />local storage</sub></td>
<td align="center"><sub>Doctor / Patient /<br />Admin roles</sub></td>
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

**CardioGuard** — Making cardiac health monitoring accessible to everyone.

<br />

<img src="https://img.shields.io/badge/Made_with-❤️-white?style=for-the-badge" alt="Made with love" />
<img src="https://img.shields.io/badge/Powered_by-InNova-4285F4?style=for-the-badge&logo=google" alt="Powered by InNova" />

<br />
<br />

<sub>© 2026 CardioGuard. All rights reserved.</sub>

</div>
