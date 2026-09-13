import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  LtiDeploymentRequest,
  LtiDeploymentResponse,
  LtiLaunchRequest,
  LtiLaunchResponse,
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
}
