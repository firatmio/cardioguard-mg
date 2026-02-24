"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Activity,
  AlertTriangle,
  Heart,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Wifi,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  BarChart3,
  Zap,
  Target,
  Timer,
  Shield,
} from "lucide-react";
import { useDashboardStats, useEmergencyAlerts } from "@/lib/firebase/realtime";
import { getPatientStatistics, getPatientEvents } from "@/lib/firebase/firestore";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { stats, recentAlerts, activePatients, patients, loading } = useDashboardStats();
  const { activeAlerts: emergencyAlerts, loading: emLoading } = useEmergencyAlerts();

  // ── Aggregate 24h pipeline stats across all patients ──
  interface Agg24h {
    totalAnalyses: number;
    totalAnomalies: number;
    totalNormal: number;
    avgHeartRate: number;
    minHeartRate: number;
    maxHeartRate: number;
    avgSdnn: number;
    avgRmssd: number;
    avgAnomalyScore: number;
    maxAnomalyScore: number;
    totalEvents: number;
    patientBreakdown: {
      id: string;
      name: string;
      analyses: number;
      anomalies: number;
      avgBpm: number;
      events: number;
      riskScore: number;
    }[];
  }

  const [agg, setAgg] = useState<Agg24h>({
    totalAnalyses: 0,
    totalAnomalies: 0,
    totalNormal: 0,
    avgHeartRate: 0,
    minHeartRate: 0,
    maxHeartRate: 0,
    avgSdnn: 0,
    avgRmssd: 0,
    avgAnomalyScore: 0,
    maxAnomalyScore: 0,
    totalEvents: 0,
    patientBreakdown: [],
  });

  useEffect(() => {
    if (!patients || patients.length === 0) return;
    let cancelled = false;

    async function fetchAggregates() {
      const [statsResults, eventsResults] = await Promise.all([
        Promise.allSettled(patients.map((p) => getPatientStatistics(p.id!))),
        Promise.allSettled(patients.map((p) => getPatientEvents(p.id!, "24h"))),
      ]);

      let totalAn = 0, totalAnom = 0, totalNorm = 0;
      let hrSum = 0, hrCount = 0, hrMin = Infinity, hrMax = -Infinity;
      let sdnnSum = 0, sdnnCount = 0, rmssdSum = 0, rmssdCount = 0;
      let anomScoreSum = 0, anomScoreCount = 0, maxAnomScore = 0;
      let totalEv = 0;
      const breakdown: Agg24h["patientBreakdown"] = [];

      for (let i = 0; i < patients.length; i++) {
        const p = patients[i];
        const sr = statsResults[i];
        const er = eventsResults[i];
        const st = sr.status === "fulfilled" ? sr.value?.statistics : null;
        const ev = er.status === "fulfilled" ? (er.value?.events?.length ?? 0) : 0;

        totalEv += ev;

        if (st) {
          totalAn += st.total_analyses ?? 0;
          totalAnom += st.anomaly_count ?? 0;
          totalNorm += st.normal_count ?? 0;
          if (st.avg_heart_rate > 0) { hrSum += st.avg_heart_rate; hrCount++; }
          if (st.min_heart_rate > 0) hrMin = Math.min(hrMin, st.min_heart_rate);
          if (st.max_heart_rate > 0) hrMax = Math.max(hrMax, st.max_heart_rate);
          if (st.avg_hrv_sdnn > 0) { sdnnSum += st.avg_hrv_sdnn; sdnnCount++; }
          if (st.avg_hrv_rmssd > 0) { rmssdSum += st.avg_hrv_rmssd; rmssdCount++; }
          if (st.avg_anomaly_score > 0) { anomScoreSum += st.avg_anomaly_score; anomScoreCount++; }
          maxAnomScore = Math.max(maxAnomScore, st.max_anomaly_score ?? 0);

          breakdown.push({
            id: p.id!,
            name: p.name,
            analyses: st.total_analyses ?? 0,
            anomalies: st.anomaly_count ?? 0,
            avgBpm: Math.round(st.avg_heart_rate ?? 0),
            events: ev,
            riskScore: st.avg_anomaly_score ?? 0,
          });
        } else if (ev > 0) {
          breakdown.push({
            id: p.id!,
            name: p.name,
            analyses: 0,
            anomalies: 0,
            avgBpm: 0,
            events: ev,
            riskScore: 0,
          });
        }
      }

      if (!cancelled) {
        setAgg({
          totalAnalyses: totalAn,
          totalAnomalies: totalAnom,
          totalNormal: totalNorm,
          avgHeartRate: hrCount > 0 ? Math.round(hrSum / hrCount) : 0,
          minHeartRate: hrMin === Infinity ? 0 : Math.round(hrMin),
          maxHeartRate: hrMax === -Infinity ? 0 : Math.round(hrMax),
          avgSdnn: sdnnCount > 0 ? Math.round(sdnnSum / sdnnCount * 10) / 10 : 0,
          avgRmssd: rmssdCount > 0 ? Math.round(rmssdSum / rmssdCount * 10) / 10 : 0,
          avgAnomalyScore: anomScoreCount > 0 ? Math.round(anomScoreSum / anomScoreCount * 1000) / 1000 : 0,
          maxAnomalyScore: Math.round(maxAnomScore * 1000) / 1000,
          totalEvents: totalEv,
          patientBreakdown: breakdown.sort((a, b) => b.riskScore - a.riskScore),
        });
      }
    }

    fetchAggregates();
    return () => { cancelled = true; };
  }, [patients]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <Loader2 size={28} className={styles.spin} />
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Patients",
      value: String(stats.totalPatients),
      icon: Users,
      color: "primary",
    },
    {
      title: "Active Recordings",
      value: String(stats.activeRecordings),
      icon: Activity,
      color: "success",
    },
    {
      title: "Today's Alerts",
      value: String(stats.todayAlerts),
      icon: AlertTriangle,
      color: "warning",
    },
    {
      title: "Avg. Heart Rate",
      value: stats.avgBpm > 0 ? String(stats.avgBpm) : "—",
      suffix: stats.avgBpm > 0 ? "bpm" : undefined,
      icon: Heart,
      color: "danger",
    },
  ];

  const router = useRouter();

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

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Overview</h1>
          <p className={styles.pageDesc}>
            Monitor your patients' cardiac conditions in real time.
          </p>
        </div>
        <div className={styles.liveIndicator}>
          <span className={styles.liveDot} />
          <span>Live</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className={styles.statCard}>
              <div className={styles.statTop}>
                <div
                  className={`${styles.statIcon} ${styles[`icon_${card.color}`]}`}
                >
                  <Icon size={18} />
                </div>
                <div className={`${styles.statChange} ${styles.changeUp}`}>
                  <ArrowUpRight size={14} />
                  <span>live</span>
                </div>
              </div>
              <div className={styles.statValue}>
                {card.value}
                {card.suffix && (
                  <span className={styles.statSuffix}>{card.suffix}</span>
                )}
              </div>
              <div className={styles.statLabel}>{card.title}</div>
            </div>
          );
        })}
      </div>

      {/* Two column layout */}
      <div className={styles.grid2}>
        {/* Recent alerts */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <AlertTriangle size={16} />
              Recent Alerts
            </h2>
            <span className={styles.cardBadge}>
              {recentAlerts.filter((a) => !a.acknowledged).length} new
            </span>
          </div>
          <div className={styles.alertList}>
            {recentAlerts.length === 0 ? (
              <div className={styles.emptyMini}>No alerts yet.</div>
            ) : (
              recentAlerts.map((alert) => (
                <div key={alert.id} className={styles.alertRow}>
                  <div
                    className={`${styles.severityDot} ${styles[`sev_${alert.severity}`]}`}
                  />
                  <div className={styles.alertInfo}>
                    <span className={styles.alertPatient}>
                      {alert.patientName}
                    </span>
                    <span className={styles.alertType}>{alert.type}</span>
                  </div>
                  {alert.bpm && (
                    <span className={styles.alertBpm}>{alert.bpm} bpm</span>
                  )}
                  <span className={styles.alertTime}>
                    <Clock size={12} />
                    {formatTime(alert.time)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active patients */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <Users size={16} />
              Active Patients
            </h2>
            <span className={styles.cardBadge}>
              {activePatients.filter((p) => p.status === "recording").length}{" "}
              recording
            </span>
          </div>
          <div className={styles.patientList}>
            {activePatients.length === 0 ? (
              <div className={styles.emptyMini}>No patients yet.</div>
            ) : (
              activePatients.map((patient) => (
                <div key={patient.id} className={styles.patientRow} onClick={() => router.push(`/dashboard/patients/${patient.id}`)}>
                  <div className={styles.patientAvatar}>
                    {patient.name[0]}
                  </div>
                  <div className={styles.patientInfo}>
                    <span className={styles.patientName}>{patient.name}</span>
                    <span className={styles.patientAge}>
                      {patient.age} y/o
                    </span>
                  </div>
                  <div
                    className={`${styles.statusBadge} ${styles[`status_${patient.deviceStatus === "recording" ? "recording" : patient.deviceStatus === "connected" ? "idle" : patient.status}`]}`}
                  >
                    {(patient.deviceStatus === "recording" || patient.status === "recording") && <Wifi size={10} />}
                    {patient.deviceStatus === "recording"
                      ? "Live Recording"
                      : patient.deviceStatus === "connected"
                        ? "Connected"
                        : patient.status === "recording"
                          ? "Recording"
                          : patient.status === "idle"
                            ? "Idle"
                            : "Offline"}
                  </div>
                  <div className={styles.patientBpm}>
                    {(patient.lastBPM ?? patient.bpm) ? (
                      <>
                        <Heart size={12} color={patient.lastBPM ? "#ef4444" : undefined} />
                        <span>{patient.lastBPM ?? patient.bpm}</span>
                        {patient.lastBPM && (
                          <span className={styles.liveDot} title="Live data" />
                        )}
                      </>
                    ) : (
                      <span className={styles.noBpm}>—</span>
                    )}
                  </div>
                  <div className={styles.signalBar}>
                    <div
                      className={styles.signalFill}
                      style={{
                        width: `${patient.lastSignalQuality != null ? Math.round(patient.lastSignalQuality * 100) : patient.signal}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Emergency Alerts Banner */}
      {!emLoading && emergencyAlerts.length > 0 && (
        <div className={styles.emergencyBanner}>
          <div className={styles.emergencyHeader}>
            <ShieldAlert size={18} />
            <span>
              {emergencyAlerts.length} Active Emergency Alert(s)
            </span>
          </div>
          <div className={styles.emergencyList}>
            {emergencyAlerts.slice(0, 3).map((ea) => (
              <div key={ea.id} className={styles.emergencyItem}>
                <span
                  className={`${styles.sevBadge} ${
                    ea.severity === "CRITICAL"
                      ? styles.sev_critical
                      : ea.severity === "HIGH"
                      ? styles.sev_urgent
                      : styles.sev_warning
                  }`}
                >
                  {ea.severity}
                </span>
                <span className={styles.emergencySummary}>
                  {ea.summary || ea.event_type.replace(/_/g, " ")}
                </span>
                <span className={styles.emergencyTime}>
                  {ea.created_at
                    ? new Date(ea.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
                {ea.notified_emergency_contact && (
                  <span className={styles.emergencyNotified} title="Emergency contact notified">
                    <CheckCircle2 size={12} /> SMS
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Last 24 Hours Analysis Summary ─── */}
      <div className={styles.section24h}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleRow}>
            <Timer size={18} />
            <h2 className={styles.sectionTitle}>Last 24 Hours</h2>
          </div>
          <span className={styles.sectionBadge}>Live</span>
        </div>

        {/* 24h Stat Grid */}
        <div className={styles.grid24h}>
          <div className={styles.stat24h}>
            <div className={`${styles.stat24hIcon} ${styles.icon_primary}`}>
              <Activity size={16} />
            </div>
            <div className={styles.stat24hValue}>{agg.totalAnalyses}</div>
            <div className={styles.stat24hLabel}>ECG Analyses</div>
          </div>

          <div className={styles.stat24h}>
            <div className={`${styles.stat24hIcon} ${styles.icon_warning}`}>
              <AlertTriangle size={16} />
            </div>
            <div className={styles.stat24hValue}>{agg.totalEvents}</div>
            <div className={styles.stat24hLabel}>Events</div>
          </div>

          <div className={styles.stat24h}>
            <div className={`${styles.stat24hIcon} ${styles.icon_danger}`}>
              <Heart size={16} />
            </div>
            <div className={styles.stat24hValue}>
              {agg.avgHeartRate > 0 ? agg.avgHeartRate : "—"}
              {agg.avgHeartRate > 0 && <span className={styles.stat24hUnit}>bpm</span>}
            </div>
            <div className={styles.stat24hLabel}>Avg. Heart Rate</div>
          </div>

          <div className={styles.stat24h}>
            <div className={`${styles.stat24hIcon} ${styles.icon_danger}`}>
              <TrendingUp size={16} />
            </div>
            <div className={styles.stat24hValue}>
              {agg.minHeartRate > 0
                ? `${agg.minHeartRate}/${agg.maxHeartRate}`
                : "—"}
            </div>
            <div className={styles.stat24hLabel}>Min / Max BPM</div>
          </div>

          <div className={styles.stat24h}>
            <div className={`${styles.stat24hIcon} ${styles.icon_success}`}>
              <BarChart3 size={16} />
            </div>
            <div className={styles.stat24hValue}>
              {agg.avgSdnn > 0 ? agg.avgSdnn : "—"}
              {agg.avgSdnn > 0 && <span className={styles.stat24hUnit}>ms</span>}
            </div>
            <div className={styles.stat24hLabel}>Avg. HRV (SDNN)</div>
          </div>

          <div className={styles.stat24h}>
            <div className={`${styles.stat24hIcon} ${styles.icon_success}`}>
              <Zap size={16} />
            </div>
            <div className={styles.stat24hValue}>
              {agg.avgRmssd > 0 ? agg.avgRmssd : "—"}
              {agg.avgRmssd > 0 && <span className={styles.stat24hUnit}>ms</span>}
            </div>
            <div className={styles.stat24hLabel}>Avg. HRV (RMSSD)</div>
          </div>

          <div className={styles.stat24h}>
            <div className={`${styles.stat24hIcon} ${styles.icon_primary}`}>
              <Shield size={16} />
            </div>
            <div className={styles.stat24hValue}>
              {agg.totalAnalyses > 0
                ? `${(((agg.totalAnalyses - agg.totalAnomalies) / agg.totalAnalyses) * 100).toFixed(1)}%`
                : "—"}
            </div>
            <div className={styles.stat24hLabel}>Normal Rate</div>
          </div>

          <div className={styles.stat24h}>
            <div className={`${styles.stat24hIcon} ${styles.icon_warning}`}>
              <Target size={16} />
            </div>
            <div className={styles.stat24hValue}>{agg.avgAnomalyScore}</div>
            <div className={styles.stat24hLabel}>Avg. Anomaly Score</div>
          </div>
        </div>

        {/* Anomaly / Normal bar */}
        {agg.totalAnalyses > 0 && (
          <div className={styles.anomalyBar}>
            <div className={styles.anomalyBarHeader}>
              <span className={styles.anomalyBarLabel}>
                <CheckCircle2 size={12} /> Normal: {agg.totalNormal}
              </span>
              <span className={styles.anomalyBarLabel}>
                <ShieldAlert size={12} /> Anomaly: {agg.totalAnomalies}
              </span>
            </div>
            <div className={styles.anomalyBarTrack}>
              <div
                className={styles.anomalyBarNormal}
                style={{
                  width: `${((agg.totalNormal / agg.totalAnalyses) * 100).toFixed(1)}%`,
                }}
              />
              <div
                className={styles.anomalyBarAnom}
                style={{
                  width: `${((agg.totalAnomalies / agg.totalAnalyses) * 100).toFixed(1)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Per-Patient 24h Breakdown ─── */}
      {agg.patientBreakdown.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <BarChart3 size={16} />
              Patient 24-Hour Summary
            </h2>
            <span className={styles.cardBadge}>
              {agg.patientBreakdown.length} patients
            </span>
          </div>
          <div className={styles.breakdownTable}>
            <div className={styles.breakdownHead}>
              <span className={styles.breakdownColName}>Patient</span>
              <span className={styles.breakdownCol}>Analyses</span>
              <span className={styles.breakdownCol}>Anomaly</span>
              <span className={styles.breakdownCol}>Events</span>
              <span className={styles.breakdownCol}>Avg. BPM</span>
              <span className={styles.breakdownCol}>Risk</span>
            </div>
            {agg.patientBreakdown.map((pb) => (
              <div
                key={pb.id}
                className={styles.breakdownRow}
                onClick={() => router.push(`/dashboard/patients/${pb.id}`)}
              >
                <span className={styles.breakdownColName}>
                  <div className={styles.patientAvatar}>{pb.name[0]}</div>
                  {pb.name}
                </span>
                <span className={styles.breakdownCol}>{pb.analyses}</span>
                <span className={`${styles.breakdownCol} ${pb.anomalies > 0 ? styles.colDanger : ""}`}>
                  {pb.anomalies}
                </span>
                <span className={`${styles.breakdownCol} ${pb.events > 0 ? styles.colWarning : ""}`}>
                  {pb.events}
                </span>
                <span className={styles.breakdownCol}>
                  {pb.avgBpm > 0 ? `${pb.avgBpm}` : "—"}
                </span>
                <span className={styles.breakdownCol}>
                  <div className={styles.riskBar}>
                    <div
                      className={`${styles.riskFill} ${
                        pb.riskScore >= 0.7
                          ? styles.riskHigh
                          : pb.riskScore >= 0.4
                          ? styles.riskMed
                          : styles.riskLow
                      }`}
                      style={{ width: `${Math.min(100, pb.riskScore * 100)}%` }}
                    />
                  </div>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
