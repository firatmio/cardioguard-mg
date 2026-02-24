// =============================================================================
// Local Database (SQLite)
// =============================================================================
// Offline-first storage for ECG segments, events, and sync metadata.
// Uses expo-sqlite for reliable local persistence.
//
// Schema Design:
//   - ecg_segments: Raw ECG data chunks (10-sec segments)
//   - clinical_events: Anomaly events from the backend
//   - recording_sessions: Metadata for recording sessions
//   - sync_queue: Items pending upload to the backend
//
// Data lifecycle:
//   1. ECG data arrives from BLE → saved to ecg_segments (synced=false)
//   2. Segment added to sync_queue
//   3. SyncQueue uploads when online → marks synced=true
//   4. Old synced segments are pruned after configurable retention period
// =============================================================================

import * as SQLite from 'expo-sqlite';
import type { ECGSegment, ClinicalEvent, RecordingSession } from '../../types';

const DB_NAME = 'cardioguard.db';
const DB_VERSION = 1;

export interface SyncQueueItem {
  id: number;
  type: 'ecg_segment' | 'event_ack';
  referenceId: string;
  payload: string; // JSON-serialized data
  createdAt: string;
  attempts: number;
  lastAttemptAt: string | null;
}

class LocalDatabase {
  private static instance: LocalDatabase;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  /**
   * Initialize the database and create tables if they don't exist.
   * Must be called once on app startup before any DB operations.
   */
  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(DB_NAME);

    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS ecg_segments (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        samples TEXT NOT NULL,
        sample_rate INTEGER NOT NULL,
        lead TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        duration REAL NOT NULL,
        signal_quality REAL NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS clinical_events (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        segment_id TEXT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        doctor_notified INTEGER NOT NULL DEFAULT 0,
        patient_action TEXT,
        measured_bpm REAL,
        duration_seconds REAL
      );

      CREATE TABLE IF NOT EXISTS recording_sessions (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        total_duration_seconds REAL NOT NULL DEFAULT 0,
        segment_count INTEGER NOT NULL DEFAULT 0,
        average_bpm REAL,
        event_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'recording'
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT
      );

      CREATE TABLE IF NOT EXISTS db_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_segments_patient_time
        ON ecg_segments(patient_id, start_time);

      CREATE INDEX IF NOT EXISTS idx_segments_synced
        ON ecg_segments(synced);

      CREATE INDEX IF NOT EXISTS idx_events_patient_time
        ON clinical_events(patient_id, occurred_at);

      CREATE INDEX IF NOT EXISTS idx_sync_queue_type
        ON sync_queue(type);
    `);

    // Store schema version
    await this.db.runAsync(
      `INSERT OR REPLACE INTO db_meta (key, value) VALUES ('version', ?)`,
      [String(DB_VERSION)]
    );
  }

  // ---------------------------------------------------------------------------
  // ECG Segments
  // ---------------------------------------------------------------------------

  /**
   * Save an ECG segment to local storage and enqueue it for sync.
   */
  async saveECGSegment(segment: ECGSegment): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const samplesJson = JSON.stringify(segment.samples);

    await this.db.runAsync(
      `INSERT OR REPLACE INTO ecg_segments
        (id, patient_id, device_id, samples, sample_rate, lead, start_time, end_time, duration, signal_quality, synced, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        segment.id,
        segment.patientId,
        segment.deviceId,
        samplesJson,
        segment.sampleRate,
        segment.lead,
        segment.startTime,
        segment.endTime,
        segment.duration,
        segment.signalQuality,
        segment.synced ? 1 : 0,
        segment.createdAt,
      ]
    );

