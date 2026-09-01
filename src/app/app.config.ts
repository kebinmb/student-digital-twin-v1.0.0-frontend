import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';
import { catchError, of } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './core/service/authentication/auth-service';
import { authInterceptor } from './core/interceptors/authentication/auth-interceptor';
import { CustomTheme } from './theme/custom-theme';

function initializeApp(authService: AuthService) {
  return () => {
    // Prevent 404 on initial load if no session exists
    const token = localStorage.getItem('token') || localStorage.getItem('refreshToken');
    if (!token) {
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
    provideRouter(routes),
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
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    }
  ]
};