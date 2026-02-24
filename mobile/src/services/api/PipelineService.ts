// =============================================================================
// Pipeline Service
// =============================================================================
// Communicates with the backend AI pipeline for real-time ECG analysis.
//
// Endpoints used:
//   POST /api/v1/pipeline/analyze   → Send ECG segment, get anomaly analysis
//   GET  /api/v1/pipeline/baseline  → Get patient's personalized baseline
//   GET  /api/v1/pipeline/history   → Get analysis history & trend
//   POST /api/v1/ecg/batch          → Batch upload for offline sync
//
// Integration points:
//   - SyncQueue calls analyzeBatch() during sync
//   - DeviceContext calls analyzeSegment() after saving to SQLite
//   - Results are saved as ClinicalEvents in LocalDatabase
//   - High-severity events trigger local notifications
// =============================================================================

import { API_CONFIG } from '../../constants/config';
import LocalDatabase from '../storage/LocalDatabase';
import NotificationService from '../notifications/NotificationService';
import type { ECGSegment, ClinicalEvent, AnomalyType, EventSeverity } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Server pipeline response */
export interface PipelineResult {
  status: string;
  analysis_id: string;
  patient_id: string;
  anomaly_score: number;
  confidence: number;
  pattern: string;
  severity: string | null;
  heart_rate_bpm: number;
  sdnn_ms: number;
  rmssd_ms: number;
  total_beats: number;
  ectopic_beats: number;
  event_created: boolean;
  event_id: string | null;
  event_type: string | null;
  event_summary: string | null;
  baseline: Record<string, any> | null;
  processing_time_ms: number;
  model_version: string;
}

/** Batch upload response from /ecg/batch */
export interface BatchIngestResponse {
  status: string;
  accepted: number;
  chunk_ids: string[];
}

/** Analysis summary for UI display */
export interface AnalysisSummary {
  anomalyScore: number;
  heartRate: number;
  pattern: string;
  severity: string | null;
  eventCreated: boolean;
  processingTimeMs: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class PipelineService {
  private static instance: PipelineService;
  private db = LocalDatabase.getInstance();
  private notifications = NotificationService.getInstance();

  /** Rate-limit: minimum interval between pipeline calls (ms) */
  private static readonly MIN_ANALYZE_INTERVAL = 5_000;
  private lastAnalyzeTime = 0;

  /** Track consecutive failures to apply backoff */
  private consecutiveFailures = 0;
  private static readonly MAX_BACKOFF = 8; // max 2^8 = 256x (4.2 min)

  private constructor() {}

  static getInstance(): PipelineService {
    if (!PipelineService.instance) {
      PipelineService.instance = new PipelineService();
    }
    return PipelineService.instance;
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /**
   * Send a single ECG segment to the pipeline for real-time analysis.
   * Returns the analysis summary, or null if the call was skipped/failed.
   *
   * Rate-limited to prevent flooding the server during continuous streaming.
   */
  async analyzeSegment(segment: ECGSegment): Promise<AnalysisSummary | null> {
    // Rate limit
    const now = Date.now();
    const minInterval = PipelineService.MIN_ANALYZE_INTERVAL *
      Math.pow(2, Math.min(this.consecutiveFailures, PipelineService.MAX_BACKOFF));

    if (now - this.lastAnalyzeTime < minInterval) {
      return null;
    }
    this.lastAnalyzeTime = now;

    try {
      const result = await this.callPipelineAnalyze({
        patient_id: segment.patientId,
        session_id: '',
        samples: segment.samples,
        sampling_rate: segment.sampleRate,
        device_id: segment.deviceId,
      });

      this.consecutiveFailures = 0;

      // If the pipeline created an event, save it locally and notify
      if (result.event_created && result.event_id) {
        await this.saveEventFromResult(result, segment);
      }

      return {
        anomalyScore: result.anomaly_score,
        heartRate: result.heart_rate_bpm,
        pattern: result.pattern,
        severity: result.severity,
        eventCreated: result.event_created,
        processingTimeMs: result.processing_time_ms,
      };
    } catch (error: any) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures <= 2) {
        console.warn('[PipelineService] Analysis failed:', error?.message);
      }
      return null;
    }
  }

