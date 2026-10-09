import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnalyticsApiService } from './analytics-api.service';
import { environment } from '../../../../environments/environment';

describe('AnalyticsApiService — acknowledgeIntervention()', () => {
  let service: AnalyticsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AnalyticsApiService
      ]
    });
    service = TestBed.inject(AnalyticsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── Dynamic ID ───────────────────────────────────────────────────────────

  it('should use dynamic interventionId in URL — NOT hardcoded 1', () => {
    service.acknowledgeIntervention(42, 'I acknowledge.').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/v1/student/telemetry/interventions/42/acknowledge`
    );
    expect(req.request.method).toBe('POST');
    req.flush({});

    // Must NOT have called the hardcoded URL
    httpMock.expectNone(`${environment.apiUrl}/v1/student/telemetry/interventions/1/acknowledge`);
  });

  it('should build correct URL for any interventionId', () => {
    [5, 17, 100, 9999].forEach(id => {
      service.acknowledgeIntervention(id, '').subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/v1/student/telemetry/interventions/${id}/acknowledge`
      );
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  // ─── Request body ─────────────────────────────────────────────────────────

  it('should include student response in request body', () => {
    const response = 'I have reviewed this feedback and will improve.';
    service.acknowledgeIntervention(10, response).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/v1/student/telemetry/interventions/10/acknowledge`
    );
    expect(req.request.body.response).toBe(response);
    req.flush({});
  });

  it('should send empty response when no text provided', () => {
    service.acknowledgeIntervention(10, '').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/v1/student/telemetry/interventions/10/acknowledge`
    );
    expect(req.request.body).toBeDefined();
    expect(req.request.body.response).toBe('');
    req.flush({});
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it('should handle 409 Conflict gracefully (already acknowledged)', () => new Promise<void>((done) => {
    service.acknowledgeIntervention(10, 'response').subscribe({
      next: result => {
        // 409 treated as success (idempotent)
        expect((result as any).alreadyAcknowledged).toBe(true);
        done();
      }
    });

    httpMock.expectOne(
      `${environment.apiUrl}/v1/student/telemetry/interventions/10/acknowledge`
    ).flush(
      { message: 'Already acknowledged' },
      { status: 409, statusText: 'Conflict' }
    );
  }));

  it('should propagate non-409 errors to caller', () => new Promise<void>((done) => {
    service.acknowledgeIntervention(10, 'response').subscribe({
      error: err => {
        expect(err.status).toBe(500);
        done();
      }
    });

    httpMock.expectOne(
      `${environment.apiUrl}/v1/student/telemetry/interventions/10/acknowledge`
    ).flush(
      { message: 'Server error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
  }));

  // ─── Guard: invalid ID ────────────────────────────────────────────────────

  it('should return error Observable when interventionId is 0', () => new Promise<void>((done) => {
    service.acknowledgeIntervention(0, 'response').subscribe({
      error: err => {
        expect(err.message).toContain('Invalid interventionId');
        done();
      }
    });
    httpMock.expectNone(req => req.url.includes('acknowledge'));
  }));

  it('should return error Observable when interventionId is negative', () => new Promise<void>((done) => {
    service.acknowledgeIntervention(-1, 'response').subscribe({
      error: err => {
        expect(err).toBeTruthy();
        done();
      }
    });
    httpMock.expectNone(req => req.url.includes('acknowledge'));
  }));

  // ─── Legacy method signature compatibility ───────────────────────────────

  it('acknowledgeStudentIntervention should delegate to acknowledgeIntervention', () => {
    service.acknowledgeStudentIntervention(25, 'Noted').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/v1/student/telemetry/interventions/25/acknowledge`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body.response).toBe('Noted');
    req.flush({});
  });
});

describe('AnalyticsApiService — Early Warning Radar', () => {
  let service: AnalyticsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AnalyticsApiService
      ]
    });
    service = TestBed.inject(AnalyticsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call GET /v1/analytics/digital-twin/early-warning/radar', () => {
    const mockItems = [
      {
        studentId: 10,
        studentNumber: '2026-0001',
        studentName: 'Juan Dela Cruz',
        programCode: 'BSCS',
        yearLevel: 3,
        riskLevel: 'CRITICAL',
        dropoutProbability: 0.85,
        primaryRiskFactor: 'Academic Deficit',
        suggestedAction: 'Academic Tutoring'
      }
    ];

    service.getEarlyWarningRadar().subscribe(items => {
      expect(items).toHaveLength(1);
      expect(items[0].studentNumber).toBe('2026-0001');
      expect(items[0].riskLevel).toBe('CRITICAL');
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/v1/analytics/digital-twin/early-warning/radar`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockItems);
  });

  it('should return empty array on HTTP error for getEarlyWarningRadar', () => {
    service.getEarlyWarningRadar().subscribe(items => {
      expect(items).toEqual([]);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/v1/analytics/digital-twin/early-warning/radar`
    );
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });

  it('should call GET /v1/analytics/digital-twin/early-warning/slice with page params', () => {
    service.getEarlyWarningRadarSlice(1, 10, 'predictedDropoutProbability', 'DESC').subscribe(res => {
      expect(res.content).toEqual([]);
    });

    const req = httpMock.expectOne(req =>
      req.url === `${environment.apiUrl}/v1/analytics/digital-twin/early-warning/slice` &&
      req.params.get('page') === '1' &&
      req.params.get('size') === '10' &&
      req.params.get('sortBy') === 'predictedDropoutProbability' &&
      req.params.get('sortDir') === 'DESC'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], hasNext: false, hasPrevious: false, isFirst: false, isLast: true, page: 1, size: 10 });
  });
});

