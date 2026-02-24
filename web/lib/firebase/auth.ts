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
 * Kullanıcının rolünü sunucu üzerinden kontrol eder.
 * Rol "patient" ise özel hata fırlatır ve oturumu kapatır.
 * Geçerli bir doktor/admin ise profili oluşturur veya günceller.
 */
async function checkDoctorRole(credential: UserCredential): Promise<UserCredential> {
  const uid = credential.user.uid;
  try {
    const data = await api.public.get<{ uid: string; role: string; exists: boolean }>(
      `/users/${uid}/role`
    );
    if (data.exists && data.role === "patient") {
      await firebaseSignOut(auth);
      const err = new Error("Bu panel yalnızca doktorlar içindir.");
      (err as any).code = "auth/patient-role";
      throw err;
    }
  } catch (err: any) {
    if (err?.code === "auth/patient-role") throw err;
    console.warn("[Auth] Role check failed:", err?.message);
  }

  // Profili "doctor" rolüyle oluştur / güncelle — böylece
  // get_current_user middleware'i doğru rolü okur.
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

/** Email + şifre ile giriş */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return checkDoctorRole(credential);
}

/** Google popup ile giriş */
export async function signInWithGoogle(): Promise<UserCredential> {
  const credential = await signInWithPopup(auth, googleProvider);
  return checkDoctorRole(credential);
}

/** Çıkış */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}
