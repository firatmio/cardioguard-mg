// =============================================================================
// Offline Sync Queue
// =============================================================================
// Manages the upload queue for ECG data and other pending items.
// Implements batched uploads with exponential backoff and retry logic.
//
// Flow:
//   1. New ECG segments are written to local DB and enqueued
//   2. SyncQueue checks network status periodically
//   3. When online, items are batched and uploaded to the backend
//   4. Successful items are removed from queue and marked synced in DB
//   5. Failed items get retry count incremented, retried with backoff
//   6. Items exceeding max retries are flagged for manual review
// =============================================================================

import { SYNC_CONFIG, API_CONFIG } from '../../constants/config';
import LocalDatabase from './LocalDatabase';
import type { SyncQueueItem } from './LocalDatabase';
import { db, auth } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import FirestoreECGSync from '../firebase/ecgSync';
import PipelineService from '../api/PipelineService';
import type { ECGSegment } from '../../types';

export interface SyncResult {
  uploaded: number;
  failed: number;
  remaining: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

type SyncStatusListener = (status: SyncStatus, result?: SyncResult) => void;

class SyncQueue {
  private static instance: SyncQueue;
  private db = LocalDatabase.getInstance();
  private status: SyncStatus = 'idle';
  private listeners: Set<SyncStatusListener> = new Set();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline: boolean = false;
  private isSyncing: boolean = false;

  // Consecutive failure tracking — backs off when backend is unreachable
  // to avoid spamming the network and burning battery/CPU.
  private consecutiveFailures: number = 0;
  private static readonly MAX_BACKOFF_MULTIPLIER = 16; // max 16× base interval

  private constructor() {}

  /**
   * FirestoreECGSync henüz initialize edilmemişse, mevcut Firebase Auth
   * kullanıcısından otomatik başlat. Patient doc yoksa oluşturur.
   */
  private async ensureFirestoreReady(): Promise<string | null> {
    const ecgSync = FirestoreECGSync.getInstance();
    let docId = ecgSync.getPatientDocId();
    if (docId) return docId;

    // Mevcut kullanıcıyı Firebase Auth'tan al
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    // initialize() patient doc'u arar veya oluşturur
    await ecgSync.initialize(currentUser.uid);
    return ecgSync.getPatientDocId();
  }

  static getInstance(): SyncQueue {
    if (!SyncQueue.instance) {
      SyncQueue.instance = new SyncQueue();
    }
    return SyncQueue.instance;
  }

  /**
   * Update network status. Called by useNetworkStatus hook.
   */
  setOnline(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    if (online && wasOffline) {
      // Just came online — reset backoff and trigger immediate sync
      this.consecutiveFailures = 0;
      PipelineService.getInstance().resetBackoff();
      this.processQueue();
    }

    if (!online) {
      this.updateStatus('offline');
    }
  }

  /**
   * Start periodic sync processing.
   * Uses adaptive interval: backs off exponentially when backend is unreachable
   * to avoid spamming a dead server every 30 seconds.
   */
  startPeriodicSync(): void {
    this.stopPeriodicSync();
    this.scheduleNextSync();
  }

  private scheduleNextSync(): void {
    // Exponential backoff: 30s → 60s → 120s → ... → max 8min
    const backoffMultiplier = Math.min(
      Math.pow(2, this.consecutiveFailures),
      SyncQueue.MAX_BACKOFF_MULTIPLIER,
    );
    const interval = SYNC_CONFIG.syncInterval * backoffMultiplier;

    this.syncTimer = setTimeout(async () => {
      if (this.isOnline && !this.isSyncing) {
        const result = await this.processQueue();
        if (result.uploaded > 0) {
          // Reset backoff on any success
          this.consecutiveFailures = 0;
        } else if (result.failed > 0) {
          this.consecutiveFailures = Math.min(
            this.consecutiveFailures + 1,
            Math.log2(SyncQueue.MAX_BACKOFF_MULTIPLIER),
          );
        }
      }
      // Schedule next sync (recursive)
      this.scheduleNextSync();
    }, interval);
  }

  /**
   * Stop periodic sync processing.
   */
  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Process the sync queue: batch upload pending items to the backend.
   * Safe to call multiple times; concurrent execution is prevented.
   */
  async processQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { uploaded: 0, failed: 0, remaining: await this.db.getSyncQueueCount() };
    }

    if (!this.isOnline) {
      this.updateStatus('offline');
      return { uploaded: 0, failed: 0, remaining: await this.db.getSyncQueueCount() };
    }

    this.isSyncing = true;
    this.updateStatus('syncing');

    let totalUploaded = 0;
    let totalFailed = 0;

    try {
      // Process items in batches
      let items = await this.db.getPendingSyncItems(SYNC_CONFIG.batchSize);

      while (items.length > 0 && this.isOnline) {
        const ecgItems = items.filter((i) => i.type === 'ecg_segment');
        const otherItems = items.filter((i) => i.type !== 'ecg_segment');

        // Upload ECG segments as a batch
        if (ecgItems.length > 0) {
          const result = await this.uploadECGBatch(ecgItems);
          totalUploaded += result.uploaded;
          totalFailed += result.failed;
        }

        // Process other items individually
        for (const item of otherItems) {
          const success = await this.uploadSingleItem(item);
          if (success) {
            totalUploaded++;
          } else {
            totalFailed++;
          }
        }

        // Fetch next batch
        items = await this.db.getPendingSyncItems(SYNC_CONFIG.batchSize);

        // If all remaining items have been attempted and failed, stop
        if (items.length > 0 && items.every((i) => i.attempts >= API_CONFIG.maxRetries)) {
          break;
        }
      }
    } catch (error) {
      console.error('[SyncQueue] Queue processing error:', error);
      this.updateStatus('error');
    } finally {
      this.isSyncing = false;
    }

