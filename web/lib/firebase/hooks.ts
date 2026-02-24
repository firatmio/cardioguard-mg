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
 * Firebase Auth state hook.
 * Listens to user session via onAuthStateChanged.
 * When a session is detected, syncs the profile with the "doctor" role
 * and keeps loading = true until sync is complete.
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
        // Sync profile as "doctor" — stays loading until complete
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
