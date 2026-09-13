// File: src/app/core/service/compliance/compliance-api.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ClearanceRequestDto,
  ClearanceSignoffDto,
  ClearanceStudentSuggestionDto,
  InitiateClearanceRequest,
  ProcessSignoffRequest,
  DegreeAuditResultDto,
  ApplyForGraduationRequest,
  GraduationApplicationDto,
  ChedFormE1InstitutionalDto,
  ChedFormE3EnrolmentDto,
  ChedFormE4GraduateDto,
  ChedFormE5FacultyDto
} from '../../models/compliance.model';

@Injectable({
  providedIn: 'root'
})
export class ComplianceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1`;

  // Clearance Workflows
  initiateClearance(request: InitiateClearanceRequest): Observable<ClearanceRequestDto> {
    return this.http.post<ClearanceRequestDto>(`${this.baseUrl}/clearance/requests`, request);
  }

  getClearanceByStudentAndTerm(studentIdentifier: string | number, termId: number): Observable<ClearanceRequestDto> {
    return this.http.get<ClearanceRequestDto>(`${this.baseUrl}/clearance/requests/student/${studentIdentifier}/term/${termId}`);
  }

  getClearanceById(id: number): Observable<ClearanceRequestDto> {
    return this.http.get<ClearanceRequestDto>(`${this.baseUrl}/clearance/requests/${id}`);
  }

  processSignoff(signoffId: number, request: ProcessSignoffRequest): Observable<ClearanceSignoffDto> {
    return this.http.put<ClearanceSignoffDto>(`${this.baseUrl}/clearance/signoffs/${signoffId}`, request);
  }

  getPendingSignoffsByDepartment(departmentType: string): Observable<ClearanceSignoffDto[]> {
    return this.http.get<ClearanceSignoffDto[]>(`${this.baseUrl}/clearance/signoffs/pending/${departmentType}`);
  }

  getClearanceStudentSuggestions(query: string = ''): Observable<ClearanceStudentSuggestionDto[]> {
    return this.http.get<ClearanceStudentSuggestionDto[]>(`${this.baseUrl}/clearance/requests/students/suggestions?query=${encodeURIComponent(query)}`);
  }

  // Degree Audit & Graduation
  evaluateDegreeAudit(studentProfileId: number): Observable<DegreeAuditResultDto> {
    return this.http.get<DegreeAuditResultDto>(`${this.baseUrl}/graduation/audit/${studentProfileId}`);
  }

  applyForGraduation(request: ApplyForGraduationRequest): Observable<GraduationApplicationDto> {
    return this.http.post<GraduationApplicationDto>(`${this.baseUrl}/graduation/apply`, request);
  }

  issueSpecialOrder(graduationApplicationId: number, specialOrderNumber: string): Observable<GraduationApplicationDto> {
    return this.http.post<GraduationApplicationDto>(
      `${this.baseUrl}/graduation/applications/${graduationApplicationId}/special-order`,
      { specialOrderNumber }
    );
  }

  getGraduationApplicationsByTerm(termId: number): Observable<GraduationApplicationDto[]> {
    return this.http.get<GraduationApplicationDto[]>(`${this.baseUrl}/graduation/applications/term/${termId}`);
  }

  // CHED Regulatory Reporting
  exportChedE1(campusId: number): Observable<ChedFormE1InstitutionalDto> {
    return this.http.get<ChedFormE1InstitutionalDto>(`${this.baseUrl}/compliance/ched/e1/${campusId}`);
  }

  exportChedE3(termId: number): Observable<ChedFormE3EnrolmentDto[]> {
    return this.http.get<ChedFormE3EnrolmentDto[]>(`${this.baseUrl}/compliance/ched/e3/${termId}`);
  }

  exportChedE4(termId: number): Observable<ChedFormE4GraduateDto[]> {
    return this.http.get<ChedFormE4GraduateDto[]>(`${this.baseUrl}/compliance/ched/e4/${termId}`);
  }

  exportChedE5(termId: number): Observable<ChedFormE5FacultyDto[]> {
    return this.http.get<ChedFormE5FacultyDto[]>(`${this.baseUrl}/compliance/ched/e5/${termId}`);
  }
}
