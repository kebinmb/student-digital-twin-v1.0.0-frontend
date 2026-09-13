import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  FacultyProfile,
  CreateFacultyAccountRequest,
  UpdateFacultyProfileRequest,
  ChedE5ReportResponse
} from '../../models/faculty-management.model';

@Injectable({
  providedIn: 'root'
})
export class FacultyApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/faculty`;

  private allFaculty$?: Observable<FacultyProfile[]>;

  getAllFaculty(): Observable<FacultyProfile[]> {
    if (!this.allFaculty$) {
      this.allFaculty$ = this.http.get<FacultyProfile[]>(this.baseUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.allFaculty$;
  }

  getFacultyProfile(userId: number): Observable<FacultyProfile> {
    return this.http.get<FacultyProfile>(`${this.baseUrl}/${userId}/profile`);
  }

  updateFacultyProfile(userId: number, request: UpdateFacultyProfileRequest): Observable<FacultyProfile> {
    return this.http.put<FacultyProfile>(`${this.baseUrl}/${userId}/profile`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  createFacultyAccount(request: CreateFacultyAccountRequest): Observable<FacultyProfile> {
    return this.http.post<FacultyProfile>(this.baseUrl, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  generateChedE5Report(termId: number): Observable<ChedE5ReportResponse> {
    return this.http.get<ChedE5ReportResponse>(`${environment.apiUrl}/v1/reports/ched-e5`, {
      params: { termId: String(termId) }
    });
  }

  invalidateCache(): void {
    this.allFaculty$ = undefined;
  }
}