    // Add to sync queue
    await this.enqueueSyncItem('ecg_segment', segment.id, {
      ...segment,
      samples: segment.samples, // Will be serialized to JSON
    });
  }

  /**
   * Retrieve ECG segments for a patient within a time range.
   */
  async getECGSegments(
    patientId: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100,
  ): Promise<ECGSegment[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = `SELECT * FROM ecg_segments WHERE patient_id = ?`;
    const params: any[] = [patientId];

    if (startTime !== undefined) {
      query += ` AND start_time >= ?`;
      params.push(startTime);
    }
    if (endTime !== undefined) {
      query += ` AND end_time <= ?`;
      params.push(endTime);
    }

    query += ` ORDER BY start_time DESC LIMIT ?`;
    params.push(limit);

    const rows = await this.db.getAllAsync(query, params);
    return (rows as any[]).map(this.rowToSegment);
  }

  /**
   * Get the count of unsynced segments.
   */
  async getUnsyncedCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync(
      `SELECT COUNT(*) as count FROM ecg_segments WHERE synced = 0`
    );
    return (result as any)?.count ?? 0;
  }

  /**
   * Mark segments as synced after successful upload.
   */
  async markSegmentsSynced(ids: string[]): Promise<void> {
    if (!this.db || ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(',');
    await this.db.runAsync(
      `UPDATE ecg_segments SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );
  }

  // ---------------------------------------------------------------------------
  // Clinical Events
  // ---------------------------------------------------------------------------

  /**
   * Save a clinical event received from the backend.
   */
  async saveClinicalEvent(event: ClinicalEvent): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO clinical_events
        (id, patient_id, segment_id, type, severity, title, description, occurred_at, created_at, is_read, doctor_notified, patient_action, measured_bpm, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.patientId,
        event.segmentId,
        event.type,
        event.severity,
        event.title,
        event.description,
        event.occurredAt,
        event.createdAt,
        event.isRead ? 1 : 0,
        event.doctorNotified ? 1 : 0,
        event.patientAction,
        event.measuredBPM,
        event.durationSeconds,
      ]
    );
  }

  /**
   * Get recent events for a patient.
   */
  async getRecentEvents(
    patientId: string,
    limit: number = 20,
  ): Promise<ClinicalEvent[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      `SELECT * FROM clinical_events
       WHERE patient_id = ?
       ORDER BY occurred_at DESC
       LIMIT ?`,
      [patientId, limit]
    );

    return (rows as any[]).map(this.rowToEvent);
  }

  /**
   * Get unread event count for badge display.
   */
  async getUnreadEventCount(patientId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync(
      `SELECT COUNT(*) as count FROM clinical_events WHERE patient_id = ? AND is_read = 0`,
      [patientId]
    );
    return (result as any)?.count ?? 0;
  }

  /**
   * Mark an event as read.
   */
  async markEventRead(eventId: string): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      `UPDATE clinical_events SET is_read = 1 WHERE id = ?`,
      [eventId]
    );
  }

  // ---------------------------------------------------------------------------
  // Recording Sessions
  // ---------------------------------------------------------------------------

  async saveRecordingSession(session: RecordingSession): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO recording_sessions
        (id, patient_id, device_id, start_time, end_time, total_duration_seconds, segment_count, average_bpm, event_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.patientId,
        session.deviceId,
        session.startTime,
        session.endTime,
        session.totalDurationSeconds,
        session.segmentCount,
        session.averageBPM,
        session.eventCount,
        session.status,
      ]
    );
  }

  async getRecordingSessions(
    patientId: string,
    limit: number = 30,
  ): Promise<RecordingSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      `SELECT * FROM recording_sessions
       WHERE patient_id = ?
       ORDER BY start_time DESC
       LIMIT ?`,
      [patientId, limit]
    );

    return (rows as any[]).map(this.rowToSession);
  }

  // ---------------------------------------------------------------------------
  // Sync Queue
  // ---------------------------------------------------------------------------

  async enqueueSyncItem(
    type: SyncQueueItem['type'],
    referenceId: string,
    payload: any,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO sync_queue (type, reference_id, payload, created_at)
       VALUES (?, ?, ?, ?)`,
      [type, referenceId, JSON.stringify(payload), new Date().toISOString()]
    );
  }

  async getPendingSyncItems(limit: number = 10): Promise<SyncQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync(
      `SELECT * FROM sync_queue
       ORDER BY created_at ASC
       LIMIT ?`,
      [limit]
    );

    return (rows as any[]).map((row) => ({
      id: row.id,
      type: row.type,
      referenceId: row.reference_id,
      payload: row.payload,
      createdAt: row.created_at,
      attempts: row.attempts,
      lastAttemptAt: row.last_attempt_at,
    }));
  }

  async removeSyncItems(ids: number[]): Promise<void> {
    if (!this.db || ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await this.db.runAsync(
      `DELETE FROM sync_queue WHERE id IN (${placeholders})`,
      ids
    );
  }

  async incrementSyncAttempt(id: number): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      `UPDATE sync_queue SET attempts = attempts + 1, last_attempt_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  }

  async getSyncQueueCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync(
      `SELECT COUNT(*) as count FROM sync_queue`
    );
    return (result as any)?.count ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Maintenance
  // ---------------------------------------------------------------------------

  /**
   * Remove synced segments older than the retention period.
   * Keeps unsynced data indefinitely (until successfully uploaded).
   */
  async pruneOldData(retentionDays: number = 30): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const result = await this.db.runAsync(
      `DELETE FROM ecg_segments WHERE synced = 1 AND start_time < ?`,
      [cutoffTime]
    );

    return result.changes;
  }

  // ---------------------------------------------------------------------------
  // Row Mappers
  // ---------------------------------------------------------------------------

  private rowToSegment(row: any): ECGSegment {
    return {
      id: row.id,
      patientId: row.patient_id,
      deviceId: row.device_id,
      samples: JSON.parse(row.samples),
      sampleRate: row.sample_rate,
      lead: row.lead,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      signalQuality: row.signal_quality,
      synced: row.synced === 1,
      createdAt: row.created_at,
    };
  }

  private rowToEvent(row: any): ClinicalEvent {
    return {
      id: row.id,
      patientId: row.patient_id,
      segmentId: row.segment_id,
      type: row.type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
      isRead: row.is_read === 1,
      doctorNotified: row.doctor_notified === 1,
      patientAction: row.patient_action,
      measuredBPM: row.measured_bpm,
      durationSeconds: row.duration_seconds,
    };
  }

  private rowToSession(row: any): RecordingSession {
    return {
      id: row.id,
      patientId: row.patient_id,
      deviceId: row.device_id,
      startTime: row.start_time,
      endTime: row.end_time,
      totalDurationSeconds: row.total_duration_seconds,
      segmentCount: row.segment_count,
      averageBPM: row.average_bpm,
      eventCount: row.event_count,
      status: row.status,
    };
  }
}

export default LocalDatabase;
