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
  ScanAttendanceRequest,
  StartAttendanceSessionRequest
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

  getDailyAttendance(date?: string, sectionId?: number): Observable<AttendanceRecordResponse[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (sectionId) params = params.set('sectionId', sectionId.toString());
    return this.http.get<AttendanceRecordResponse[]>(`${environment.apiUrl}/v1/attendance/daily`, { params });
  }

  getStudentRiskProfile(studentId: number): Observable<DigitalTwinRiskProfileDto> {
    return this.http.get<DigitalTwinRiskProfileDto>(`${environment.apiUrl}/v1/analytics/digital-twin/risk/${studentId}`);
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
}
