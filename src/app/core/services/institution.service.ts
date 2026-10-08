import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WebSocketService } from './websocket.service';
import { WS_TOPICS } from '../constants/websocket-topics.constants';
import {
  AcademicYear,
  Campus,
  CiloPiloMapping,
  Course,
  CourseOutcome,
  CoursePrerequisite,
  CreateAcademicYearRequest,
  CreateCampusRequest,
  CreateCiloPiloMappingRequest,
  CreateCourseOutcomeRequest,
  CreateCoursePrerequisiteRequest,
  CreateCourseRequest,
  CreateDepartmentRequest,
  CreateFeeCatalogRequest,
  CreateFeeCategoryRequest,
  CreateGradingScaleRequest,
  CreatePaymentTermTemplateRequest,
  CreateProgramOutcomeRequest,
  CreateProgramRequest,
  CreateScholarshipDiscountRequest,
  CreateTermRequest,
  Department,
  FeeCatalog,
  FeeCategory,
  GradingScale,
  Page,
  PaymentTermTemplate,
  Program,
  ProgramOutcome,
  ScholarshipDiscount,
  SliceResponse,
  Term,
  TermHonorRollReport,
  CertificateVerification,
  CertificateRevocationSummary,
  UpdateAcademicYearRequest,
  UpdateCampusRequest,
  UpdateCourseOutcomeRequest,
  UpdateCourseRequest,
  UpdateDepartmentRequest,
  UpdateGradingScaleRequest,
  UpdateProgramRequest,
  UpdateTermScheduleRequest
} from '../models/institution.model';