  /**
   * Send multiple segments to the pipeline in batch.
   * Used by SyncQueue for offline sync.
   * Returns the number of successfully analyzed segments.
   */
  async analyzeBatch(segments: ECGSegment[]): Promise<{
    analyzed: number;
    failed: number;
    results: PipelineResult[];
  }> {
    let analyzed = 0;
    let failed = 0;
    const results: PipelineResult[] = [];

    for (const segment of segments) {
      try {
        const result = await this.callPipelineAnalyze({
          patient_id: segment.patientId,
          session_id: '',
          samples: segment.samples,
          sampling_rate: segment.sampleRate,
          device_id: segment.deviceId,
        });

        results.push(result);
        analyzed++;

        // Save any events generated
        if (result.event_created && result.event_id) {
          await this.saveEventFromResult(result, segment);
        }
      } catch {
        failed++;
      }
    }

    if (analyzed > 0) {
      this.consecutiveFailures = 0;
    }

    return { analyzed, failed, results };
  }

  /**
   * Batch upload segments to the ingest endpoint (without waiting for analysis).
   * Lighter than pipeline/analyze — used when we just need to persist data.
   */
  async batchUpload(segments: ECGSegment[]): Promise<BatchIngestResponse | null> {
    try {
      const chunks = segments.map((seg) => ({
        patient_id: seg.patientId,
        session_id: '',
        samples: seg.samples,
        sampling_rate: seg.sampleRate,
        lead_type: `Lead ${seg.lead}`,
        timestamp: seg.createdAt,
      }));

      const response = await this.fetchWithTimeout(
        `${API_CONFIG.baseUrl}/api/v1/ecg/batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chunks }),
        },
      );

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Get patient's current baseline from the server.
   */
  async getBaseline(patientId: string): Promise<Record<string, any> | null> {
    try {
      const response = await this.fetchWithTimeout(
        `${API_CONFIG.baseUrl}/api/v1/pipeline/baseline/${encodeURIComponent(patientId)}`,
        { method: 'GET' },
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.baseline ?? data;
    } catch {
      return null;
    }
  }

  /**
   * Get patient's analysis history from the server.
   */
  async getHistory(patientId: string): Promise<any | null> {
    try {
      const response = await this.fetchWithTimeout(
        `${API_CONFIG.baseUrl}/api/v1/pipeline/history/${encodeURIComponent(patientId)}`,
        { method: 'GET' },
      );

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Reset backoff counter (called when network comes back online).
   */
  resetBackoff(): void {
    this.consecutiveFailures = 0;
    this.lastAnalyzeTime = 0;
  }

  // =========================================================================
  // PRIVATE
  // =========================================================================

  /**
   * Call POST /api/v1/pipeline/analyze
   */
  private async callPipelineAnalyze(body: {
    patient_id: string;
    session_id: string;
    samples: number[];
    sampling_rate: number;
    device_id?: string;
  }): Promise<PipelineResult> {
    const response = await this.fetchWithTimeout(
      `${API_CONFIG.baseUrl}/api/v1/pipeline/analyze`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Pipeline error ${response.status}: ${text}`);
    }

    return await response.json();
  }

  /**
   * Convert a PipelineResult into a ClinicalEvent, save to LocalDatabase,
   * and trigger a local notification.
   */
  private async saveEventFromResult(
    result: PipelineResult,
    segment: ECGSegment,
  ): Promise<void> {
    const event: ClinicalEvent = {
      id: result.event_id!,
      patientId: result.patient_id,
      segmentId: segment.id,
      type: this.mapPatternToAnomalyType(result.pattern),
      severity: this.mapSeverity(result.severity),
      title: this.generateEventTitle(result),
      description: this.generateEventDescription(result),
      occurredAt: new Date(segment.startTime).toISOString(),
      createdAt: new Date().toISOString(),
      isRead: false,
      doctorNotified: true, // Server handles doctor notification
      patientAction: this.generatePatientAction(result),
      measuredBPM: result.heart_rate_bpm,
      durationSeconds: segment.duration,
    };

    try {
      await this.db.saveClinicalEvent(event);
    } catch (err) {
      console.warn('[PipelineService] Failed to save event locally:', err);
    }

    // Show local notification
    try {
      await this.notifications.showEventNotification(event);
    } catch (err) {
      console.warn('[PipelineService] Failed to show notification:', err);
    }
  }

