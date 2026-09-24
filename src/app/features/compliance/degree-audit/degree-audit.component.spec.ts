import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { DegreeAuditComponent } from './degree-audit.component';
import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { TermService } from '../../../core/services/institution.service';
import { AuthService } from '../../../core/service/authentication/auth-service';

describe('DegreeAuditComponent', () => {
  let component: DegreeAuditComponent;
  let fixture: ComponentFixture<DegreeAuditComponent>;

  const mockAudit = {
    studentProfileId: 1,
    studentNumber: '2026-CS-0001',
    studentName: 'Juan Dela Cruz',
    programCode: 'BSIT',
    curriculumCode: 'BSIT-2024',
    totalCurriculumUnits: 142,
    totalUnitsEarned: 142,
    cumulativeGpa: 1.35,
    residencyRequirementMet: true,
    qualifiedForGraduation: true,
    honorsEligible: 'MAGNA_CUM_LAUDE',
    auditedCourses: [
      {
        courseCode: 'IT 311',
        courseTitle: 'Enterprise Architecture',
        creditUnits: 3.0,
        gradeEarned: 1.25,
        status: 'PASSED'
      }
    ]
  };

  const mockComplianceApi = {
    evaluateDegreeAudit: vi.fn().mockReturnValue(of(mockAudit)),
    applyForGraduation: vi.fn().mockReturnValue(of({
      id: 10,
      studentProfileId: 1,
      studentNumber: '2026-CS-0001',
      studentName: 'Juan Dela Cruz',
      curriculumId: 1,
      curriculumCode: 'BSIT-2024',
      termId: 1,
      termName: '1ST_SEM - AY 2026-2027',
      applicationDate: '2026-09-24',
      degreeAuditStatus: 'QUALIFIED',
      totalUnitsCompleted: 142,
      cumulativeGpa: 1.35,
      honorsStatus: 'MAGNA_CUM_LAUDE',
      specialOrderNumber: null,
      specialOrderIssuedAt: null
    })),
    issueSpecialOrder: vi.fn().mockReturnValue(of({
      id: 10,
      studentProfileId: 1,
      studentNumber: '2026-CS-0001',
      studentName: 'Juan Dela Cruz',
      curriculumId: 1,
      curriculumCode: 'BSIT-2024',
      termId: 1,
      termName: '1ST_SEM - AY 2026-2027',
      applicationDate: '2026-09-24',
      degreeAuditStatus: 'QUALIFIED',
      totalUnitsCompleted: 142,
      cumulativeGpa: 1.35,
      honorsStatus: 'MAGNA_CUM_LAUDE',
      specialOrderNumber: 'CHED-SO-2026-0891',
      specialOrderIssuedAt: '2026-09-24'
    }))
  };

  const mockEnrollmentApi = {
    getCurrentStudentProfile: vi.fn().mockReturnValue(of({
      id: 1,
      studentNumber: '2026-CS-0001',
      userId: 1,
      username: 'jdelacruz',
      email: 'jdelacruz@sdt.edu.ph',
      programId: 1,
      programCode: 'BSIT',
      programName: 'Bachelor of Science in Information Technology',
      curriculumId: 1,
      curriculumCode: 'BSIT-2024',
      classification: 'REGULAR',
      yearLevel: 4,
      enrollmentStatus: 'ENROLLED',
      isGraduating: true,
      totalUnitsEarned: 142,
      cumulativeGpa: 1.35
    })),
    searchStudents: vi.fn().mockReturnValue(of([
      {
        id: 1,
        studentIdNumber: '2026-CS-0001',
        fullName: 'Juan Dela Cruz',
        programCode: 'BSIT',
        yearLevel: 4,
        academicStatus: 'REGULAR'
      }
    ]))
  };

  const mockTermService = {
    getAll: vi.fn().mockReturnValue(of([
      { id: 1, termType: '1ST_SEM', academicYearCode: 'AY 2026-2027', isActive: true }
    ])),
    getActive: vi.fn().mockReturnValue(of({
      id: 1,
      termType: '1ST_SEM',
      academicYearCode: 'AY 2026-2027',
      isActive: true
    }))
  };

  const mockAuthService = {
    currentUser: signal({
      id: 1,
      username: 'jdelacruz',
      role: 'STUDENT',
      roles: ['STUDENT']
    }),
    hasRole: vi.fn((role: string) => role === 'STUDENT'),
    hasAnyRole: vi.fn((roles: string[]) => roles.includes('STUDENT')),
    getUserId: vi.fn().mockReturnValue(1)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DegreeAuditComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: ComplianceApiService, useValue: mockComplianceApi },
        { provide: EnrollmentApiService, useValue: mockEnrollmentApi },
        { provide: TermService, useValue: mockTermService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DegreeAuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and auto-evaluate degree audit for logged-in student', () => {
    expect(component).toBeTruthy();
    expect(component.isStudentRole()).toBe(true);
    expect(component.searchStudentId).toBe(1);
    expect(mockComplianceApi.evaluateDegreeAudit).toHaveBeenCalledWith(1);
    expect(component.auditResult()).toEqual(mockAudit);
  });

  it('should compute honors severity correctly', () => {
    expect(component.getHonorsSeverity('MAGNA_CUM_LAUDE')).toBe('success');
    expect(component.getHonorsSeverity('NONE')).toBe('secondary');
  });

  it('should compute course completion status severity correctly', () => {
    expect(component.getCourseStatusSeverity('PASSED')).toBe('success');
    expect(component.getCourseStatusSeverity('FAILED')).toBe('danger');
    expect(component.getCourseStatusSeverity('IN_PROGRESS')).toBe('warn');
  });

  it('should allow graduation application submission', () => {
    component.applyForGraduation();
    expect(mockComplianceApi.applyForGraduation).toHaveBeenCalled();
    expect(component.graduationApp()?.degreeAuditStatus).toBe('QUALIFIED');
  });
});