    const remaining = await this.db.getSyncQueueCount();
    const result: SyncResult = { uploaded: totalUploaded, failed: totalFailed, remaining };

    this.updateStatus(remaining === 0 ? 'idle' : totalFailed > 0 ? 'error' : 'idle');

    return result;
  }

  /**
   * Get current queue status.
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Listen for sync status changes.
   */
  onStatusChange(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get the number of items pending in the sync queue.
   */
  async getPendingCount(): Promise<number> {
    return this.db.getSyncQueueCount();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async uploadECGBatch(items: SyncQueueItem[]): Promise<{ uploaded: number; failed: number }> {
    let uploaded = 0;
    let failed = 0;

    try {
      const segments: ECGSegment[] = items.map((item) => JSON.parse(item.payload));

      // ── 1) Pipeline analiz (analiz + kayıt birlikte) ────────────────────
      const pipeline = PipelineService.getInstance();
      const pipelineResult = await pipeline.analyzeBatch(segments);

      if (pipelineResult.analyzed > 0) {
        // Pipeline başarılı — analiz edilenler synced
        const analyzedIds = items.slice(0, pipelineResult.analyzed).map((i) => i.id);
        const analyzedSegIds = items.slice(0, pipelineResult.analyzed).map((i) => i.referenceId);
        await this.db.removeSyncItems(analyzedIds);
        await this.db.markSegmentsSynced(analyzedSegIds);
        uploaded = pipelineResult.analyzed;
      }

      if (pipelineResult.failed > 0) {
        // ── 2) Pipeline başarısız olanlar → batch ingest fallback ──────────
        const failedSegments = segments.slice(pipelineResult.analyzed);
        const failedItems = items.slice(pipelineResult.analyzed);

        const batchResult = await pipeline.batchUpload(failedSegments);
        if (batchResult && batchResult.accepted > 0) {
          const batchIds = failedItems.slice(0, batchResult.accepted).map((i) => i.id);
          const batchSegIds = failedItems.slice(0, batchResult.accepted).map((i) => i.referenceId);
          await this.db.removeSyncItems(batchIds);
          await this.db.markSegmentsSynced(batchSegIds);
          uploaded += batchResult.accepted;
          failed += failedItems.length - batchResult.accepted;
        } else {
          // ── 3) REST API tamamen erişilemez → Firestore fallback ──────────
          const patientDocId = await this.ensureFirestoreReady();
          if (patientDocId) {
            try {
              const ecgSegmentsRef = collection(db, 'patients', patientDocId, 'ecg_segments');
              for (const segment of failedSegments) {
                await addDoc(ecgSegmentsRef, {
                  ...segment,
                  uploadedAt: serverTimestamp(),
                  source: 'mobile_fallback',
                });
              }

              const fbIds = failedItems.map((i) => i.id);
              const fbSegIds = failedItems.map((i) => i.referenceId);
              await this.db.removeSyncItems(fbIds);
              await this.db.markSegmentsSynced(fbSegIds);
              uploaded += failedItems.length;

              if (this.consecutiveFailures <= 1 || this.consecutiveFailures % 10 === 0) {
                console.log('[SyncQueue] ECG data uploaded to Firestore (REST API unavailable)');
              }
            } catch (firestoreErr: any) {
              if (this.consecutiveFailures <= 1 || this.consecutiveFailures % 5 === 0) {
                console.warn('[SyncQueue] Firestore fallback also failed:', firestoreErr?.message);
              }
              for (const item of failedItems) {
                await this.db.incrementSyncAttempt(item.id);
              }
              failed += failedItems.length;
            }
          } else {
            if (this.consecutiveFailures <= 1 || this.consecutiveFailures % 5 === 0) {
              console.warn('[SyncQueue] ECG upload skipped: REST API unreachable, Firestore patient doc not ready');
            }
            for (const item of failedItems) {
              await this.db.incrementSyncAttempt(item.id);
            }
            failed += failedItems.length;
          }
        }
      }
    } catch (error: any) {
      if (this.consecutiveFailures <= 1 || this.consecutiveFailures % 5 === 0) {
        console.warn('[SyncQueue] ECG batch upload failed:', error?.message);
      }
      for (const item of items) {
        await this.db.incrementSyncAttempt(item.id);
      }
      failed = items.length;
    }

    return { uploaded, failed };
  }

  private async uploadSingleItem(item: SyncQueueItem): Promise<boolean> {
    try {
      const payload = JSON.parse(item.payload);

      // Önce REST API'ye göndermeyi dene
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        const response = await fetch(`${API_CONFIG.baseUrl}/sync/${item.type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          await this.db.removeSyncItems([item.id]);
          return true;
        }
      } catch {
        // REST API erişilemez — Firestore'a yaz
      }

      // Firestore fallback
      const patientDocId = await this.ensureFirestoreReady();
      if (patientDocId) {
        const syncRef = collection(db, 'patients', patientDocId, 'sync_data');
        await addDoc(syncRef, {
          type: item.type,
          ...payload,
          uploadedAt: serverTimestamp(),
          source: 'mobile_fallback',
        });
        await this.db.removeSyncItems([item.id]);
        return true;
      }

      await this.db.incrementSyncAttempt(item.id);
      return false;
    } catch {
      await this.db.incrementSyncAttempt(item.id);
      return false;
    }
  }

  private updateStatus(status: SyncStatus): void {
    this.status = status;
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (e) {
        console.error('[SyncQueue] Status listener error:', e);
      }
    }
  }
}

export default SyncQueue;