  /**
   * Map server pattern string to mobile AnomalyType.
   */
  private mapPatternToAnomalyType(pattern: string): AnomalyType {
    const map: Record<string, AnomalyType> = {
      bradycardia: 'bradycardia',
      tachycardia: 'tachycardia',
      irregular_rhythm: 'irregular_rhythm',
      afib_suspect: 'irregular_rhythm',
      signal_loss: 'signal_loss',
      pause: 'pause',
      normal_sinus: 'unknown', // Not an anomaly, but might still create info events
    };
    return map[pattern] || 'unknown';
  }

  /**
   * Map server severity to mobile EventSeverity.
   */
  private mapSeverity(severity: string | null): EventSeverity {
    const map: Record<string, EventSeverity> = {
      LOW: 'info',
      MEDIUM: 'warning',
      HIGH: 'urgent',
      CRITICAL: 'critical',
    };
    return map[severity ?? ''] || 'warning';
  }

  /**
   * Generate patient-friendly event title.
   */
  private generateEventTitle(result: PipelineResult): string {
    const titles: Record<string, string> = {
      bradycardia: 'Low Heart Rate Detected',
      tachycardia: 'High Heart Rate Detected',
      irregular_rhythm: 'Irregular Heart Rhythm Detected',
      afib_suspect: 'Irregular Heart Rhythm Detected',
      signal_loss: 'Signal Loss',
      pause: 'Heartbeat Pause Detected',
    };
    return titles[result.pattern] || 'Abnormal ECG Finding';
  }

  /**
   * Generate patient-friendly event description.
   */
  private generateEventDescription(result: PipelineResult): string {
    const bpm = Math.round(result.heart_rate_bpm);
    const severity = result.severity;

    if (result.pattern === 'bradycardia') {
      return `Your heart rate was measured at ${bpm} BPM. This is below normal. Your doctor has been notified.`;
    }
    if (result.pattern === 'tachycardia') {
      return `Your heart rate was measured at ${bpm} BPM. This is above normal. Your doctor has been notified.`;
    }
    if (result.pattern === 'irregular_rhythm' || result.pattern === 'afib_suspect') {
      return `An irregularity was detected in your heart rhythm. Your doctor has been notified.`;
    }
    if (result.pattern === 'pause') {
      return `A brief pause was detected in your heartbeat. Your doctor has been notified.`;
    }

    if (severity === 'CRITICAL') {
      return `A critical ECG anomaly was detected (${bpm} BPM). Your emergency contact and doctor have been notified.`;
    }

    return result.event_summary ?? `An unusual finding was detected in the ECG analysis (${bpm} BPM). Your doctor has been notified.`;
  }

  /**
   * Generate patient action recommendation.
   */
  private generatePatientAction(result: PipelineResult): string {
    if (result.severity === 'CRITICAL') {
      return 'Please stay calm and do not move. Your emergency contact and doctor have been notified. If you feel very unwell, call 112.';
    }
    if (result.severity === 'HIGH') {
      return 'Your doctor has been notified. Please continue wearing your monitor and reduce physical activity.';
    }
    if (result.severity === 'MEDIUM') {
      return 'Your doctor has been notified. Continue wearing your monitor.';
    }
    return 'There is no emergency. Continue wearing your monitor.';
  }

  /**
   * Fetch with timeout using AbortController.
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = API_CONFIG.timeout,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export default PipelineService;
