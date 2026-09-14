// File: src/app/core/service/compliance/equity-api.service.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
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

export interface SliceResponse<T> {
  content: T[];
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
  isFirst: boolean;
  isLast: boolean;
}

export interface EquitySearchFilterParams {
  search?: string;
  status?: string;
  is4ps?: boolean;
  isIp?: boolean;
  isPwd?: boolean;
  isGida?: boolean;
  isFirstGen?: boolean;
  isSoloParent?: boolean;
  isFarmerFisherfolk?: boolean;
  isBottom40?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

@Injectable({
  providedIn: 'root'
})
export class EquityApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/equity-profiles`;
  private cachedStatistics$?: Observable<EquityStatisticsSummaryDto>;

  getMyEquityProfile(): Observable<StudentEquityProfileDto> {
    return this.http.get<StudentEquityProfileDto>(`${this.baseUrl}/me`);
  }

  updateMyEquityProfile(request: UpdateStudentEquityProfileRequest): Observable<StudentEquityProfileDto> {
    return this.http.put<StudentEquityProfileDto>(`${this.baseUrl}/me`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  getEquityProfileByStudentProfileId(studentProfileId: number): Observable<StudentEquityProfileDto> {
    return this.http.get<StudentEquityProfileDto>(`${this.baseUrl}/student/${studentProfileId}`);
  }

  verifyEquityProfile(profileId: number, request: VerifyEquityProfileRequest): Observable<StudentEquityProfileDto> {
    return this.http.put<StudentEquityProfileDto>(`${this.baseUrl}/${profileId}/verify`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  searchEquityProfiles(params: EquitySearchFilterParams): Observable<PageResponse<StudentEquityProfileDto>> {
    const httpParams = this.buildFilterParams(params);
    return this.http.get<PageResponse<StudentEquityProfileDto>>(`${this.baseUrl}/search`, { params: httpParams });
  }

  searchEquityProfilesSlice(params: EquitySearchFilterParams): Observable<SliceResponse<StudentEquityProfileDto>> {
    const httpParams = this.buildFilterParams(params);
    return this.http.get<SliceResponse<StudentEquityProfileDto>>(`${this.baseUrl}/search-slice`, { params: httpParams });
  }

  getEquityStatisticsSummary(): Observable<EquityStatisticsSummaryDto> {
    if (!this.cachedStatistics$) {
      this.cachedStatistics$ = this.http.get<EquityStatisticsSummaryDto>(`${this.baseUrl}/statistics`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.cachedStatistics$;
  }

  invalidateCache(): void {
    this.cachedStatistics$ = undefined;
  }

  private buildFilterParams(params: EquitySearchFilterParams): HttpParams {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.is4ps !== undefined && params.is4ps !== null) httpParams = httpParams.set('is4ps', params.is4ps);
    if (params.isIp !== undefined && params.isIp !== null) httpParams = httpParams.set('isIp', params.isIp);
    if (params.isPwd !== undefined && params.isPwd !== null) httpParams = httpParams.set('isPwd', params.isPwd);
    if (params.isGida !== undefined && params.isGida !== null) httpParams = httpParams.set('isGida', params.isGida);
    if (params.isFirstGen !== undefined && params.isFirstGen !== null) httpParams = httpParams.set('isFirstGen', params.isFirstGen);
    if (params.isSoloParent !== undefined && params.isSoloParent !== null) httpParams = httpParams.set('isSoloParent', params.isSoloParent);
    if (params.isFarmerFisherfolk !== undefined && params.isFarmerFisherfolk !== null) httpParams = httpParams.set('isFarmerFisherfolk', params.isFarmerFisherfolk);
    if (params.isBottom40 !== undefined && params.isBottom40 !== null) httpParams = httpParams.set('isBottom40', params.isBottom40);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);
    return httpParams;
  }
}

