// =============================================================================
// Firestore Types — Type definitions for all Firestore collections
// =============================================================================

/** User registered from mobile app (`users/{uid}`) */
export interface RegisteredUserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: "patient" | "doctor";
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  height?: string;
  weight?: string;
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  onboardingComplete: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface PatientDoc {
  id?: string; // Firestore doc ID
  userId?: string; // Firebase Auth UID of the registered user
  name: string;
  age: number;
  gender: "M" | "F";
  diagnosis: string;
  status: "recording" | "idle" | "offline";
  bpm: number | null;
  signal: number;
  lastSync: Date | null;
  alerts24h: number;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  doctorId: string; // Firebase Auth UID of the doctor
  doctorName?: string; // Doctor's name (for display in mobile app)

  // BLE / ECG live monitoring fields (updated by mobile app)
  lastBPM?: number | null;
  lastSignalQuality?: number;
  deviceStatus?: "connected" | "disconnected" | "recording";
  deviceBattery?: number | null;
  deviceId?: string;
  lastRecordingAt?: Date | null;
  lastStatusUpdate?: Date | null;
}

/** ECG reading from patient's BLE device (`patients/{id}/ecg_readings/{readingId}`) */
export interface ECGReadingDoc {
  bpm: number;
  signalQuality: number;
  deviceId: string;
  timestamp: Date;
}

export interface AlertDoc {
  id?: string;
  patientName: string;
  patientId: string; // reference to patient doc ID
  type: string;
  severity: "critical" | "urgent" | "warning" | "info";
  bpm: number | null;
  time: Date;
  acknowledged: boolean;
  description: string;
  doctorId: string;
  createdAt: Date;
}

export interface DoctorStatsDoc {
  totalPatients: number;
  activeRecordings: number;
  todayAlerts: number;
  avgBpm: number;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// AI Pipeline & Analysis Types
// ---------------------------------------------------------------------------

/** Pipeline analyze response from server */
export interface PipelineResult {
  status: string;
  analysis_id: string;
  patient_id: string;
  anomaly_score: number;
  confidence: number;
  pattern: string;
  severity: string | null;
  heart_rate_bpm: number;
  sdnn_ms: number;
  rmssd_ms: number;
  total_beats: number;
  ectopic_beats: number;
  event_created: boolean;
  event_id: string | null;
  event_type: string | null;
  event_summary: string | null;
  baseline: Record<string, unknown> | null;
  processing_time_ms: number;
  model_version: string;
}

/** Analysis record from /results/analysis/patient/{id} */
export interface AnalysisRecord {
  chunk_id: string;
  anomaly_score: number;
  confidence: number;
  pattern: string | null;
  signal_quality_score: number;
  timestamp: string | null;
}

/** Patient statistics from /results/analysis/patient/{id}/statistics */
export interface PatientStatistics {
  total_analyses: number;
  avg_anomaly_score: number;
  max_anomaly_score: number;
  avg_heart_rate: number;
  min_heart_rate: number;
  max_heart_rate: number;
  avg_hrv_sdnn: number;
  avg_hrv_rmssd: number;
  anomaly_count: number;
  normal_count: number;
}

/** Event from /results/events/patient/{id} */
export interface EventRecord {
  id?: string;
  event_id: string;
  patient_id: string;
  event_type: string;
  severity: string;
  decision_summary: string;
  created_at: string;
  session_id?: string;
}

/** MedGemma report from /results/reports/event/{id} */
export interface MedGemmaReport {
  event_id: string;
  patient_id: string;
  doctor_version?: string;
  patient_version?: string;
  model_version?: string;
  created_at: string;
}

/** Patient baseline from /results/patient/{id}/baseline */
export interface PatientBaseline {
  patient_id: string;
  avg_heart_rate: number;
  std_heart_rate: number;
  avg_sdnn: number;
  avg_rmssd: number;
  avg_pnn50: number;
  avg_ectopic_ratio: number;
  sample_count: number;
  last_updated: string;
}

/** Patient trend from /results/patient/{id}/trend */
export interface PatientTrend {
  type: string;
  slope: number;
  change_percent: number;
  start_value: number;
  end_value: number;
}

/** Emergency alert from Firestore emergency_alerts collection */
export interface EmergencyAlertDoc {
  id?: string;
  event_id: string;
  patient_id: string;
  severity: string;
  event_type: string;
  summary: string;
  doctor_id: string | null;
  notified_emergency_contact: boolean;
  notified_doctor: boolean;
  created_at: string;
  status: "active" | "acknowledged" | "resolved";
}

/** Summary response from /results/summary/patient/{id} */
export interface PatientSummary {
  patient_id: string;
  statistics: PatientStatistics | null;
  baseline: PatientBaseline | null;
  recent_trend: PatientTrend | null;
  last_updated: string;
}
