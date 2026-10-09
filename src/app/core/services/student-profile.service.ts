import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../service/authentication/auth-service';
import { StudentProfileResponse } from '../models/enrollment.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StudentProfileService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly _profile = signal<StudentProfileResponse | null>(null);
  public readonly profile = this._profile.asReadonly();

  loadForCurrentStudent(): void {
    const user = this.authService.currentUser();
    if (!user || (user.role !== 'STUDENT' && !user.roles?.includes('STUDENT'))) return;

    this.http.get<StudentProfileResponse>(`${environment.apiUrl}/v1/students/me`).subscribe({
      next: (profile) => this._profile.set(profile),
      error: (err) => console.error('[StudentProfileService] Failed to load student profile', err)
    });
  }

  setProfile(profile: StudentProfileResponse | null): void {
    this._profile.set(profile);
  }
}
