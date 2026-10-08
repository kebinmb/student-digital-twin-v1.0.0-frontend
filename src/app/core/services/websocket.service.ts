import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { RxStomp, RxStompConfig, RxStompState } from '@stomp/rx-stomp';
import SockJS from 'sockjs-client';
import { AuthService } from '../service/authentication/auth-service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private rxStomp: RxStomp | null = null;

  private readonly _connected$ = new BehaviorSubject<boolean>(false);
  public readonly connected$ = this._connected$.asObservable();

  public get isConnected(): boolean {
    return this._connected$.value;
  }

  connect(): void {
    if (this.rxStomp && this.rxStomp.connected()) {
      return;
    }

    if (!this.rxStomp) {
      this.rxStomp = new RxStomp();
    }

    let token: string | null = null;
    try {
      if (typeof this.authService?.accessToken === 'function') {
        token = this.authService.accessToken();
      } else if (typeof (this.authService as any)?.accessToken === 'string') {
        token = (this.authService as any).accessToken;
      }
    } catch {
      // In case of mock or test context
    }
    if (!token && typeof localStorage !== 'undefined') {
      try {
        token = localStorage.getItem('token');
      } catch {}
    }

    const wsUrl = (environment as any).wsUrl || '/ws';
    let brokerURL: string | undefined;

    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      const loc = window.location;
      const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      if (wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://')) {
        brokerURL = wsUrl;
      } else if (wsUrl.startsWith('http://') || wsUrl.startsWith('https://')) {
        brokerURL = wsUrl.replace(/^http/, 'ws');
      } else {
        const cleanPath = wsUrl.startsWith('/') ? wsUrl : `/${wsUrl}`;
        brokerURL = `${protocol}//${loc.host}${cleanPath}`;
      }
    }

    const stompConfig: RxStompConfig = {
      brokerURL,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: 5000,
      debug: (msg: string) => {
        if (!environment.production) {
          // Debug logs can be enabled for troubleshooting
        }
      }
    };

    if (!brokerURL) {
      const sockJsUrl = (environment as any).sockJsUrl || '/ws-sockjs';
      stompConfig.webSocketFactory = () => {
        const Factory = typeof SockJS === 'function' ? SockJS : (SockJS as any).default;
        return new Factory(sockJsUrl, null, {
          transports: ['websocket', 'xhr-streaming', 'xhr-polling']
        });
      };
    }

    this.rxStomp.configure(stompConfig);

    this.rxStomp.connectionState$.subscribe((state: RxStompState) => {
      const isOpen = state === RxStompState.OPEN;
      if (this._connected$.value !== isOpen) {
        this._connected$.next(isOpen);
      }
    });

    try {
      this.rxStomp.activate();
    } catch (e) {
      console.warn('[WebSocket] Error activating stomp:', e);
    }
  }

  watch<T>(destination: string): Observable<T> {
    if (!this.rxStomp) {
      try {
        this.connect();
      } catch (err) {
        console.warn('[WebSocket] Error during connect in watch:', err);
      }
    }

    if (!this.rxStomp) {
      return new Observable<T>();
    }

    return this.rxStomp.watch(destination).pipe(
      map(message => {
        try {
          return JSON.parse(message.body) as T;
        } catch {
          return message.body as unknown as T;
        }
      })
    );
  }

  publish(destination: string, body: any, headers: Record<string, string> = {}): void {
    if (!this.rxStomp || !this.rxStomp.connected()) {
      console.warn('[WebSocket] Cannot publish, client not connected');
      return;
    }

    this.rxStomp.publish({
      destination,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers
    });
  }

  disconnect(): void {
    if (this.rxStomp) {
      this.rxStomp.deactivate();
      this._connected$.next(false);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
