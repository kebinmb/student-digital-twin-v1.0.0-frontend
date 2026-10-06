import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../authentication/auth-service';
import { ResilientSseService } from '../../services/resilient-sse.service';
import {
  LtiDeploymentRequest,
  LtiDeploymentResponse,
  LtiLaunchRequest,
  LtiLaunchResponse,
  LmsRosterSyncResponse,
  StudentSelfServiceSummaryDto
} from '../../models/lms.model';

export interface StudentRealtimeNotification {
  eventType: 'INIT' | 'GRADE_RELEASED' | 'CLEARANCE_UPDATED' | 'STANDING_UPDATED' | 'ENROLLMENT_UPDATED' | 'ATTENDANCE_VERIFIED' | 'INTERVENTION_DISPATCHED';
  studentId?: number;
  sectionId?: number;
  courseCode?: string;
  courseTitle?: string;
  grade?: number;
  status?: string;
  termId?: number;
  departmentType?: string;
  signoffStatus?: string;
  overallStatus?: string;
  remarks?: string;
  gpa?: number;
  totalUnitsEarned?: number;
  academicStatus?: string;
  sessionId?: number;
  sectionCode?: string;
  interventionType?: string;
  riskLevel?: string;
  triggerFactor?: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LmsApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly resilientSse = inject(ResilientSseService);

  getDeployments(): Observable<LtiDeploymentResponse[]> {
    return this.http.get<LtiDeploymentResponse[]>(`${environment.apiUrl}/v1/lti/deployments`);
  }

  createDeployment(request: LtiDeploymentRequest): Observable<LtiDeploymentResponse> {
    return this.http.post<LtiDeploymentResponse>(`${environment.apiUrl}/v1/lti/deployments`, request);
  }

  initiateOidcLogin(clientId: string, deploymentId: string, targetLinkUri: string): Observable<string> {
    const params = new HttpParams()
      .set('client_id', clientId)
      .set('deployment_id', deploymentId)
      .set('target_link_uri', targetLinkUri);
    return this.http.get(`${environment.apiUrl}/v1/lti/login`, { params, responseType: 'text' });
  }

  validateLaunchToken(request: LtiLaunchRequest): Observable<LtiLaunchResponse> {
    return this.http.post<LtiLaunchResponse>(`${environment.apiUrl}/v1/lti/launch`, request);
  }

  syncRoster(sectionId: number): Observable<LmsRosterSyncResponse> {
    return this.http.post<LmsRosterSyncResponse>(`${environment.apiUrl}/v1/lms/sync/roster/${sectionId}`, {});
  }

  getStudentPortalSummary(studentId: number): Observable<StudentSelfServiceSummaryDto> {
    return this.http.get<StudentSelfServiceSummaryDto>(`${environment.apiUrl}/v1/students/portal/summary/${studentId}`);
  }

  getMyStudentPortalSummary(): Observable<StudentSelfServiceSummaryDto> {
    return this.http.get<StudentSelfServiceSummaryDto>(`${environment.apiUrl}/v1/students/portal/me`);
  }

  subscribeToStudentEvents(studentId?: number): Observable<StudentRealtimeNotification> {
    const studentParam = studentId ? `?studentId=${studentId}` : '';
    return this.resilientSse.createStream<StudentRealtimeNotification>(
      `/v1/students/portal/stream${studentParam}`,
      [
        'grade-released',
        'clearance-updated',
        'standing-updated',
        'enrollment-updated',
        'attendance-verified',
        'intervention-dispatched',
        'INIT'
      ]
    );
  }
}
