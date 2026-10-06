import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
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

  private activeCampuses$?: Observable<Campus[]>;
  private allCampuses$?: Observable<Campus[]>;

  getAll(): Observable<Campus[]> {
    if (!this.allCampuses$) {
      this.allCampuses$ = this.http.get<Campus[]>(this.baseUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.allCampuses$;
  }

  getActive(): Observable<Campus[]> {
    if (!this.activeCampuses$) {
      this.activeCampuses$ = this.http.get<Campus[]>(`${this.baseUrl}/active`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.activeCampuses$;
  }

  getById(id: number): Observable<Campus> {
    return this.http.get<Campus>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateCampusRequest): Observable<Campus> {
    return this.http.post<Campus>(this.baseUrl, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: number, request: UpdateCampusRequest): Observable<Campus> {
    return this.http.put<Campus>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  toggleStatus(id: number, active: boolean): Observable<Campus> {
    return this.http.patch<Campus>(`${this.baseUrl}/${id}/status`, null, {
      params: new HttpParams().set('active', active)
    }).pipe(
      tap(() => this.invalidateCache())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  invalidateCache(): void {
    this.activeCampuses$ = undefined;
    this.allCampuses$ = undefined;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AcademicYearService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/academic-years`;

  private allAcademicYears$?: Observable<AcademicYear[]>;
  private currentAcademicYear$?: Observable<AcademicYear>;

  getAll(): Observable<AcademicYear[]> {
    if (!this.allAcademicYears$) {
      this.allAcademicYears$ = this.http.get<AcademicYear[]>(this.baseUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.allAcademicYears$;
  }

  getCurrent(): Observable<AcademicYear> {
    if (!this.currentAcademicYear$) {
      this.currentAcademicYear$ = this.http.get<AcademicYear>(`${this.baseUrl}/current`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.currentAcademicYear$;
  }

  getById(id: number): Observable<AcademicYear> {
    return this.http.get<AcademicYear>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateAcademicYearRequest): Observable<AcademicYear> {
    return this.http.post<AcademicYear>(this.baseUrl, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: number, request: UpdateAcademicYearRequest): Observable<AcademicYear> {
    return this.http.put<AcademicYear>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  setCurrent(id: number): Observable<AcademicYear> {
    return this.http.put<AcademicYear>(`${this.baseUrl}/${id}/set-current`, {}).pipe(
      tap(() => this.invalidateCache())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  invalidateCache(): void {
    this.allAcademicYears$ = undefined;
    this.currentAcademicYear$ = undefined;
  }
}

@Injectable({
  providedIn: 'root'
})
export class TermService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/terms`;

  private activeTerm$?: Observable<Term>;
  private allTerms$?: Observable<Term[]>;

  getActive(): Observable<Term> {
    if (!this.activeTerm$) {
      this.activeTerm$ = this.http.get<Term>(`${this.baseUrl}/active`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.activeTerm$;
  }

  getAll(): Observable<Term[]> {
    if (!this.allTerms$) {
      this.allTerms$ = this.http.get<Term[]>(this.baseUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.allTerms$;
  }

  getByAcademicYear(academicYearId: number): Observable<Term[]> {
    return this.http.get<Term[]>(`${this.baseUrl}/academic-year/${academicYearId}`);
  }

  getById(id: number): Observable<Term> {
    return this.http.get<Term>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTermRequest): Observable<Term> {
    return this.http.post<Term>(this.baseUrl, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  updateSchedule(id: number, request: UpdateTermScheduleRequest): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/schedule`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  activate(id: number): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/activate`, {}).pipe(
      tap(() => this.invalidateCache())
    );
  }

  toggleEnrollmentWindow(id: number, open: boolean): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/enrollment-window?open=${open}`, {}).pipe(
      tap(() => this.invalidateCache())
    );
  }

  toggleGradingWindow(id: number, open: boolean): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/grading-window?open=${open}`, {}).pipe(
      tap(() => this.invalidateCache())
    );
  }

  toggleAddDropWindow(id: number, open: boolean): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/add-drop-window?open=${open}`, {}).pipe(
      tap(() => this.invalidateCache())
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
      tap(() => this.invalidateCache())
    );
  }

  invalidateCache(): void {
    this.activeTerm$ = undefined;
    this.allTerms$ = undefined;
  }
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/departments`;

  private allDepartments$?: Observable<Department[]>;

  getAll(): Observable<Department[]> {
    if (!this.allDepartments$) {
      this.allDepartments$ = this.http.get<Department[]>(this.baseUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.allDepartments$;
  }

  getByCampus(campusId: number): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/campus/${campusId}`);
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateDepartmentRequest): Observable<Department> {
    return this.http.post<Department>(this.baseUrl, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: number, request: UpdateDepartmentRequest): Observable<Department> {
    return this.http.put<Department>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  invalidateCache(): void {
    this.allDepartments$ = undefined;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ProgramService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/programs`;

  private allPrograms$?: Observable<Program[]>;

  getAll(): Observable<Program[]> {
    if (!this.allPrograms$) {
      this.allPrograms$ = this.http.get<Program[]>(this.baseUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.allPrograms$;
  }

  getById(id: number): Observable<Program> {
    return this.http.get<Program>(`${this.baseUrl}/${id}`);
  }

  getByDepartment(deptId: number): Observable<Program[]> {
    return this.http.get<Program[]>(`${this.baseUrl}/department/${deptId}`);
  }

  create(request: CreateProgramRequest): Observable<Program> {
    return this.http.post<Program>(this.baseUrl, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: number, request: UpdateProgramRequest): Observable<Program> {
    return this.http.put<Program>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
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

  invalidateCache(): void {
    this.allPrograms$ = undefined;
  }
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/courses`;

  private activeCourses$?: Observable<Course[]>;

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
    if (!this.activeCourses$) {
      this.activeCourses$ = this.http.get<Course[]>(`${this.baseUrl}/active`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.activeCourses$;
  }

  getById(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateCourseRequest): Observable<Course> {
    return this.http.post<Course>(this.baseUrl, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: number, request: UpdateCourseRequest): Observable<Course> {
    return this.http.put<Course>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  toggleStatus(id: number, active: boolean): Observable<Course> {
    return this.http.patch<Course>(`${this.baseUrl}/${id}/status`, null, {
      params: new HttpParams().set('active', active)
    }).pipe(
      tap(() => this.invalidateCache())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  invalidateCache(): void {
    this.activeCourses$ = undefined;
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

  private allGradingScales$?: Observable<GradingScale[]>;

  getAll(): Observable<GradingScale[]> {
    if (!this.allGradingScales$) {
      this.allGradingScales$ = this.http.get<GradingScale[]>(this.baseUrl).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.allGradingScales$;
  }

  getById(id: number): Observable<GradingScale> {
    return this.http.get<GradingScale>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateGradingScaleRequest): Observable<GradingScale> {
    return this.http.post<GradingScale>(this.baseUrl, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: number, request: UpdateGradingScaleRequest): Observable<GradingScale> {
    return this.http.put<GradingScale>(`${this.baseUrl}/${id}`, request).pipe(
      tap(() => this.invalidateCache())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  invalidateCache(): void {
    this.allGradingScales$ = undefined;
  }
}

@Injectable({
  providedIn: 'root'
})
export class FinancialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1`;

  private feeCategories$?: Observable<FeeCategory[]>;
  private feeCatalog$?: Observable<FeeCatalog[]>;
  private paymentTermTemplates$?: Observable<PaymentTermTemplate[]>;
  private scholarships$?: Observable<ScholarshipDiscount[]>;

  // Fee Categories
  getFeeCategories(): Observable<FeeCategory[]> {
    if (!this.feeCategories$) {
      this.feeCategories$ = this.http.get<FeeCategory[]>(`${this.baseUrl}/fee-categories`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.feeCategories$;
  }

  createFeeCategory(request: CreateFeeCategoryRequest): Observable<FeeCategory> {
    return this.http.post<FeeCategory>(`${this.baseUrl}/fee-categories`, request).pipe(
      tap(() => this.invalidateFeeCategoriesCache())
    );
  }

  updateFeeCategory(id: number, request: { name: string }): Observable<FeeCategory> {
    return this.http.put<FeeCategory>(`${this.baseUrl}/fee-categories/${id}`, request).pipe(
      tap(() => this.invalidateFeeCategoriesCache())
    );
  }

  deleteFeeCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/fee-categories/${id}`).pipe(
      tap(() => this.invalidateFeeCategoriesCache())
    );
  }

  // Fee Catalog
  getFeeCatalog(): Observable<FeeCatalog[]> {
    if (!this.feeCatalog$) {
      this.feeCatalog$ = this.http.get<FeeCatalog[]>(`${this.baseUrl}/fee-catalog`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.feeCatalog$;
  }

  getFeeCatalogByCategory(categoryId: number): Observable<FeeCatalog[]> {
    return this.http.get<FeeCatalog[]>(`${this.baseUrl}/fee-catalog/category/${categoryId}`);
  }

  createFeeCatalog(request: CreateFeeCatalogRequest): Observable<FeeCatalog> {
    return this.http.post<FeeCatalog>(`${this.baseUrl}/fee-catalog`, request).pipe(
      tap(() => this.invalidateFeeCatalogCache())
    );
  }

  updateFeeCatalog(id: number, request: { name: string; defaultAmount: number; isPerUnit: boolean }): Observable<FeeCatalog> {
    return this.http.put<FeeCatalog>(`${this.baseUrl}/fee-catalog/${id}`, request).pipe(
      tap(() => this.invalidateFeeCatalogCache())
    );
  }

  deleteFeeCatalog(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/fee-catalog/${id}`).pipe(
      tap(() => this.invalidateFeeCatalogCache())
    );
  }

  // Payment Term Templates
  getPaymentTermTemplates(): Observable<PaymentTermTemplate[]> {
    if (!this.paymentTermTemplates$) {
      this.paymentTermTemplates$ = this.http.get<PaymentTermTemplate[]>(`${this.baseUrl}/payment-term-templates`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.paymentTermTemplates$;
  }

  createPaymentTermTemplate(request: CreatePaymentTermTemplateRequest): Observable<PaymentTermTemplate> {
    return this.http.post<PaymentTermTemplate>(`${this.baseUrl}/payment-term-templates`, request).pipe(
      tap(() => this.invalidatePaymentTemplatesCache())
    );
  }

  deletePaymentTermTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/payment-term-templates/${id}`).pipe(
      tap(() => this.invalidatePaymentTemplatesCache())
    );
  }

  // Scholarship Discounts
  getScholarships(): Observable<ScholarshipDiscount[]> {
    if (!this.scholarships$) {
      this.scholarships$ = this.http.get<ScholarshipDiscount[]>(`${this.baseUrl}/scholarship-discounts`).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.scholarships$;
  }

  createScholarship(request: CreateScholarshipDiscountRequest): Observable<ScholarshipDiscount> {
    return this.http.post<ScholarshipDiscount>(`${this.baseUrl}/scholarship-discounts`, request).pipe(
      tap(() => this.invalidateScholarshipsCache())
    );
  }

  deleteScholarship(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/scholarship-discounts/${id}`).pipe(
      tap(() => this.invalidateScholarshipsCache())
    );
  }

  invalidateFeeCategoriesCache(): void {
    this.feeCategories$ = undefined;
  }

  invalidateFeeCatalogCache(): void {
    this.feeCatalog$ = undefined;
  }

  invalidatePaymentTemplatesCache(): void {
    this.paymentTermTemplates$ = undefined;
  }

  invalidateScholarshipsCache(): void {
    this.scholarships$ = undefined;
  }
}