@Injectable({
  providedIn: 'root'
})
export class CampusService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/campuses`;

  private readonly _allCampuses$ = new BehaviorSubject<Campus[]>([]);
  public readonly allCampuses$ = this._allCampuses$.asObservable();

  private readonly _activeCampuses$ = new BehaviorSubject<Campus[]>([]);
  public readonly activeCampuses$ = this._activeCampuses$.asObservable();

  getAll(): Observable<Campus[]> {
    return this.http.get<Campus[]>(this.baseUrl).pipe(
      tap((campuses) => this._allCampuses$.next(campuses)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getActive(): Observable<Campus[]> {
    return this.http.get<Campus[]>(`${this.baseUrl}/active`).pipe(
      tap((campuses) => this._activeCampuses$.next(campuses)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getById(id: number): Observable<Campus> {
    return this.http.get<Campus>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateCampusRequest): Observable<Campus> {
    return this.http.post<Campus>(this.baseUrl, request).pipe(
      tap(() => this.refresh())
    );
  }

  update(id: number, request: UpdateCampusRequest): Observable<Campus> {
    return this.http.put<Campus>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.refresh())
    );
  }

  toggleStatus(id: number, active: boolean): Observable<Campus> {
    return this.http.patch<Campus>(`${this.baseUrl}/${id}/status`, null, {
      params: new HttpParams().set('active', active)
    }).pipe(
      tap(() => this.refresh())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.refresh())
    );
  }

  refresh(): void {
    this.http.get<Campus[]>(this.baseUrl).subscribe({
      next: (campuses) => this._allCampuses$.next(campuses),
      error: (err) => console.error('[CampusService] refresh all failed', err)
    });
    this.http.get<Campus[]>(`${this.baseUrl}/active`).subscribe({
      next: (campuses) => this._activeCampuses$.next(campuses),
      error: (err) => console.error('[CampusService] refresh active failed', err)
    });
  }

  invalidateCache(): void {
    this.refresh();
  }
}

@Injectable({
  providedIn: 'root'
})
export class AcademicYearService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/academic-years`;

  private readonly _allAcademicYears$ = new BehaviorSubject<AcademicYear[]>([]);
  public readonly allAcademicYears$ = this._allAcademicYears$.asObservable();

  private readonly _currentAcademicYear$ = new BehaviorSubject<AcademicYear | null>(null);
  public readonly currentAcademicYear$ = this._currentAcademicYear$.asObservable();

  getAll(): Observable<AcademicYear[]> {
    return this.http.get<AcademicYear[]>(this.baseUrl).pipe(
      tap((years) => this._allAcademicYears$.next(years)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getCurrent(): Observable<AcademicYear> {
    return this.http.get<AcademicYear>(`${this.baseUrl}/current`).pipe(
      tap((year) => this._currentAcademicYear$.next(year)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getById(id: number): Observable<AcademicYear> {
    return this.http.get<AcademicYear>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateAcademicYearRequest): Observable<AcademicYear> {
    return this.http.post<AcademicYear>(this.baseUrl, request).pipe(
      tap(() => this.refresh())
    );
  }

  update(id: number, request: UpdateAcademicYearRequest): Observable<AcademicYear> {
    return this.http.put<AcademicYear>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.refresh())
    );
  }

  setCurrent(id: number): Observable<AcademicYear> {
    return this.http.put<AcademicYear>(`${this.baseUrl}/${id}/set-current`, {}).pipe(
      tap((year) => {
        this._currentAcademicYear$.next(year);
        this.refresh();
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.refresh())
    );
  }

  refresh(): void {
    this.http.get<AcademicYear[]>(this.baseUrl).subscribe({
      next: (years) => this._allAcademicYears$.next(years),
      error: (err) => console.error('[AcademicYearService] refresh all failed', err)
    });
    this.http.get<AcademicYear>(`${this.baseUrl}/current`).subscribe({
      next: (year) => this._currentAcademicYear$.next(year),
      error: (err) => console.error('[AcademicYearService] refresh current failed', err)
    });
  }

  invalidateCache(): void {
    this.refresh();
  }
}

@Injectable({
  providedIn: 'root'
})
export class TermService {
  private readonly http = inject(HttpClient);
  private readonly wsService = inject(WebSocketService, { optional: true });
  private readonly baseUrl = `${environment.apiUrl}/v1/terms`;

  private readonly _activeTerm$ = new BehaviorSubject<Term | null>(null);
  public readonly activeTerm$ = this._activeTerm$.asObservable();

  private readonly _allTerms$ = new BehaviorSubject<Term[]>([]);
  public readonly allTerms$ = this._allTerms$.asObservable();

  constructor() {
    if (this.wsService) {
      this.wsService.watch<Term>(WS_TOPICS.ACTIVE_TERM).pipe(
        catchError((err) => {
          console.error('[TermService] WebSocket watch error:', err);
          return of(null);
        })
      ).subscribe((term) => {
        if (term) {
          this._activeTerm$.next(term);
          const currentList = this._allTerms$.value;
          const index = currentList.findIndex(t => t.id === term.id);
          if (index !== -1) {
            const updated = [...currentList];
            updated[index] = { ...updated[index], ...term };
            this._allTerms$.next(updated);
          }
        }
      });
    }
  }

  get activeTerm(): Term | null {
    return this._activeTerm$.value;
  }

  get currentActiveTerm(): Term | null {
    return this._activeTerm$.value;
  }

  getActiveTermId(): number | null {
    return this._activeTerm$.value?.id ?? null;
  }

  getActive(): Observable<Term> {
    return this.http.get<Term>(`${this.baseUrl}/active`).pipe(
      tap((term) => this._activeTerm$.next(term)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getAll(): Observable<Term[]> {
    return this.http.get<Term[]>(this.baseUrl).pipe(
      tap((terms) => this._allTerms$.next(terms)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getByAcademicYear(academicYearId: number): Observable<Term[]> {
    return this.http.get<Term[]>(`${this.baseUrl}/academic-year/${academicYearId}`);
  }

  getById(id: number): Observable<Term> {
    return this.http.get<Term>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTermRequest): Observable<Term> {
    return this.http.post<Term>(this.baseUrl, request).pipe(
      tap(() => this.refresh())
    );
  }

  updateSchedule(id: number, request: UpdateTermScheduleRequest): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/schedule`, request).pipe(
      tap((term) => {
        if (term.isActive) {
          this._activeTerm$.next(term);
        }
        this.refresh();
      })
    );
  }

  activate(id: number): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/activate`, {}).pipe(
      tap((term) => {
        this._activeTerm$.next(term);
        this.refresh();
      })
    );
  }

  toggleEnrollmentWindow(id: number, open: boolean): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/enrollment-window?open=${open}`, {}).pipe(
      tap((term) => {
        if (term.isActive) {
          this._activeTerm$.next(term);
        }
        this.refresh();
      })
    );
  }

  toggleGradingWindow(id: number, open: boolean): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/grading-window?open=${open}`, {}).pipe(
      tap((term) => {
        if (term.isActive) {
          this._activeTerm$.next(term);
        }
        this.refresh();
      })
    );
  }

  toggleAddDropWindow(id: number, open: boolean): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/add-drop-window?open=${open}`, {}).pipe(
      tap((term) => {
        if (term.isActive) {
          this._activeTerm$.next(term);
        }
        this.refresh();
      })
    );
  }

  getHonorRoll(id: number, programId?: number): Observable<TermHonorRollReport> {
    let params = new HttpParams();
    if (programId != null) {
      params = params.set('programId', programId.toString());
    }
    return this.http.get<TermHonorRollReport>(`${this.baseUrl}/${id}/honor-roll`, { params });
  }

  getHonorCertificate(id: number, studentId: number): Observable<CertificateVerification> {
    return this.http.get<CertificateVerification>(`${this.baseUrl}/${id}/honor-certificate/${studentId}`);
  }

  downloadCertificatesZip(id: number, programId?: number): Observable<Blob> {
    let params = new HttpParams();
    if (programId != null) {
      params = params.set('programId', programId.toString());
    }
    return this.http.get(`${this.baseUrl}/${id}/honor-certificates/zip`, {
      params,
      responseType: 'blob'
    });
  }

  revokeCertificate(certificateId: string, reason: string): Observable<CertificateRevocationSummary> {
    return this.http.post<CertificateRevocationSummary>(`${environment.apiUrl}/v1/institution/certificates/revoke`, {
      certificateId,
      reason
    });
  }

  reinstateCertificate(certificateId: string): Observable<CertificateRevocationSummary> {
    return this.http.post<CertificateRevocationSummary>(`${environment.apiUrl}/v1/institution/certificates/reinstate?certificateId=${encodeURIComponent(certificateId)}`, {});
  }

  getActiveCertificateRevocations(): Observable<CertificateRevocationSummary[]> {
    return this.http.get<CertificateRevocationSummary[]>(`${environment.apiUrl}/v1/institution/certificates/revocations`);
  }

  exportCertificateRevocations(format: 'csv' | 'html'): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/v1/institution/certificates/revocations/export`, {
      params: new HttpParams().set('format', format),
      responseType: 'blob'
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.refresh())
    );
  }

  refresh(): void {
    this.http.get<Term>(`${this.baseUrl}/active`).subscribe({
      next: (term) => this._activeTerm$.next(term),
      error: (err) => console.error('[TermService] refresh active failed', err)
    });
    this.http.get<Term[]>(this.baseUrl).subscribe({
      next: (terms) => this._allTerms$.next(terms),
      error: (err) => console.error('[TermService] refresh all failed', err)
    });
  }

  invalidateCache(): void {
    this.refresh();
  }
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/departments`;

  private readonly _allDepartments$ = new BehaviorSubject<Department[]>([]);
  public readonly allDepartments$ = this._allDepartments$.asObservable();

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.baseUrl).pipe(
      tap((deps) => this._allDepartments$.next(deps)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getByCampus(campusId: number): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/campus/${campusId}`);
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateDepartmentRequest): Observable<Department> {
    return this.http.post<Department>(this.baseUrl, request).pipe(
      tap(() => this.refresh())
    );
  }

  update(id: number, request: UpdateDepartmentRequest): Observable<Department> {
    return this.http.put<Department>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.refresh())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.refresh())
    );
  }

  refresh(): void {
    this.http.get<Department[]>(this.baseUrl).subscribe({
      next: (deps) => this._allDepartments$.next(deps),
      error: (err) => console.error('[DepartmentService] refresh all failed', err)
    });
  }

  invalidateCache(): void {
    this.refresh();
  }
}

