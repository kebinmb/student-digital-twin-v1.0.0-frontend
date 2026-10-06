import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VapidPublicKeyResponse {
  publicKey: string;
}

export interface PushStatusResponse {
  isSubscribed: boolean;
  activeDeviceCount: number;
}

export interface PushPreferences {
  notifyGrades: boolean;
  notifyClearance: boolean;
  notifyHonors: boolean;
  notifyAttendance: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebPushService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/push`;

  readonly isSupported = signal<boolean>(
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  );

  readonly permission = signal<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  readonly isSubscribed = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly activeDevices = signal<number>(0);

  constructor() {
    if (this.isSupported()) {
      this.checkCurrentSubscription();
    }
  }

  async checkCurrentSubscription(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      this.permission.set(Notification.permission);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const subscribed = sub !== null;
      this.isSubscribed.set(subscribed);

      // Also refresh status from backend
      this.refreshBackendStatus();
      return subscribed;
    } catch {
      this.isSubscribed.set(false);
      return false;
    }
  }

  async refreshBackendStatus(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<PushStatusResponse>(`${this.baseUrl}/status`));
      this.isSubscribed.set(res.isSubscribed);
      this.activeDevices.set(res.activeDeviceCount);
    } catch {
      // Ignored if user not logged in or endpoint unavail
    }
  }

  async subscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser.');
    }

    this.isLoading.set(true);
    try {
      const perm = await Notification.requestPermission();
      this.permission.set(perm);
      if (perm !== 'granted') {
        throw new Error('Notification permission was not granted.');
      }

      const vapidRes = await firstValueFrom(
        this.http.get<VapidPublicKeyResponse>(`${this.baseUrl}/vapid-public-key`)
      );

      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = this.urlBase64ToUint8Array(vapidRes.publicKey);
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource
        });
      }

      const subJson = subscription.toJSON();
      const payload = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subJson.keys?.['p256dh'] || '',
          auth: subJson.keys?.['auth'] || ''
        },
        userAgent: navigator.userAgent
      };

      await firstValueFrom(this.http.post(`${this.baseUrl}/subscribe`, payload));

      this.isSubscribed.set(true);
      await this.refreshBackendStatus();
      return true;
    } finally {
      this.isLoading.set(false);
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;

    this.isLoading.set(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await firstValueFrom(
          this.http.post(`${this.baseUrl}/unsubscribe`, { endpoint: subscription.endpoint })
        );
        await subscription.unsubscribe();
      }

      this.isSubscribed.set(false);
      await this.refreshBackendStatus();
      return true;
    } finally {
      this.isLoading.set(false);
    }
  }

  getPreferences(): Observable<PushPreferences> {
    return this.http.get<PushPreferences>(`${this.baseUrl}/preferences`);
  }

  updatePreferences(prefs: PushPreferences): Observable<PushPreferences> {
    return this.http.put<PushPreferences>(`${this.baseUrl}/preferences`, prefs);
  }

  sendTestNotification(title?: string, body?: string, url?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/test`, {
      title: title || 'CHMSU Real-Time Academic Notification',
      body: body || 'Real-time Web Push integration is active and operating securely.',
      url: url || '/dashboard/portal/student'
    });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
