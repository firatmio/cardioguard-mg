// =============================================================================
// Firebase Auth Helpers — Mobile
// =============================================================================
// Email/password + Google sign-in via expo-auth-session.
// Kayıt anında Firestore'a doğrudan yazılır (sunucu bağımlılığı kaldırıldı).
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

// ── Firestore'a kullanıcı profili yaz ──────────────────────────────────────

/**
 * Kullanıcıyı doğrudan Firestore `users/{uid}` dokümanına yazar.
 * Sunucu API'sine bağımlılık YOK — doğrudan client SDK kullanılır.
 *
 * İlk kayıtta temel alanlar oluşturulur; tekrar girişlerde sadece
 * lastLoginAt günceller.
 */
export async function saveUserProfile(user: User) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // İlk kayıt — tam profil oluştur
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
      // Tekrar giriş — sadece lastLoginAt güncelle
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    }

    // ApiClient token'ını da set et (diğer API çağrıları için)
    try {
      const api = ApiClient.getInstance();
      const idToken = await user.getIdToken(true);
      await api.setTokens({
        accessToken: idToken,
        refreshToken: '',
        expiresAt: Date.now() + 3600 * 1000,
      });
    } catch {
      // ApiClient token set başarısız olursa sorun değil, Firestore kaydı zaten yazıldı
    }
  } catch (err) {
    console.warn('[Auth] Firestore profile save failed:', err);
  }
}

// ── Email / Password ────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  // Fire-and-forget: login akışını bloklamaz
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
  // İlk kayıt — profil mutlaka Firestore'a yazılmalı
  await saveUserProfile(credential.user);
  return credential;
}

// ── Google Sign-In ──────────────────────────────────────────────────────────

export async function signInWithGoogleToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  // Fire-and-forget: login akışını bloklamaz
  saveUserProfile(result.user);
  return result;
}

// ── Sign Out ────────────────────────────────────────────────────────────────

export async function signOut() {
  return firebaseSignOut(auth);
}
