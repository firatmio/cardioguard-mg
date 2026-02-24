// =============================================================================
// Firestore Service — CRUD via API (Server-centric)
// =============================================================================
// All CRUD operations are now executed through the FastAPI server.
// Real-time listening (onSnapshot) is still directly on Firestore (realtime.ts).
// =============================================================================

import api from "../api";
import type {
  PatientDoc,
  AlertDoc,
  RegisteredUserDoc,
  AnalysisRecord,
  PatientStatistics,
  EventRecord,
  MedGemmaReport,
  PatientBaseline,
  PatientTrend,
  PatientSummary,
  PipelineResult,
} from "./types";

// ---------------------------------------------------------------------------
// REGISTERED USER SEARCH (server: GET /users/search)
// ---------------------------------------------------------------------------

export async function searchRegisteredUsers(
  searchTerm: string,
  excludeUserIds: string[] = []
): Promise<RegisteredUserDoc[]> {
  if (!searchTerm.trim()) return [];

  const data = await api.get<RegisteredUserDoc[]>("/users/search", {
    q: searchTerm.trim(),
    role: "patient",
    exclude: excludeUserIds.length > 0 ? excludeUserIds.join(",") : undefined,
  });

  return data.map((u) => ({
    ...u,
    onboardingComplete: u.onboardingComplete ?? false,
    createdAt: u.createdAt ? new Date(u.createdAt as unknown as string) : new Date(),
    lastLoginAt: u.lastLoginAt
      ? new Date(u.lastLoginAt as unknown as string)
      : undefined,
  }));
}

/**
 * Adds a registered user to the doctor's patient list.
 * Server: POST /patients/doctor/{doctorId}/from-user
 */
export async function addPatientFromUser(
  doctorId: string,
  registeredUser: RegisteredUserDoc,
  extras?: { diagnosis?: string; notes?: string; doctorName?: string }
): Promise<string> {
  const result = await api.post<{ id: string }>(
    `/patients/doctor/${doctorId}/from-user`,
    {
      userId: registeredUser.uid,
      notes: extras?.notes?.trim() || "",
      doctorName: extras?.doctorName || "",
    }
  );
  return result.id;
}

// ---------------------------------------------------------------------------
// PATIENT OPERATIONS (server: /patients/*)
// ---------------------------------------------------------------------------

/** Get all patients of the doctor — Server: GET /patients/doctor/{doctorId} */
export async function getPatients(doctorId: string): Promise<PatientDoc[]> {
  const data = await api.get<Record<string, unknown>[]>(`/patients/doctor/${doctorId}`);
  return data.map(normalizePatient);
}

/** Get single patient — Server: GET /patients/{patientId} */
export async function getPatient(patientId: string): Promise<PatientDoc | null> {
  try {
    const data = await api.get<Record<string, unknown>>(`/patients/${patientId}`);
    return normalizePatient(data);
  } catch {
    return null;
  }
}

/** Add new patient — Server: POST /patients/doctor/{doctorId} */
export async function addPatient(
  doctorId: string,
  data: Omit<PatientDoc, "id" | "createdAt" | "updatedAt" | "doctorId">
): Promise<string> {
  const result = await api.post<{ id: string }>(
    `/patients/doctor/${doctorId}`,
    {
      firstName: data.name?.split(" ")[0] || data.name,
      lastName: data.name?.split(" ").slice(1).join(" ") || "",
      email: data.email || "",
      phone: data.phone || "",
      gender: data.gender === "F" ? "female" : "male",
      notes: data.notes || "",
    }
  );
  return result.id;
}

/** Update patient — Server: PUT /patients/{patientId} */
export async function updatePatient(
  patientId: string,
  data: Partial<Omit<PatientDoc, "id" | "createdAt" | "doctorId">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const parts = data.name.split(" ");
    payload.firstName = parts[0];
    payload.lastName = parts.slice(1).join(" ");
  }
  if (data.email !== undefined) payload.email = data.email;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.status !== undefined) payload.status = data.status;
  if (data.gender !== undefined)
    payload.gender = data.gender === "F" ? "female" : "male";

  await api.put(`/patients/${patientId}`, payload);
}

/** Delete patient — Server: DELETE /patients/{patientId} */
export async function deletePatient(patientId: string): Promise<void> {
  await api.delete(`/patients/${patientId}`);
}

// ---------------------------------------------------------------------------
// ALERT OPERATIONS (server: /alerts/*)
// ---------------------------------------------------------------------------

/** Get all alerts of the doctor — Server: GET /alerts/doctor/{doctorId} */
export async function getAlerts(doctorId: string): Promise<AlertDoc[]> {
  const data = await api.get<Record<string, unknown>[]>(`/alerts/doctor/${doctorId}`);
  return data.map(normalizeAlert);
}

/** Acknowledge alert — Server: PUT /alerts/{alertId}/acknowledge */
export async function acknowledgeAlert(alertId: string): Promise<void> {
  await api.put(`/alerts/${alertId}/acknowledge`);
}

/** Create new alert — Server: POST /alerts */
export async function addAlert(
  doctorId: string,
  data: Omit<AlertDoc, "id" | "createdAt" | "doctorId">
): Promise<string> {
  const result = await api.post<{ id: string }>("/alerts", {
    patientId: data.patientId,
    patientName: data.patientName,
    doctorId,
    type: data.type || "anomaly",
    severity: data.severity,
    title: data.type,
    message: data.description,
  });
  return result.id;
}

// ---------------------------------------------------------------------------
// Normalize helpers — server response → client types
// ---------------------------------------------------------------------------

