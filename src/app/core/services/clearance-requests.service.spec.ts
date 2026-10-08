import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClearanceRequestsService } from './clearance-requests.service';
import { TermService } from './institution.service';
import { WebSocketService } from './websocket.service';

describe('ClearanceRequestsService — Dynamic Parameters', () => {
  let service: ClearanceRequestsService;
  let httpMock: HttpTestingController;
  let termSubject$: BehaviorSubject<any>;
  let wsMessages$: Subject<unknown>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    termSubject$ = new BehaviorSubject<any>(null);
    wsMessages$ = new Subject();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ClearanceRequestsService,
        {
          provide: TermService,
          useValue: {
            activeTerm$: termSubject$.asObservable()
          }
        },
        {
          provide: WebSocketService,
          useValue: {
            watch: vi.fn().mockReturnValue(wsMessages$.asObservable())
          }
        }
      ]
    });

    service = TestBed.inject(ClearanceRequestsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  // 1. Core: Dynamic URL construction
  it('should use dynamic studentId in URL — NOT hardcoded 10', () => {
    service.initializeForStudent(15); // different from 10
    termSubject$.next({ id: 11 });

    // Must NOT call /student/10/term/...
    httpMock.expectNone('/api/v1/clearance/requests/student/10/term/11');

    // MUST call with the correct studentId
    const req = httpMock.expectOne('/api/v1/clearance/requests/student/15/term/11');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should use dynamic termId from active term — NOT hardcoded 10', () => {
    service.initializeForStudent(10);
    termSubject$.next({ id: 11 }); // active term is 11, not 10

    // Must NOT call /term/10
    httpMock.expectNone('/api/v1/clearance/requests/student/10/term/10');

    // MUST call with the active term ID
    const req = httpMock.expectOne('/api/v1/clearance/requests/student/10/term/11');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should build correct URL for any studentId and termId combination', () => {
    const cases = [
      { studentId: 1, termId: 5 },
      { studentId: 42, termId: 11 },
      { studentId: 99, termId: 3 }
    ];

    for (const { studentId, termId } of cases) {
      // Reset
      service['currentStudentId'] = null;
      service['subs'].unsubscribe();
      service['subs'] = new Subscription();
      termSubject$.next(null);

      service.initializeForStudent(studentId);
      termSubject$.next({ id: termId });

      const req = httpMock.expectOne(
        `/api/v1/clearance/requests/student/${studentId}/term/${termId}`
      );
      expect(req.request.method).toBe('GET');
      req.flush([]);
    }
  });

  // 2. Guard: reject invalid IDs
  it('should NOT make HTTP call when studentId is 0', () => {
    service.initializeForStudent(0);
    termSubject$.next({ id: 11 });
    httpMock.expectNone('/api/v1/clearance/requests/student/0/term/11');
  });

  it('should NOT make HTTP call when studentId is negative', () => {
    service.initializeForStudent(-5);
    termSubject$.next({ id: 11 });
    httpMock.expectNone('/api/v1/clearance/requests/student/-5/term/11');
  });

  it('should NOT make HTTP call when studentId is NaN', () => {
    service.initializeForStudent(NaN);
    termSubject$.next({ id: 11 });
    httpMock.expectNone((req) => req.url.includes('clearance/requests'));
  });

  // 3. Re-fetch on term change
  it('should re-fetch with new termId when active term changes', () => {
    service.initializeForStudent(10);

    // Term 11 becomes active
    termSubject$.next({ id: 11 });
    httpMock.expectOne('/api/v1/clearance/requests/student/10/term/11').flush([]);

    // Term changes to 12
    termSubject$.next({ id: 12 });
    httpMock.expectOne('/api/v1/clearance/requests/student/10/term/12').flush([]);

    // Verify no calls were made with old termId 10
    httpMock.expectNone('/api/v1/clearance/requests/student/10/term/10');
  });

  it('should NOT re-fetch if same term emits again', () => {
    service.initializeForStudent(10);
    termSubject$.next({ id: 11 });
    httpMock.expectOne('/api/v1/clearance/requests/student/10/term/11').flush([]);

    // Same term emits again — distinctUntilChanged must block re-fetch
    termSubject$.next({ id: 11 });
    httpMock.expectNone('/api/v1/clearance/requests/student/10/term/11');
  });

  // 4. No duplicate subscriptions
  it('should not duplicate HTTP calls when initializeForStudent called twice for same student', () => {
    service.initializeForStudent(10);
    termSubject$.next({ id: 11 });
    httpMock.expectOne('/api/v1/clearance/requests/student/10/term/11').flush([]);

    // Second call with same ID — must be a no-op
    service.initializeForStudent(10);
    httpMock.expectNone('/api/v1/clearance/requests/student/10/term/11');
  });

  it('should switch to new student when studentId changes', () => {
    // First student
    service.initializeForStudent(10);
    termSubject$.next({ id: 11 });
    httpMock.expectOne('/api/v1/clearance/requests/student/10/term/11').flush([]);

    // Navigate to different student (REGISTRAR use case)
    service.initializeForStudent(15);
    // Must fetch new student — NOT old student
    httpMock.expectNone('/api/v1/clearance/requests/student/10/term/11');
    const req = httpMock.expectOne('/api/v1/clearance/requests/student/15/term/11');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  // 5. State management
  it('should emit fetched data to requests$', () => {
    const MOCK = [{ id: 1, status: 'PENDING' }, { id: 2, status: 'APPROVED' }];
    let emitted: any[] | null = null;
    service.requests$.subscribe((r) => (emitted = r));

    service.initializeForStudent(10);
    termSubject$.next({ id: 11 });
    httpMock.expectOne('/api/v1/clearance/requests/student/10/term/11').flush(MOCK);

    expect(emitted).toEqual(MOCK);
    expect(emitted!.length).toBe(2);
  });

  // 6. Memory safety
  it('should unsubscribe all streams on destroy', () => {
    service.initializeForStudent(10);
    termSubject$.next({ id: 11 });
    httpMock.expectOne('/api/v1/clearance/requests/student/10/term/11').flush([]);

    service.ngOnDestroy();
    expect(wsMessages$.observed).toBe(false);
  });
});
