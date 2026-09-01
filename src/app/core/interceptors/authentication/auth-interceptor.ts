import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../../service/authentication/auth-service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.accessToken();

  // Attach token if available and not hitting public auth endpoints
  let authReq = req;
  if (token && !req.url.includes('/api/public/auth')) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Intercept 401s on protected endpoints
      if (error.status === 401 && !req.url.includes('/api/public/auth')) {
        return handle401Error(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap(res => {
        isRefreshing = false;
        refreshTokenSubject.next(res.accessToken);
        return next(req.clone({
          setHeaders: { Authorization: `Bearer ${res.accessToken}` }
        }));
      }),
      catchError(err => {
        isRefreshing = false;
        authService.clearAuth();
        return throwError(() => err);
      })
    );
  }

  // Queue concurrent requests until refresh finishes
  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => next(req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    })))
  );
}
