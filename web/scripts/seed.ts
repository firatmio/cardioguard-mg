#!/usr/bin/env npx tsx
// =============================================================================
// SEED SCRIPT — Create / clean test data
// =============================================================================
// Usage:
//   npx tsx scripts/seed.ts --doctor <doctorId>          # Write seed data
//   npx tsx scripts/seed.ts --doctor <doctorId> --clean   # Delete seed data
//   npx tsx scripts/seed.ts --doctor <doctorId> --reset   # Delete + rewrite
//
// Environment variable:
//   API_BASE_URL  (default: http://localhost:8000/api/v1)
// =============================================================================

const API_BASE = process.env.API_BASE_URL || "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// HTTP helpers (Node 18+ native fetch)
// ---------------------------------------------------------------------------

async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`${method} ${path} → ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const SEED_PATIENTS = [
  { firstName: "Ahmet", lastName: "Yilmaz", gender: "male", notes: "Atrial Fibrillation" },
  { firstName: "Fatma", lastName: "Kaya", gender: "female", notes: "Supraventricular Tachycardia" },
  { firstName: "Mehmet", lastName: "Demir", gender: "male", notes: "Bradycardia" },
  { firstName: "Ayse", lastName: "Celik", gender: "female", notes: "ST-Segment Anomaly" },
  { firstName: "Ali", lastName: "Ozturk", gender: "male", notes: "Ventricular Tachycardia" },
  { firstName: "Zeynep", lastName: "Arslan", gender: "female", notes: "Atrioventricular Block" },
  { firstName: "Hasan", lastName: "Koc", gender: "male", notes: "Atrial Flutter" },
  { firstName: "Elif", lastName: "Yildiz", gender: "female", notes: "Sinus Tachycardia" },
  { firstName: "Mustafa", lastName: "Sahin", gender: "male", notes: "QT Prolongation" },
  { firstName: "Hatice", lastName: "Aydin", gender: "female", notes: "Premature Ventricular Contraction" },
];

function buildAlerts(
  patientIds: string[],
  patients: typeof SEED_PATIENTS,
  doctorId: string
) {
  return [
    { patientIdx: 0, type: "Tachycardia", severity: "critical", message: "Heart rate reached 165 bpm." },
    { patientIdx: 7, type: "ST-Segment Elevation", severity: "critical", message: "Significant ST-segment elevation in Lead II." },
    { patientIdx: 1, type: "Bradycardia", severity: "urgent", message: "Heart rate dropped to 42 bpm." },
    { patientIdx: 3, type: "Irregular Rhythm", severity: "warning", message: "Brief irregular rhythm episode." },
    { patientIdx: 9, type: "Premature Ventricular Contraction", severity: "warning", message: "12 PVCs detected in the last hour." },
    { patientIdx: 4, type: "Signal Loss", severity: "info", message: "Device connection lost." },
    { patientIdx: 5, type: "AV Block (2nd degree)", severity: "urgent", message: "Second degree AV block pattern." },
    { patientIdx: 2, type: "Pause", severity: "warning", message: "2.1 second sinus arrest recorded." },
  ].map((a) => ({
    patientId: patientIds[a.patientIdx] || "",
    patientName: `${patients[a.patientIdx]?.firstName} ${patients[a.patientIdx]?.lastName}`,
    doctorId,
    type: a.type,
    severity: a.severity,
    title: a.type,
    message: a.message,
  }));
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function seedData(doctorId: string): Promise<void> {
  console.log("\n🌱 Creating seed data...\n");

  // Patients
  const patientIds: string[] = [];
  for (const p of SEED_PATIENTS) {
    try {
      const result = await api<{ id: string }>("POST", `/patients/doctor/${doctorId}`, p);
      patientIds.push(result.id);
      console.log(`  ✅ Patient: ${p.firstName} ${p.lastName} (${result.id})`);
    } catch (err) {
      console.error(`  ❌ Could not add patient (${p.firstName}):`, (err as Error).message);
    }
  }

  // Alerts
  const alerts = buildAlerts(patientIds, SEED_PATIENTS, doctorId);
  for (const a of alerts) {
    try {
      const result = await api<{ id: string }>("POST", "/alerts", a);
      console.log(`  ✅ Alert: ${a.type} → ${a.patientName} (${result.id})`);
    } catch (err) {
      console.error(`  ❌ Could not add alert (${a.type}):`, (err as Error).message);
    }
  }

  console.log(`\n✅ Seed complete: ${patientIds.length} patients, ${alerts.length} alerts.\n`);
}

async function cleanData(doctorId: string): Promise<void> {
  console.log("\n🧹 Cleaning seed data...\n");

  // Get patients
  let patients: { id: string; name?: string }[] = [];
  try {
    patients = await api<{ id: string; name?: string }[]>("GET", `/patients/doctor/${doctorId}`);
  } catch {
    console.log("  ℹ️  No patients found or endpoint not accessible.");
  }

  // Get alerts
  let alerts: { id: string; type?: string }[] = [];
  try {
    alerts = await api<{ id: string; type?: string }[]>("GET", `/alerts/doctor/${doctorId}`);
  } catch {
    console.log("  ℹ️  No alerts found or endpoint not accessible.");
  }

  // Delete alerts
  let deletedAlerts = 0;
  for (const a of alerts) {
    try {
      await api("DELETE", `/alerts/${a.id}`);
      deletedAlerts++;
      console.log(`  🗑️  Alert deleted: ${a.type || a.id}`);
    } catch (err) {
      console.error(`  ❌ Could not delete alert (${a.id}):`, (err as Error).message);
    }
  }

  // Delete patients
  let deletedPatients = 0;
  for (const p of patients) {
    try {
      await api("DELETE", `/patients/${p.id}`);
      deletedPatients++;
      console.log(`  🗑️  Patient deleted: ${p.name || p.id}`);
    } catch (err) {
      console.error(`  ❌ Could not delete patient (${p.id}):`, (err as Error).message);
    }
  }

  console.log(`\n🧹 Cleanup complete: ${deletedPatients} patients, ${deletedAlerts} alerts deleted.\n`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  const doctorIdx = args.indexOf("--doctor");
  const doctorId = doctorIdx !== -1 ? args[doctorIdx + 1] : undefined;

  if (!doctorId) {
    console.error("Usage: npx tsx scripts/seed.ts --doctor <doctorId> [--clean | --reset]");;
    process.exit(1);
  }

  const doClean = args.includes("--clean");
  const doReset = args.includes("--reset");

  console.log(`📡 API: ${API_BASE}`);
  console.log(`👨‍⚕️ Doctor ID: ${doctorId}`);

  if (doReset) {
    await cleanData(doctorId);
    await seedData(doctorId);
  } else if (doClean) {
    await cleanData(doctorId);
  } else {
    await seedData(doctorId);
  }
}

main().catch((err) => {
  console.error("\n💥 Error:", err);
  process.exit(1);
});
