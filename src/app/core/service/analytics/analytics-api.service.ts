import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
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

  getStudentRiskProfile(studentId: number): Observable<DigitalTwinRiskProfileDto> {
    return this.http.get<DigitalTwinRiskProfileDto>(`${environment.apiUrl}/v1/analytics/digital-twin/risk/${studentId}`);
  }

  getEarlyWarningRadar(): Observable<EarlyWarningRadarItemDto[]> {
    return this.http.get<EarlyWarningRadarItemDto[]>(`${environment.apiUrl}/v1/analytics/digital-twin/early-warning/radar`);
  }
}
