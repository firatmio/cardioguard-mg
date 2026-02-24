import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./config";
import api from "../api";

const googleProvider = new GoogleAuthProvider();

/**
 * Checks user role via the server.
 * If role is "patient", throws a custom error and signs out.
 * If it's a valid doctor/admin, creates or updates the profile.
 */
async function checkDoctorRole(credential: UserCredential): Promise<UserCredential> {
  const uid = credential.user.uid;
  try {
    const data = await api.public.get<{ uid: string; role: string; exists: boolean }>(
      `/users/${uid}/role`
    );
    if (data.exists && data.role === "patient") {
      await firebaseSignOut(auth);
      const err = new Error("This panel is only for doctors.");
      (err as any).code = "auth/patient-role";
      throw err;
    }
  } catch (err: any) {
    if (err?.code === "auth/patient-role") throw err;
    console.warn("[Auth] Role check failed:", err?.message);
  }

  // Create / update profile with "doctor" role — so that
  // get_current_user middleware reads the correct role.
  try {
    await api.post("/users/profile", {
      email: credential.user.email || "",
      displayName: credential.user.displayName || "",
      role: "doctor",
    });
  } catch (err: any) {
    console.warn("[Auth] Profile sync failed:", err?.message);
  }

  return credential;
}

/** Sign in with email + password */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return checkDoctorRole(credential);
}

/** Sign in with Google popup */
export async function signInWithGoogle(): Promise<UserCredential> {
  const credential = await signInWithPopup(auth, googleProvider);
  return checkDoctorRole(credential);
}

/** Sign out */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}
