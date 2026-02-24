"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Activity,
  AlertTriangle,
  Shield,
  BarChart3,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Clock,
  Zap,
  Target,
  Brain,
  RefreshCw,
  ChevronRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  getPatient,
  getPatientStatistics,
  getPatientEvents,
  getPatientReports,
  getPatientBaseline,
  getPatientTrend,
  getPatientAnalyses,
  getEventReport,
} from "@/lib/firebase/firestore";
import { usePatient } from "@/lib/firebase/realtime";
import type {
  PatientDoc,
  PatientStatistics,
  EventRecord,
  MedGemmaReport,
  PatientBaseline,
  PatientTrend,
  AnalysisRecord,
} from "@/lib/firebase/types";
import styles from "./page.module.css";

// ─── Types ──────────────────────────────────────────────────────────────
type TabKey = "overview" | "analyses" | "events" | "reports";

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "analyses", label: "Analyses", icon: Activity },
  { key: "events", label: "Events", icon: AlertTriangle },
  { key: "reports", label: "Reports", icon: FileText },
];

// ─── Helpers ────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function severityClass(sev: string): string {
  const s = sev?.toLowerCase();
  if (s === "critical") return styles.sev_critical;
  if (s === "high" || s === "urgent") return styles.sev_urgent;
  if (s === "medium" || s === "warning") return styles.sev_warning;
  return styles.sev_info;
}

function scoreColor(score: number): string {
  if (score >= 0.7) return styles.scoreHigh;
  if (score >= 0.4) return styles.scoreMed;
  return styles.scoreLow;
}

function trendIcon(trend: PatientTrend | null) {
  if (!trend) return <Minus size={14} />;
  if (trend.slope > 0.01) return <TrendingUp size={14} />;
  if (trend.slope < -0.01) return <TrendingDown size={14} />;
  return <Minus size={14} />;
}

