import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GradeChangeRequestService } from './grade-change-request.service';

describe('GradeChangeRequestService — No Duplicate HTTP Call', () => {
  let service: GradeChangeRequestService;
  let httpMock: HttpTestingController;

  const URL = '/api/v1/grades/change-requests/pending';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GradeChangeRequestService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(GradeChangeRequestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should call GET /pending exactly ONCE on initialize() — not twice', () => {
    service.initialize();

    // Exactly ONE request
    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    // No additional requests
    httpMock.verify(); // would throw if any extra request exists
  });

  it('should NOT call again when initialize() is called a second time', () => {
    service.initialize();
    httpMock.expectOne(URL).flush([]);

    // Second call — must be a no-op
    service.initialize();
    httpMock.expectNone(URL);
  });

  it('should handle 403 Forbidden without crashing', () => {
    expect(() => {
      service.initialize();
      httpMock.expectOne(URL).flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' }
      );
    }).not.toThrow();

    expect(service.error).toContain('permission');
  });

  it('should emit pending requests to pending$ after successful load', () => {
    const MOCK = [
      { id: 1, status: 'PENDING', facultyName: 'Dr. Santos' },
      { id: 2, status: 'PENDING', facultyName: 'Prof. Cruz' }
    ];

    let emitted: any[] = [];
    service.pending$.subscribe(data => emitted = data);

    service.initialize();
    httpMock.expectOne(URL).flush(MOCK);

    expect(emitted.length).toBe(2);
  });

  it('should filter by termId when termId is provided', () => {
    service.initialize(11);

    const req = httpMock.expectOne(`${URL}?termId=11`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
