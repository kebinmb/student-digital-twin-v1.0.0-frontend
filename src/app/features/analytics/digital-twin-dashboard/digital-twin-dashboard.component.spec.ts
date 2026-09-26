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
      getStudentRiskProfile: vi.fn().mockReturnValue(of(mockRiskProfile))
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
    expect(mockAnalyticsApi.getCurrentStudentRiskProfile).toHaveBeenCalled();
    expect(mockEnrollmentApi.getCurrentStudentProfile).toHaveBeenCalled();

    expect(component.riskProfile()).toEqual(mockRiskProfile);
    expect(component.studentProfile()).toEqual(mockStudentProfile);

    // Verify student-facing computed properties
    expect(component.retentionRate()).toBe(97); // 1 - 0.03 = 97%
    expect(component.academicHealthScore()).toBe(85); // 100 - 15 = 85
    expect(component.attendanceHealthScore()).toBe(90); // 100 - 10 = 90
    expect(component.getStudentStatusLabel('LOW')).toBe('OPTIMAL PROGRESSION');
  });

  it('should recalculate telemetry when student presses refresh', () => {
    fixture.detectChanges();

    component.recalculateMLModel();

    expect(mockAnalyticsApi.getCurrentStudentRiskProfile).toHaveBeenCalledTimes(2);
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

  it('should display activity review recommendations when activity alerts exist', () => {
    const profileWithAlerts: DigitalTwinRiskProfileDto = {
      ...mockRiskProfile,
      recommendedInterventions: ['Review Quiz 1 Topics', 'Regular Academic Mentoring'],
      activityAlerts: [
        {
          activityTitle: 'Quiz 1',
          categoryName: 'Quizzes',
          scoreEarned: 20,
          maxPoints: 50,
          percentage: 40.0,
          suggestion: 'Review Quiz 1 Topics'
        }
      ]
    };

    mockAnalyticsApi.getCurrentStudentRiskProfile.mockReturnValue(of(profileWithAlerts));
    fixture = TestBed.createComponent(DigitalTwinAnalyticsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Quiz 1');
    expect(compiled.textContent).toContain('Review Quiz 1 Topics');
    expect(compiled.textContent).toContain('20 / 50 (40%)');
  });
});
