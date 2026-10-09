import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { SliceResponse } from '../../models/institution.model';
import {
  AcknowledgeInterventionRequest,
  InterventionAcknowledgeResponse,
  AttendanceRecordResponse,
  AttendanceSessionResponse,
  DigitalTwinRiskProfileDto,
  EarlyWarningRadarItemDto,
  FacultyAttendanceRecordResponse,
  ScanAttendanceRequest,
  StartAttendanceSessionRequest,
  StudentInterventionDto,
  DispatchInterventionRequest,
  UpdateInterventionStatusRequest,
  VerifyCreatorAttendanceRequest,
  AdminTelemetryQueryParams,
  PageResponse,
  StudentTelemetryAdminSummary,
  FacultySectionOption,
  FacultyTelemetryQueryParams,
  StudentSelfTelemetry,
  StudentTelemetrySummary,
  TelemetryKpiSummary
} from '../../models/analytics.model';

import { AuthService } from '../authentication/auth-service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  startAttendanceSession(request: StartAttendanceSessionRequest): Observable<AttendanceSessionResponse> {
    return this.http.post<AttendanceSessionResponse>(`${environment.apiUrl}/v1/attendance/session/start`, request).pipe(
      catchError(err => {
        console.error('Failed to start attendance session:', err);
        return throwError(() => err);
      })
    );
  }

  scanAttendance(request: ScanAttendanceRequest): Observable<AttendanceRecordResponse> {
    return this.http.post<AttendanceRecordResponse>(`${environment.apiUrl}/v1/attendance/scan`, request).pipe(
      catchError(err => {
        console.error('Failed to scan attendance:', err);
        return throwError(() => err);
      })
    );
  }

  verifyCreatorAttendance(request: VerifyCreatorAttendanceRequest): Observable<FacultyAttendanceRecordResponse> {
    return this.http.post<FacultyAttendanceRecordResponse>(`${environment.apiUrl}/v1/attendance/creator/verify`, request).pipe(
      catchError(err => {
        console.error('Failed to verify creator attendance:', err);
        return throwError(() => err);
      })
    );
  }

  getDailyFacultyAttendance(date?: string, sectionId?: number): Observable<FacultyAttendanceRecordResponse[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (sectionId) params = params.set('sectionId', sectionId.toString());
    return this.http.get<FacultyAttendanceRecordResponse[]>(`${environment.apiUrl}/v1/attendance/creator/daily`, { params }).pipe(
      catchError(err => {
        console.error('Failed to get daily faculty attendance:', err);
        return of([]);
      })
    );
  }

  getStudentAttendanceSlice(
    studentId: number,
    page = 0,
    size = 20,
    sortBy?: string,
    sortDir = 'DESC'
  ): Observable<SliceResponse<AttendanceRecordResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sortDir', sortDir);
    if (sortBy) params = params.set('sortBy', sortBy);
    return this.http.get<SliceResponse<AttendanceRecordResponse>>(
      `${environment.apiUrl}/v1/attendance/student/${studentId}/slice`,
      { params }
    ).pipe(
      catchError(err => {
        console.error(`Failed to get student attendance slice for ${studentId}:`, err);
        return of({ content: [], hasNext: false, hasPrevious: false, isFirst: true, isLast: true, page: page, size: size });
      })
    );
  }

  getCurrentStudentAttendanceSlice(
    page = 0,
    size = 50,
    sortBy?: string,
    sortDir = 'DESC'
  ): Observable<SliceResponse<AttendanceRecordResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sortDir', sortDir);
    if (sortBy) params = params.set('sortBy', sortBy);
    return this.http.get<SliceResponse<AttendanceRecordResponse>>(
      `${environment.apiUrl}/v1/attendance/student/me/slice`,
      { params }
    ).pipe(
      catchError(err => {
        console.error('Failed to get current student attendance slice:', err);
        return of({ content: [], hasNext: false, hasPrevious: false, isFirst: true, isLast: true, page: page, size: size });
      })
    );
  }

  getDailyAttendance(date?: string, sectionId?: number): Observable<AttendanceRecordResponse[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (sectionId) params = params.set('sectionId', sectionId.toString());
    return this.http.get<AttendanceRecordResponse[]>(`${environment.apiUrl}/v1/attendance/daily`, { params }).pipe(
      catchError(err => {
        console.error('Failed to get daily attendance:', err);
        return of([]);
      })
    );
  }

  subscribeToSessionStream(sessionId: number): Observable<AttendanceRecordResponse> {
    return new Observable<AttendanceRecordResponse>(observer => {
      const token = this.authService.accessToken();
      const tokenParam = token ? `?access_token=${encodeURIComponent(token)}` : '';
      const eventSource = new EventSource(`${environment.apiUrl}/v1/attendance/stream/${sessionId}${tokenParam}`);
      eventSource.addEventListener('attendance-scan', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          observer.next(data);
        } catch (err) {
          console.error('Error parsing SSE event data:', err);
        }
      });
      eventSource.onerror = (err) => observer.error(err);
      return () => eventSource.close();
    });
  }

  getStudentRiskProfile(studentId: number): Observable<DigitalTwinRiskProfileDto> {
    return this.http.get<DigitalTwinRiskProfileDto>(`${environment.apiUrl}/v1/analytics/digital-twin/risk/${studentId}`).pipe(
      catchError(err => {
        console.error(`Failed to get student risk profile for ${studentId}:`, err);
        return throwError(() => err);
      })
    );
  }

  getCurrentStudentRiskProfile(): Observable<DigitalTwinRiskProfileDto> {
    return this.http.get<DigitalTwinRiskProfileDto>(`${environment.apiUrl}/v1/analytics/digital-twin/risk/me`).pipe(
      catchError(err => {
        console.error('Failed to get current student risk profile:', err);
        return throwError(() => err);
      })
    );
  }

  getEarlyWarningRadar(): Observable<EarlyWarningRadarItemDto[]> {
    return this.http.get<EarlyWarningRadarItemDto[]>(`${environment.apiUrl}/v1/analytics/digital-twin/early-warning/radar`).pipe(
      catchError(err => {
        console.error('Failed to get early warning radar items:', err);
        return of([]);
      })
    );
  }

  getEarlyWarningRadarSlice(
    page = 0,
    size = 20,
    sortBy?: string,
    sortDir = 'DESC'
  ): Observable<SliceResponse<DigitalTwinRiskProfileDto>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sortDir', sortDir);
    if (sortBy) params = params.set('sortBy', sortBy);
    return this.http.get<SliceResponse<DigitalTwinRiskProfileDto>>(
      `${environment.apiUrl}/v1/analytics/digital-twin/early-warning/slice`,
      { params }
    ).pipe(
      catchError(err => {
        console.error('Failed to get early warning radar slice:', err);
        return of({ content: [], hasNext: false, hasPrevious: false, isFirst: true, isLast: true, page: page, size: size });
      })
    );
  }

  dispatchIntervention(request: DispatchInterventionRequest): Observable<StudentInterventionDto> {
    return this.http.post<StudentInterventionDto>(`${environment.apiUrl}/v1/analytics/interventions/dispatch`, request).pipe(
      catchError(err => {
        console.error('Failed to dispatch intervention:', err);
        return throwError(() => err);
      })
    );
  }

  updateInterventionStatus(id: number, request: UpdateInterventionStatusRequest): Observable<StudentInterventionDto> {
    return this.http.patch<StudentInterventionDto>(`${environment.apiUrl}/v1/analytics/interventions/${id}/status`, request).pipe(
      catchError(err => {
        console.error(`Failed to update intervention status for ${id}:`, err);
        return throwError(() => err);
      })
    );
  }

  getStudentInterventions(studentId: number): Observable<StudentInterventionDto[]> {
    return this.http.get<StudentInterventionDto[]>(`${environment.apiUrl}/v1/analytics/interventions/student/${studentId}`).pipe(
      catchError(err => {
        console.error(`Failed to get student interventions for ${studentId}:`, err);
        return of([]);
      })
    );
  }

  getInterventionTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/v1/analytics/interventions/types`).pipe(
      catchError(() => of(['GUIDANCE_COUNSELING', 'ACADEMIC_TUTORING', 'ATTENDANCE_CONFERENCE', 'FINANCIAL_SUBSIDY_AID', 'PEER_MENTORING']))
    );
  }

  getAdminStudentTelemetry(params: AdminTelemetryQueryParams): Observable<PageResponse<StudentTelemetryAdminSummary>> {
    let httpParams = new HttpParams()
      .set('page', (params.page ?? 0).toString())
      .set('size', (params.size ?? 10).toString());

    if (params.searchQuery) {
      httpParams = httpParams.set('searchQuery', params.searchQuery);
    }
    if (params.riskLevel && params.riskLevel !== 'ALL') {
      httpParams = httpParams.set('riskLevel', params.riskLevel);
    }
    if (params.interventionStatus && params.interventionStatus !== 'ALL') {
      httpParams = httpParams.set('interventionStatus', params.interventionStatus);
    }

    return this.http.get<PageResponse<StudentTelemetryAdminSummary>>(`${environment.apiUrl}/v1/admin/telemetry/students`, { params: httpParams }).pipe(
      catchError(err => {
        console.error('Failed to get admin student telemetry:', err);
        return of({ content: [], totalElements: 0, totalPages: 0, size: params.size ?? 10, number: params.page ?? 0, first: true, last: true, empty: true });
      })
    );
  }

  getFacultyStudentTelemetry(params: FacultyTelemetryQueryParams): Observable<PageResponse<StudentTelemetryAdminSummary>> {
    let httpParams = new HttpParams()
      .set('page', (params.page ?? 0).toString())
      .set('size', (params.size ?? 10).toString());

    if (params.searchQuery) {
      httpParams = httpParams.set('searchQuery', params.searchQuery);
    }
    if (params.riskLevel && params.riskLevel !== 'ALL') {
      httpParams = httpParams.set('riskLevel', params.riskLevel);
    }
    if (params.interventionStatus && params.interventionStatus !== 'ALL') {
      httpParams = httpParams.set('interventionStatus', params.interventionStatus);
    }
    if (params.sectionId) {
      httpParams = httpParams.set('sectionId', params.sectionId.toString());
    }

    return this.http.get<PageResponse<StudentTelemetryAdminSummary>>(`${environment.apiUrl}/v1/faculty/telemetry/students`, { params: httpParams }).pipe(
      catchError(err => {
        console.error('Failed to get faculty student telemetry:', err);
        return of({ content: [], totalElements: 0, totalPages: 0, size: params.size ?? 10, number: params.page ?? 0, first: true, last: true, empty: true });
      })
    );
  }

  getFacultyAssignedSections(): Observable<FacultySectionOption[]> {
    return this.http.get<FacultySectionOption[]>(`${environment.apiUrl}/v1/faculty/telemetry/sections`).pipe(
      catchError(err => {
        console.error('Failed to get faculty assigned sections:', err);
        return of([]);
      })
    );
  }

  getStudentSelfTelemetry(): Observable<StudentSelfTelemetry> {
    return this.http.get<StudentSelfTelemetry>(`${environment.apiUrl}/v1/student/telemetry/me`).pipe(
      catchError(err => {
        console.error('Failed to get student self telemetry:', err);
        return throwError(() => err);
      })
    );
  }

  acknowledgeIntervention(
    interventionId: number,
    studentResponse: string = ''
  ): Observable<InterventionAcknowledgeResponse | any> {
    if (!interventionId || interventionId <= 0) {
      console.error('[AnalyticsApiService] Invalid interventionId — cannot acknowledge');
      return throwError(() => new Error('Invalid interventionId'));
    }

    const body: AcknowledgeInterventionRequest = {
      response: studentResponse || ''
    };

    return this.http.post<InterventionAcknowledgeResponse | any>(
      `${environment.apiUrl}/v1/student/telemetry/interventions/${interventionId}/acknowledge`,
      body
    ).pipe(
      tap(() => console.log(`[AnalyticsApiService] Intervention ${interventionId} acknowledged`)),
      catchError(err => {
        console.error(`Failed to acknowledge intervention ${interventionId}:`, err);

        // Handle known error cases gracefully
        if (err.status === 409) {
          // Already acknowledged — treat as success (idempotent)
          console.warn(`Intervention ${interventionId} already acknowledged — ignoring 409`);
          return of({ alreadyAcknowledged: true });
        }

        if (err.status === 403) {
          console.error(`Not authorized to acknowledge intervention ${interventionId}`);
        }

        return throwError(() => err);
      })
    );
  }

  acknowledgeStudentIntervention(
    id: number,
    studentResponse: string = ''
  ): Observable<any> {
    return this.acknowledgeIntervention(id, studentResponse);
  }

  getAdminTelemetryKpi(params?: AdminTelemetryQueryParams): Observable<TelemetryKpiSummary> {
    let httpParams = new HttpParams();
    if (params?.searchQuery) {
      httpParams = httpParams.set('searchQuery', params.searchQuery);
    }
    if (params?.riskLevel && params.riskLevel !== 'ALL') {
      httpParams = httpParams.set('riskLevel', params.riskLevel);
    }
    if (params?.interventionStatus && params.interventionStatus !== 'ALL') {
      httpParams = httpParams.set('interventionStatus', params.interventionStatus);
    }

    return this.http.get<TelemetryKpiSummary>(`${environment.apiUrl}/v1/admin/telemetry/kpi`, { params: httpParams }).pipe(
      catchError(err => {
        console.error('Failed to get admin telemetry KPI:', err);
        return of({
          totalMonitored: 0,
          criticalRiskCount: 0,
          highRiskCount: 0,
          moderateRiskCount: 0,
          lowRiskCount: 0,
          totalActiveInterventions: 0,
          averageWellnessIndex: 100.0
        });
      })
    );
  }

  getFacultyTelemetryKpi(params?: FacultyTelemetryQueryParams): Observable<TelemetryKpiSummary> {
    let httpParams = new HttpParams();
    if (params?.searchQuery) {
      httpParams = httpParams.set('searchQuery', params.searchQuery);
    }
    if (params?.riskLevel && params.riskLevel !== 'ALL') {
      httpParams = httpParams.set('riskLevel', params.riskLevel);
    }
    if (params?.interventionStatus && params.interventionStatus !== 'ALL') {
      httpParams = httpParams.set('interventionStatus', params.interventionStatus);
    }
    if (params?.sectionId) {
      httpParams = httpParams.set('sectionId', params.sectionId.toString());
    }

    return this.http.get<TelemetryKpiSummary>(`${environment.apiUrl}/v1/faculty/telemetry/kpi`, { params: httpParams }).pipe(
      catchError(err => {
        console.error('Failed to get faculty telemetry KPI:', err);
        return of({
          totalMonitored: 0,
          criticalRiskCount: 0,
          highRiskCount: 0,
          moderateRiskCount: 0,
          lowRiskCount: 0,
          totalActiveInterventions: 0,
          averageWellnessIndex: 100.0
        });
      })
    );
  }
}
