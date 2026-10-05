import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Observable, tap, catchError, throwError, finalize, shareReplay } from 'rxjs';
import { RegisterRequest, LoginRequest, AuthResponse, UserContext } from '../../models/auth.model';
import { resetInterceptorState } from '../../interceptors/authentication/auth-interceptor';

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

    readonly currentUser = computed<UserContext>(() => {
      const token = this.accessTokenSignal();
      if (!token) {
        try {
          const saved = localStorage.getItem('chmsu_remembered_user');
          if (saved) return { id: null, username: saved, email: '', role: 'STUDENT', roles: ['STUDENT'] };
        } catch {

        }
        return { id: null, username: '', email: '', role: 'GUEST', roles: [] };
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const rawRoles: string[] = Array.isArray(payload.roles)
          ? payload.roles
          : (payload.realm_access?.roles || []);
        const normalizedRoles = rawRoles.map((r: string) => r.replace(/^ROLE_/, '').toUpperCase());
        const primaryRole = normalizedRoles[0] || 'STUDENT';

        const rawId = payload.sub ?? payload.id ?? payload.userId;
        const parsedId = rawId !== undefined && rawId !== null ? Number(rawId) : null;
        const userId = parsedId !== null && !isNaN(parsedId) ? parsedId : null;

        const rawCollegeId = payload.college_id ?? payload.collegeId;
        const parsedCollegeId = rawCollegeId !== undefined && rawCollegeId !== null ? Number(rawCollegeId) : null;
        const collegeId = parsedCollegeId !== null && !isNaN(parsedCollegeId) ? parsedCollegeId : null;

        const rawProgramId = payload.program_id ?? payload.programId;
        const parsedProgramId = rawProgramId !== undefined && rawProgramId !== null ? Number(rawProgramId) : null;
        const programId = parsedProgramId !== null && !isNaN(parsedProgramId) ? parsedProgramId : null;

        return {
          id: userId,
          username: payload.preferred_username || payload.username || 'Student User',
          email: payload.email || '',
          role: primaryRole,
          roles: normalizedRoles,
          collegeId,
          programId
        };
      } catch {
        return { id: null, username: '', email: '', role: 'GUEST', roles: [] };
      }
    });

    getUserId(): number | null {
      return this.currentUser().id;
    }

    hasAnyRole(requiredRoles: string[]): boolean {
      const userRoles = this.currentUser().roles || [this.currentUser().role.toUpperCase()];
      const normalizedReq = requiredRoles.map(r => r.replace(/^ROLE_/, '').toUpperCase());
      return userRoles.some(r => normalizedReq.includes(r));
    }

    hasRole(requiredRole: string): boolean {
      return this.hasAnyRole([requiredRole]);
    }

    register(data: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/register`, data);
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials, {
      withCredentials: true // Accepts HttpOnly, Partitioned REFRESH_TOKEN cookie
    }).pipe(
      tap(res => {
        this.accessTokenSignal.set(res.accessToken);
        if (res.accessToken) {
          try { localStorage.setItem('token', res.accessToken); } catch {}
        }
        if (res.refreshToken) {
          try { localStorage.setItem('refreshToken', res.refreshToken); } catch {}
        }
        try {
          const user = this.currentUser();
          if (user?.username) {
            localStorage.setItem('chmsu_remembered_user', user.username);
          }
        } catch {}
      })
    );
  }

  private refreshInProgress$: Observable<AuthResponse> | null = null;

  refreshToken(): Observable<AuthResponse> {
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    let savedRefreshToken: string | null = null;
    try {
      savedRefreshToken = localStorage.getItem('refreshToken');
    } catch {}

    this.refreshInProgress$ = this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, 
      { refreshToken: savedRefreshToken || undefined }, 
      {
        withCredentials: true // Sends REFRESH_TOKEN cookie automatically
      }
    ).pipe(
      tap(res => {
        this.accessTokenSignal.set(res.accessToken);
        if (res.accessToken) {
          try { localStorage.setItem('token', res.accessToken); } catch {}
        }
        if (res.refreshToken) {
          try { localStorage.setItem('refreshToken', res.refreshToken); } catch {}
        }
      }),
      catchError(err => {
        this.clearAuth();
        this.router.navigate(['/login']);
        return throwError(() => err);
      }),
      finalize(() => {
        this.refreshInProgress$ = null;
      }),
      shareReplay(1)
    );

    return this.refreshInProgress$;
  }

  logout(): Observable<void> {
    let savedRefreshToken: string | null = null;
    try {
      savedRefreshToken = localStorage.getItem('refreshToken');
    } catch {}

    return this.http.post<void>(`${this.baseUrl}/logout`, 
      { refreshToken: savedRefreshToken || undefined }, 
      {
        withCredentials: true
      }
    ).pipe(
      tap(() => {
        this.clearAuth();
        this.router.navigate(['/login']);
      })
    );
  }

  setAccessToken(token: string | null): void {
    this.accessTokenSignal.set(token);
    try {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    } catch {}
  }

  clearAuth(): void {
    this.accessTokenSignal.set(null);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    } catch {}
    resetInterceptorState();
  }
}
