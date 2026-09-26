import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SliceResponse } from '../../models/institution.model';
import {
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
  VerifyCreatorAttendanceRequest
} from '../../models/analytics.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsApiService {
  private readonly http = inject(HttpClient);

  startAttendanceSession(request: StartAttendanceSessionRequest): Observable<AttendanceSessionResponse> {
    return this.http.post<AttendanceSessionResponse>(`${environment.apiUrl}/v1/attendance/session/start`, request);
  }

  scanAttendance(request: ScanAttendanceRequest): Observable<AttendanceRecordResponse> {
    return this.http.post<AttendanceRecordResponse>(`${environment.apiUrl}/v1/attendance/scan`, request);
  }

  verifyCreatorAttendance(request: VerifyCreatorAttendanceRequest): Observable<FacultyAttendanceRecordResponse> {
    return this.http.post<FacultyAttendanceRecordResponse>(`${environment.apiUrl}/v1/attendance/creator/verify`, request);
  }

  getDailyFacultyAttendance(date?: string, sectionId?: number): Observable<FacultyAttendanceRecordResponse[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (sectionId) params = params.set('sectionId', sectionId.toString());
    return this.http.get<FacultyAttendanceRecordResponse[]>(`${environment.apiUrl}/v1/attendance/creator/daily`, { params });
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
    );
  }

  getDailyAttendance(date?: string, sectionId?: number): Observable<AttendanceRecordResponse[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (sectionId) params = params.set('sectionId', sectionId.toString());
    return this.http.get<AttendanceRecordResponse[]>(`${environment.apiUrl}/v1/attendance/daily`, { params });
  }

  subscribeToSessionStream(sessionId: number): Observable<AttendanceRecordResponse> {
    return new Observable<AttendanceRecordResponse>(observer => {
      const eventSource = new EventSource(`${environment.apiUrl}/v1/attendance/stream/${sessionId}`);
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
    return this.http.get<DigitalTwinRiskProfileDto>(`${environment.apiUrl}/v1/analytics/digital-twin/risk/${studentId}`);
  }

  getCurrentStudentRiskProfile(): Observable<DigitalTwinRiskProfileDto> {
    return this.http.get<DigitalTwinRiskProfileDto>(`${environment.apiUrl}/v1/analytics/digital-twin/risk/me`);
  }

  getEarlyWarningRadar(): Observable<EarlyWarningRadarItemDto[]> {
    return this.http.get<EarlyWarningRadarItemDto[]>(`${environment.apiUrl}/v1/analytics/digital-twin/early-warning/radar`);
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
    );
  }

  dispatchIntervention(request: DispatchInterventionRequest): Observable<StudentInterventionDto> {
    return this.http.post<StudentInterventionDto>(`${environment.apiUrl}/v1/analytics/interventions/dispatch`, request);
  }

  updateInterventionStatus(id: number, request: UpdateInterventionStatusRequest): Observable<StudentInterventionDto> {
    return this.http.patch<StudentInterventionDto>(`${environment.apiUrl}/v1/analytics/interventions/${id}/status`, request);
  }

  getStudentInterventions(studentId: number): Observable<StudentInterventionDto[]> {
    return this.http.get<StudentInterventionDto[]>(`${environment.apiUrl}/v1/analytics/interventions/student/${studentId}`);
  }
}
