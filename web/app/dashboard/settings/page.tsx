"use client";

import {
  User,
  Mail,
  Shield,
  Bell,
  Moon,
  Globe,
  Heart,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/lib/firebase/hooks";
import styles from "./page.module.css";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ayarlar</h1>
        <p className={styles.pageDesc}>
          Hesap bilgilerinizi ve tercihlerinizi yönetin.
        </p>
      </div>

      {/* Profile section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <User size={16} />
          Profil Bilgileri
        </h2>
        <div className={styles.card}>
          <div className={styles.profileRow}>
            <div className={styles.profileAvatar}>
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className={styles.profileImg}
                />
              ) : (
                <span className={styles.profileFallback}>
                  {(user?.displayName || user?.email || "D")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>
                {user?.displayName || "Doktor"}
              </div>
              <div className={styles.profileEmail}>{user?.email}</div>
            </div>
            <div className={styles.providerBadge}>
              {user?.providerData[0]?.providerId === "google.com" ? (
                <>
                  <Globe size={12} />
                  Google
                </>
              ) : (
                <>
                  <Mail size={12} />
                  Email
                </>
              )}
            </div>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Ad Soyad</label>
              <div className={styles.fieldValue}>
                {user?.displayName || "—"}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>E-posta</label>
              <div className={styles.fieldValue}>{user?.email || "—"}</div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>UID</label>
              <div className={styles.fieldValueMono}>{user?.uid}</div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Son Giriş</label>
              <div className={styles.fieldValue}>
                {user?.metadata.lastSignInTime
                  ? new Date(user.metadata.lastSignInTime).toLocaleString(
                      "tr-TR"
                    )
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification preferences */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Bell size={16} />
          Bildirim Tercihleri
        </h2>
        <div className={styles.card}>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>Kritik Uyarılar</div>
              <div className={styles.settingDesc}>
                Anlık push bildirim — kritik ve acil anomaliler
              </div>
            </div>
            <div className={`${styles.toggle} ${styles.toggleOn}`}>
              <div className={styles.toggleDot} />
            </div>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>Günlük Özet</div>
              <div className={styles.settingDesc}>
                Her gün sabah 08:00'de hasta durumu raporu
              </div>
            </div>
            <div className={`${styles.toggle} ${styles.toggleOn}`}>
              <div className={styles.toggleDot} />
            </div>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>Bağlantı Kopma</div>
              <div className={styles.settingDesc}>
                Hasta cihazı 30 dk+ çevrimdışı olduğunda
              </div>
            </div>
            <div className={styles.toggle}>
              <div className={styles.toggleDot} />
            </div>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>E-posta Bildirimleri</div>
              <div className={styles.settingDesc}>
                Uyarıları e-posta olarak da al
              </div>
            </div>
            <div className={styles.toggle}>
              <div className={styles.toggleDot} />
            </div>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Shield size={16} />
          Sistem Bilgisi
        </h2>
        <div className={styles.card}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <Smartphone size={14} />
              <span className={styles.infoLabel}>Platform</span>
              <span className={styles.infoValue}>CardioGuard Web v1.0</span>
            </div>
            <div className={styles.infoItem}>
              <Heart size={14} />
              <span className={styles.infoLabel}>AI Model</span>
              <span className={styles.infoValue}>MedGemma v2.0</span>
            </div>
            <div className={styles.infoItem}>
              <Shield size={14} />
              <span className={styles.infoLabel}>Uyumluluk</span>
              <span className={styles.infoValue}>HIPAA · GDPR · KVKK</span>
            </div>
            <div className={styles.infoItem}>
              <Globe size={14} />
              <span className={styles.infoLabel}>Bölge</span>
              <span className={styles.infoValue}>europe-west1 (Belçika)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
