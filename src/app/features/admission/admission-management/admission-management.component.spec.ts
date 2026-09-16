import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AdmissionManagementComponent } from './admission-management.component';
import { AuthService } from '../../../core/service/authentication/auth-service';

describe('AdmissionManagementComponent', () => {
  let component: AdmissionManagementComponent;
  let fixture: ComponentFixture<AdmissionManagementComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmissionManagementComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(AdmissionManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create AdmissionManagementComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should dynamically calculate daysOpenCalculated based on configForm values', () => {
    // Initial values: 20000 / 1000 = 20
    expect(component.daysOpenCalculated()).toBe(20);

    // Dynamically patch dailySlotLimit to 500
    component.configForm.patchValue({ dailySlotLimit: 500 });
    fixture.detectChanges();
    expect(component.daysOpenCalculated()).toBe(40); // 20000 / 500 = 40

    // Dynamically patch totalOpenedSlots to 15000 and dailySlotLimit to 1000
    component.configForm.patchValue({ totalOpenedSlots: 15000, dailySlotLimit: 1000 });
    fixture.detectChanges();
    expect(component.daysOpenCalculated()).toBe(15); // 15000 / 1000 = 15
  });

  it('should toggle isCreateSlotModalVisible state when opening and closing create slot modal', () => {
    expect(component.isCreateSlotModalVisible()).toBe(false);
    component.openCreateSlotModal();
    expect(component.isCreateSlotModalVisible()).toBe(true);
    component.closeCreateSlotModal();
    expect(component.isCreateSlotModalVisible()).toBe(false);
  });

  it('should correctly calculate risk score, vulnerability severity, and priority labels', () => {
    const baselineApp: any = {
      is4psBeneficiary: false,
      isIndigenousPeople: false,
      isPersonWithDisability: false,
      isSoloParent: false,
      isRaisedBySoloParent: false,
      isOrphan: false,
      isFarmerFisherfolk: false,
      isRebelReturneeFamily: false,
      isGidaResident: false,
      isBottom40IncomeBracket: false,
      isFirstGenerationCollege: false,
      highSchoolType: 'PRIVATE'
    };

    // Baseline: 10.0
    expect(component.getRiskScore(baselineApp)).toBe(10);
    expect(component.getVulnerabilitySeverity(10)).toBe('info');
    expect(component.getPriorityLabel(10)).toBe('Standard Baseline');

    // High affirmative priority with multiple statutory indicators:
    // Base 10 + Public SHS 10 + 4Ps 15 + PWD 15 + Bottom 40 20 = 70
    const highPriorityApp: any = {
      ...baselineApp,
      highSchoolType: 'PUBLIC',
      is4psBeneficiary: true,
      isPersonWithDisability: true,
      isBottom40IncomeBracket: true
    };

    expect(component.getRiskScore(highPriorityApp)).toBe(70);
    expect(component.getVulnerabilitySeverity(70)).toBe('danger');
    expect(component.getPriorityLabel(70)).toBe('High Affirmative Priority');
  });

  it('should compute real-time interviewQueueSummary based on post-exam candidates', () => {
    const mockApps: any[] = [
      {
        id: 1,
        fullName: 'Applicant 1',
        applicationNumber: 'ADM-2026-001',
        applicationStatus: 'EXAM_PASSED',
        targetProgramId: 1,
        is4psBeneficiary: true,
        isBottom40IncomeBracket: true,
        isIndigenousPeople: true,
        isPersonWithDisability: false,
        isSoloParent: false,
        isRaisedBySoloParent: false,
        isOrphan: false,
        isFarmerFisherfolk: true,
        isFirstGenerationCollege: true,
        highSchoolType: 'PUBLIC'
      },
      {
        id: 2,
        fullName: 'Applicant 2',
        applicationNumber: 'ADM-2026-002',
        applicationStatus: 'EXAM_PASSED',
        targetProgramId: 1,
        is4psBeneficiary: false,
        isBottom40IncomeBracket: false,
        isIndigenousPeople: false,
        isPersonWithDisability: true,
        isSoloParent: true,
        isRaisedBySoloParent: false,
        isOrphan: true,
        isFarmerFisherfolk: false,
        isFirstGenerationCollege: false,
        highSchoolType: 'PRIVATE'
      },
      {
        id: 3,
        fullName: 'Applicant 3',
        applicationNumber: 'ADM-2026-003',
        applicationStatus: 'SUBMITTED', // Not in interview queue
        targetProgramId: 1,
        is4psBeneficiary: true
      }
    ];

    component.allApplications.set(mockApps);
    component.selectedProgramId.set(1);
    fixture.detectChanges();

    const summary = component.interviewQueueSummary();
    expect(summary.totalCount).toBe(2);
    expect(summary.count4ps).toBe(1);
    expect(summary.countIp).toBe(1);
    expect(summary.countPwd).toBe(1);
    expect(summary.countSolo).toBe(1);
    expect(summary.countOrphan).toBe(1);
    expect(summary.countAgri).toBe(1);
    expect(summary.countFirstGen).toBe(1);
  });

  it('should filter chairInterviewApps by equity group and priority level', () => {
    const mockApps: any[] = [
      {
        id: 1,
        fullName: 'Maria Santos',
        applicationNumber: 'ADM-2026-001',
        applicationStatus: 'EXAM_PASSED',
        targetProgramId: 1,
        is4psBeneficiary: true,
        isBottom40IncomeBracket: true,
        highSchoolType: 'PUBLIC',
        socioeconomicRiskScore: 75
      },
      {
        id: 2,
        fullName: 'Juan Dela Cruz',
        applicationNumber: 'ADM-2026-002',
        applicationStatus: 'EXAM_PASSED',
        targetProgramId: 1,
        is4psBeneficiary: false,
        isPersonWithDisability: true,
        socioeconomicRiskScore: 25
      }
    ];

    component.allApplications.set(mockApps);
    component.selectedProgramId.set(1);

    // Initial: both visible
    expect(component.chairInterviewApps().length).toBe(2);

    // Filter by 4Ps
    component.interviewEquityFilter.set('4PS');
    expect(component.chairInterviewApps().length).toBe(1);
    expect(component.chairInterviewApps()[0].fullName).toBe('Maria Santos');

    // Filter by PWD
    component.interviewEquityFilter.set('PWD');
    expect(component.chairInterviewApps().length).toBe(1);
    expect(component.chairInterviewApps()[0].fullName).toBe('Juan Dela Cruz');

    // Filter by High Priority
    component.interviewEquityFilter.set('ALL');
    component.interviewPriorityFilter.set('HIGH');
    expect(component.chairInterviewApps().length).toBe(1);
    expect(component.chairInterviewApps()[0].fullName).toBe('Maria Santos');

    // Search query
    component.interviewPriorityFilter.set('ALL');
    component.interviewSearchQuery.set('Juan');
    expect(component.chairInterviewApps().length).toBe(1);
    expect(component.chairInterviewApps()[0].fullName).toBe('Juan Dela Cruz');
  });

  it('should open and close prospective student equity dossier modal', () => {
    const mockApp: any = {
      id: 1,
      fullName: 'Test Applicant',
      applicationNumber: 'ADM-2026-999'
    };

    expect(component.isDossierModalVisible()).toBe(false);
    expect(component.selectedDossierApp()).toBeNull();

    component.openDossierModal(mockApp);
    expect(component.isDossierModalVisible()).toBe(true);
    expect(component.selectedDossierApp()).toBe(mockApp);

    component.closeDossierModal();
    expect(component.isDossierModalVisible()).toBe(false);
    expect(component.selectedDossierApp()).toBeNull();
  });

  it('should include EXAM_PASSED applicants across all programs when selectedProgramId is null and handle status casing', () => {
    const mockApps: any[] = [
      {
        id: 10,
        fullName: 'BSIT Candidate',
        applicationNumber: 'ADM-2026-010',
        applicationStatus: 'EXAM_PASSED',
        targetProgramId: 1
      },
      {
        id: 20,
        fullName: 'BSCS Candidate',
        applicationNumber: 'ADM-2026-020',
        applicationStatus: 'exam_passed', // lowercase
        targetProgramId: 2
      },
      {
        id: 30,
        fullName: 'Civil Eng Candidate',
        applicationNumber: 'ADM-2026-030',
        applicationStatus: ' EXAM_PASSED ', // whitespace
        targetProgramId: 3
      },
      {
        id: 40,
        fullName: 'Pending Guidance Exam',
        applicationNumber: 'ADM-2026-040',
        applicationStatus: 'SUBMITTED',
        targetProgramId: 1
      }
    ];

    component.allApplications.set(mockApps);
    component.selectedProgramId.set(null); // All Programs
    fixture.detectChanges();

    // All 3 passed exam applicants should be in chairInterviewApps
    const queue = component.chairInterviewApps();
    expect(queue.length).toBe(3);
    expect(queue.map(a => a.id)).toEqual([10, 20, 30]);

    // Summary count should also be 3
    expect(component.interviewQueueSummary().totalCount).toBe(3);

    // Filtering to Program 2 (with string coercion) should show only BSCS
    component.selectedProgramId.set('2' as any);
    expect(component.chairInterviewApps().length).toBe(1);
    expect(component.chairInterviewApps()[0].fullName).toBe('BSCS Candidate');
    expect(component.interviewQueueSummary().totalCount).toBe(1);

    // Resetting back to null shows all again
    component.selectedProgramId.set(null);
    expect(component.chairInterviewApps().length).toBe(3);
  });

  it('should strictly scope interview queue, summary metrics, and program options to chairperson assigned program', () => {
    const chairJwt = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({
      sub: '42',
      preferred_username: 'chairperson_cs',
      roles: ['ROLE_CHAIRPERSON'],
      program_id: 2
    }))}.signature`;

    authService.setAccessToken(chairJwt);
    fixture.detectChanges();

    expect(component.isChairperson()).toBe(true);
    expect(component.assignedProgramId()).toBe(2);

    component.publicPrograms.set([
      { id: 1, code: 'BSIT', name: 'BS Information Technology' } as any,
      { id: 2, code: 'BSCS', name: 'BS Computer Science' } as any,
      { id: 3, code: 'BSIS', name: 'BS Information Systems' } as any
    ]);

    // Program options should only list the assigned program
    const options = component.programOptions();
    expect(options.length).toBe(1);
    expect(options[0].value).toBe(2);
    expect(options[0].label).toContain('BSCS');

    expect(component.assignedProgramName()).toBe('BSCS - BS Computer Science');

    const mockApps: any[] = [
      {
        id: 101,
        fullName: 'BSIT Applicant',
        applicationStatus: 'EXAM_PASSED',
        targetProgramId: 1,
        is4psBeneficiary: true
      },
      {
        id: 102,
        fullName: 'BSCS Applicant 1',
        applicationStatus: 'EXAM_PASSED',
        targetProgramId: 2,
        is4psBeneficiary: true
      },
      {
        id: 103,
        fullName: 'BSCS Applicant 2',
        applicationStatus: 'EXAM_PASSED',
        targetProgramId: 2,
        is4psBeneficiary: false
      },
      {
        id: 104,
        fullName: 'BSIS Applicant',
        applicationStatus: 'EXAM_PASSED',
        targetProgramId: 3,
        is4psBeneficiary: true
      }
    ];

    component.allApplications.set(mockApps);
    fixture.detectChanges();

    // Even if selectedProgramId was null, chairInterviewApps must be restricted to program 2
    const queue = component.chairInterviewApps();
    expect(queue.length).toBe(2);
    expect(queue.every(a => a.targetProgramId === 2)).toBe(true);

    // Summary metrics should only count program 2 candidates
    const summary = component.interviewQueueSummary();
    expect(summary.totalCount).toBe(2);
    expect(summary.count4ps).toBe(1);

    // Guard against evaluating applicants outside assigned program
    const outOfScopeApp = mockApps[0]; // program 1
    component.openInterviewModal(outOfScopeApp);
    expect(component.selectedApp()).toBeNull();
    expect(component.isInterviewModalVisible()).toBe(false);

    // Evaluating assigned program applicant succeeds
    const inScopeApp = mockApps[1]; // program 2
    component.openInterviewModal(inScopeApp);
    expect(component.selectedApp()).toBe(inScopeApp);
    expect(component.isInterviewModalVisible()).toBe(true);
  });
});
