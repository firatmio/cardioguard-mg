"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Smartphone } from "lucide-react";
import { signInWithEmail, signInWithGoogle } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/firebase/hooks";
import styles from "./page.module.css";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [patientWarning, setPatientWarning] = useState(false);

  // Zaten giriş yapmışsa dashboard'a yönlendir
  // patientWarning veya aktif login sırasında yönlendirme yapma
  useEffect(() => {
    if (!authLoading && user && !patientWarning && !loading) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router, patientWarning, loading]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPatientWarning(false);
    setLoading(true);

    try {
      await signInWithEmail(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/patient-role") {
        setPatientWarning(true);
        return;
      }
      switch (code) {
        case "auth/user-not-found":
          setError("Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.");
          break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("E-posta veya şifre hatalı.");
          break;
        case "auth/invalid-email":
          setError("Geçersiz e-posta adresi.");
          break;
        case "auth/too-many-requests":
          setError("Çok fazla deneme. Lütfen daha sonra tekrar edin.");
          break;
        default:
          setError("Giriş yapılırken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setPatientWarning(false);
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/patient-role") {
        setPatientWarning(true);
      } else if (code !== "auth/popup-closed-by-user") {
        setError("Google ile giriş yapılırken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Auth yüklenirken skeleton göster
  if (authLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  // Zaten giriş yapmışsa boş göster (redirect olacak)
  if (user) return null;

  return (
    <div className={styles.page}>
      {/* Sol — Dekoratif Alan */}
      <div className={styles.decorSide}>
        <div className={styles.decorContent}>
          <div className={styles.decorLogo}>
            <div className={styles.logoIcon}>
              <Heart size={24} strokeWidth={2.5} />
            </div>
            <span className={styles.logoText}>CardioGuard</span>
          </div>
          <h1 className={styles.decorTitle}>
            Kardiyak İzleme <br />
            <span className={styles.decorGradient}>Kontrol Paneliniz</span>
          </h1>
          <p className={styles.decorDesc}>
            Hastalarınızın ECG verilerini gerçek zamanlı takip edin, AI destekli
            anomali uyarılarını anında alın.
          </p>

          <div className={styles.decorStats}>
            <div className={styles.decorStat}>
              <span className={styles.decorStatValue}>99.2%</span>
              <span className={styles.decorStatLabel}>Anomali Tespiti</span>
            </div>
            <div className={styles.decorStat}>
              <span className={styles.decorStatValue}>{"<"}2s</span>
              <span className={styles.decorStatLabel}>Uyarı Süresi</span>
            </div>
            <div className={styles.decorStat}>
              <span className={styles.decorStatValue}>24/7</span>
              <span className={styles.decorStatLabel}>Sürekli İzleme</span>
            </div>
          </div>
        </div>

        {/* Dekoratif daireler */}
        <div className={styles.decorCircle1} />
        <div className={styles.decorCircle2} />
      </div>

      {/* Sağ — Login Formu */}
      <div className={styles.formSide}>
        {/* Mobilde logo */}
        <Link href="/" className={styles.mobileLogo}>
          <div className={styles.logoIcon}>
            <Heart size={18} strokeWidth={2.5} />
          </div>
          <span className={styles.logoText}>CardioGuard</span>
        </Link>

        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Hoş Geldiniz</h2>
            <p className={styles.formSubtitle}>
              Doktor paneline erişmek için giriş yapın
            </p>
          </div>

          {/* Hata mesajı */}
          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {patientWarning && (
            <div className={styles.patientWarning}>
              <div className={styles.pwHeader}>
                <Smartphone size={20} />
                <span>Bu panel yalnızca doktorlar içindir</span>
              </div>
              <p className={styles.pwText}>
                Hasta olarak giriş yapmaya çalıştınız. Sağlık verilerinizi
                takip etmek için lütfen <strong>CardioGuard</strong> mobil
                uygulamasını kullanın.
              </p>
              <div className={styles.pwActions}>
                <Link href="/download" className={styles.pwDownloadBtn}>
                  <Smartphone size={14} />
                  Uygulamayı İndir
                </Link>
                <button
                  className={styles.pwDismiss}
                  onClick={() => setPatientWarning(false)}
                >
                  Kapat
                </button>
              </div>
            </div>
          )}

          {/* Google butonu */}
          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span>Google ile devam et</span>
          </button>

          <div className={styles.divider}>
            <span>veya</span>
          </div>

          {/* Email / Şifre formu */}
          <form onSubmit={handleEmailLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                E-posta
              </label>
              <div className={styles.inputWrapper}>
                <Mail size={16} className={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doktor@cardioguard.ai"
                  className={styles.input}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Şifre
              </label>
              <div className={styles.inputWrapper}>
                <Lock size={16} className={styles.inputIcon} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={styles.input}
                  required
                  autoComplete="current-password"
                  minLength={6}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Şifreyi göster"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <div className={styles.btnSpinner} />
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className={styles.footerText}>
            <Link href="/" className={styles.backLink}>
              ← Ana sayfaya dön
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
