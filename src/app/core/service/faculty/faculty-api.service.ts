import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FacultyProfile, CreateFacultyAccountRequest } from '../../models/faculty-management.model';

@Injectable({
  providedIn: 'root'
})
export class FacultyApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/faculty`;

  getAllFaculty(): Observable<FacultyProfile[]> {
    return this.http.get<FacultyProfile[]>(this.baseUrl);
  }

  getFacultyProfile(userId: number): Observable<FacultyProfile> {
    return this.http.get<FacultyProfile>(`${this.baseUrl}/${userId}/profile`);
  }

  createFacultyAccount(request: CreateFacultyAccountRequest): Observable<FacultyProfile> {
    return this.http.post<FacultyProfile>(this.baseUrl, request);
  }
}
