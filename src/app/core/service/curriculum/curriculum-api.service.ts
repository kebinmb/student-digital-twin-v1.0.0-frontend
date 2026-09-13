import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddCourseToCurriculumRequest,
  AddPrerequisiteRequest,
  AvailableCourseDto,
  CloneCurriculumRequest,
  CreateCurriculumRequest,
  CurriculumLookupOption,
  CurriculumSummaryResponse,
  DesignerViewResponse,
  RelocateCourseRequest,
  ValidationReportDto
} from '../../models/curriculum-designer.model';

@Injectable({
  providedIn: 'root'
})
export class CurriculumApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/curricula`;

  private lookupOptions$?: Observable<CurriculumLookupOption[]>;

  getDesignerView(curriculumId: number): Observable<DesignerViewResponse> {
    return this.http.get<DesignerViewResponse>(`${this.baseUrl}/${curriculumId}/designer`);
  }

  getAvailableCourses(curriculumId: number, search?: string): Observable<AvailableCourseDto[]> {
    let params = new HttpParams();
    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }
    return this.http.get<AvailableCourseDto[]>(`${this.baseUrl}/${curriculumId}/available-courses`, { params });
  }

  addCourseToCurriculum(curriculumId: number, request: AddCourseToCurriculumRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${curriculumId}/courses`, request);
  }

  removeCourseFromCurriculum(curriculumId: number, curriculumCourseId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${curriculumId}/courses/${curriculumCourseId}`);
  }

  updateBatchCoursePositions(curriculumId: number, requests: RelocateCourseRequest[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${curriculumId}/courses/batch-positions`, requests);
  }

  updateCoursePosition(curriculumId: number, request: RelocateCourseRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${curriculumId}/courses/position`, request);
  }

  addPrerequisite(curriculumId: number, request: AddPrerequisiteRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${curriculumId}/prerequisites`, request);
  }

  removePrerequisite(curriculumId: number, prerequisiteId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${curriculumId}/prerequisites/${prerequisiteId}`);
  }

  validateCurriculum(curriculumId: number): Observable<ValidationReportDto> {
    return this.http.post<ValidationReportDto>(`${this.baseUrl}/${curriculumId}/validate`, {});
  }

  transitionState(curriculumId: number, status: string): Observable<void> {
    const params = new HttpParams().set('status', status);
    return this.http.post<void>(`${this.baseUrl}/${curriculumId}/transition-state`, {}, { params }).pipe(
      tap(() => this.invalidateCache())
    );
  }

  cloneCurriculum(curriculumId: number, request: CloneCurriculumRequest): Observable<CurriculumSummaryResponse> {
    return this.http.post<CurriculumSummaryResponse>(`${this.baseUrl}/${curriculumId}/clone`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  createCurriculum(request: CreateCurriculumRequest): Observable<CurriculumSummaryResponse> {
    return this.http.post<CurriculumSummaryResponse>(this.baseUrl, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  getCurriculaByProgram(programId: number): Observable<CurriculumSummaryResponse[]> {
    return this.http.get<CurriculumSummaryResponse[]>(`${this.baseUrl}/program/${programId}`);
  }

  getCurriculumById(id: number): Observable<CurriculumSummaryResponse> {
    return this.http.get<CurriculumSummaryResponse>(`${this.baseUrl}/${id}`);
  }

  updateCurriculum(id: number, request: { name: string; effectiveAcademicYear: string }): Observable<CurriculumSummaryResponse> {
    return this.http.put<CurriculumSummaryResponse>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  getCurriculumCourses(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${id}/courses`);
  }

  getCurriculumLookupOptions(): Observable<CurriculumLookupOption[]> {
    if (!this.lookupOptions$) {
      this.lookupOptions$ = this.http.get<CurriculumLookupOption[]>(`${this.baseUrl}/lookup`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.lookupOptions$;
  }

  deleteCurriculum(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  invalidateCache(): void {
    this.lookupOptions$ = undefined;
  }
}
