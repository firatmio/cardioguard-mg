#!/usr/bin/env npx tsx
// =============================================================================
// SEED SCRIPT — Test verisi oluştur / temizle
// =============================================================================
// Kullanım:
//   npx tsx scripts/seed.ts --doctor <doctorId>          # Seed verileri yaz
//   npx tsx scripts/seed.ts --doctor <doctorId> --clean   # Seed verilerini sil
//   npx tsx scripts/seed.ts --doctor <doctorId> --reset   # Sil + yeniden yaz
//
// Ortam değişkeni:
//   API_BASE_URL  (varsayılan: http://localhost:8000/api/v1)
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
// Seed data tanımları
// ---------------------------------------------------------------------------

const SEED_PATIENTS = [
  { firstName: "Ahmet", lastName: "Yılmaz", gender: "male", notes: "Atriyal Fibrilasyon" },
  { firstName: "Fatma", lastName: "Kaya", gender: "female", notes: "Supraventriküler Taşikardi" },
  { firstName: "Mehmet", lastName: "Demir", gender: "male", notes: "Bradikardi" },
  { firstName: "Ayşe", lastName: "Çelik", gender: "female", notes: "ST-Segment Anomalisi" },
  { firstName: "Ali", lastName: "Öztürk", gender: "male", notes: "Ventriküler Taşikardi" },
  { firstName: "Zeynep", lastName: "Arslan", gender: "female", notes: "Atriyoventriküler Blok" },
  { firstName: "Hasan", lastName: "Koç", gender: "male", notes: "Atriyal Flutter" },
  { firstName: "Elif", lastName: "Yıldız", gender: "female", notes: "Sinüs Taşikardisi" },
  { firstName: "Mustafa", lastName: "Şahin", gender: "male", notes: "QT Uzaması" },
  { firstName: "Hatice", lastName: "Aydın", gender: "female", notes: "Erken Ventrikül Atımı" },
];

function buildAlerts(
  patientIds: string[],
  patients: typeof SEED_PATIENTS,
  doctorId: string
) {
  return [
    { patientIdx: 0, type: "Taşikardi", severity: "critical", message: "Kalp hızı 165 bpm'e ulaştı." },
    { patientIdx: 7, type: "ST-Segment Elevasyonu", severity: "critical", message: "Lead II'de belirgin ST-segment elevasyonu." },
    { patientIdx: 1, type: "Bradikardi", severity: "urgent", message: "Kalp hızı 42 bpm'e düştü." },
    { patientIdx: 3, type: "Düzensiz Ritim", severity: "warning", message: "Kısa süreli düzensiz ritim episodu." },
    { patientIdx: 9, type: "Erken Ventrikül Atımı", severity: "warning", message: "Son 1 saatte 12 PVC tespit edildi." },
    { patientIdx: 4, type: "Sinyal Kaybı", severity: "info", message: "Cihaz bağlantısı koptu." },
    { patientIdx: 5, type: "AV Blok (2. derece)", severity: "urgent", message: "İkinci derece AV blok paterni." },
    { patientIdx: 2, type: "Pause", severity: "warning", message: "2.1 saniyelik sinüs arrest kaydedildi." },
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
  console.log("\n🌱 Seed verileri oluşturuluyor...\n");

  // Hastalar
  const patientIds: string[] = [];
  for (const p of SEED_PATIENTS) {
    try {
      const result = await api<{ id: string }>("POST", `/patients/doctor/${doctorId}`, p);
      patientIds.push(result.id);
      console.log(`  ✅ Hasta: ${p.firstName} ${p.lastName} (${result.id})`);
    } catch (err) {
      console.error(`  ❌ Hasta eklenemedi (${p.firstName}):`, (err as Error).message);
    }
  }

  // Alertler
  const alerts = buildAlerts(patientIds, SEED_PATIENTS, doctorId);
  for (const a of alerts) {
    try {
      const result = await api<{ id: string }>("POST", "/alerts", a);
      console.log(`  ✅ Alert: ${a.type} → ${a.patientName} (${result.id})`);
    } catch (err) {
      console.error(`  ❌ Alert eklenemedi (${a.type}):`, (err as Error).message);
    }
  }

  console.log(`\n✅ Seed tamamlandı: ${patientIds.length} hasta, ${alerts.length} alert.\n`);
}

async function cleanData(doctorId: string): Promise<void> {
  console.log("\n🧹 Seed verileri temizleniyor...\n");

  // Hastaları getir
  let patients: { id: string; name?: string }[] = [];
  try {
    patients = await api<{ id: string; name?: string }[]>("GET", `/patients/doctor/${doctorId}`);
  } catch {
    console.log("  ℹ️  Hasta bulunamadı veya endpoint erişilemedi.");
  }

  // Alertleri getir
  let alerts: { id: string; type?: string }[] = [];
  try {
    alerts = await api<{ id: string; type?: string }[]>("GET", `/alerts/doctor/${doctorId}`);
  } catch {
    console.log("  ℹ️  Alert bulunamadı veya endpoint erişilemedi.");
  }

  // Alertleri sil
  let deletedAlerts = 0;
  for (const a of alerts) {
    try {
      await api("DELETE", `/alerts/${a.id}`);
      deletedAlerts++;
      console.log(`  🗑️  Alert silindi: ${a.type || a.id}`);
    } catch (err) {
      console.error(`  ❌ Alert silinemedi (${a.id}):`, (err as Error).message);
    }
  }

  // Hastaları sil
  let deletedPatients = 0;
  for (const p of patients) {
    try {
      await api("DELETE", `/patients/${p.id}`);
      deletedPatients++;
      console.log(`  🗑️  Hasta silindi: ${p.name || p.id}`);
    } catch (err) {
      console.error(`  ❌ Hasta silinemedi (${p.id}):`, (err as Error).message);
    }
  }

  console.log(`\n🧹 Temizlik tamamlandı: ${deletedPatients} hasta, ${deletedAlerts} alert silindi.\n`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  const doctorIdx = args.indexOf("--doctor");
  const doctorId = doctorIdx !== -1 ? args[doctorIdx + 1] : undefined;

  if (!doctorId) {
    console.error("Kullanım: npx tsx scripts/seed.ts --doctor <doctorId> [--clean | --reset]");
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
  console.error("\n💥 Hata:", err);
  process.exit(1);
});
