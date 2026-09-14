// File: src/app/features/compliance/student-equity-profiling/student-equity-profiling.component.spec.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { StudentEquityProfilingComponent } from './student-equity-profiling.component';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { EquityApiService } from '../../../core/service/compliance/equity-api.service';
import { StudentEquityProfileDto } from '../../../core/models/student-equity.model';

describe('StudentEquityProfilingComponent', () => {
  let component: StudentEquityProfilingComponent;
  let fixture: ComponentFixture<StudentEquityProfilingComponent>;
  let mockAuthService: any;
  let mockEquityApi: any;

  const mockDefaultProfile: StudentEquityProfileDto = {
    id: 1,
    studentProfileId: 10,
    studentNumber: '2026-0010',
    studentName: 'Maria Santos',
    programCode: 'BSIT',
    programName: 'Bachelor of Science in Information Technology',
    isPersonWithDisability: false,
    isSoloParent: false,
    isRaisedBySoloParent: false,
    is4psBeneficiary: false,
    isListahananNhts: false,
    unifastTesAwardee: false,
    isIndigenousPeople: false,
    isOrphan: false,
    isGidaResident: false,
    isFarmerFisherfolk: false,
    isRebelReturneeFamily: false,
    isBottom40IncomeBracket: false,
    monthlyHouseholdIncomeBracket: 'POOR_BELOW_10K',
    isFirstGenerationCollege: false,
    verificationStatus: 'SELF_DECLARED',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  beforeEach(async () => {
    mockAuthService = {
      currentUser: signal({
        id: 10,
        role: 'STUDENT',
        roles: ['STUDENT'],
        username: 'maria.santos'
      }),
      hasRole: vi.fn((role: string) => role === 'STUDENT'),
      hasAnyRole: vi.fn((roles: string[]) => roles.includes('STUDENT'))
    };

    mockEquityApi = {
      getMyEquityProfile: vi.fn().mockReturnValue(of(mockDefaultProfile)),
      getEquityProfileByStudentProfileId: vi.fn().mockReturnValue(of(mockDefaultProfile)),
      updateMyEquityProfile: vi.fn().mockReturnValue(of({ ...mockDefaultProfile, verificationStatus: 'PENDING_VERIFICATION' })),
      verifyEquityProfile: vi.fn().mockReturnValue(of({
        ...mockDefaultProfile,
        verificationStatus: 'VERIFIED',
        verificationRemarks: 'All documents verified'
      }))
    };

    await TestBed.configureTestingModule({
      imports: [StudentEquityProfilingComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: EquityApiService, useValue: mockEquityApi }
      ]
    }).compileComponents();
  });

  describe('Student Self-Service View', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(StudentEquityProfilingComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should be in student self-service mode when studentId is null and user has STUDENT role', () => {
      expect(component.isAdminMode()).toBe(false);
      expect(component.canEditStudentFields()).toBe(true);
      expect(mockEquityApi.getMyEquityProfile).toHaveBeenCalled();
    });

    it('should activate conditional validation when PWD is checked', () => {
      const pwdCheckbox = component.equityForm.get('isPersonWithDisability');
      const pwdIdCtrl = component.equityForm.get('pwdIdNumber');
      const disabilityTypeCtrl = component.equityForm.get('disabilityType');

      expect(pwdIdCtrl?.hasValidator(Validators.required)).toBe(false);
      expect(disabilityTypeCtrl?.hasValidator(Validators.required)).toBe(false);

      pwdCheckbox?.setValue(true);
      expect(pwdIdCtrl?.hasError('required')).toBe(true);
      expect(disabilityTypeCtrl?.hasError('required')).toBe(true);

      pwdIdCtrl?.setValue('PWD-12345');
      disabilityTypeCtrl?.setValue('VISUAL');
      expect(pwdIdCtrl?.valid).toBe(true);
      expect(disabilityTypeCtrl?.valid).toBe(true);

      pwdCheckbox?.setValue(false);
      expect(pwdIdCtrl?.hasValidator(Validators.required)).toBe(false);
      expect(pwdIdCtrl?.value).toBe('');
      expect(disabilityTypeCtrl?.hasValidator(Validators.required)).toBe(false);
      expect(disabilityTypeCtrl?.value).toBeNull();
    });

    it('should activate solo parent conditional validation via merge when either solo parent control is checked', () => {
      const isSoloParentCtrl = component.equityForm.get('isSoloParent');
      const isRaisedBySoloParentCtrl = component.equityForm.get('isRaisedBySoloParent');
      const soloParentIdCtrl = component.equityForm.get('soloParentIdNumber');

      expect(soloParentIdCtrl?.hasValidator(Validators.required)).toBe(false);

      // Check isSoloParent
      isSoloParentCtrl?.setValue(true);
      expect(soloParentIdCtrl?.hasError('required')).toBe(true);

      // Uncheck isSoloParent, check isRaisedBySoloParent
      isSoloParentCtrl?.setValue(false);
      isRaisedBySoloParentCtrl?.setValue(true);
      expect(soloParentIdCtrl?.hasError('required')).toBe(true);

      soloParentIdCtrl?.setValue('SP-2024-999');
      expect(soloParentIdCtrl?.valid).toBe(true);

      // Uncheck both
      isRaisedBySoloParentCtrl?.setValue(false);
      expect(soloParentIdCtrl?.hasValidator(Validators.required)).toBe(false);
      expect(soloParentIdCtrl?.value).toBe('');
    });

    it('should map unchecked secondary fields explicitly to null in saveProfile()', () => {
      component.equityForm.patchValue({
        isPersonWithDisability: false,
        pwdIdNumber: 'SHOULD_BE_NULL',
        isSoloParent: false,
        isRaisedBySoloParent: false,
        soloParentIdNumber: 'SHOULD_BE_NULL',
        is4psBeneficiary: false,
        household4psIdNumber: 'SHOULD_BE_NULL',
        monthlyHouseholdIncomeBracket: 'LOW_INCOME_10K_TO_20K'
      });

      component.saveProfile();

      expect(mockEquityApi.updateMyEquityProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          isPersonWithDisability: false,
          pwdIdNumber: null,
          disabilityType: null,
          isSoloParent: false,
          isRaisedBySoloParent: false,
          soloParentIdNumber: null,
          is4psBeneficiary: false,
          household4psIdNumber: null,
          monthlyHouseholdIncomeBracket: 'LOW_INCOME_10K_TO_20K'
        })
      );
    });

    it('should lock form fields when profile verificationStatus is VERIFIED', () => {
      const verifiedProfile: StudentEquityProfileDto = {
        ...mockDefaultProfile,
        verificationStatus: 'VERIFIED'
      };
      mockEquityApi.getMyEquityProfile.mockReturnValue(of(verifiedProfile));

      component.loadProfile();

      expect(component.canEditStudentFields()).toBe(false);
      expect(component.equityForm.disabled).toBe(true);
    });
  });

  describe('Institutional Administrative Audit View', () => {
    beforeEach(() => {
      mockAuthService.hasAnyRole.mockImplementation((roles: string[]) => roles.includes('ADMIN'));
      mockAuthService.hasRole.mockImplementation((role: string) => role === 'ADMIN');
      mockAuthService.currentUser.set({
        id: 99,
        role: 'ADMIN',
        roles: ['ADMIN'],
        username: 'admin.officer'
      });

      fixture = TestBed.createComponent(StudentEquityProfilingComponent);
      fixture.componentRef.setInput('studentId', '42');
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should recognize admin audit mode when studentId input is provided', () => {
      expect(component.isAdminMode()).toBe(true);
      expect(component.canEditStudentFields()).toBe(false);
      expect(mockEquityApi.getEquityProfileByStudentProfileId).toHaveBeenCalledWith(42);
    });

    it('should disable declaration equityForm in admin mode', () => {
      expect(component.equityForm.disabled).toBe(true);
    });

    it('should populate auditForm with profile status and allow submitting audit decision', () => {
      expect(component.auditForm.get('verificationStatus')?.value).toBe('VERIFIED');

      component.auditForm.patchValue({
        verificationStatus: 'VERIFIED',
        verificationRemarks: 'Certificate and ID verified with NCIP and CSWD.'
      });

      component.submitAuditDecision();

      expect(mockEquityApi.verifyEquityProfile).toHaveBeenCalledWith(1, {
        verificationStatus: 'VERIFIED',
        verificationRemarks: 'Certificate and ID verified with NCIP and CSWD.'
      });

      expect(component.profile()?.verificationStatus).toBe('VERIFIED');
    });
  });
});
