// =============================================================================
// Firebase Configuration — Mobile (Patient App)
// =============================================================================
// Uses the same Firebase project as the web dashboard.
// Auth persistence is stored in AsyncStorage for React Native.
// =============================================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Singleton — prevent multiple initializations
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth should only be called once; on hot-reload use getAuth instead.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

// Firestore: React Native'de varsayılan WebChannel transport çalışmaz.
// experimentalAutoDetectLongPolling HTTP long-polling'e geçiş yaparak
// bağlantı timeout sorunlarını çözer.
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  // Hot-reload'da initializeFirestore tekrar çağrılamaz
  db = getFirestore(app);
}

export { auth, db };
export default app;
