import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InstitutionalWebhook {
  id: number;
  name: string;
  targetUrl: string;
  subscribedEvents: string;
  active: boolean;
  createdAt: string;
}

export interface CreateWebhookRequest {
  name: string;
  targetUrl: string;
  secretKey: string;
  subscribedEvents: string;
}

export interface WebhookDelivery {
  id: number;
  webhookId: number | null;
  eventType: string;
  payloadJson: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER';
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  responseHttpCode: number | null;
  responseBody: string | null;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebhookService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/admin/webhooks`;

  getAll(): Observable<InstitutionalWebhook[]> {
    return this.http.get<InstitutionalWebhook[]>(this.baseUrl);
  }

  create(req: CreateWebhookRequest): Observable<InstitutionalWebhook> {
    return this.http.post<InstitutionalWebhook>(this.baseUrl, req);
  }

  toggle(id: number, active: boolean): Observable<InstitutionalWebhook> {
    return this.http.patch<InstitutionalWebhook>(`${this.baseUrl}/${id}/toggle?active=${active}`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getDeliveries(id: number): Observable<WebhookDelivery[]> {
    return this.http.get<WebhookDelivery[]>(`${this.baseUrl}/${id}/deliveries`);
  }

  retryDelivery(deliveryId: number): Observable<WebhookDelivery> {
    return this.http.post<WebhookDelivery>(`${this.baseUrl}/deliveries/${deliveryId}/retry`, {});
  }

  testPing(id: number): Observable<WebhookDelivery> {
    return this.http.post<WebhookDelivery>(`${this.baseUrl}/${id}/test`, {});
  }
}
