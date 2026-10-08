import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageService } from 'primeng/api';

import { ClearanceComponent } from './student-clearance.component';
import { ClearanceRequestsService } from '../../../core/services/clearance-requests.service';
import { ClearanceService } from '../../../core/services/clearance.service';
import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { TermService } from '../../../core/services/institution.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';

describe('[ClearanceComponent] — Dynamic studentId and termId', () => {
  let fixture: ComponentFixture<ClearanceComponent>;
  let requests$: BehaviorSubject<any[]>;
  let initSpy: any;

  const MOCK_REQUESTS = [
    { id: 1, studentId: 15, termId: 11, status: 'PENDING', department: 'Finance' },
    { id: 2, studentId: 15, termId: 11, status: 'APPROVED', department: 'Library' }
  ];

  beforeEach(() => {
    requests$ = new BehaviorSubject<any[]>([]);
    initSpy = vi.fn();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  async function createTestComponent(authMock?: any, routeMock?: any) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ClearanceComponent],
      providers: [
        {
          provide: ClearanceRequestsService,
          useValue: {
            requests$: requests$.asObservable(),
            initializeForStudent: initSpy
          }
        },
        {
          provide: ClearanceService,
          useValue: {
            clearanceRequest$: of(null),
            currentClearance: () => null,
            initializeForStudent: vi.fn(),
            refresh: vi.fn()
          }
        },
        {
          provide: ComplianceApiService,
          useValue: {
            getClearanceByStudentAndTerm: vi.fn().mockReturnValue(of(null)),
            getClearanceStudentSuggestions: vi.fn().mockReturnValue(of([]))
          }
        },
        {
          provide: AuthService,
          useValue: authMock || {
            currentUser: () => ({ studentId: 15, role: 'STUDENT' }),
            currentUser$: of({ studentId: 15, role: 'STUDENT' }),
            hasRole: (r: string) => r === 'STUDENT'
          }
        },
        {
          provide: ActivatedRoute,
          useValue: routeMock || {
            snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } }
          }
        },
        {
          provide: TermService,
          useValue: {
            activeTerm$: of({ id: 11, name: 'Term 11' }),
            getActive: vi.fn().mockReturnValue(of({ id: 11, name: 'Term 11' }))
          }
        },
        {
          provide: EnrollmentApiService,
          useValue: {
            getCurrentStudentProfile: vi.fn().mockReturnValue(of({ id: 15, studentNumber: '2026-0015' }))
          }
        },
        {
          provide: AcademicPeriodStore,
          useValue: {
            selectedTermId: () => 11,
            selectedTerm: () => ({ id: 11, name: 'Term 11' }),
            activeTerm: () => ({ id: 11, name: 'Term 11' })
          }
        },
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClearanceComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should call initializeForStudent with authenticated studentId (15, not hardcoded 10)', async () => {
    await createTestComponent();
    expect(initSpy).toHaveBeenCalledWith(15); // authenticated user's ID
    expect(initSpy).not.toHaveBeenCalledWith(10); // must NOT use hardcoded 10
  });

  it('should display fetched clearance requests', async () => {
    await createTestComponent();
    requests$.next(MOCK_REQUESTS);
    fixture.detectChanges();
    expect(fixture.componentInstance.clearanceRequests.length).toBe(2);
  });

  it('should update display when WS push changes requests$', async () => {
    await createTestComponent();
    requests$.next(MOCK_REQUESTS);
    fixture.detectChanges();
    expect(fixture.componentInstance.clearanceRequests.length).toBe(2);

    // Admin approves a third — WS push
    requests$.next([...MOCK_REQUESTS, { id: 3, status: 'APPROVED', department: 'Registrar' }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.clearanceRequests.length).toBe(3);
  });

  it('should use route param studentId for REGISTRAR role, not own studentId', async () => {
    // Simulate REGISTRAR viewing student 42's clearance via route param
    await createTestComponent(
      {
        currentUser: () => ({ studentId: 8, role: 'REGISTRAR' }), // registrar's own ID
        currentUser$: of({ studentId: 8, role: 'REGISTRAR' }),
        hasRole: (r: string) => r === 'REGISTRAR'
      },
      {
        snapshot: { paramMap: { get: () => '42' }, queryParamMap: { get: () => null } }
      }
    );

    // Must use route param (42), not registrar's own studentId (8), not hardcoded (10)
    expect(initSpy).toHaveBeenCalledWith(42);
    expect(initSpy).not.toHaveBeenCalledWith(8);
    expect(initSpy).not.toHaveBeenCalledWith(10);
  });
});
