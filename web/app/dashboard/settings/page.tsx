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
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageDesc}>
          Manage your account information and preferences.
        </p>
      </div>

      {/* Profile section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <User size={16} />
          Profile Information
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
                {user?.displayName || "Doctor"}
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
              <label className={styles.fieldLabel}>Full Name</label>
              <div className={styles.fieldValue}>
                {user?.displayName || "—"}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Email</label>
              <div className={styles.fieldValue}>{user?.email || "—"}</div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>UID</label>
              <div className={styles.fieldValueMono}>{user?.uid}</div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Last Sign In</label>
              <div className={styles.fieldValue}>
                {user?.metadata.lastSignInTime
                  ? new Date(user.metadata.lastSignInTime).toLocaleString(
                      "en-US"
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
          Notification Preferences
        </h2>
        <div className={styles.card}>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>Critical Alerts</div>
              <div className={styles.settingDesc}>
                Instant push notification — critical and urgent anomalies
              </div>
            </div>
            <div className={`${styles.toggle} ${styles.toggleOn}`}>
              <div className={styles.toggleDot} />
            </div>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>Daily Summary</div>
              <div className={styles.settingDesc}>
                Patient status report every day at 08:00 AM
              </div>
            </div>
            <div className={`${styles.toggle} ${styles.toggleOn}`}>
              <div className={styles.toggleDot} />
            </div>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>Connection Loss</div>
              <div className={styles.settingDesc}>
                When patient device is offline for 30+ minutes
              </div>
            </div>
            <div className={styles.toggle}>
              <div className={styles.toggleDot} />
            </div>
          </div>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>Email Notifications</div>
              <div className={styles.settingDesc}>
                Also receive alerts via email
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
          System Information
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
              <span className={styles.infoLabel}>Compliance</span>
              <span className={styles.infoValue}>HIPAA · GDPR · KVKK</span>
            </div>
            <div className={styles.infoItem}>
              <Globe size={14} />
              <span className={styles.infoLabel}>Region</span>
              <span className={styles.infoValue}>europe-west1 (Belgium)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
