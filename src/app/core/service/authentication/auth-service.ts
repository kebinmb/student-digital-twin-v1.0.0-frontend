import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { RegisterRequest, LoginRequest, AuthResponse } from '../../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly baseUrl = `${environment.apiUrl}/public/auth`;

    private readonly accessTokenSignal = signal<string | null>(null);

    readonly accessToken = computed(() => this.accessTokenSignal());
    readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

    readonly currentUser = computed(() => {
      const token = this.accessTokenSignal();
      if (!token) {
        try {
          const saved = localStorage.getItem('chmsu_remembered_user');
          if (saved) return { username: saved, role: 'Student' };
        } catch {

        }
        return { username: 'Student User', role: 'Student' };
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        console.log("Payload",payload);
        return {
          username: payload.preferred_username || payload.username || 'Student User',
          email: payload.email || '',
          role: (payload.roles && payload.roles[0]) ? payload.roles[0].replace('ROLE_', '') : 'Student'
        };
      } catch {
        return { username: 'Student User', role: 'Student' };
      }
    });

    register(data: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/register`, data);
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials, {
      withCredentials: true // Accepts HttpOnly, Partitioned REFRESH_TOKEN cookie
    }).pipe(
      tap(res => this.accessTokenSignal.set(res.accessToken))
    );
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, {}, {
      withCredentials: true // Sends REFRESH_TOKEN cookie automatically
    }).pipe(
      tap(res => this.accessTokenSignal.set(res.accessToken)),
      catchError(err => {
        this.clearAuth();
        this.router.navigate(['/login']);
        return throwError(() => err);
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.clearAuth();
        this.router.navigate(['/login']);
      })
    );
  }

  setAccessToken(token: string | null): void {
    this.accessTokenSignal.set(token);
  }

  clearAuth(): void {
    this.accessTokenSignal.set(null);
  }
}
