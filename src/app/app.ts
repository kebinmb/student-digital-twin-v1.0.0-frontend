import { Component, signal, ChangeDetectionStrategy, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { WebSocketService } from './core/services/websocket.service';
import { AuthService } from './core/service/authentication/auth-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('student-digital-twin-v1.0.0-frontend');
  private readonly wsService = inject(WebSocketService);
  private readonly authService = inject(AuthService, { optional: true });

  constructor() {
    if (this.authService) {
      effect(() => {
        let isAuth = false;
        try {
          if (typeof this.authService?.isAuthenticated === 'function') {
            isAuth = !!this.authService.isAuthenticated();
          } else if (typeof this.authService?.isAuthenticated === 'boolean') {
            isAuth = this.authService.isAuthenticated;
          } else if (typeof this.authService?.accessToken === 'function') {
            isAuth = !!this.authService.accessToken();
          }
        } catch {
          isAuth = false;
        }

        if (isAuth) {
          this.wsService.connect();
        } else {
          this.wsService.disconnect();
        }
      });
    }
  }

  ngOnInit(): void {
    let isAuth = true;
    if (this.authService) {
      try {
        if (typeof this.authService.isAuthenticated === 'function') {
          isAuth = !!this.authService.isAuthenticated();
        } else if (typeof this.authService.isAuthenticated === 'boolean') {
          isAuth = this.authService.isAuthenticated;
        } else if (typeof this.authService.accessToken === 'function') {
          isAuth = !!this.authService.accessToken();
        }
      } catch {
        isAuth = true;
      }
    }

    if (isAuth) {
      this.wsService.connect();
    }
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }
}