// ─── Component ──────────────────────────────────────────────────────────
export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<PatientDoc | null>(null);
  const [stats, setStats] = useState<PatientStatistics | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [reports, setReports] = useState<MedGemmaReport[]>([]);
  const [baseline, setBaseline] = useState<PatientBaseline | null>(null);
  const [trend, setTrend] = useState<PatientTrend | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<MedGemmaReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Real-time Firestore subscription for live patient data ──
  const { patient: livePatient } = usePatient(patientId);

  // Merge: real-time Firestore data overrides API data for live fields
  const mergedPatient: PatientDoc | null = patient
    ? {
        ...patient,
        ...(livePatient
          ? {
              status: livePatient.status,
              bpm: livePatient.lastBPM ?? livePatient.bpm ?? patient.bpm,
              lastBPM: livePatient.lastBPM ?? livePatient.bpm,
              signal: livePatient.signal ?? patient.signal,
              lastSignalQuality:
                livePatient.lastSignalQuality ?? patient.lastSignalQuality,
              deviceStatus: livePatient.deviceStatus ?? patient.deviceStatus,
              deviceBattery: livePatient.deviceBattery ?? patient.deviceBattery,
              lastSync: livePatient.lastSync ?? patient.lastSync,
              alerts24h: livePatient.alerts24h ?? patient.alerts24h,
            }
          : {}),
      }
    : livePatient;

  // ── Fetch all data ──
  const fetchData = useCallback(
    async (showRefresh = false) => {
      if (!patientId) return;
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [p, s, ev, rep, bl, tr, an] = await Promise.allSettled([
          getPatient(patientId),
          getPatientStatistics(patientId),
          getPatientEvents(patientId),
          getPatientReports(patientId),
          getPatientBaseline(patientId),
          getPatientTrend(patientId),
          getPatientAnalyses(patientId, 24, 50),
        ]);

        if (p.status === "fulfilled") setPatient(p.value);
        if (s.status === "fulfilled") setStats(s.value?.statistics ?? null);
        if (ev.status === "fulfilled") setEvents(ev.value?.events ?? []);
        if (rep.status === "fulfilled") setReports(rep.value?.reports ?? []);
        if (bl.status === "fulfilled") setBaseline(bl.value?.baseline ?? null);
        if (tr.status === "fulfilled") setTrend(tr.value?.trend ?? null);
        if (an.status === "fulfilled") setAnalyses(an.value?.analyses ?? []);
      } catch (err) {
        console.error("[PatientDetail] Fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [patientId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Expand report detail ──
  const handleExpandReport = async (eventId: string) => {
    if (expandedReport === eventId) {
      setExpandedReport(null);
      setReportDetail(null);
      return;
    }
    setExpandedReport(eventId);
    setReportLoading(true);
    try {
      const det = await getEventReport(eventId, "doctor");
      setReportDetail(det?.report ?? null);
    } catch {
      setReportDetail(null);
    } finally {
      setReportLoading(false);
    }
  };

  // ── Loading state ──
  if (loading || !mergedPatient) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <Loader2 size={28} className={styles.spin} />
          <p>Loading patient data...</p>
        </div>
      </div>
    );
  }

  // ── Derived (from mergedPatient) ──
  const displayPatient = mergedPatient;

  const patientStatus = displayPatient.status as string;

  const statusLabel =
    patientStatus === "recording"
      ? "Recording"
      : patientStatus === "idle" || patientStatus === "active"
      ? "Online"
      : "Offline";

  const statusClass =
    patientStatus === "recording"
      ? styles.status_recording
      : patientStatus === "idle" || patientStatus === "active"
      ? styles.status_idle
      : styles.status_offline;

  const liveBpm = displayPatient.lastBPM ?? displayPatient.bpm;
  const anomalyRate =
    stats && stats.total_analyses > 0
      ? ((stats.anomaly_count / stats.total_analyses) * 100).toFixed(1)
      : "0";

  // ── Render ──
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backBtn}
            onClick={() => router.push("/dashboard/patients")}
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div className={styles.patientAvatar}>{initials(displayPatient.name)}</div>
          <div className={styles.headerInfo}>
            <h1>{displayPatient.name}</h1>
            <div className={styles.headerMeta}>
              <span>
                {displayPatient.age} y/o · {displayPatient.gender === "M" ? "Male" : "Female"}
              </span>
              <span className={`${styles.statusBadge} ${statusClass}`}>
                {patientStatus === "recording" || patientStatus === "idle" || patientStatus === "active" ? (
                  <Wifi size={10} />
                ) : (
                  <WifiOff size={10} />
                )}
                {statusLabel}
              </span>
              {displayPatient.diagnosis && <span>{displayPatient.diagnosis}</span>}
            </div>
          </div>
        </div>

        <button
          className={styles.backBtn}
          onClick={() => fetchData(true)}
          title="Refresh"
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? styles.spin : ""} />
        </button>
      </div>

      {/* Quick Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.icon_danger}`}>
            <Heart size={18} />
          </div>
          <div>
            <div className={styles.statValue}>
              {liveBpm != null ? `${liveBpm}` : "—"}
              <span style={{ fontSize: "0.7rem", fontWeight: 400, marginLeft: 4 }}>BPM</span>
            </div>
            <div className={styles.statLabel}>Current Heart Rate</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.icon_success}`}>
            <Activity size={18} />
          </div>
          <div>
            <div className={styles.statValue}>
              {stats?.total_analyses ?? 0}
            </div>
            <div className={styles.statLabel}>Total Analyses</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.icon_warning}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className={styles.statValue}>{events.length}</div>
            <div className={styles.statLabel}>Event Count</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.icon_primary}`}>
            <Zap size={18} />
          </div>
          <div>
            <div className={styles.statValue}>{anomalyRate}%</div>
            <div className={styles.statLabel}>Anomaly Rate</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.icon_info}`}>
            <Target size={18} />
          </div>
          <div>
            <div className={styles.statValue}>
              {stats?.avg_hrv_sdnn != null
                ? `${stats.avg_hrv_sdnn.toFixed(0)}`
                : "—"}
              <span style={{ fontSize: "0.7rem", fontWeight: 400, marginLeft: 4 }}>ms</span>
            </div>
            <div className={styles.statLabel}>Avg. HRV (SDNN)</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            <t.icon size={14} />
            {t.label}
            {t.key === "events" && events.length > 0 && (
              <span className={styles.tabBadge}>{events.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          stats={stats}
          baseline={baseline}
          trend={trend}
          patient={displayPatient}
        />
      )}

      {activeTab === "analyses" && <AnalysesTab analyses={analyses} />}

      {activeTab === "events" && <EventsTab events={events} />}

      {activeTab === "reports" && (
        <ReportsTab
          reports={reports}
          expandedReport={expandedReport}
          reportDetail={reportDetail}
          reportLoading={reportLoading}
          onExpandReport={handleExpandReport}
        />
      )}
    </div>
  );
}

// =====================================================================
// Tab Components
// =====================================================================

// ── Overview Tab ──
function OverviewTab({
  stats,
  baseline,
  trend,
  patient,
}: {
  stats: PatientStatistics | null;
  baseline: PatientBaseline | null;
  trend: PatientTrend | null;
  patient: PatientDoc;
}) {
  return (
    <div className={styles.grid2}>
      {/* Statistics Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            <BarChart3 size={16} /> Statistics
          </span>
        </div>
        {stats ? (
          <div className={styles.baselineGrid}>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Avg. Heart Rate</div>
              <div className={styles.baselineValue}>
                {(stats.avg_heart_rate ?? 0).toFixed(0)}
                <span className={styles.baselineUnit}>bpm</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Min / Max Heart Rate</div>
              <div className={styles.baselineValue}>
                {(stats.min_heart_rate ?? 0).toFixed(0)} / {(stats.max_heart_rate ?? 0).toFixed(0)}
                <span className={styles.baselineUnit}>bpm</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>HRV SDNN</div>
              <div className={styles.baselineValue}>
                {(stats.avg_hrv_sdnn ?? 0).toFixed(1)}
                <span className={styles.baselineUnit}>ms</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>HRV RMSSD</div>
              <div className={styles.baselineValue}>
                {(stats.avg_hrv_rmssd ?? 0).toFixed(1)}
                <span className={styles.baselineUnit}>ms</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Normal / Anomaly</div>
              <div className={styles.baselineValue}>
                {stats.normal_count ?? 0} / {stats.anomaly_count ?? 0}
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Avg. Anomaly Score</div>
              <div className={styles.baselineValue}>
                {(stats.avg_anomaly_score ?? 0).toFixed(3)}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <BarChart3 size={28} />
            </div>
            No analysis data yet
          </div>
        )}
      </div>

      {/* Baseline Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            <Shield size={16} /> Learned Baseline
          </span>
          {trend && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {trendIcon(trend)}{" "}
              {trend.change_percent > 0 ? "+" : ""}
              {trend.change_percent.toFixed(1)}%
            </span>
          )}
        </div>
        {baseline ? (
          <div className={styles.baselineGrid}>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Avg. Heart Rate</div>
              <div className={styles.baselineValue}>
                {(baseline.avg_heart_rate ?? 0).toFixed(1)}
                <span className={styles.baselineUnit}>bpm</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Std. Deviation</div>
              <div className={styles.baselineValue}>
                ±{(baseline.std_heart_rate ?? 0).toFixed(1)}
                <span className={styles.baselineUnit}>bpm</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>SDNN</div>
              <div className={styles.baselineValue}>
                {(baseline.avg_sdnn ?? 0).toFixed(1)}
                <span className={styles.baselineUnit}>ms</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>RMSSD</div>
              <div className={styles.baselineValue}>
                {(baseline.avg_rmssd ?? 0).toFixed(1)}
                <span className={styles.baselineUnit}>ms</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>pNN50</div>
              <div className={styles.baselineValue}>
                {((baseline.avg_pnn50 ?? 0) * 100).toFixed(1)}
                <span className={styles.baselineUnit}>%</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Sample Count</div>
              <div className={styles.baselineValue}>{baseline.sample_count ?? 0}</div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Shield size={28} />
            </div>
            Baseline not yet established
          </div>
        )}
      </div>

      {/* Patient Info Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            <Heart size={16} /> Patient Information
          </span>
        </div>
        <div className={styles.baselineGrid}>
          {patient.email && (
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Email</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                {patient.email}
              </div>
            </div>
          )}
          {patient.phone && (
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Phone</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                {patient.phone}
              </div>
            </div>
          )}
          {patient.deviceId && (
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Device ID</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                {patient.deviceId}
              </div>
            </div>
          )}
          {patient.deviceBattery != null && (
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Device Battery</div>
              <div className={styles.baselineValue}>
                {patient.deviceBattery}
                <span className={styles.baselineUnit}>%</span>
              </div>
            </div>
          )}
          {patient.notes && (
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Notes</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {patient.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trend Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            <TrendingUp size={16} /> Trend Analysis
          </span>
        </div>
        {trend ? (
          <div className={styles.baselineGrid}>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Trend Type</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", textTransform: "capitalize" }}>
                {trend.type}
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Slope</div>
              <div className={styles.baselineValue}>
                {trend.slope > 0 ? "+" : ""}
                {trend.slope.toFixed(4)}
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Change</div>
              <div className={styles.baselineValue}>
                {trend.change_percent > 0 ? "+" : ""}
                {trend.change_percent.toFixed(1)}
                <span className={styles.baselineUnit}>%</span>
              </div>
            </div>
            <div className={styles.baselineItem}>
              <div className={styles.baselineLabel}>Start → End</div>
              <div className={styles.baselineValue}>
                {trend.start_value.toFixed(1)} → {trend.end_value.toFixed(1)}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <TrendingUp size={28} />
            </div>
            No trend data yet
          </div>
        )}
      </div>
    </div>
  );
}

// ── Analyses Tab ──
function AnalysesTab({ analyses }: { analyses: AnalysisRecord[] }) {
  if (analyses.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Activity size={28} />
          </div>
          No analysis data yet. Data will appear automatically when the device is connected.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          <Activity size={16} /> Last 24 Hours Analyses
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {analyses.length} records
        </span>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Anomaly Score</th>
              <th>Confidence</th>
              <th>Pattern</th>
              <th>Signal Quality</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((a, i) => (
              <tr key={a.chunk_id || i}>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} />
                    {fmtDate(a.timestamp)}
                  </span>
                </td>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {a.anomaly_score.toFixed(3)}
                    <span className={styles.scoreBar}>
                      <span
                        className={`${styles.scoreFill} ${scoreColor(a.anomaly_score)}`}
                        style={{ width: `${Math.min(a.anomaly_score * 100, 100)}%` }}
                      />
                    </span>
                  </span>
                </td>
                <td>{(a.confidence * 100).toFixed(0)}%</td>
                <td>{a.pattern ?? "Normal"}</td>
                <td>{(a.signal_quality_score * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Events Tab ──
function EventsTab({ events }: { events: EventRecord[] }) {
  if (events.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <AlertTriangle size={28} />
          </div>
          No events recorded yet. Events are created automatically when anomalies are detected.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          <AlertTriangle size={16} /> Events
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {events.length} events
        </span>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.event_id}>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} />
                    {fmtDate(ev.created_at)}
                  </span>
                </td>
                <td style={{ textTransform: "capitalize" }}>
                  {ev.event_type.replace(/_/g, " ")}
                </td>
                <td>
                  <span className={`${styles.sevBadge} ${severityClass(ev.severity)}`}>
                    {ev.severity}
                  </span>
                </td>
                <td style={{ maxWidth: 300, fontSize: "0.78rem" }}>
                  {ev.decision_summary}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reports Tab ──
function ReportsTab({
  reports,
  expandedReport,
  reportDetail,
  reportLoading,
  onExpandReport,
}: {
  reports: MedGemmaReport[];
  expandedReport: string | null;
  reportDetail: MedGemmaReport | null;
  reportLoading: boolean;
  onExpandReport: (eventId: string) => void;
}) {
  if (reports.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Brain size={28} />
          </div>
          No MedGemma reports generated yet. Reports are created automatically when critical
          events are detected.
        </div>
      </div>
    );
  }

  return (
    <div>
      {reports.map((rep) => {
        const isExpanded = expandedReport === rep.event_id;
        return (
          <div key={rep.event_id} className={styles.reportCard}>
            <div
              className={styles.reportHeader}
              onClick={() => onExpandReport(rep.event_id)}
              style={{ cursor: "pointer" }}
            >
              <span className={styles.reportTitle}>
                <Brain size={14} />
                Event: {rep.event_id.slice(0, 8)}…
                <ChevronRight
                  size={14}
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                    transition: "transform 0.2s",
                  }}
                />
              </span>
              <span className={styles.reportTime}>
                {fmtDate(rep.created_at)}
              </span>
            </div>

            {isExpanded && (
              <div className={styles.reportBody}>
                {reportLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Loader2 size={14} className={styles.spin} />
                    Loading report...
                  </div>
                ) : reportDetail?.doctor_version ? (
                  reportDetail.doctor_version
                ) : (
                  "Report details not found."
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
