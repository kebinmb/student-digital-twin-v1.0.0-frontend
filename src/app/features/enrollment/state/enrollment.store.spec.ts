import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EnrollmentStore } from './enrollment.store';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { TermService } from '../../../core/services/institution.service';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { WS_TOPICS } from '../../../core/constants/websocket-topics.constants';
import { TermResponse } from '../../../core/models/institution.model';
import { StudentProfileResponse, AdvisingEligibilityResponse, StudentEnrollmentResponse } from '../../../core/models/enrollment.model';

describe('EnrollmentStore WebSocket Reactivity', () => {
  let store: EnrollmentStore;
  let mockEnrollmentApi: any;
  let mockTermService: any;
  let mockAuthService: any;
  let mockWsService: any;

  let activeTermWs$: Subject<any>;
  let adminEnrollmentsWs$: Subject<any>;
  let studentEnrollmentWs$: Subject<any>;
  let activeTermService$: BehaviorSubject<any>;
  let allTermsService$: BehaviorSubject<any>;

  beforeEach(() => {
    activeTermWs$ = new Subject<any>();
    adminEnrollmentsWs$ = new Subject<any>();
    studentEnrollmentWs$ = new Subject<any>();
    activeTermService$ = new BehaviorSubject<any>(null);
    allTermsService$ = new BehaviorSubject<any>([]);

    mockWsService = {
      watch: vi.fn((topic: string) => {
        if (topic === WS_TOPICS.ACTIVE_TERM) return activeTermWs$;
        if (topic === WS_TOPICS.ADMIN_ENROLLMENTS) return adminEnrollmentsWs$;
        if (topic.startsWith('/topic/enrollment.')) return studentEnrollmentWs$;
        return of(null);
      })
    };

    mockEnrollmentApi = {
      getCurrentStudentProfile: vi.fn().mockReturnValue(of({
        id: 42,
        studentNumber: '2026-IT-0001',
        username: 'student_john',
        programCode: 'BSIT',
        yearLevel: 1,
        enrollmentStatus: 'REGULAR'
      } as StudentProfileResponse)),
      searchStudents: vi.fn().mockReturnValue(of([])),
      getAdvisingEligibility: vi.fn().mockReturnValue(of({
        studentId: 42,
        studentNumber: '2026-IT-0001',
        studentName: 'John Doe',
        programCode: 'BSIT',
        programName: 'BS Information Technology',
        curriculumCode: 'BSIT-2026',
        yearLevel: 1,
        isGraduating: false,
        totalUnitsEarned: 0,
        currentYearLevel: 1,
        maxAllowedUnits: 24,
        currentEnrolledUnits: 0,
        enrollmentStatus: 'REGULAR',
        courses: []
      } as unknown as AdvisingEligibilityResponse)),
      getEnrollment: vi.fn().mockReturnValue(of({
        enrollmentId: 100,
        studentId: 42,
        studentNumber: '2026-IT-0001',
        termId: 11,
        termName: 'AY 2026-2027 - 1st Semester',
        status: 'ENLISTED',
        totalCreditUnits: 3,
        enrollmentDate: new Date().toISOString(),
        isOverloadApproved: false,
        items: []
      } as unknown as StudentEnrollmentResponse)),
      getEnrollmentsByTerm: vi.fn().mockReturnValue(of([]))
    };

    mockTermService = {
      getAll: vi.fn().mockReturnValue(of([
        {
          id: 11,
          academicYearId: 1,
          academicYearCode: 'AY 2026-2027',
          termType: 'FIRST_SEM',
          termName: 'AY 2026-2027 - 1st Semester',
          startDate: '2026-08-01',
          endDate: '2026-12-15',
          isActive: true,
          isCurrent: true,
          enrollmentOpen: false,
          gradingOpen: false,
          addDropOpen: false
        } as TermResponse
      ])),
      activeTerm$: activeTermService$.asObservable(),
      allTerms$: allTermsService$.asObservable()
    };

    mockAuthService = {
      hasRole: vi.fn((role: string) => role === 'STUDENT'),
      hasAnyRole: vi.fn((roles: string[]) => roles.includes('STUDENT'))
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EnrollmentStore,
        { provide: EnrollmentApiService, useValue: mockEnrollmentApi },
        { provide: TermService, useValue: mockTermService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: WebSocketService, useValue: mockWsService }
      ]
    });

    store = TestBed.inject(EnrollmentStore);
  });

  it('should initialize and subscribe to student WebSocket topic on loadInitialData for STUDENT role', () => {
    store.loadInitialData();

    expect(mockEnrollmentApi.getCurrentStudentProfile).toHaveBeenCalled();
    expect(store.studentId()).toBe(42);

    // Verify WebSocket subscription on /topic/enrollment.42 was established
    expect(mockWsService.watch).toHaveBeenCalledWith(WS_TOPICS.ENROLLMENT(42));
    expect(mockWsService.watch).not.toHaveBeenCalledWith('/topic/enrollment.null');
    expect(mockWsService.watch).not.toHaveBeenCalledWith('/topic/enrollment.0');
  });

  it('should guard setStudentId to never subscribe to invalid IDs like null, 0, or negative', () => {
    mockWsService.watch.mockClear();

    store.setStudentId(null);
    expect(store.studentId()).toBeNull();
    expect(mockWsService.watch).not.toHaveBeenCalled();

    store.setStudentId(0);
    expect(store.studentId()).toBeNull();
    expect(mockWsService.watch).not.toHaveBeenCalled();

    store.setStudentId(-1);
    expect(store.studentId()).toBeNull();
    expect(mockWsService.watch).not.toHaveBeenCalled();
  });

  it('should reactively update isEnrollmentClosed and refresh advising when active term flags mutate via WebSocket', () => {
    // Initial term state is closed
    store.loadInitialData();
    expect(store.isEnrollmentClosed()).toBe(true);

    const loadAdvisingSpy = vi.spyOn(store, 'loadStudentAdvising');

    // Admin opens enrollment window over WebSocket broadcast
    activeTermWs$.next({
      id: 11,
      academicYearId: 1,
      academicYearCode: 'AY 2026-2027',
      termType: 'FIRST_SEM',
      enrollmentOpen: true,
      gradingOpen: false,
      addDropOpen: false
    });

    // Real-time update check: enrollment is now open without page reload!
    expect(store.isEnrollmentClosed()).toBe(false);
    expect(store.selectedTerm()?.enrollmentOpen).toBe(true);
    expect(loadAdvisingSpy).toHaveBeenCalledWith(42, 11);
  });

  it('should refresh advising and enrollment when student WebSocket topic receives an update', () => {
    store.loadInitialData();
    const loadAdvisingSpy = vi.spyOn(store, 'loadStudentAdvising');

    // WebSocket notification arrives on student enrollment topic
    studentEnrollmentWs$.next({
      enrollmentId: 100,
      studentProfileId: 42,
      termId: 11,
      enrollmentStatus: 'ENROLLED',
      remarks: 'Confirmed',
      updatedAt: new Date().toISOString()
    });

    expect(loadAdvisingSpy).toHaveBeenCalledWith(42, 11);
  });

  it('should reload enrollments when ADMIN_ENROLLMENTS topic broadcasts', () => {
    store.selectedTermId.set(11);
    const loadTermEnrollmentsSpy = vi.spyOn(store, 'loadTermEnrollments');

    adminEnrollmentsWs$.next({
      enrollmentId: 200,
      studentProfileId: 50,
      termId: 11,
      enrollmentStatus: 'ENROLLED'
    });

    expect(loadTermEnrollmentsSpy).toHaveBeenCalledWith(11);
  });
});
