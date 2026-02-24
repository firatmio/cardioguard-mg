// =============================================================================
// Hook: useGoogleAuth
// =============================================================================
// Google Sign-In via expo-auth-session + Firebase credential exchange.
// Works in Expo Go + dev builds.
// =============================================================================

import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { signInWithGoogleToken } from '../services/firebase/auth';

// Allow web browser auth session to complete properly
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs — from Firebase Console → Authentication → Sign-in method → Google
// Web client ID is REQUIRED for both Android & iOS in Expo
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '746111825927-1lb6vdn12sa77jv7nuvea99rlef06f1e.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '746111825927-kchd82k15e8lioms374650k55phaas72.apps.googleusercontent.com';

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: WEB_CLIENT_ID, // iOS: ayrı client ID yoksa webClientId kullan
  });

  useEffect(() => {
    handleResponse();
  }, [response]);

  const handleResponse = async () => {
    if (response?.type !== 'success') return;

    setLoading(true);
    setError(null);

    try {
      const { id_token } = response.params;
      if (!id_token) {
        setError('Google kimlik doğrulama başarısız oldu.');
        return;
      }
      await signInWithGoogleToken(id_token);
      // Auth state change will trigger navigation automatically
    } catch (err: any) {
      console.error('[GoogleAuth] Error:', err);
      setError('Google ile giriş yapılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setError(null);
    try {
      await promptAsync();
    } catch (err) {
      setError('Google giriş penceresi açılamadı.');
    }
  };

  return {
    signIn,
    loading,
    error,
    ready: !!request,
  };
}