@Injectable({
  providedIn: 'root'
})
export class ProgramService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/programs`;

  private readonly _allPrograms$ = new BehaviorSubject<Program[]>([]);
  public readonly allPrograms$ = this._allPrograms$.asObservable();

  getAll(): Observable<Program[]> {
    return this.http.get<Program[]>(this.baseUrl).pipe(
      tap((progs) => this._allPrograms$.next(progs)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getById(id: number): Observable<Program> {
    return this.http.get<Program>(`${this.baseUrl}/${id}`);
  }

  getByDepartment(deptId: number): Observable<Program[]> {
    return this.http.get<Program[]>(`${this.baseUrl}/department/${deptId}`);
  }

  create(request: CreateProgramRequest): Observable<Program> {
    return this.http.post<Program>(this.baseUrl, request).pipe(
      tap(() => this.refresh())
    );
  }

  update(id: number, request: UpdateProgramRequest): Observable<Program> {
    return this.http.put<Program>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.refresh())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.refresh())
    );
  }

  getOutcomes(programId: number): Observable<ProgramOutcome[]> {
    return this.http.get<ProgramOutcome[]>(`${this.baseUrl}/${programId}/outcomes`);
  }

  createOutcome(programId: number, request: CreateProgramOutcomeRequest): Observable<ProgramOutcome> {
    return this.http.post<ProgramOutcome>(`${this.baseUrl}/${programId}/outcomes`, request);
  }

  deleteOutcome(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/outcomes/${id}`);
  }

  refresh(): void {
    this.http.get<Program[]>(this.baseUrl).subscribe({
      next: (progs) => this._allPrograms$.next(progs),
      error: (err) => console.error('[ProgramService] refresh all failed', err)
    });
  }

  invalidateCache(): void {
    this.refresh();
  }
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/courses`;

  private readonly _activeCourses$ = new BehaviorSubject<Course[]>([]);
  public readonly activeCourses$ = this._activeCourses$.asObservable();

  search(search?: string, page = 0, size = 20): Observable<Page<Course>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Page<Course>>(`${this.baseUrl}/search`, { params });
  }

  searchSlice(search?: string, page = 0, size = 20): Observable<SliceResponse<Course>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<SliceResponse<Course>>(`${this.baseUrl}/search-slice`, { params });
  }

  getAllActive(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.baseUrl}/active`).pipe(
      tap((courses) => this._activeCourses$.next(courses)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getById(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateCourseRequest): Observable<Course> {
    return this.http.post<Course>(this.baseUrl, request).pipe(
      tap(() => this.refresh())
    );
  }

  update(id: number, request: UpdateCourseRequest): Observable<Course> {
    return this.http.put<Course>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.refresh())
    );
  }

  toggleStatus(id: number, active: boolean): Observable<Course> {
    return this.http.patch<Course>(`${this.baseUrl}/${id}/status`, null, {
      params: new HttpParams().set('active', active)
    }).pipe(
      tap(() => this.refresh())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.refresh())
    );
  }

  refresh(): void {
    this.http.get<Course[]>(`${this.baseUrl}/active`).subscribe({
      next: (courses) => this._activeCourses$.next(courses),
      error: (err) => console.error('[CourseService] refresh active failed', err)
    });
  }

  invalidateCache(): void {
    this.refresh();
  }
}

