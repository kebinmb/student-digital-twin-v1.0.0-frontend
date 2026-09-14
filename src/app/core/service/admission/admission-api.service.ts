import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdmissionApplicationResponse,
  AdmissionConfigDto,
  CreateExamSlotRequest,
  EmailAvailabilityResponse,
  EntranceExamSlotResponse,
  EvaluateExamRequest,
  EvaluateInterviewRequest,
  PublicProgramDto,
  PublicTermDto,
  QueueTokenRequest,
  QueueTokenResponse,
  SubmitAdmissionRequest,
  UpdateAdmissionConfigRequest,
  UpdateAdmissionStatusRequest
} from '../../models/admission.model';

@Injectable({
  providedIn: 'root'
})
export class AdmissionApiService {
  private readonly http = inject(HttpClient);
  private readonly publicBaseUrl = `${environment.apiUrl}/v1/public/admission`;
  private readonly adminBaseUrl = `${environment.apiUrl}/v1/admission`;

  private publicPrograms$?: Observable<PublicProgramDto[]>;
  private publicTerms$?: Observable<PublicTermDto[]>;

  // Public Guest Endpoints
  getPublicAdmissionConfig(termId?: number): Observable<AdmissionConfigDto> {
    let params = new HttpParams();
    if (termId) params = params.set('termId', termId.toString());
    return this.http.get<AdmissionConfigDto>(`${this.publicBaseUrl}/config`, { params });
  }

  getPublicPrograms(): Observable<PublicProgramDto[]> {
    if (!this.publicPrograms$) {
      this.publicPrograms$ = this.http.get<PublicProgramDto[]>(`${this.publicBaseUrl}/programs`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.publicPrograms$;
  }

  getPublicTerms(): Observable<PublicTermDto[]> {
    if (!this.publicTerms$) {
      this.publicTerms$ = this.http.get<PublicTermDto[]>(`${this.publicBaseUrl}/terms`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.publicTerms$;
  }

  invalidatePublicCache(): void {
    this.publicPrograms$ = undefined;
    this.publicTerms$ = undefined;
  }

  requestQueueToken(request?: QueueTokenRequest): Observable<QueueTokenResponse> {
    return this.http.post<QueueTokenResponse>(`${this.publicBaseUrl}/queue/token`, request || {});
  }

  checkQueueStatus(token: string): Observable<QueueTokenResponse> {
    const params = new HttpParams().set('token', token);
    return this.http.get<QueueTokenResponse>(`${this.publicBaseUrl}/queue/status`, { params });
  }

  checkEmailAvailability(email: string, termId?: number): Observable<EmailAvailabilityResponse> {
    let params = new HttpParams().set('email', email);
    if (termId) {
      params = params.set('termId', termId.toString());
    }
    return this.http.get<EmailAvailabilityResponse>(`${this.publicBaseUrl}/check-email`, { params });
  }

  getAvailableExamSlots(termId?: number): Observable<EntranceExamSlotResponse[]> {
    let params = new HttpParams();
    if (termId) {
      params = params.set('termId', termId.toString());
    }
    return this.http.get<EntranceExamSlotResponse[]>(`${this.publicBaseUrl}/exam-slots`, { params });
  }

  submitApplication(request: SubmitAdmissionRequest): Observable<AdmissionApplicationResponse> {
    return this.http.post<AdmissionApplicationResponse>(`${this.publicBaseUrl}/apply`, request);
  }

  trackApplication(applicationNumber: string): Observable<AdmissionApplicationResponse> {
    return this.http.get<AdmissionApplicationResponse>(`${this.publicBaseUrl}/track/${encodeURIComponent(applicationNumber)}`);
  }

  // Staff / Admin / Guidance / Chair Endpoints
  getAdmissionConfig(termId?: number): Observable<AdmissionConfigDto> {
    let params = new HttpParams();
    if (termId) params = params.set('termId', termId.toString());
    return this.http.get<AdmissionConfigDto>(`${this.adminBaseUrl}/config`, { params });
  }

  updateAdmissionConfig(request: UpdateAdmissionConfigRequest): Observable<AdmissionConfigDto> {
    return this.http.put<AdmissionConfigDto>(`${this.adminBaseUrl}/config`, request);
  }

  getAllApplications(termId?: number, status?: string): Observable<AdmissionApplicationResponse[]> {
    let params = new HttpParams();
    if (termId) params = params.set('termId', termId.toString());
    if (status) params = params.set('status', status);
    return this.http.get<AdmissionApplicationResponse[]>(`${this.adminBaseUrl}/applications`, { params });
  }

  getUnclaimedApplications(termId?: number): Observable<AdmissionApplicationResponse[]> {
    let params = new HttpParams();
    if (termId) params = params.set('termId', termId.toString());
    return this.http.get<AdmissionApplicationResponse[]>(`${this.adminBaseUrl}/applications/unclaimed`, { params });
  }

  getApplicationsForProgram(programId: number, status?: string): Observable<AdmissionApplicationResponse[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<AdmissionApplicationResponse[]>(`${this.adminBaseUrl}/applications/program/${programId}`, { params });
  }

  evaluateExam(id: number, request: EvaluateExamRequest): Observable<AdmissionApplicationResponse> {
    return this.http.post<AdmissionApplicationResponse>(`${this.adminBaseUrl}/applications/${id}/evaluate-exam`, request);
  }

  evaluateInterview(id: number, request: EvaluateInterviewRequest): Observable<AdmissionApplicationResponse> {
    return this.http.post<AdmissionApplicationResponse>(`${this.adminBaseUrl}/applications/${id}/evaluate-interview`, request);
  }

  updateApplicationStatus(id: number, request: UpdateAdmissionStatusRequest): Observable<AdmissionApplicationResponse> {
    return this.http.put<AdmissionApplicationResponse>(`${this.adminBaseUrl}/applications/${id}/status`, request);
  }

  getAllAdminExamSlots(termId?: number): Observable<EntranceExamSlotResponse[]> {
    let params = new HttpParams();
    if (termId) params = params.set('termId', termId.toString());
    return this.http.get<EntranceExamSlotResponse[]>(`${this.adminBaseUrl}/exam-slots`, { params });
  }

  createExamSlot(request: CreateExamSlotRequest): Observable<EntranceExamSlotResponse> {
    return this.http.post<EntranceExamSlotResponse>(`${this.adminBaseUrl}/exam-slots`, request);
  }

  updateExamSlotStatus(id: number, status: string): Observable<EntranceExamSlotResponse> {
    const params = new HttpParams().set('status', status);
    return this.http.put<EntranceExamSlotResponse>(`${this.adminBaseUrl}/exam-slots/${id}/status`, {}, { params });
  }

  deleteExamSlot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminBaseUrl}/exam-slots/${id}`);
  }
}
