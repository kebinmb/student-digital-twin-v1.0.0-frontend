import { Injectable } from '@angular/core';
import { MessageService, ToastMessageOptions } from 'primeng/api';

/**
 * DeduplicatingMessageService
 *
 * Enterprise-grade extension of PrimeNG MessageService that prevents:
 * 1. Dual-emission toasts caused by HTTP interceptors and component-level error handlers.
 * 2. Cascading / duplicate toast spam from rapid concurrent failing requests.
 * 3. Exact message duplication within a sliding time window.
 */
@Injectable({ providedIn: 'root' })
export class DeduplicatingMessageService extends MessageService {
  private readonly recentKeys = new Map<string, number>();
  private readonly DEDUPE_WINDOW_MS = 1500;
  private readonly RAPID_ERROR_BURST_MS = 800;
  private lastErrorTimestamp = 0;

  override add(message: ToastMessageOptions): void {
    if (!message) return;

    const now = Date.now();
    this.cleanExpiredKeys(now);

    const severity = message.severity || 'info';
    const isErrorOrWarn = severity === 'error' || severity === 'warn';

    // 1. Check exact signature match (severity + summary + detail)
    const exactKey = `${severity}|${message.summary || ''}|${message.detail || ''}`;
    if (this.recentKeys.has(exactKey)) {
      return;
    }

    // 2. Check identical detail for error / warn messages
    if (isErrorOrWarn && message.detail) {
      const detailKey = `err_detail|${message.detail}`;
      if (this.recentKeys.has(detailKey)) {
        return;
      }
      this.recentKeys.set(detailKey, now);
    }

    // 3. Suppress rapid consecutive error/warn toasts in the same microtask/burst window
    // (e.g. globalErrorInterceptor + component subscription error: handler both firing)
    if (isErrorOrWarn) {
      if (now - this.lastErrorTimestamp < this.RAPID_ERROR_BURST_MS) {
        return;
      }
      this.lastErrorTimestamp = now;
    }

    this.recentKeys.set(exactKey, now);
    super.add(message);
  }

  override addAll(messages: ToastMessageOptions[]): void {
    if (!messages || !Array.isArray(messages)) return;
    for (const msg of messages) {
      this.add(msg);
    }
  }

  private cleanExpiredKeys(now: number): void {
    for (const [key, timestamp] of this.recentKeys.entries()) {
      if (now - timestamp > this.DEDUPE_WINDOW_MS) {
        this.recentKeys.delete(key);
      }
    }
  }
}
