// =============================================================================
// Firebase Auth Helpers — Mobile
// =============================================================================
// Email/password + Google sign-in via expo-auth-session.
// Writes directly to Firestore at registration time (server dependency removed).
// =============================================================================

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import ApiClient from '../api/ApiClient';

// ── Write user profile to Firestore ──────────────────────────────────────

/**
 * Writes the user directly to the Firestore `users/{uid}` document.
 * NO dependency on server API — uses the client SDK directly.
 *
 * On first registration, basic fields are created; on subsequent logins,
 * only lastLoginAt is updated.
 */
export async function saveUserProfile(user: User) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // First registration — create full profile
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        role: 'patient',
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      console.log('[Auth] Patient profile created in Firestore.');
    } else {
      // Subsequent login — only update lastLoginAt
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    }

    // Also set the ApiClient token (for other API calls)
    try {
      const api = ApiClient.getInstance();
      const idToken = await user.getIdToken(true);
      await api.setTokens({
        accessToken: idToken,
        refreshToken: '',
        expiresAt: Date.now() + 3600 * 1000,
      });
    } catch {
      // If ApiClient token set fails, no problem — Firestore record is already written
    }
  } catch (err) {
    console.warn('[Auth] Firestore profile save failed:', err);
  }
}

// ── Email / Password ────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  // Fire-and-forget: does not block the login flow
  saveUserProfile(credential.user);
  return credential;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string,
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && credential.user) {
    await updateProfile(credential.user, { displayName });
  }
  // First registration — profile must be written to Firestore
  await saveUserProfile(credential.user);
  return credential;
}

// ── Google Sign-In ──────────────────────────────────────────────────────────

export async function signInWithGoogleToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  // Fire-and-forget: does not block the login flow
  saveUserProfile(result.user);
  return result;
}

// ── Sign Out ────────────────────────────────────────────────────────────────

export async function signOut() {
  return firebaseSignOut(auth);
}
