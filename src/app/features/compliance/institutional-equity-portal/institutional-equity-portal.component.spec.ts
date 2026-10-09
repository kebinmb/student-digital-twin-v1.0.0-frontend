// File: src/app/features/compliance/institutional-equity-portal/institutional-equity-portal.component.spec.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { InstitutionalEquityPortalComponent } from './institutional-equity-portal.component';
import { EquityApiService } from '../../../core/service/compliance/equity-api.service';
import {
  StudentEquityProfileDto,
  EquityStatisticsSummaryDto,
  ApplicantEquityAuditDto,
  ApplicantEquityStatsDto
} from '../../../core/models/student-equity.model';

describe('InstitutionalEquityPortalComponent', () => {
  let component: InstitutionalEquityPortalComponent;
  let fixture: ComponentFixture<InstitutionalEquityPortalComponent>;
  let mockEquityApi: any;

  const mockEnrolledStats: EquityStatisticsSummaryDto = {
    totalProfilesCount: 150,
    count4psBeneficiaries: 30,
    countListahananNhts: 25,
    countUnifastTesAwardees: 40,
    countIndigenousPeoples: 12,
    countPersonsWithDisabilities: 8,
    countSoloParents: 15,
    countRaisedBySoloParents: 20,
    countOrphans: 4,
    countGidaResidents: 18,
    countFarmerFisherfolk: 22,
    countRebelReturneeFamilies: 3,
    countBottom40IncomeBracket: 65,
    countFirstGenerationCollege: 50,
    countSelfDeclared: 45,
    countPendingVerification: 35,
    countVerified: 65,
    countRejected: 5
  };

  const mockApplicantStats: ApplicantEquityStatsDto = {
    totalPostExamCount: 42,
    examPassedCount: 38,
    examFailedCount: 4,
    count4psBeneficiaries: 14,
    countIndigenousPeoples: 5,
    countPersonsWithDisabilities: 3,
    countSoloParents: 7,
    countOrphans: 2,
    countGidaResidents: 9,
    countFarmerFisherfolk: 11,
    countBottom40IncomeBracket: 28,
    countFirstGenerationCollege: 20
  };

  const mockApplicantAuditDto: ApplicantEquityAuditDto = {
    id: 101,
    applicationNumber: 'ADM-2026-59384',
    applicantName: 'Juan Dela Cruz',
    email: 'juan.delacruz@example.com',
    mobileNumber: '09171234567',
    targetProgramId: 1,
    targetProgramCode: 'BSIT',
    targetProgramName: 'Bachelor of Science in Information Technology',
    termId: 10,
    termName: 'AY 2026-2027 1st Semester',
    highSchoolName: 'Negros Occidental National High School',
    highSchoolType: 'PUBLIC',
    highSchoolGwa: 89.5,
    examScore: 84.5,
    examRemarks: 'Qualified for admission',
    applicationStatus: 'EXAM_PASSED',
    evaluatedByName: 'Dr. Santos (Admissions Officer)',
    interviewScore: 88.0,
    interviewRemarks: 'Strong analytical aptitude',
    is4psBeneficiary: true,
    household4psIdNumber: '4PS-NO-89234',
    isIndigenousPeople: false,
    isPersonWithDisability: false,
    isSoloParent: true,
    isRaisedBySoloParent: false,
    soloParentIdNumber: 'SP-2024-0012',
    isOrphan: false,
    isGidaResident: true,
    gidaBarangayResidence: 'Brgy. Minoyan, Murcia',
    isFarmerFisherfolk: true,
    rsbsaRegistrationNumber: '06-45-01-00923',
    isRebelReturneeFamily: false,
    isBottom40IncomeBracket: true,
    monthlyHouseholdIncomeBracket: 'POOR_BELOW_10K',
    isFirstGenerationCollege: true,
    isUnderprivilegedHomeless: false,
    socioeconomicRiskScore: 75.0,
    createdAt: '2026-02-15T08:30:00Z',
    isEnrolled: false
  };

  beforeEach(async () => {
    mockEquityApi = {
      getEquityStatisticsSummary: vi.fn().mockReturnValue(of(mockEnrolledStats)),
      searchEquityProfiles: vi.fn().mockReturnValue(of({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0
      })),
      getAdmissionApplicantEquityStats: vi.fn().mockReturnValue(of(mockApplicantStats)),
      searchAdmissionApplicants: vi.fn().mockReturnValue(of({
        content: [mockApplicantAuditDto],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0
      })),
      getAdmissionApplicantDossier: vi.fn().mockReturnValue(of(mockApplicantAuditDto)),
      verifyEquityProfile: vi.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [InstitutionalEquityPortalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: EquityApiService, useValue: mockEquityApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstitutionalEquityPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and default to ENROLLED cohort', () => {
    expect(component).toBeTruthy();
    expect(component.activeCohort()).toBe('ENROLLED');
    expect(mockEquityApi.getEquityStatisticsSummary).toHaveBeenCalled();
    expect(mockEquityApi.searchEquityProfiles).toHaveBeenCalled();
  });

  it('should switch to ADMISSION cohort and load post-exam applicant data', () => {
    component.switchCohort('ADMISSION');

    expect(component.activeCohort()).toBe('ADMISSION');
    expect(mockEquityApi.getAdmissionApplicantEquityStats).toHaveBeenCalled();
    expect(mockEquityApi.searchAdmissionApplicants).toHaveBeenCalled();
    expect(component.applicants().length).toBe(1);
    expect(component.applicants()[0].applicationNumber).toBe('ADM-2026-59384');
    expect(component.applicants()[0].socioeconomicRiskScore).toBe(75.0);
  });

  it('should filter admission applicants on search query changes', () => {
    component.switchCohort('ADMISSION');
    component.searchQuery.set('ADM-2026-59384');
    component.onFilterChange();

    expect(mockEquityApi.searchAdmissionApplicants).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'ADM-2026-59384',
        page: 0
      })
    );
  });

  it('should filter admission applicants by statutory indicator flags', () => {
    component.switchCohort('ADMISSION');
    component.is4psFilter.set(true);
    component.onFilterChange();

    expect(mockEquityApi.searchAdmissionApplicants).toHaveBeenCalledWith(
      expect.objectContaining({
        is4ps: true,
        page: 0
      })
    );
  });

  it('should open applicant equity dossier modal when openApplicantDossier is invoked', () => {
    component.openApplicantDossier(mockApplicantAuditDto);

    expect(component.selectedApplicant()).toEqual(mockApplicantAuditDto);
    expect(component.showApplicantDossierDialog()).toBe(true);
  });

  it('should correctly evaluate exam status severities', () => {
    expect(component.getExamStatusSeverity('EXAM_PASSED')).toBe('success');
    expect(component.getExamStatusSeverity('APPROVED')).toBe('success');
    expect(component.getExamStatusSeverity('ELIGIBLE_FOR_ENROLLMENT')).toBe('success');
    expect(component.getExamStatusSeverity('INTERVIEW_ACCEPTED')).toBe('info');
    expect(component.getExamStatusSeverity('EXAM_FAILED')).toBe('danger');
    expect(component.getExamStatusSeverity('DRAFT')).toBe('secondary');
  });

  it('should correctly evaluate vulnerability score severities', () => {
    expect(component.getVulnerabilitySeverity(75)).toBe('danger'); // High affirmative action need
    expect(component.getVulnerabilitySeverity(45)).toBe('warn');   // Moderate need
    expect(component.getVulnerabilitySeverity(15)).toBe('info');   // Low / baseline
    expect(component.getVulnerabilitySeverity(undefined)).toBe('secondary');
  });

  it('should handle backend error gracefully without crashing when loadApplicantStats fails', () => {
    mockEquityApi.getAdmissionApplicantEquityStats.mockReturnValue(throwError(() => new Error('500 Internal Server Error')));

    component.switchCohort('ADMISSION');

    expect(component.activeCohort()).toBe('ADMISSION');
    expect(component.statsLoading()).toBe(false);
    expect(component.statsError()).toBeTruthy();
    expect(component.applicantStats()).toBeNull();
  });
});
