import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { DigitalTwinAnalyticsDashboardComponent } from './digital-twin-dashboard.component';
import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { DigitalTwinRiskProfileDto } from '../../../core/models/analytics.model';
import { StudentProfileResponse } from '../../../core/models/enrollment.model';

describe('DigitalTwinAnalyticsDashboardComponent', () => {
  let component: DigitalTwinAnalyticsDashboardComponent;
  let fixture: ComponentFixture<DigitalTwinAnalyticsDashboardComponent>;

  const mockRiskProfile: DigitalTwinRiskProfileDto = {
    studentId: 10,
    studentNumber: '2026-CS-0001',
    studentName: 'Alice Student',
    programCode: 'BSIT',
    yearLevel: 3,
    academicRiskScore: 15,
    attendanceRiskScore: 10,
    socioeconomicRiskScore: 20,
    compositeRiskLevel: 'LOW',
    predictedDropoutProbability: 0.03,
    recommendedInterventions: ['Regular Academic Mentoring', 'Free Higher Education Stipend'],
    evaluatedAt: '2026-09-25T06:00:00Z'
  };

  const mockStudentProfile: StudentProfileResponse = {
    id: 10,
    studentNumber: '2026-CS-0001',
    userId: 100,
    username: 'alice',
    email: 'alice@example.com',
    programId: 1,
    programCode: 'BSIT',
    programName: 'Bachelor of Science in Information Technology',
    curriculumId: 1,
    curriculumCode: 'BSIT-2024',
    classification: 'REGULAR',
    yearLevel: 3,
    enrollmentStatus: 'ENROLLED',
    isGraduating: false,
    totalUnitsEarned: 72,
    cumulativeGpa: 1.45,
    financialClearance: 'CLEARED',
    departmentalClearance: 'CLEARED'
  };

  let mockAnalyticsApi: any;
  let mockEnrollmentApi: any;
  let mockAuthService: any;
  let mockMessageService: any;

  beforeEach(async () => {
    mockAnalyticsApi = {
      getCurrentStudentRiskProfile: vi.fn().mockReturnValue(of(mockRiskProfile)),
      getStudentRiskProfile: vi.fn().mockReturnValue(of(mockRiskProfile)),
      getAdminStudentTelemetry: vi.fn().mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0 })),
      getFacultyStudentTelemetry: vi.fn().mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0 })),
      getFacultyAssignedSections: vi.fn().mockReturnValue(of([{ sectionId: 1, sectionCode: 'BSCS-3A', courseCode: 'CS101', enrolledCount: 30 }])),
      getStudentSelfTelemetry: vi.fn().mockReturnValue(of({
        studentId: 10,
        fullName: 'Alice Student',
        riskLevel: 'LOW',
        wellnessScore: 88.5,
        dimensionScores: { 'Academic Progress': 85.0, 'Attendance Consistency': 90.0, 'LMS Engagement Index': 88.0, 'Assignment Punctuality': 95.0 },
        recommendations: [],
        milestones: [],
        lastSync: '2026-09-25T06:00:00Z'
      })),
      acknowledgeStudentIntervention: vi.fn().mockReturnValue(of(undefined)),
      dispatchIntervention: vi.fn().mockReturnValue(of({ id: 1, interventionType: 'GUIDANCE_COUNSELING', status: 'DISPATCHED' })),
      getAdminTelemetryKpi: vi.fn().mockReturnValue(of(null)),
      getFacultyTelemetryKpi: vi.fn().mockReturnValue(of(null))
    };

    mockEnrollmentApi = {
      getCurrentStudentProfile: vi.fn().mockReturnValue(of(mockStudentProfile))
    };

    mockAuthService = {
      hasRole: vi.fn((role: string) => role === 'STUDENT'),
      getUserId: vi.fn().mockReturnValue(100),
      currentUser: vi.fn().mockReturnValue({ id: 100, username: 'alice', role: 'STUDENT', roles: ['STUDENT'] })
    };

    await TestBed.configureTestingModule({
      imports: [DigitalTwinAnalyticsDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: AnalyticsApiService, useValue: mockAnalyticsApi },
        { provide: EnrollmentApiService, useValue: mockEnrollmentApi },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    mockMessageService = TestBed.inject(MessageService);
    vi.spyOn(mockMessageService, 'add');

    fixture = TestBed.createComponent(DigitalTwinAnalyticsDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create and load student-specific telemetry display for STUDENT role', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.isStudent()).toBe(true);
    expect(mockAnalyticsApi.getStudentSelfTelemetry).toHaveBeenCalled();

    expect(component.riskProfile()).toEqual(mockRiskProfile);
    expect(component.studentProfile()).toEqual(mockStudentProfile);

    expect(component.retentionRate()).toBe(97);
    expect(component.academicHealthScore()).toBe(85);
    expect(component.attendanceHealthScore()).toBe(90);
    expect(component.getStudentStatusLabel('LOW')).toBe('OPTIMAL PROGRESSION');
  });

  it('should recalculate telemetry when student presses refresh', () => {
    fixture.detectChanges();

    component.recalculateMLModel();

    expect(mockAnalyticsApi.getCurrentStudentRiskProfile).toHaveBeenCalled();
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Telemetry Refreshed'
      })
    );
  });

  it('should format student status labels according to risk levels', () => {
    expect(component.getStudentStatusLabel('CRITICAL')).toBe('SUPPORT & INTERVENTION ACTIVE');
    expect(component.getStudentStatusLabel('HIGH')).toBe('ACADEMIC ADVISORY RECOMMENDED');
    expect(component.getStudentStatusLabel('MODERATE')).toBe('GOOD STANDING - ACTIVE');
    expect(component.getStudentStatusLabel('LOW')).toBe('OPTIMAL PROGRESSION');
  });

  it('should load administrative telemetry data when user is ADMIN', () => {
    mockAuthService.hasRole.mockImplementation((role: string) => role === 'ADMIN');
    mockAnalyticsApi.getAdminStudentTelemetry.mockReturnValue(of({
      content: [
        {
          studentId: 10,
          studentNumber: '2026-CS-0001',
          fullName: 'Alice Student',
          programOrCohort: 'BSIT (Year 3)',
          riskLevel: 'CRITICAL',
          riskScore: 85.0,
          activeInterventions: [
            { id: 1, interventionType: 'GUIDANCE_COUNSELING', triggerReason: 'High Risk', status: 'DISPATCHED', dispatchedAt: '2026-09-25T06:00:00Z' }
          ],
          lastTelemetrySync: '2026-09-25T06:00:00Z'
        }
      ],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0
    }));

    fixture = TestBed.createComponent(DigitalTwinAnalyticsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isAdmin()).toBe(true);
    expect(mockAnalyticsApi.getAdminStudentTelemetry).toHaveBeenCalled();
    expect(component.adminTelemetryList().length).toBe(1);
    expect(component.criticalRiskCount()).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Administrator Student Telemetry & AI Interventions');
    expect(compiled.textContent).toContain('Alice Student');
    expect(compiled.textContent).toContain('CRITICAL');
  });

  it('should load section-scoped telemetry data when user is FACULTY', () => {
    mockAuthService.hasRole.mockImplementation((role: string) => role === 'FACULTY');
    mockAnalyticsApi.getFacultyStudentTelemetry.mockReturnValue(of({
      content: [
        {
          studentId: 20,
          studentNumber: '2026-CS-0002',
          fullName: 'Bob Faculty Student',
          sectionCode: 'BSCS-3A',
          programOrCohort: 'BSCS (Year 3)',
          riskLevel: 'MODERATE',
          riskScore: 45.0,
          activeInterventions: [],
          lastTelemetrySync: '2026-09-25T06:00:00Z'
        }
      ],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0
    }));

    fixture = TestBed.createComponent(DigitalTwinAnalyticsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isFaculty()).toBe(true);
    expect(mockAnalyticsApi.getFacultyAssignedSections).toHaveBeenCalled();
    expect(mockAnalyticsApi.getFacultyStudentTelemetry).toHaveBeenCalled();
    expect(component.adminTelemetryList().length).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Faculty Class Section Digital Twin Radar');
    expect(compiled.textContent).toContain('Bob Faculty Student');
  });

  it('should populate executive analytics cards using total aggregate KPI data rather than only loaded page data', () => {
    mockAuthService.hasRole.mockImplementation((role: string) => role === 'ADMIN');
    mockAnalyticsApi.getAdminStudentTelemetry.mockReturnValue(of({
      content: [
        {
          studentId: 10,
          studentNumber: '2026-CS-0001',
          fullName: 'Alice Student',
          programOrCohort: 'BSIT (Year 3)',
          riskLevel: 'LOW',
          riskScore: 10.0,
          activeInterventions: [],
          lastTelemetrySync: '2026-09-25T06:00:00Z'
        }
      ],
      totalElements: 50,
      totalPages: 5,
      size: 10,
      number: 0
    }));

    mockAnalyticsApi.getAdminTelemetryKpi.mockReturnValue(of({
      totalMonitored: 50,
      criticalRiskCount: 8,
      highRiskCount: 12,
      moderateRiskCount: 15,
      lowRiskCount: 15,
      totalActiveInterventions: 18,
      averageWellnessIndex: 78.5
    }));

    fixture = TestBed.createComponent(DigitalTwinAnalyticsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isAdmin()).toBe(true);
    expect(mockAnalyticsApi.getAdminTelemetryKpi).toHaveBeenCalled();
    // Only 1 student is in the current page table slice
    expect(component.adminTelemetryList().length).toBe(1);

    // But executive KPI cards show total institutional aggregates
    expect(component.totalMonitoredStudents()).toBe(50);
    expect(component.criticalRiskCount()).toBe(8);
    expect(component.highRiskCount()).toBe(12);
    expect(component.moderateRiskCount()).toBe(15);
    expect(component.lowRiskCount()).toBe(15);
    expect(component.totalActiveInterventionsCount()).toBe(18);
    expect(component.averageWellnessIndex()).toBe(78.5);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('50');
    expect(compiled.textContent).toContain('20');
    expect(compiled.textContent).toContain('(8 Critical, 12 High)');
    expect(compiled.textContent).toContain('18');
    expect(compiled.textContent).toContain('78.5%');
  });
});
