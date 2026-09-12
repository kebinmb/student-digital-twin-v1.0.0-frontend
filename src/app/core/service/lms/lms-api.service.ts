import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  LtiDeploymentRequest,
  LtiDeploymentResponse,
  LmsRosterSyncResponse,
  StudentSelfServiceSummaryDto
} from '../../models/lms.model';

@Injectable({
  providedIn: 'root'
})
export class LmsApiService {
  private readonly http = inject(HttpClient);

  getDeployments(): Observable<LtiDeploymentResponse[]> {
    return this.http.get<LtiDeploymentResponse[]>(`${environment.apiUrl}/v1/lti/deployments`);
  }

  createDeployment(request: LtiDeploymentRequest): Observable<LtiDeploymentResponse> {
    return this.http.post<LtiDeploymentResponse>(`${environment.apiUrl}/v1/lti/deployments`, request);
  }

  syncRoster(sectionId: number): Observable<LmsRosterSyncResponse> {
    return this.http.post<LmsRosterSyncResponse>(`${environment.apiUrl}/v1/lms/sync/roster/${sectionId}`, {});
  }

  getStudentPortalSummary(studentId: number): Observable<StudentSelfServiceSummaryDto> {
    return this.http.get<StudentSelfServiceSummaryDto>(`${environment.apiUrl}/v1/students/portal/summary/${studentId}`);
  }
}
