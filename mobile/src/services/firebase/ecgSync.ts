// =============================================================================
// Firestore ECG Sync Service
// =============================================================================
// Writes real-time ECG status and summary data to Firestore so the
// doctor's web dashboard can display live patient monitoring status.
//
// Data written to Firestore (lightweight summaries only — not raw samples):
//   patients/{patientDocId} → lastBPM, lastSignalQuality, deviceStatus, lastRecordingAt
//   patients/{patientDocId}/ecg_readings/{id} → BPM readings history
//
// Raw ECG segment data continues to be uploaded to the REST API backend
// via SyncQueue for heavy processing (AI analysis, long-term storage).
// =============================================================================

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

/** Minimum interval between Firestore BPM writes (ms) to avoid excessive writes */
const MIN_WRITE_INTERVAL_MS = 10_000; // 10 seconds

/** Maximum BPM readings to keep per patient (older ones can be cleaned up) */
const MAX_BPM_HISTORY = 1000;

interface ECGReadingDoc {
  bpm: number;
  signalQuality: number;
  deviceId: string;
  timestamp: ReturnType<typeof serverTimestamp>;
}

class FirestoreECGSync {
  private static instance: FirestoreECGSync;
  private lastWriteTime = 0;
  private patientDocId: string | null = null;
  private userId: string | null = null;
  private isActive = false;
  private initFailed = false; // Tracks if init failed to avoid repeated queries
  private lastInitAttempt = 0;
  private static readonly INIT_RETRY_INTERVAL = 5 * 60 * 1000; // Retry init every 5 min

  private constructor() {}

  static getInstance(): FirestoreECGSync {
    if (!FirestoreECGSync.instance) {
      FirestoreECGSync.instance = new FirestoreECGSync();
    }
    return FirestoreECGSync.instance;
  }

  /**
   * Initialize with the current user's ID.
   * Finds the patient document in Firestore that matches this userId.
   * Caches failure to avoid repeated queries when no patient doc exists.
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;

    // If init previously failed, only retry after cooldown period
    if (this.initFailed && Date.now() - this.lastInitAttempt < FirestoreECGSync.INIT_RETRY_INTERVAL) {
      return;
    }
    this.lastInitAttempt = Date.now();

    try {
      // Find the patient doc where userId matches
      const patientsRef = collection(db, 'patients');
      const q = query(patientsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        this.patientDocId = snapshot.docs[0].id;
        this.initFailed = false;
        console.log('[FirestoreECGSync] Initialized for patient doc:', this.patientDocId);
      } else {
        // Patient doc yok — otomatik oluştur.
        // Doktor henüz eklememişse bile hasta kendi dokümanını oluşturur,
        // böylece cihaz verileri Firestore'a yazılabilir.
        try {
          const newDocRef = doc(collection(db, 'patients'));
          await setDoc(newDocRef, {
            userId,
            createdAt: serverTimestamp(),
            deviceStatus: 'disconnected',
            lastBPM: null,
            lastSignalQuality: 0,
            source: 'mobile_auto',
          });
          this.patientDocId = newDocRef.id;
          this.initFailed = false;
          console.log('[FirestoreECGSync] Auto-created patient doc:', this.patientDocId);
        } catch (createErr) {
          this.initFailed = true;
          this.patientDocId = null;
          console.warn('[FirestoreECGSync] Failed to auto-create patient doc:', createErr);
        }
      }
    } catch (error) {
      this.initFailed = true;
      console.error('[FirestoreECGSync] Failed to initialize:', error);
      this.patientDocId = null;
    }
  }

  /**
   * Start syncing ECG data to Firestore.
   */
  start(): void {
    this.isActive = true;
  }

  /**
   * Stop syncing ECG data to Firestore.
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * Update the patient's live monitoring status in Firestore.
   * Called periodically from useECGStream when new data arrives.
   *
   * This is rate-limited to avoid excessive Firestore writes.
   */
  async updateLiveStatus(data: {
    bpm: number | null;
    signalQuality: number;
    deviceId: string;
    isRecording: boolean;
    batteryLevel?: number | null;
  }): Promise<void> {
    if (!this.isActive || !this.patientDocId) return;

    const now = Date.now();

    // Rate limit writes
    if (now - this.lastWriteTime < MIN_WRITE_INTERVAL_MS) return;
    this.lastWriteTime = now;

    try {
      const patientRef = doc(db, 'patients', this.patientDocId);

      // Update patient document with current monitoring status
      await updateDoc(patientRef, {
        lastBPM: data.bpm,
        lastSignalQuality: data.signalQuality,
        deviceStatus: data.isRecording ? 'recording' : 'connected',
        deviceBattery: data.batteryLevel ?? null,
        deviceId: data.deviceId,
        lastRecordingAt: serverTimestamp(),
      });

      // Write BPM reading to history subcollection (if we have a valid BPM)
      if (data.bpm && data.bpm >= 30 && data.bpm <= 220) {
        const readingsRef = collection(db, 'patients', this.patientDocId, 'ecg_readings');
        await addDoc(readingsRef, {
          bpm: data.bpm,
          signalQuality: data.signalQuality,
          deviceId: data.deviceId,
          timestamp: serverTimestamp(),
        } as ECGReadingDoc);
      }
    } catch (error) {
      // Non-fatal: Firestore write failure shouldn't break the app
      console.warn('[FirestoreECGSync] Failed to update live status:', error);
    }
  }

  /**
   * Update device connection status in Firestore.
   * Called when device connects/disconnects.
   */
  async updateDeviceStatus(status: 'connected' | 'disconnected' | 'recording'): Promise<void> {
    if (!this.patientDocId) return;

    try {
      const patientRef = doc(db, 'patients', this.patientDocId);
      await updateDoc(patientRef, {
        deviceStatus: status,
        lastStatusUpdate: serverTimestamp(),
      });
    } catch (error) {
      console.warn('[FirestoreECGSync] Failed to update device status:', error);
    }
  }

  /**
   * Get the current patient document ID (if resolved).
   */
  getPatientDocId(): string | null {
    return this.patientDocId;
  }
}

export default FirestoreECGSync;
