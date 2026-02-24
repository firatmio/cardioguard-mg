// =============================================================================
// Patient Domain Types
// =============================================================================

/**
 * Patient profile as stored locally on the device.
 * This is a subset of the full patient record on the backend.
 * Sensitive fields (e.g., full name) are encrypted at rest via SecureStore.
 */
export interface PatientProfile {
  id: string;
  displayName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';

  /** Firestore patient document ID (may differ from user UID) */
  firestoreDocId?: string;

  /** Primary physician assigned to this patient */
  doctorId: string;
  doctorName: string;
  doctorPhotoUrl?: string;

  /** Known cardiac conditions (for context, NOT for local diagnosis) */
  conditions: string[];

  /** Current active medications (informational only) */
  medications: string[];

  /** Emergency contact phone number */
  emergencyContact: string;
}

/**
 * Patient's current health status as reported by the backend AI.
 * This is a simplified, patient-friendly representation.
 *
 * IMPORTANT: This is NOT a diagnosis. It's an anomaly-level indicator
 * used to inform the patient about their monitoring status.
 */
export interface PatientStatus {
  /** Overall risk level as determined by backend AI */
  riskLevel: 'normal' | 'attention' | 'elevated' | 'critical';

  /** Patient-friendly summary text */
  summary: string;

  /** Average BPM over last 24 hours */
  avgBPM24h: number | null;

  /** Minimum BPM in last 24 hours */
  minBPM24h: number | null;

  /** Maximum BPM in last 24 hours */
  maxBPM24h: number | null;

  /** Total recording hours today */
  recordingHoursToday: number;

  /** Number of anomalies detected today */
  anomaliesToday: number;

  /** Last updated timestamp (ISO) */
  lastUpdated: string;
}

/**
 * Authentication tokens for API communication.
 * Stored in SecureStore, never in plain AsyncStorage.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
