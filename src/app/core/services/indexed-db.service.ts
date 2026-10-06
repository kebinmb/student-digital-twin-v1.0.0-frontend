import { Injectable } from '@angular/core';
import { QueuedAttendanceScan } from './offline-attendance-sync.service';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private readonly DB_NAME = 'sdt_offline_db';
  private readonly STORE_NAME = 'offline_attendance_scans';
  private readonly DB_VERSION = 1;

  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initDb();
    }
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async putScan(scan: QueuedAttendanceScan): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.put(scan);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[IndexedDB] Failed to put scan:', e);
    }
  }

  async getAllScans(): Promise<QueuedAttendanceScan[]> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return [];
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[IndexedDB] Failed to get all scans:', e);
      return [];
    }
  }

  async deleteScan(id: string): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[IndexedDB] Failed to delete scan:', e);
    }
  }

  async clearScans(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[IndexedDB] Failed to clear scans:', e);
    }
  }
}
