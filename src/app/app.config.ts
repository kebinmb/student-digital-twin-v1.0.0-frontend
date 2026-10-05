import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';
import { catchError, of } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './core/service/authentication/auth-service';
import { authInterceptor } from './core/interceptors/authentication/auth-interceptor';
import { globalErrorInterceptor } from './core/interceptors/error/global-error.interceptor';
import { CustomTheme } from './theme/custom-theme';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DeduplicatingMessageService } from './core/services/toast.service';
import { environment } from '../environments/environment';

function initializeApp(authService: AuthService) {
  return () => {
    // Attempt session restoration on initial app load / page refresh:
    // 1. If we have a saved token or refreshToken in localStorage (development / fallback)
    // 2. OR if we're in cookie mode (production HttpOnly cookie) or have a remembered user
    let token: string | null = null;
    let refreshToken: string | null = null;
    let rememberedUser: string | null = null;
    try {
      token = localStorage.getItem('token');
      refreshToken = localStorage.getItem('refreshToken');
      rememberedUser = localStorage.getItem('chmsu_remembered_user');
    } catch {}

    const hasStoredToken = !!(token || refreshToken);
    const isCookieMode = (environment as any).auth?.storageType === 'cookie';

    if (!hasStoredToken && !isCookieMode && !rememberedUser) {
      return of(null);
    }
    return authService.refreshToken().pipe(
      catchError(() => of(null))
    );
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: MessageService, useClass: DeduplicatingMessageService },
    ConfirmationService,
    providePrimeNG({
      theme: {
        preset: CustomTheme,
        options: {
          darkModeSelector: 'none',
          cssLayer: false
        }
      },
      ripple: true
    }),
    provideHttpClient(withInterceptors([authInterceptor, globalErrorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    }
  ]
};