@Injectable({
  providedIn: 'root'
})
export class CourseOutcomeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/courses`;

  getByCourse(courseId: number): Observable<CourseOutcome[]> {
    return this.http.get<CourseOutcome[]>(`${this.baseUrl}/${courseId}/outcomes`);
  }

  getById(id: number): Observable<CourseOutcome> {
    return this.http.get<CourseOutcome>(`${environment.apiUrl}/v1/course-outcomes/${id}`);
  }

  create(courseId: number, request: CreateCourseOutcomeRequest): Observable<CourseOutcome> {
    return this.http.post<CourseOutcome>(`${this.baseUrl}/${courseId}/outcomes`, request);
  }

  update(courseIdOrId: number, idOrReq: number | CreateCourseOutcomeRequest | UpdateCourseOutcomeRequest, maybeReq?: CreateCourseOutcomeRequest | UpdateCourseOutcomeRequest): Observable<CourseOutcome> {
    const id = maybeReq !== undefined ? idOrReq : courseIdOrId;
    const request = maybeReq !== undefined ? maybeReq : idOrReq;
    return this.http.put<CourseOutcome>(`${environment.apiUrl}/v1/course-outcomes/${id}`, request);
  }

  delete(courseIdOrId: number, maybeId?: number): Observable<void> {
    const id = maybeId !== undefined ? maybeId : courseIdOrId;
    return this.http.delete<void>(`${environment.apiUrl}/v1/course-outcomes/${id}`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class CoursePrerequisiteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/courses`;

  getByCourse(courseId: number): Observable<CoursePrerequisite[]> {
    return this.http.get<CoursePrerequisite[]>(`${this.baseUrl}/${courseId}/prerequisites`);
  }

  create(courseId: number, request: CreateCoursePrerequisiteRequest): Observable<CoursePrerequisite> {
    return this.http.post<CoursePrerequisite>(`${this.baseUrl}/${courseId}/prerequisites`, request);
  }

  delete(courseId: number, prereqId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${courseId}/prerequisites/${prereqId}`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class CiloPiloMappingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/cilo-pilo-mappings`;

  getMatrix(courseId?: number, programId?: number): Observable<CiloPiloMapping[]> {
    let params = new HttpParams();
    if (courseId) params = params.set('courseId', courseId.toString());
    if (programId) params = params.set('programId', programId.toString());
    return this.http.get<CiloPiloMapping[]>(this.baseUrl, { params });
  }

  getByCourse(courseId: number): Observable<CiloPiloMapping[]> {
    return this.http.get<CiloPiloMapping[]>(`${this.baseUrl}/course/${courseId}`);
  }

  getByProgram(programId: number): Observable<CiloPiloMapping[]> {
    return this.http.get<CiloPiloMapping[]>(`${this.baseUrl}/program/${programId}`);
  }

  getByCourseOutcome(ciloId: number): Observable<CiloPiloMapping[]> {
    return this.http.get<CiloPiloMapping[]>(`${this.baseUrl}/course-outcome/${ciloId}`);
  }

  getByProgramOutcome(piloId: number): Observable<CiloPiloMapping[]> {
    return this.http.get<CiloPiloMapping[]>(`${this.baseUrl}/program-outcome/${piloId}`);
  }

  createOrUpdate(request: CreateCiloPiloMappingRequest): Observable<CiloPiloMapping> {
    return this.http.post<CiloPiloMapping>(this.baseUrl, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class GradingScaleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/grading-scales`;

  private readonly _allGradingScales$ = new BehaviorSubject<GradingScale[]>([]);
  public readonly allGradingScales$ = this._allGradingScales$.asObservable();

  getAll(): Observable<GradingScale[]> {
    return this.http.get<GradingScale[]>(this.baseUrl).pipe(
      tap((scales) => this._allGradingScales$.next(scales)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getById(id: number): Observable<GradingScale> {
    return this.http.get<GradingScale>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateGradingScaleRequest): Observable<GradingScale> {
    return this.http.post<GradingScale>(this.baseUrl, request).pipe(
      tap(() => this.refresh())
    );
  }

  update(id: number, request: UpdateGradingScaleRequest): Observable<GradingScale> {
    return this.http.put<GradingScale>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.refresh())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.refresh())
    );
  }

  refresh(): void {
    this.http.get<GradingScale[]>(this.baseUrl).subscribe({
      next: (scales) => this._allGradingScales$.next(scales),
      error: (err) => console.error('[GradingScaleService] refresh all failed', err)
    });
  }

  invalidateCache(): void {
    this.refresh();
  }
}

@Injectable({
  providedIn: 'root'
})
export class FinancialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1`;

  private readonly _feeCategories$ = new BehaviorSubject<FeeCategory[]>([]);
  public readonly feeCategories$ = this._feeCategories$.asObservable();

  private readonly _feeCatalog$ = new BehaviorSubject<FeeCatalog[]>([]);
  public readonly feeCatalog$ = this._feeCatalog$.asObservable();

  private readonly _paymentTermTemplates$ = new BehaviorSubject<PaymentTermTemplate[]>([]);
  public readonly paymentTermTemplates$ = this._paymentTermTemplates$.asObservable();

  private readonly _scholarships$ = new BehaviorSubject<ScholarshipDiscount[]>([]);
  public readonly scholarships$ = this._scholarships$.asObservable();

  // Fee Categories
  getFeeCategories(): Observable<FeeCategory[]> {
    return this.http.get<FeeCategory[]>(`${this.baseUrl}/fee-categories`).pipe(
      tap((categories) => this._feeCategories$.next(categories)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  createFeeCategory(request: CreateFeeCategoryRequest): Observable<FeeCategory> {
    return this.http.post<FeeCategory>(`${this.baseUrl}/fee-categories`, request).pipe(
      tap(() => this.refreshFeeCategories())
    );
  }

  updateFeeCategory(id: number, request: { name: string }): Observable<FeeCategory> {
    return this.http.put<FeeCategory>(`${this.baseUrl}/fee-categories/${id}`, request).pipe(
      tap(() => this.refreshFeeCategories())
    );
  }

  deleteFeeCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/fee-categories/${id}`).pipe(
      tap(() => this.refreshFeeCategories())
    );
  }

  // Fee Catalog
  getFeeCatalog(): Observable<FeeCatalog[]> {
    return this.http.get<FeeCatalog[]>(`${this.baseUrl}/fee-catalog`).pipe(
      tap((catalog) => this._feeCatalog$.next(catalog)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getFeeCatalogByCategory(categoryId: number): Observable<FeeCatalog[]> {
    return this.http.get<FeeCatalog[]>(`${this.baseUrl}/fee-catalog/category/${categoryId}`);
  }

  createFeeCatalog(request: CreateFeeCatalogRequest): Observable<FeeCatalog> {
    return this.http.post<FeeCatalog>(`${this.baseUrl}/fee-catalog`, request).pipe(
      tap(() => this.refreshFeeCatalog())
    );
  }

  updateFeeCatalog(id: number, request: { name: string; defaultAmount: number; isPerUnit: boolean }): Observable<FeeCatalog> {
    return this.http.put<FeeCatalog>(`${this.baseUrl}/fee-catalog/${id}`, request).pipe(
      tap(() => this.refreshFeeCatalog())
    );
  }

  deleteFeeCatalog(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/fee-catalog/${id}`).pipe(
      tap(() => this.refreshFeeCatalog())
    );
  }

  // Payment Term Templates
  getPaymentTermTemplates(): Observable<PaymentTermTemplate[]> {
    return this.http.get<PaymentTermTemplate[]>(`${this.baseUrl}/payment-term-templates`).pipe(
      tap((templates) => this._paymentTermTemplates$.next(templates)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  createPaymentTermTemplate(request: CreatePaymentTermTemplateRequest): Observable<PaymentTermTemplate> {
    return this.http.post<PaymentTermTemplate>(`${this.baseUrl}/payment-term-templates`, request).pipe(
      tap(() => this.refreshPaymentTermTemplates())
    );
  }

  deletePaymentTermTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/payment-term-templates/${id}`).pipe(
      tap(() => this.refreshPaymentTermTemplates())
    );
  }

  // Scholarship Discounts
  getScholarships(): Observable<ScholarshipDiscount[]> {
    return this.http.get<ScholarshipDiscount[]>(`${this.baseUrl}/scholarship-discounts`).pipe(
      tap((scholarships) => this._scholarships$.next(scholarships)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  createScholarship(request: CreateScholarshipDiscountRequest): Observable<ScholarshipDiscount> {
    return this.http.post<ScholarshipDiscount>(`${this.baseUrl}/scholarship-discounts`, request).pipe(
      tap(() => this.refreshScholarships())
    );
  }

  deleteScholarship(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/scholarship-discounts/${id}`).pipe(
      tap(() => this.refreshScholarships())
    );
  }

  refreshFeeCategories(): void {
    this.http.get<FeeCategory[]>(`${this.baseUrl}/fee-categories`).subscribe({
      next: (cats) => this._feeCategories$.next(cats),
      error: (err) => console.error('[FinancialService] refresh fee categories failed', err)
    });
  }

  refreshFeeCatalog(): void {
    this.http.get<FeeCatalog[]>(`${this.baseUrl}/fee-catalog`).subscribe({
      next: (cat) => this._feeCatalog$.next(cat),
      error: (err) => console.error('[FinancialService] refresh fee catalog failed', err)
    });
  }

  refreshPaymentTermTemplates(): void {
    this.http.get<PaymentTermTemplate[]>(`${this.baseUrl}/payment-term-templates`).subscribe({
      next: (temps) => this._paymentTermTemplates$.next(temps),
      error: (err) => console.error('[FinancialService] refresh payment templates failed', err)
    });
  }

  refreshScholarships(): void {
    this.http.get<ScholarshipDiscount[]>(`${this.baseUrl}/scholarship-discounts`).subscribe({
      next: (schol) => this._scholarships$.next(schol),
      error: (err) => console.error('[FinancialService] refresh scholarships failed', err)
    });
  }

  refreshAll(): void {
    this.refreshFeeCategories();
    this.refreshFeeCatalog();
    this.refreshPaymentTermTemplates();
    this.refreshScholarships();
  }

  invalidateFeeCategoriesCache(): void {
    this.refreshFeeCategories();
  }

  invalidateFeeCatalogCache(): void {
    this.refreshFeeCatalog();
  }

  invalidatePaymentTemplatesCache(): void {
    this.refreshPaymentTermTemplates();
  }

  invalidateScholarshipsCache(): void {
    this.refreshScholarships();
  }
}
