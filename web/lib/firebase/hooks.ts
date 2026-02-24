"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./config";
import api from "../api";

interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * Firebase Auth durum hook'u.
 * onAuthStateChanged ile kullanıcı oturumunu dinler.
 * Oturum algılandığında profili "doctor" rolüyle senkronize eder ve
 * sync tamamlanana kadar loading = true tutar.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });
  const syncedUid = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && syncedUid.current !== user.uid) {
        syncedUid.current = user.uid;
        // Profili "doctor" olarak senkronize et — tamamlanana kadar loading kalır
        try {
          await api.post("/users/profile", {
            email: user.email || "",
            displayName: user.displayName || "",
            role: "doctor",
          });
        } catch (err: any) {
          console.warn("[Auth] Profile sync failed:", err?.message);
        }
      }
      setState({ user, loading: false });
    });
    return unsubscribe;
  }, []);

  return state;
}
