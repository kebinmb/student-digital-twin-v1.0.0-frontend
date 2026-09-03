import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
  Term,
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
export class AcademicYearService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/academic-years`;

  getAll(): Observable<AcademicYear[]> {
    return this.http.get<AcademicYear[]>(this.baseUrl);
  }

  getCurrent(): Observable<AcademicYear> {
    return this.http.get<AcademicYear>(`${this.baseUrl}/current`);
  }

  getById(id: number): Observable<AcademicYear> {
    return this.http.get<AcademicYear>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateAcademicYearRequest): Observable<AcademicYear> {
    return this.http.post<AcademicYear>(this.baseUrl, request);
  }

  update(id: number, request: UpdateAcademicYearRequest): Observable<AcademicYear> {
    return this.http.put<AcademicYear>(`${this.baseUrl}/${id}`, request);
  }

  setCurrent(id: number): Observable<AcademicYear> {
    return this.http.put<AcademicYear>(`${this.baseUrl}/${id}/set-current`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class TermService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/terms`;

  getByAcademicYear(academicYearId: number): Observable<Term[]> {
    return this.http.get<Term[]>(`${this.baseUrl}/academic-year/${academicYearId}`);
  }

  getById(id: number): Observable<Term> {
    return this.http.get<Term>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTermRequest): Observable<Term> {
    return this.http.post<Term>(this.baseUrl, request);
  }

  updateSchedule(id: number, request: UpdateTermScheduleRequest): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/schedule`, request);
  }

  activate(id: number): Observable<Term> {
    return this.http.put<Term>(`${this.baseUrl}/${id}/activate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class CampusService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/campuses`;

  getAll(): Observable<Campus[]> {
    return this.http.get<Campus[]>(this.baseUrl);
  }

  getActive(): Observable<Campus[]> {
    return this.http.get<Campus[]>(`${this.baseUrl}/active`);
  }

  getById(id: number): Observable<Campus> {
    return this.http.get<Campus>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateCampusRequest): Observable<Campus> {
    return this.http.post<Campus>(this.baseUrl, request);
  }

  update(id: number, request: UpdateCampusRequest): Observable<Campus> {
    return this.http.put<Campus>(`${this.baseUrl}/${id}`, request);
  }

  toggleStatus(id: number, active: boolean): Observable<Campus> {
    return this.http.patch<Campus>(`${this.baseUrl}/${id}/status`, null, {
      params: new HttpParams().set('active', active)
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/departments`;

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.baseUrl);
  }

  getByCampus(campusId: number): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/campus/${campusId}`);
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateDepartmentRequest): Observable<Department> {
    return this.http.post<Department>(this.baseUrl, request);
  }

  update(id: number, request: UpdateDepartmentRequest): Observable<Department> {
    return this.http.put<Department>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class ProgramService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/programs`;

  getAll(): Observable<Program[]> {
    return this.http.get<Program[]>(this.baseUrl);
  }

  getById(id: number): Observable<Program> {
    return this.http.get<Program>(`${this.baseUrl}/${id}`);
  }

  getByDepartment(deptId: number): Observable<Program[]> {
    return this.http.get<Program[]>(`${this.baseUrl}/department/${deptId}`);
  }

  create(request: CreateProgramRequest): Observable<Program> {
    return this.http.post<Program>(this.baseUrl, request);
  }

  update(id: number, request: UpdateProgramRequest): Observable<Program> {
    return this.http.put<Program>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
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
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/courses`;

  search(search?: string, page = 0, size = 20): Observable<Page<Course>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Page<Course>>(`${this.baseUrl}/search`, { params });
  }

  getAllActive(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.baseUrl}/active`);
  }

  getById(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateCourseRequest): Observable<Course> {
    return this.http.post<Course>(this.baseUrl, request);
  }

  update(id: number, request: UpdateCourseRequest): Observable<Course> {
    return this.http.put<Course>(`${this.baseUrl}/${id}`, request);
  }

  toggleStatus(id: number, active: boolean): Observable<Course> {
    return this.http.patch<Course>(`${this.baseUrl}/${id}/status`, null, {
      params: new HttpParams().set('active', active)
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
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

  update(courseIdOrId: number, idOrReq: any, maybeReq?: any): Observable<CourseOutcome> {
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

  getAll(): Observable<GradingScale[]> {
    return this.http.get<GradingScale[]>(this.baseUrl);
  }

  getById(id: number): Observable<GradingScale> {
    return this.http.get<GradingScale>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateGradingScaleRequest): Observable<GradingScale> {
    return this.http.post<GradingScale>(this.baseUrl, request);
  }

  update(id: number, request: UpdateGradingScaleRequest): Observable<GradingScale> {
    return this.http.put<GradingScale>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class FinancialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1`;

  // Fee Categories
  getFeeCategories(): Observable<FeeCategory[]> {
    return this.http.get<FeeCategory[]>(`${this.baseUrl}/fee-categories`);
  }

  createFeeCategory(request: CreateFeeCategoryRequest): Observable<FeeCategory> {
    return this.http.post<FeeCategory>(`${this.baseUrl}/fee-categories`, request);
  }

  updateFeeCategory(id: number, request: { name: string }): Observable<FeeCategory> {
    return this.http.put<FeeCategory>(`${this.baseUrl}/fee-categories/${id}`, request);
  }

  deleteFeeCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/fee-categories/${id}`);
  }

  // Fee Catalog
  getFeeCatalog(): Observable<FeeCatalog[]> {
    return this.http.get<FeeCatalog[]>(`${this.baseUrl}/fee-catalog`);
  }

  getFeeCatalogByCategory(categoryId: number): Observable<FeeCatalog[]> {
    return this.http.get<FeeCatalog[]>(`${this.baseUrl}/fee-catalog/category/${categoryId}`);
  }

  createFeeCatalog(request: CreateFeeCatalogRequest): Observable<FeeCatalog> {
    return this.http.post<FeeCatalog>(`${this.baseUrl}/fee-catalog`, request);
  }

  updateFeeCatalog(id: number, request: { name: string; defaultAmount: number; isPerUnit: boolean }): Observable<FeeCatalog> {
    return this.http.put<FeeCatalog>(`${this.baseUrl}/fee-catalog/${id}`, request);
  }

  deleteFeeCatalog(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/fee-catalog/${id}`);
  }

  // Payment Term Templates
  getPaymentTermTemplates(): Observable<PaymentTermTemplate[]> {
    return this.http.get<PaymentTermTemplate[]>(`${this.baseUrl}/payment-term-templates`);
  }

  createPaymentTermTemplate(request: CreatePaymentTermTemplateRequest): Observable<PaymentTermTemplate> {
    return this.http.post<PaymentTermTemplate>(`${this.baseUrl}/payment-term-templates`, request);
  }

  deletePaymentTermTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/payment-term-templates/${id}`);
  }

  // Scholarship Discounts
  getScholarships(): Observable<ScholarshipDiscount[]> {
    return this.http.get<ScholarshipDiscount[]>(`${this.baseUrl}/scholarship-discounts`);
  }

  createScholarship(request: CreateScholarshipDiscountRequest): Observable<ScholarshipDiscount> {
    return this.http.post<ScholarshipDiscount>(`${this.baseUrl}/scholarship-discounts`, request);
  }

  deleteScholarship(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/scholarship-discounts/${id}`);
  }
}
