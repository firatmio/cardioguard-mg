// =============================================================================
// Context: AuthContext
// =============================================================================
// Firebase auth state management for the patient app.
// Tracks: user, loading, onboarding completion status.
// =============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase/config';
import { saveUserProfile } from '../services/firebase/auth';

const ONBOARDING_KEY = 'onboarding_completed';
const PATIENT_DATA_KEY = 'patient_onboarding_data';

export interface PatientOnboardingData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  height: string;
  weight: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  onboardingComplete: boolean;
  patientData: PatientOnboardingData | null;
  setOnboardingComplete: (data: PatientOnboardingData) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingDone] = useState(false);
  const [patientData, setPatientData] = useState<PatientOnboardingData | null>(null);

  const syncedUid = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check if onboarding was completed for this user
        const key = `${ONBOARDING_KEY}_${firebaseUser.uid}`;
        const dataKey = `${PATIENT_DATA_KEY}_${firebaseUser.uid}`;
        const completed = await AsyncStorage.getItem(key);
        const storedData = await AsyncStorage.getItem(dataKey);
        setOnboardingDone(completed === 'true');
        if (storedData) {
          setPatientData(JSON.parse(storedData));
        }

        // Ensure Firestore profile on every app launch
        // (compensates here if initial registration failed)
        if (syncedUid.current !== firebaseUser.uid) {
          syncedUid.current = firebaseUser.uid;
          saveUserProfile(firebaseUser);
        }
      } else {
        syncedUid.current = null;
        setOnboardingDone(false);
        setPatientData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const setOnboardingComplete = useCallback(async (data: PatientOnboardingData) => {
    if (!user) return;
    const key = `${ONBOARDING_KEY}_${user.uid}`;
    const dataKey = `${PATIENT_DATA_KEY}_${user.uid}`;
    await AsyncStorage.setItem(key, 'true');
    await AsyncStorage.setItem(dataKey, JSON.stringify(data));

    // Write directly to Firestore instead of Server API — reliable
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email ?? '',
        role: 'patient',
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: `${data.firstName} ${data.lastName}`.trim(),
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        conditions: data.conditions,
        allergies: data.allergies,
        medications: data.medications,
        // Flat format (backward compatibility)
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        emergencyContactRelation: data.emergencyContactRelation,
        // Nested format (server compatibility)
        emergency_contact: {
          name: data.emergencyContactName,
          phone: data.emergencyContactPhone,
          relation: data.emergencyContactRelation,
        },
        onboardingComplete: true,
        onboardingCompletedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('[AuthContext] Firestore onboarding sync failed:', err);
    }

    setPatientData(data);
    setOnboardingDone(true);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, loading, onboardingComplete, patientData, setOnboardingComplete }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
