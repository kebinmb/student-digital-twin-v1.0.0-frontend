import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdvisingEligibilityResponse,
  EnlistSectionRequest,
  EnrollmentConfirmationDto,
  StudentEnrollmentResponse,
  UpdateEnrollmentStatusRequest,
  StudentSearchResultDto
} from '../../models/enrollment.model';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/enrollment`;

  getAdvisingEligibility(studentId: number, termId: number): Observable<AdvisingEligibilityResponse> {
    return this.http.get<AdvisingEligibilityResponse>(`${this.baseUrl}/advising/student/${studentId}/term/${termId}`);
  }

  enlistSection(studentId: number, request: EnlistSectionRequest): Observable<StudentEnrollmentResponse> {
    return this.http.post<StudentEnrollmentResponse>(`${this.baseUrl}/enlist/student/${studentId}`, request);
  }

  removeEnlistedSection(studentId: number, termId: number, sectionId: number): Observable<StudentEnrollmentResponse> {
    return this.http.delete<StudentEnrollmentResponse>(`${this.baseUrl}/enlist/student/${studentId}/term/${termId}/section/${sectionId}`);
  }

  confirmEnrollment(studentId: number, termId: number): Observable<EnrollmentConfirmationDto> {
    return this.http.post<EnrollmentConfirmationDto>(`${this.baseUrl}/confirm/student/${studentId}`, { termId });
  }

  getEnrollment(studentId: number, termId: number): Observable<StudentEnrollmentResponse> {
    return this.http.get<StudentEnrollmentResponse>(`${this.baseUrl}/student/${studentId}/term/${termId}`);
  }

  getEnrollmentsByTerm(termId: number): Observable<StudentEnrollmentResponse[]> {
    return this.http.get<StudentEnrollmentResponse[]>(`${this.baseUrl}/term/${termId}`);
  }

  updateEnrollmentStatus(enrollmentId: number, request: UpdateEnrollmentStatusRequest): Observable<StudentEnrollmentResponse> {
    return this.http.put<StudentEnrollmentResponse>(`${this.baseUrl}/${enrollmentId}/status`, request);
  }

  searchStudents(query: string): Observable<StudentSearchResultDto[]> {
    return this.http.get<StudentSearchResultDto[]>(`${environment.apiUrl}/v1/students/search`, {
      params: { query }
    });
  }
}

