import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AnalyticsApiService } from '../service/analytics/analytics-api.service';
import { AttendanceRecordResponse } from '../models/analytics.model';
import { IndexedDbService } from './indexed-db.service';

export interface QueuedAttendanceScan {
  id: string;
  qrSeed: string;
  studentId: number;
  latitude: number | null;
  longitude: number | null;
  deviceFingerprint: string;
  queuedAt: string;
  status: 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineAttendanceSyncService {
  private readonly STORAGE_KEY = 'sdt_offline_attendance_queue';
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly idb = inject(IndexedDbService);

  readonly queue = signal<QueuedAttendanceScan[]>(this.loadFromStorage());
  readonly isSyncing = signal<boolean>(false);

  readonly pendingCount = computed(() =>
    this.queue().filter(item => item.status === 'QUEUED' || item.status === 'FAILED').length
  );

  readonly conflictCount = computed(() =>
    this.queue().filter(item => item.status === 'CONFLICT').length
  );

  constructor() {
    if (typeof window !== 'undefined') {
      // Hydrate queue from IndexedDB
      this.idb.getAllScans().then(scans => {
        if (scans && scans.length > 0) {
          this.queue.set(scans);
          this.saveToStorage(scans);
        }
      });

      window.addEventListener('online', () => {
        if (this.pendingCount() > 0) {
          this.syncQueue();
        }
      });

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SDT_DRAIN_OFFLINE_ATTENDANCE' && this.pendingCount() > 0) {
            this.syncQueue();
          }
        });
      }
    }
  }

  enqueueScan(
    qrSeed: string,
    studentId: number,
    latitude: number | null,
    longitude: number | null,
    deviceFingerprint: string
  ): QueuedAttendanceScan {
    const item: QueuedAttendanceScan = {
      id: `SCAN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      qrSeed,
      studentId,
      latitude,
      longitude,
      deviceFingerprint,
      queuedAt: new Date().toISOString(),
      status: 'QUEUED'
    };

    const updated = [item, ...this.queue()];
    this.saveToStorage(updated);
    this.queue.set(updated);
    this.idb.putScan(item);
    this.requestBackgroundSync();
    return item;
  }

  private requestBackgroundSync(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((reg: any) => {
      if ('sync' in reg) {
        reg.sync.register('sync-offline-attendance').catch(() => {});
      }
      if ('periodicSync' in reg) {
        reg.periodicSync.register('periodic-attendance-sync', {
          minInterval: 60 * 60 * 1000 // 1 hour interval
        }).catch(() => {});
      }
    }).catch(() => {});
  }

  async syncQueue(): Promise<{ synced: number; failed: number; records: AttendanceRecordResponse[] }> {
    if (this.isSyncing() || this.pendingCount() === 0) {
      return { synced: 0, failed: 0, records: [] };
    }

    this.isSyncing.set(true);
    let synced = 0;
    let failed = 0;
    const records: AttendanceRecordResponse[] = [];
    const currentQueue = [...this.queue()];

    for (let i = 0; i < currentQueue.length; i++) {
      const item = currentQueue[i];
      if (item.status === 'SYNCED') continue;

      item.status = 'SYNCING';
      this.queue.set([...currentQueue]);

      try {
        const result = await firstValueFrom(
          this.analyticsApi.scanAttendance({
            qrSeed: item.qrSeed,
            studentId: item.studentId,
            latitude: item.latitude ?? undefined,
            longitude: item.longitude ?? undefined,
            deviceFingerprint: item.deviceFingerprint
          })
        );
        item.status = 'SYNCED';
        synced++;
        records.push(result);
        // Remove successfully synced item from IndexedDB
        this.idb.deleteScan(item.id);
      } catch (err: any) {
        const errorMsg = err?.error?.detail || err?.error?.message || 'Sync failed';
        const status = err?.status;
        const lowerMsg = (errorMsg + '').toLowerCase();
        const isConflict = status === 409 || lowerMsg.includes('already') || lowerMsg.includes('duplicate') || lowerMsg.includes('conflict');

        if (isConflict) {
          item.status = 'CONFLICT';
          item.errorMessage = `Conflict: ${errorMsg} (Entry already recorded)`;
          // Prune from IndexedDB so background sync doesn't loop forever
          this.idb.deleteScan(item.id);
        } else {
          item.status = 'FAILED';
          item.errorMessage = errorMsg;
          failed++;
        }
      }
      this.saveToStorage(currentQueue);
      this.queue.set([...currentQueue]);
    }

    // Keep only non-synced items to avoid storage explosion
    const pruned = currentQueue.filter(i => i.status !== 'SYNCED');
    this.saveToStorage(pruned);
    this.queue.set(pruned);

    this.isSyncing.set(false);
    return { synced, failed, records };
  }

  dismissItem(id: string): void {
    const updated = this.queue().filter(item => item.id !== id);
    this.saveToStorage(updated);
    this.queue.set(updated);
    this.idb.deleteScan(id);
  }

  retryItem(id: string): void {
    const updated = this.queue().map(item => {
      if (item.id === id) {
        return { ...item, status: 'QUEUED' as const, errorMessage: undefined };
      }
      return item;
    });
    this.saveToStorage(updated);
    this.queue.set(updated);
    this.syncQueue();
  }

  clearQueue(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.idb.clearScans();
    this.queue.set([]);
  }

  private loadFromStorage(): QueuedAttendanceScan[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(list: QueuedAttendanceScan[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not persist offline attendance queue:', e);
    }
  }
}
