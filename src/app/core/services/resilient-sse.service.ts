// File: src/app/core/services/resilient-sse.service.ts

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../service/authentication/auth-service';
import { environment } from '../../../environments/environment';

export interface SseOptions {
  maxRetryDelayMs?: number;
  initialRetryDelayMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResilientSseService {
  private readonly authService = inject(AuthService);

  createStream<T>(
    endpointPath: string,
    eventNames: string[],
    options: SseOptions = {}
  ): Observable<T> {
    const initialDelay = options.initialRetryDelayMs ?? 1000;
    const maxDelay = options.maxRetryDelayMs ?? 30000;

    return new Observable<T>((observer) => {
      let eventSource: EventSource | null = null;
      let retryTimeoutId: any = null;
      let currentDelay = initialDelay;
      let isDisposed = false;

      const connect = () => {
        if (isDisposed) return;

        const token = this.authService.accessToken();
        const separator = endpointPath.includes('?') ? '&' : '?';
        const tokenQuery = token ? `${separator}access_token=${encodeURIComponent(token)}` : '';
        const fullUrl = `${environment.apiUrl}${endpointPath}${tokenQuery}`;

        eventSource = new EventSource(fullUrl);

        const handleMessage = (event: MessageEvent) => {
          currentDelay = initialDelay; // Reset backoff on message reception
          try {
            const parsed = JSON.parse(event.data) as T;
            observer.next(parsed);
          } catch (e) {
            console.error('[ResilientSse] Error parsing SSE payload:', e);
          }
        };

        for (const name of eventNames) {
          eventSource.addEventListener(name, handleMessage);
        }

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          if (!isDisposed) {
            retryTimeoutId = setTimeout(() => {
              currentDelay = Math.min(currentDelay * 2, maxDelay);
              connect();
            }, currentDelay);
          }
        };
      };

      connect();

      return () => {
        isDisposed = true;
        if (retryTimeoutId) {
          clearTimeout(retryTimeoutId);
        }
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    });
  }
}
