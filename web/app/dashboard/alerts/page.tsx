"use client";

import {
  AlertTriangle,
  Heart,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useAlerts } from "@/lib/firebase/realtime";
import { acknowledgeAlert } from "@/lib/firebase/firestore";
import styles from "./page.module.css";

const severityLabels: Record<string, string> = {
  critical: "Critical",
  urgent: "Urgent",
  warning: "Warning",
  info: "Info",
};

export default function AlertsPage() {
  const { alerts, loading } = useAlerts();
  const [filter, setFilter] = useState<string>("all");
  const [acking, setAcking] = useState<string | null>(null);

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "unread") return !a.acknowledged;
    return a.severity === filter;
  });

  const unreadCount = alerts.filter((a) => !a.acknowledged).length;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  };

  const handleAcknowledge = async (alertId: string) => {
    setAcking(alertId);
    try {
      await acknowledgeAlert(alertId);
    } catch (err) {
      console.error("[Alerts] Acknowledge error:", err);
    } finally {
      setAcking(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spin} />
          <p>Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Anomaly Alerts</h1>
          <p className={styles.pageDesc}>
            Cardiac anomalies detected by AI.
          </p>
        </div>
        <div className={styles.unreadBadge}>
          <AlertTriangle size={14} />
          {unreadCount} unread
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterRow}>
        {["all", "unread", "critical", "urgent", "warning", "info"].map(
          (f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ""} ${f !== "all" && f !== "unread" ? styles[`filt_${f}`] : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? "All"
                : f === "unread"
                  ? "Unread"
                  : severityLabels[f]}
            </button>
          )
        )}
      </div>

      {/* Alert cards */}
      <div className={styles.alertGrid}>
        {filtered.map((alert) => (
          <div
            key={alert.id}
            className={`${styles.alertCard} ${styles[`card_${alert.severity}`]}`}
          >
            <div className={styles.alertTop}>
              <div className={styles.alertSeverity}>
                <span
                  className={`${styles.sevDot} ${styles[`sev_${alert.severity}`]}`}
                />
                <span className={styles.sevLabel}>
                  {severityLabels[alert.severity]}
                </span>
              </div>
              <span className={styles.alertTime}>
                <Clock size={12} />
                {formatTime(alert.time)}
              </span>
            </div>

            <h3 className={styles.alertType}>{alert.type}</h3>

            <div className={styles.alertPatient}>
              <span>{alert.patientName}</span>
            </div>

            <p className={styles.alertDesc}>{alert.description}</p>

            <div className={styles.alertBottom}>
              {alert.bpm && (
                <span className={styles.alertBpm}>
                  <Heart size={12} />
                  {alert.bpm} bpm
                </span>
              )}
              {alert.acknowledged ? (
                <span className={`${styles.ackBadge} ${styles.acked}`}>
                  <CheckCircle2 size={12} /> Acknowledged
                </span>
              ) : (
                <button
                  className={`${styles.ackBadge} ${styles.unacked} ${styles.ackBtn}`}
                  onClick={() => alert.id && handleAcknowledge(alert.id)}
                  disabled={acking === alert.id}
                >
                  {acking === alert.id ? (
                    <><Loader2 size={12} className={styles.spin} /> Acknowledging...</>
                  ) : (
                    <><XCircle size={12} /> Acknowledge</>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.emptyState}>
          <Filter size={24} />
          <p>
            {alerts.length === 0
              ? "No alerts yet."
              : "No alerts matching this filter."}
          </p>
        </div>
      )}
    </div>
  );
}