function normalizePatient(raw: Record<string, unknown>): PatientDoc {
  return {
    id: raw.id as string,
    userId: (raw.userId as string) || undefined,
    name: (raw.name as string) || `${raw.firstName || ""} ${raw.lastName || ""}`.trim(),
    age: (raw.age as number) || 0,
    gender: (raw.gender as "M" | "F") || (raw.gender === "female" ? "F" : "M"),
    diagnosis: (raw.diagnosis as string) || (raw.notes as string) || "",
    status: (raw.status as PatientDoc["status"]) || "offline",
    bpm: (raw.bpm as number) ?? (raw.heartRate as number) ?? null,
    signal: (raw.signal as number) ?? 0,
    lastSync: raw.lastSync ? new Date(raw.lastSync as string) : null,
    alerts24h: (raw.alerts24h as number) ?? 0,
    email: (raw.email as string) || undefined,
    phone: (raw.phone as string) || undefined,
    notes: (raw.notes as string) || undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt as string) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt as string) : new Date(),
    doctorId: (raw.doctorId as string) || "",
    doctorName: (raw.doctorName as string) || undefined,

    // BLE / ECG live monitoring fields
    lastBPM: (raw.lastBPM as number) ?? null,
    lastSignalQuality: (raw.lastSignalQuality as number) ?? undefined,
    deviceStatus: (raw.deviceStatus as PatientDoc["deviceStatus"]) ?? undefined,
    deviceBattery: (raw.deviceBattery as number) ?? null,
    deviceId: (raw.deviceId as string) || undefined,
    lastRecordingAt: raw.lastRecordingAt ? new Date(raw.lastRecordingAt as string) : null,
    lastStatusUpdate: raw.lastStatusUpdate ? new Date(raw.lastStatusUpdate as string) : null,
  };
}

// ---------------------------------------------------------------------------
// PIPELINE & ANALYSIS (server: /pipeline/*, /results/*)
// ---------------------------------------------------------------------------

/** Patient analysis history — Server: GET /results/analysis/patient/{patientId} */
export async function getPatientAnalyses(
  patientId: string,
  hours: number = 24,
  limit: number = 50
): Promise<{ analyses: AnalysisRecord[]; total_count: number }> {
  return api.get(`/results/analysis/patient/${patientId}`, { hours, limit });
}

/** Patient statistics — Server: GET /results/analysis/patient/{patientId}/statistics */
export async function getPatientStatistics(
  patientId: string,
  hours: number = 24
): Promise<{ statistics: PatientStatistics | null }> {
  return api.get(`/results/analysis/patient/${patientId}/statistics`, { hours });
}

/** Patient events — Server: GET /results/events/patient/{patientId} */
export async function getPatientEvents(
  patientId: string,
  period: string = "24h",
  severity?: string
): Promise<{ events: EventRecord[]; total_count: number }> {
  return api.get(`/results/events/patient/${patientId}`, { period, severity });
}

/** Event detail — Server: GET /results/events/{eventId} */
export async function getEventDetail(
  eventId: string
): Promise<{ event: EventRecord }> {
  return api.get(`/results/events/${eventId}`);
}

/** MedGemma report — Server: GET /results/reports/event/{eventId} */
export async function getEventReport(
  eventId: string,
  version: string = "full"
): Promise<{ report: MedGemmaReport }> {
  return api.get(`/results/reports/event/${eventId}`, { version });
}

/** Patient reports — Server: GET /results/reports/patient/{patientId} */
export async function getPatientReports(
  patientId: string,
  limit: number = 20
): Promise<{ reports: MedGemmaReport[]; total_count: number }> {
  return api.get(`/results/reports/patient/${patientId}`, { limit });
}

/** Patient baseline — Server: GET /results/patient/{patientId}/baseline */
export async function getPatientBaseline(
  patientId: string
): Promise<{ baseline: PatientBaseline | null }> {
  return api.get(`/results/patient/${patientId}/baseline`);
}

/** Patient trend — Server: GET /results/patient/{patientId}/trend */
export async function getPatientTrend(
  patientId: string,
  field: string = "anomaly_score"
): Promise<{ trend: PatientTrend | null }> {
  return api.get(`/results/patient/${patientId}/trend`, { field });
}

/** Patient summary — Server: GET /results/summary/patient/{patientId} */
export async function getPatientSummary(
  patientId: string
): Promise<PatientSummary> {
  return api.get(`/results/summary/patient/${patientId}`);
}

/** Pipeline test — Server: POST /pipeline/test */
export async function runPipelineTest(
  scenario: string = "normal",
  patientId: string = "test_patient_001"
): Promise<PipelineResult> {
  return api.post("/pipeline/test", { patient_id: patientId, scenario });
}

function normalizeAlert(raw: Record<string, unknown>): AlertDoc {
  return {
    id: raw.id as string,
    patientName: (raw.patientName as string) || "",
    patientId: (raw.patientId as string) || "",
    type: (raw.type as string) || (raw.title as string) || "",
    severity: (raw.severity as AlertDoc["severity"]) || "info",
    bpm: (raw.bpm as number) ?? null,
    time: raw.time ? new Date(raw.time as string) : (raw.createdAt ? new Date(raw.createdAt as string) : new Date()),
    acknowledged: (raw.acknowledged as boolean) ?? false,
    description: (raw.description as string) || (raw.message as string) || "",
    doctorId: (raw.doctorId as string) || "",
    createdAt: raw.createdAt ? new Date(raw.createdAt as string) : new Date(),
  };
}
