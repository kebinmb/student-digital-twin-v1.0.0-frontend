// File: src/app/core/service/compliance/equity-api.service.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  StudentEquityProfileDto,
  UpdateStudentEquityProfileRequest,
  VerifyEquityProfileRequest,
  EquityStatisticsSummaryDto
} from '../../models/student-equity.model';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class EquityApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/equity-profiles`;

  getMyEquityProfile(): Observable<StudentEquityProfileDto> {
    return this.http.get<StudentEquityProfileDto>(`${this.baseUrl}/me`);
  }

  updateMyEquityProfile(request: UpdateStudentEquityProfileRequest): Observable<StudentEquityProfileDto> {
    return this.http.put<StudentEquityProfileDto>(`${this.baseUrl}/me`, request);
  }

  getEquityProfileByStudentProfileId(studentProfileId: number): Observable<StudentEquityProfileDto> {
    return this.http.get<StudentEquityProfileDto>(`${this.baseUrl}/student/${studentProfileId}`);
  }

  verifyEquityProfile(profileId: number, request: VerifyEquityProfileRequest): Observable<StudentEquityProfileDto> {
    return this.http.put<StudentEquityProfileDto>(`${this.baseUrl}/${profileId}/verify`, request);
  }

  searchEquityProfiles(params: {
    search?: string;
    status?: string;
    is4ps?: boolean;
    isIp?: boolean;
    isPwd?: boolean;
    isGida?: boolean;
    isFirstGen?: boolean;
    page?: number;
    size?: number;
  }): Observable<PageResponse<StudentEquityProfileDto>> {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.is4ps !== undefined && params.is4ps !== null) httpParams = httpParams.set('is4ps', params.is4ps);
    if (params.isIp !== undefined && params.isIp !== null) httpParams = httpParams.set('isIp', params.isIp);
    if (params.isPwd !== undefined && params.isPwd !== null) httpParams = httpParams.set('isPwd', params.isPwd);
    if (params.isGida !== undefined && params.isGida !== null) httpParams = httpParams.set('isGida', params.isGida);
    if (params.isFirstGen !== undefined && params.isFirstGen !== null) httpParams = httpParams.set('isFirstGen', params.isFirstGen);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);

    return this.http.get<PageResponse<StudentEquityProfileDto>>(`${this.baseUrl}/search`, { params: httpParams });
  }

  getEquityStatisticsSummary(): Observable<EquityStatisticsSummaryDto> {
    return this.http.get<EquityStatisticsSummaryDto>(`${this.baseUrl}/statistics`);
  }
}
