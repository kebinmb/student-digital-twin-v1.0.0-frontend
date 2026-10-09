import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CashierDashboardService } from './cashier-dashboard.service';
import { TermService } from './institution.service';

describe('CashierDashboardService — Coordination & Dynamic Term/Student Parameters', () => {
  let service: CashierDashboardService;
  let httpMock: HttpTestingController;
  let termSubject$: BehaviorSubject<any>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    termSubject$ = new BehaviorSubject<any>(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CashierDashboardService,
        {
          provide: TermService,
          useValue: {
            activeTerm$: termSubject$.asObservable()
          }
        }
      ]
    });

    service = TestBed.inject(CashierDashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should load sections with dynamic termId from TermService', () => {
    service.initialize();

    // Flush reference data
    const curriculaReq = httpMock.expectOne('/api/v1/curricula/lookup');
    expect(curriculaReq.request.method).toBe('GET');
    curriculaReq.flush([{ id: 1, name: 'BSIT' }]);

    const campusesReq = httpMock.expectOne('/api/v1/campuses');
    expect(campusesReq.request.method).toBe('GET');
    campusesReq.flush([{ id: 1, name: 'Main Campus' }]);

    // Emit active term 10
    termSubject$.next({ id: 10, termType: 'FIRST_SEMESTER' });

    // Expect dynamic termId in section URL
    const secReq = httpMock.expectOne('/api/v1/scheduling/sections/term/10');
    expect(secReq.request.method).toBe('GET');
    secReq.flush([{ id: 101, sectionCode: 'IT1A' }]);

    const claimReq = httpMock.expectOne('/api/v1/finance/unifast/claims/term/10');
    expect(claimReq.request.method).toBe('GET');
    claimReq.flush([{ id: 201, claimBatchNumber: 'BATCH-1' }]);

    expect(service.sections().length).toBe(1);
    expect(service.sections()[0].id).toBe(101);
    expect(service.currentTermId()).toBe(10);
  });

  it('should NOT load enrollment on initialization', () => {
    service.initialize();

    // Flush reference data
    const curriculaReq = httpMock.expectOne('/api/v1/curricula/lookup');
    curriculaReq.flush([]);

    const campusesReq = httpMock.expectOne('/api/v1/campuses');
    campusesReq.flush([]);

    // Emit active term
    termSubject$.next({ id: 10 });

    const secReq = httpMock.expectOne('/api/v1/scheduling/sections/term/10');
    secReq.flush([]);

    const claimReq = httpMock.expectOne('/api/v1/finance/unifast/claims/term/10');
    claimReq.flush([]);

    // Assert that NO enrollment endpoint is called
    httpMock.expectNone((req) => req.url.includes('/enrollment'));
    expect(service.loadingEnrollment()).toBe(false);
  });

  it('should load enrollment with dynamic studentId when student is selected', () => {
    // Demand-driven: called explicitly when user selects a student
    const studentId = 42;
    const termId = 10;

    service.loadEnrollmentForStudent(studentId, termId).subscribe((res) => {
      expect(res.enrollmentId).toBe(999);
      expect(res.studentId).toBe(42);
    });

    const req = httpMock.expectOne(`/api/v1/enrollment/student/${studentId}/term/${termId}`);
    expect(req.request.method).toBe('GET');
    req.flush({ enrollmentId: 999, studentId: 42, termId: 10, status: 'ENROLLED' });

    expect(service.loadingEnrollment()).toBe(false);
  });

  it('should update sections when term changes', () => {
    service.initialize();

    // Reference data
    httpMock.expectOne('/api/v1/curricula/lookup').flush([]);
    httpMock.expectOne('/api/v1/campuses').flush([]);

    // Term 10
    termSubject$.next({ id: 10 });
    httpMock.expectOne('/api/v1/scheduling/sections/term/10').flush([{ id: 101, sectionCode: 'SEC-10' }]);
    httpMock.expectOne('/api/v1/finance/unifast/claims/term/10').flush([]);

    expect(service.sections()[0].sectionCode).toBe('SEC-10');

    // Term changed to 11
    termSubject$.next({ id: 11 });
    httpMock.expectOne('/api/v1/scheduling/sections/term/11').flush([{ id: 102, sectionCode: 'SEC-11' }]);
    httpMock.expectOne('/api/v1/finance/unifast/claims/term/11').flush([]);

    expect(service.currentTermId()).toBe(11);
    expect(service.sections()[0].sectionCode).toBe('SEC-11');
  });

  it('should coordinate term resolution with TermService', () => {
    service.initialize();

    // Reference data is loaded immediately
    httpMock.expectOne('/api/v1/curricula/lookup').flush([]);
    httpMock.expectOne('/api/v1/campuses').flush([]);

    // Before TermService emits a valid term, no term-dependent requests are made
    httpMock.expectNone((req) => req.url.includes('/scheduling/sections/term'));
    httpMock.expectNone((req) => req.url.includes('/finance/unifast/claims/term'));

    // Emit null term -> still no requests
    termSubject$.next(null);
    httpMock.expectNone((req) => req.url.includes('/scheduling/sections/term'));
    httpMock.expectNone((req) => req.url.includes('/finance/unifast/claims/term'));

    // Now TermService emits resolved term 25
    termSubject$.next({ id: 25 });

    const secReq = httpMock.expectOne('/api/v1/scheduling/sections/term/25');
    const claimReq = httpMock.expectOne('/api/v1/finance/unifast/claims/term/25');
    expect(secReq.request.method).toBe('GET');
    expect(claimReq.request.method).toBe('GET');

    secReq.flush([]);
    claimReq.flush([]);

    expect(service.currentTermId()).toBe(25);
  });
});
