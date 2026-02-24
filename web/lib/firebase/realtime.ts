// =============================================================================
// Real-time Firestore Hooks — onSnapshot ile canlı veri dinleme
// =============================================================================
// Hot reload: Firestore onSnapshot listener'ları sayesinde veri değiştiğinde
// otomatik güncellenir. Sayfayı yenilemeye gerek yok.
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { useAuth } from "./hooks";
import type { PatientDoc, AlertDoc, DoctorStatsDoc, EmergencyAlertDoc } from "./types";

// ---------------------------------------------------------------------------
// Yardımcı: Firestore data → typed object
// ---------------------------------------------------------------------------
function toDate(val: unknown): Date | null {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val);
  return null;
}

function toPatient(id: string, d: Record<string, unknown>): PatientDoc {
  return {
    id,
    userId: (d.userId as string) || undefined,
    name: (d.name as string) || "",
    age: (d.age as number) || 0,
    gender: (d.gender as "M" | "F") || "M",
    diagnosis: (d.diagnosis as string) || "",
    status: (d.status as PatientDoc["status"]) || "offline",
    bpm: (d.bpm as number) ?? null,
    signal: (d.signal as number) ?? 0,
    lastSync: toDate(d.lastSync),
    alerts24h: (d.alerts24h as number) ?? 0,
    email: (d.email as string) || undefined,
    phone: (d.phone as string) || undefined,
    notes: (d.notes as string) || undefined,
    createdAt: toDate(d.createdAt) || new Date(),
    updatedAt: toDate(d.updatedAt) || new Date(),
    doctorId: (d.doctorId as string) || "",
    doctorName: (d.doctorName as string) || undefined,

    // BLE / ECG live monitoring fields
    lastBPM: (d.lastBPM as number) ?? null,
    lastSignalQuality: (d.lastSignalQuality as number) ?? undefined,
    deviceStatus: (d.deviceStatus as PatientDoc["deviceStatus"]) ?? undefined,
    deviceBattery: (d.deviceBattery as number) ?? null,
    deviceId: (d.deviceId as string) || undefined,
    lastRecordingAt: toDate(d.lastRecordingAt),
    lastStatusUpdate: toDate(d.lastStatusUpdate),
  };
}

function toAlert(id: string, d: Record<string, unknown>): AlertDoc {
  return {
    id,
    patientName: (d.patientName as string) || "",
    patientId: (d.patientId as string) || "",
    type: (d.type as string) || "",
    severity: (d.severity as AlertDoc["severity"]) || "info",
    bpm: (d.bpm as number) ?? null,
    time: toDate(d.time) || new Date(),
    acknowledged: (d.acknowledged as boolean) ?? false,
    description: (d.description as string) || "",
    doctorId: (d.doctorId as string) || "",
    createdAt: toDate(d.createdAt) || new Date(),
  };
}

// ---------------------------------------------------------------------------
// usePatients — Doktorun tüm hastalarını real-time dinle
// ---------------------------------------------------------------------------
export function usePatients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPatients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "patients"),
      where("doctorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub: Unsubscribe = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => toPatient(d.id, d.data()));
        setPatients(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[usePatients] Error:", err);
        setError("Hasta verileri yüklenemedi.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  return { patients, loading, error };
}

// ---------------------------------------------------------------------------
// usePatient — Tek hasta belgesini real-time dinle (detay sayfası için)
// ---------------------------------------------------------------------------
export function usePatient(patientId: string | null) {
  const [patient, setPatient] = useState<PatientDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, "patients", patientId);

    const unsub: Unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setPatient(toPatient(snap.id, snap.data()));
        } else {
          setPatient(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[usePatient] Error:", err);
        setError("Hasta verisi yüklenemedi.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [patientId]);

  return { patient, loading, error };
}

// ---------------------------------------------------------------------------
// useAlerts — Doktorun tüm uyarılarını real-time dinle
// ---------------------------------------------------------------------------
export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "alerts"),
      where("doctorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub: Unsubscribe = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => toAlert(d.id, d.data()));
        setAlerts(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useAlerts] Error:", err);
        setError("Uyarı verileri yüklenemedi.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  return { alerts, loading, error };
}

// ---------------------------------------------------------------------------
// useDashboardStats — Hasta/uyarı verilerinden istatistik hesaplama
// ---------------------------------------------------------------------------
export function useDashboardStats() {
  const { patients, loading: pLoading } = usePatients();
  const { alerts, loading: aLoading } = useAlerts();

  const loading = pLoading || aLoading;

  const stats: DoctorStatsDoc = {
    totalPatients: patients.length,
    activeRecordings: patients.filter(
      (p) => p.status === "recording" || p.deviceStatus === "recording"
    ).length,
    todayAlerts: alerts.filter((a) => {
      const now = new Date();
      const alertDate = a.createdAt;
      return (
        alertDate.getFullYear() === now.getFullYear() &&
        alertDate.getMonth() === now.getMonth() &&
        alertDate.getDate() === now.getDate()
      );
    }).length,
    avgBpm: (() => {
      // Prefer live BPM from device, fallback to stored bpm
      const withBpm = patients.filter(
        (p) => (p.lastBPM ?? p.bpm) !== null
      );
      if (withBpm.length === 0) return 0;
      return Math.round(
        withBpm.reduce((sum, p) => sum + (p.lastBPM ?? p.bpm ?? 0), 0) / withBpm.length
      );
    })(),
    updatedAt: new Date(),
  };

  // Son 5 uyarı
  const recentAlerts = alerts.slice(0, 5);

  // Aktif hastalar (recording olanlar önce)
  const activePatients = [...patients]
    .sort((a, b) => {
      const order = { recording: 0, idle: 1, offline: 2 };
      return order[a.status] - order[b.status];
    })
    .slice(0, 5);

  return { stats, recentAlerts, activePatients, patients, alerts, loading };
}

// ---------------------------------------------------------------------------
// useEmergencyAlerts — Aktif acil durum uyarılarını real-time dinle
// ---------------------------------------------------------------------------
function toEmergencyAlert(
  id: string,
  d: Record<string, unknown>
): EmergencyAlertDoc {
  return {
    id,
    event_id: (d.event_id as string) || "",
    patient_id: (d.patient_id as string) || "",
    severity: (d.severity as string) || "info",
    event_type: (d.event_type as string) || "",
    summary: (d.summary as string) || "",
    doctor_id: (d.doctor_id as string) || null,
    notified_emergency_contact: (d.notified_emergency_contact as boolean) ?? false,
    notified_doctor: (d.notified_doctor as boolean) ?? false,
    created_at: (d.created_at as string) || "",
    status: (d.status as EmergencyAlertDoc["status"]) || "active",
  };
}

export function useEmergencyAlerts() {
  const { user } = useAuth();
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlertDoc[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setEmergencyAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "emergency_alerts"),
      where("doctor_id", "==", user.uid),
      orderBy("created_at", "desc")
    );

    const unsub: Unsubscribe = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) =>
          toEmergencyAlert(d.id, d.data())
        );
        setEmergencyAlerts(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useEmergencyAlerts] Error:", err);
        setError("Acil durum uyarıları yüklenemedi.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const activeAlerts = emergencyAlerts.filter((a) => a.status === "active");

  return { emergencyAlerts, activeAlerts, loading, error };
}
