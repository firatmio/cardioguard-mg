// =============================================================================
// Context: PatientContext
// =============================================================================
// Provides patient profile and status information to the component tree.
// Offline-first: loads from AsyncStorage cache, then syncs from Firestore.
//
// Doctor connection: Listens to the document in the Firestore `patients`
// collection where `userId == user.uid`. When a doctor adds or updates a
// patient, the doctorId/doctorName in the profile are automatically updated.
// =============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc as firestoreDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from './AuthContext';
import ApiClient from '../services/api/ApiClient';
import FirestoreECGSync from '../services/firebase/ecgSync';
import type { PatientProfile, PatientStatus } from '../types';

interface PatientContextValue {
  profile: PatientProfile | null;
  status: PatientStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
}

const PatientContext = createContext<PatientContextValue | null>(null);

const PROFILE_STORAGE_KEY = 'patient_profile';
const STATUS_STORAGE_KEY = 'patient_status';

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const { user, patientData } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [status, setStatus] = useState<PatientStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── 1. Load cached data from AsyncStorage on mount ──────────────────────
  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = async () => {
    try {
      const [cachedProfile, cachedStatus] = await Promise.all([
        AsyncStorage.getItem(PROFILE_STORAGE_KEY),
        AsyncStorage.getItem(STATUS_STORAGE_KEY),
      ]);

      if (cachedProfile) setProfile(JSON.parse(cachedProfile));
      if (cachedStatus) setStatus(JSON.parse(cachedStatus));
    } catch (err) {
      console.warn('[PatientContext] Failed to load cached data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── 2. Firestore real-time: listen for doctor assignment info ────────────────
  //    When a patient is added from the doctor panel, userId, doctorId,
  //    doctorName are written to the `patients` collection. This listener catches that.
  useEffect(() => {
    if (!user) return;

    let unsubscribe: Unsubscribe | null = null;

    try {
      const patientsRef = collection(db, 'patients');
      const q = query(patientsRef, where('userId', '==', user.uid));

      unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          if (snapshot.empty) {
            // Doctor hasn't added as patient yet — clear doctorId
            setProfile((prev) => {
              if (!prev) return prev;
              if (!prev.doctorId) return prev; // already empty
              const updated = { ...prev, doctorId: '', doctorName: '', doctorPhotoUrl: undefined };
              AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
              return updated;
            });
            return;
          }

          // Get the first matching document (a patient is linked to one doctor)
          const patientDoc = snapshot.docs[0];
          const data = patientDoc.data();

          const doctorId = (data.doctorId as string) || '';
          let doctorName = (data.doctorName as string) || '';

          // If doctorName is empty but doctorId exists, fetch the name from the doctor's users document
          if (doctorId && !doctorName) {
            try {
              const doctorRef = firestoreDoc(db, 'users', doctorId);
              const doctorSnap = await getDoc(doctorRef);
              if (doctorSnap.exists()) {
                const doctorData = doctorSnap.data();
                doctorName =
                  (doctorData.displayName as string) ||
                  `${(doctorData.firstName as string) || ''} ${(doctorData.lastName as string) || ''}`.trim() ||
                  '';
              }
            } catch (err) {
              console.warn('[PatientContext] Failed to fetch doctor name:', err);
            }
          }

          setProfile((prev) => {
            // Base profile information (from patientData or cache)
            const base: PatientProfile = prev ?? {
              id: user.uid,
              displayName: user.displayName || '',
              dateOfBirth: '',
              gender: 'male',
              doctorId: '',
              doctorName: '',
              conditions: [],
              medications: [],
              emergencyContact: '',
            };

            // If patientData exists, also populate onboarding information
            const withOnboarding = patientData
              ? {
                  ...base,
                  displayName:
                    `${patientData.firstName} ${patientData.lastName}`.trim() ||
                    base.displayName,
                  dateOfBirth: patientData.dateOfBirth || base.dateOfBirth,
                  gender: patientData.gender || base.gender,
                  conditions: patientData.conditions?.length
                    ? patientData.conditions
                    : base.conditions,
                  medications: patientData.medications?.length
                    ? patientData.medications
                    : base.medications,
                  emergencyContact:
                    patientData.emergencyContactPhone || base.emergencyContact,
                }
              : base;

            const updated: PatientProfile = {
              ...withOnboarding,
              id: user.uid,
              firestoreDocId: patientDoc.id,
              doctorId,
              doctorName,
            };

            // Cache update
            AsyncStorage.setItem(
              PROFILE_STORAGE_KEY,
              JSON.stringify(updated)
            ).catch(() => {});

            return updated;
          });
        },
        (err) => {
          console.warn('[PatientContext] Firestore listener error:', err);
        }
      );
    } catch (err) {
      console.warn('[PatientContext] Failed to set up Firestore listener:', err);
    }

    return () => {
      unsubscribe?.();
    };
  }, [user, patientData]);

  // ── 3. Update profile when patientData changes (even without doctor connection)
  useEffect(() => {
    if (!user || !patientData) return;

    setProfile((prev) => {
      const base: PatientProfile = prev ?? {
        id: user.uid,
        displayName: '',
        dateOfBirth: '',
        gender: 'male',
        doctorId: '',
        doctorName: '',
        conditions: [],
        medications: [],
        emergencyContact: '',
      };

      const updated: PatientProfile = {
        ...base,
        id: user.uid,
        displayName:
          `${patientData.firstName} ${patientData.lastName}`.trim() ||
          base.displayName,
        dateOfBirth: patientData.dateOfBirth || base.dateOfBirth,
        gender: patientData.gender || base.gender,
        conditions: patientData.conditions?.length
          ? patientData.conditions
          : base.conditions,
        medications: patientData.medications?.length
          ? patientData.medications
          : base.medications,
        emergencyContact:
          patientData.emergencyContactPhone || base.emergencyContact,
      };

      AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated)).catch(
        () => {}
      );
      return updated;
    });
  }, [user, patientData]);

  // ── 4. Backend status refresh ───────────────────────────────────────────
  const isRefreshingRef = React.useRef(false);
  const consecutiveFailuresRef = React.useRef(0);
  const refreshIntervalRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const BASE_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes
  const MAX_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes max backoff

  const refreshStatus = useCallback(async () => {
    if (!profile) return;
    // Don't start a new refresh before the previous one finishes
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      setError(null);
      const patientId = profile.firestoreDocId || profile.id;
      let freshStatus: PatientStatus | null = null;

      // Try fetching from REST API first
      try {
        const api = ApiClient.getInstance();
        freshStatus = await api.get<PatientStatus>(
          `/api/v1/patients/${patientId}/status`
        );
      } catch {
        // REST API unreachable — fetch from Firestore
      }

      // If REST failed, read from Firestore
      if (!freshStatus) {
        const docId = FirestoreECGSync.getInstance().getPatientDocId() || patientId;
        try {
          const patientRef = firestoreDoc(db, 'patients', docId);
          const snap = await getDoc(patientRef);
          if (snap.exists()) {
            const data = snap.data();
            freshStatus = {
              riskLevel: 'normal',
              summary: '',
              avgBPM24h: data.lastBPM ?? null,
              minBPM24h: null,
              maxBPM24h: null,
              recordingHoursToday: 0,
              anomaliesToday: 0,
              lastUpdated: data.lastRecordingAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
            } as PatientStatus;
          }
        } catch (fsErr) {
          console.warn('[PatientContext] Firestore status read failed:', fsErr);
        }
      }

      if (freshStatus) {
        setStatus(freshStatus);
        await AsyncStorage.setItem(
          STATUS_STORAGE_KEY,
          JSON.stringify(freshStatus)
        );
        // Success — reset backoff
        consecutiveFailuresRef.current = 0;
      } else {
        throw new Error('Both REST API and Firestore unavailable');
      }
    } catch (err: any) {
      consecutiveFailuresRef.current++;
      // Only log the first failure and then every 5th to reduce log spam
      if (consecutiveFailuresRef.current <= 1 || consecutiveFailuresRef.current % 5 === 0) {
        console.warn(
          `[PatientContext] Status refresh failed (attempt ${consecutiveFailuresRef.current}):`,
          err?.message
        );
      }
      setError('Could not refresh status. Using cached data.');
    } finally {
      isRefreshingRef.current = false;
    }
  }, [profile]);

  // Auto-refresh status with exponential backoff when backend is unreachable.
  // Starts at 2 minutes, backs off to max 15 minutes on consecutive failures.
  useEffect(() => {
    if (!profile) return;

    const scheduleRefresh = () => {
      const backoff = Math.min(
        BASE_REFRESH_INTERVAL * Math.pow(2, consecutiveFailuresRef.current),
        MAX_REFRESH_INTERVAL,
      );
      refreshIntervalRef.current = setTimeout(async () => {
        await refreshStatus();
        scheduleRefresh(); // reschedule with updated backoff
      }, backoff);
    };

    // Initial refresh
    refreshStatus().then(() => scheduleRefresh());

    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [profile, refreshStatus]);

  return (
    <PatientContext.Provider
      value={{ profile, status, isLoading, error, refreshStatus }}
    >
      {children}
    </PatientContext.Provider>
  );
}

/**
 * Access patient profile and status from any component.
 */
export function usePatient(): PatientContextValue {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}
