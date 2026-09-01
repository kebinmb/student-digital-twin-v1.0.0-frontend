import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../service/authentication/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. If already authenticated in-memory, allow route
  if (authService.isAuthenticated()) {
    return true;
  }

  // 2. Attempt silent token refresh via HttpOnly cookie before redirecting
  return authService.refreshToken().pipe(
    map(() => true),
    catchError(() => {
      // Return a UrlTree to redirect while preserving the target query returnUrl
      return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
    })
  );
};

// Optional: Prevent authenticated users from visiting the login page again
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};