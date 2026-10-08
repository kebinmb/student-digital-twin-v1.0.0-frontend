// File: src/app/features/compliance/student-equity-profiling/student-equity-profiling.component.ts

import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ChangeDetectionStrategy,
  computed,
  input,
  effect,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Subscription, merge } from 'rxjs';

// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';

import { AuthService } from '../../../core/service/authentication/auth-service';
import { EquityApiService } from '../../../core/service/compliance/equity-api.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { WS_TOPICS } from '../../../core/constants/websocket-topics.constants';
import {
  StudentEquityProfileDto,
  UpdateStudentEquityProfileRequest,
  VerifyEquityProfileRequest,
  DisabilityType,
  HouseholdIncomeBracket,
  EquityVerificationStatus
} from '../../../core/models/student-equity.model';

export function noWhitespaceValidator() {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const isWhitespace = (control.value || '').toString().trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  };
}

@Component({
  selector: 'app-student-equity-profiling',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    TagModule,
    SkeletonModule,
    TooltipModule,
    TextareaModule
  ],
  templateUrl: './student-equity-profiling.component.html',
  styleUrl: './student-equity-profiling.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentEquityProfilingComponent implements OnInit, OnDestroy {
  // Bound via withComponentInputBinding() from route /equity-audit/:studentId
  readonly studentId = input<string | null>(null);

  private readonly fb = inject(FormBuilder);
  private readonly equityApi = inject(EquityApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly wsService = inject(WebSocketService, { optional: true });

  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isAuditing = signal<boolean>(false);
  readonly profile = signal<StudentEquityProfileDto | null>(null);

  private readonly subs = new Subscription();
  private equityWsSub?: Subscription;
  private hasInitialized = false;

  private readonly ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'GUIDANCE'];

  readonly isAdminMode = computed(() => !!this.studentId() || this.authService.hasAnyRole(this.ADMIN_ROLES));
  readonly canEditStudentFields = computed(() => !this.isAdminMode() && this.profile()?.verificationStatus !== 'VERIFIED');

  // Reactive Form Group for Student Declarations
  readonly equityForm: FormGroup = this.fb.group({
    // 1. PWD
    isPersonWithDisability: [false],
    pwdIdNumber: ['', [Validators.maxLength(60)]],
    disabilityType: [null as DisabilityType | null],

    // 2. Solo Parent
    isSoloParent: [false],
    isRaisedBySoloParent: [false],
    soloParentIdNumber: ['', [Validators.maxLength(60)]],

    // 3. 4Ps & UniFAST TES
    is4psBeneficiary: [false],
    household4psIdNumber: ['', [Validators.maxLength(60)]],
    isListahananNhts: [false],
    unifastTesAwardee: [false],
    unifastTesAwardNumber: ['', [Validators.maxLength(60)]],

    // 4. Indigenous Peoples
    isIndigenousPeople: [false],
    ipEthnicGroup: ['', [Validators.maxLength(100)]],
    ncipCertificateNumber: ['', [Validators.maxLength(100)]],

    // 5. Orphan Status
    isOrphan: [false],

    // 6. GIDA Resident
    isGidaResident: [false],
    gidaBarangayResidence: ['', [Validators.maxLength(150)]],

    // 7. Subsistence Farmer or Fisherfolk
    isFarmerFisherfolk: [false],
    rsbsaRegistrationNumber: ['', [Validators.maxLength(60)]],

    // 8. Rebel Returnee Family / E-CLIP
    isRebelReturneeFamily: [false],
    certificateOfSurrenderNumber: ['', [Validators.maxLength(60)]],

    // 9. Bottom 40% Household Income Bracket
    isBottom40IncomeBracket: [false],
    monthlyHouseholdIncomeBracket: ['POOR_BELOW_10K' as HouseholdIncomeBracket, Validators.required],

    // 10. First-Generation College Student
    isFirstGenerationCollege: [false]
  });

  // Reactive Form Group for Institutional Auditor Review
  readonly auditForm: FormGroup = this.fb.group({
    verificationStatus: ['VERIFIED' as EquityVerificationStatus, Validators.required],
    verificationRemarks: ['', [Validators.maxLength(500)]]
  });

  readonly disabilityTypeOptions = [
    { label: 'Visual Impairment', value: 'VISUAL' },
    { label: 'Hearing Impairment', value: 'HEARING' },
    { label: 'Mobility Impairment', value: 'MOBILITY' },
    { label: 'Neurodevelopmental Disability', value: 'NEURODEVELOPMENTAL' },
    { label: 'Psychosocial Disability', value: 'PSYCHOSOCIAL' },
    { label: 'Chronic Illness', value: 'CHRONIC_ILLNESS' },
    { label: 'Other Disability Type', value: 'OTHER' }
  ];

  readonly incomeBracketOptions = [
    { label: 'Poor (Below ₱10,000 / month)', value: 'POOR_BELOW_10K' },
    { label: 'Low Income (₱10,000 - ₱20,000 / month)', value: 'LOW_INCOME_10K_TO_20K' },
    { label: 'Lower Middle Income (₱20,000 - ₱40,000 / month)', value: 'LOWER_MIDDLE_20K_TO_40K' },
    { label: 'Middle Income (₱40,000 - ₱70,000 / month)', value: 'MIDDLE_40K_TO_70K' },
    { label: 'Upper Income (₱70,000+ / month)', value: 'UPPER_70K_PLUS' }
  ];

  readonly verificationStatusOptions = [
    { label: 'Verified (Compliant)', value: 'VERIFIED' },
    { label: 'Pending Verification (Requires Review)', value: 'PENDING_VERIFICATION' },
    { label: 'Rejected (Non-Compliant)', value: 'REJECTED' }
  ];

  readonly statusTagSeverity = computed(() => {
    const status = this.profile()?.verificationStatus;
    switch (status) {
      case 'VERIFIED': return 'success';
      case 'PENDING_VERIFICATION': return 'info';
      case 'REJECTED': return 'danger';
      case 'SELF_DECLARED':
      default: return 'warn';
    }
  });

  readonly statusTagLabel = computed(() => {
    const status = this.profile()?.verificationStatus;
    switch (status) {
      case 'VERIFIED': return 'VERIFIED';
      case 'PENDING_VERIFICATION': return 'PENDING VERIFICATION';
      case 'REJECTED': return 'REJECTED';
      case 'SELF_DECLARED':
      default: return 'SELF-DECLARED';
    }
  });

  constructor() {
    effect(() => {
      const sid = this.studentId();
      untracked(() => {
        if (this.hasInitialized) {
          this.loadProfile();
        }
      });
    });
  }

  ngOnInit(): void {
    this.setupConditionalValidators();
    this.loadProfile();
    this.hasInitialized = true;
  }

  ngOnDestroy(): void {
    if (this.equityWsSub) {
      this.equityWsSub.unsubscribe();
      this.equityWsSub = undefined;
    }
    this.subs.unsubscribe();
  }

  private setupConditionalValidators(): void {
    // 1. PWD: require pwdIdNumber & disabilityType when checked
    const pwdSub = this.equityForm.get('isPersonWithDisability')?.valueChanges.subscribe(isPwd => {
      const idCtrl = this.equityForm.get('pwdIdNumber');
      const typeCtrl = this.equityForm.get('disabilityType');
      if (isPwd) {
        idCtrl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
        typeCtrl?.setValidators([Validators.required]);
      } else {
        idCtrl?.clearValidators();
        idCtrl?.setValidators([Validators.maxLength(60)]);
        idCtrl?.setValue('');
        typeCtrl?.clearValidators();
        typeCtrl?.setValue(null);
      }
      idCtrl?.updateValueAndValidity();
      typeCtrl?.updateValueAndValidity();
    });
    if (pwdSub) this.subs.add(pwdSub);

    // 2. Solo Parent: require soloParentIdNumber when either isSoloParent or isRaisedBySoloParent is checked (isolated merge)
    const isSoloParentCtrl = this.equityForm.get('isSoloParent')!;
    const isRaisedBySoloParentCtrl = this.equityForm.get('isRaisedBySoloParent')!;
    const soloParentIdCtrl = this.equityForm.get('soloParentIdNumber')!;

    const soloSub = merge(isSoloParentCtrl.valueChanges, isRaisedBySoloParentCtrl.valueChanges).subscribe(() => {
      const isSolo = !!isSoloParentCtrl.value || !!isRaisedBySoloParentCtrl.value;
      if (isSolo) {
        if (!soloParentIdCtrl.hasValidator(Validators.required)) {
          soloParentIdCtrl.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
          soloParentIdCtrl.updateValueAndValidity({ emitEvent: false });
        }
      } else {
        if (soloParentIdCtrl.hasValidator(Validators.required)) {
          soloParentIdCtrl.clearValidators();
          soloParentIdCtrl.setValidators([Validators.maxLength(60)]);
          soloParentIdCtrl.setValue('', { emitEvent: false });
          soloParentIdCtrl.updateValueAndValidity({ emitEvent: false });
        }
      }
    });
    this.subs.add(soloSub);

    // 3. 4Ps: require household4psIdNumber when checked
    const fourPsSub = this.equityForm.get('is4psBeneficiary')?.valueChanges.subscribe(is4ps => {
      const ctrl = this.equityForm.get('household4psIdNumber');
      if (is4ps) {
        ctrl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValidators([Validators.maxLength(60)]);
        ctrl?.setValue('');
      }
      ctrl?.updateValueAndValidity();
    });
    if (fourPsSub) this.subs.add(fourPsSub);

    // 4. IP: require ipEthnicGroup & ncipCertificateNumber when checked
    const ipSub = this.equityForm.get('isIndigenousPeople')?.valueChanges.subscribe(isIp => {
      const groupCtrl = this.equityForm.get('ipEthnicGroup');
      const certCtrl = this.equityForm.get('ncipCertificateNumber');
      if (isIp) {
        groupCtrl?.setValidators([Validators.required, Validators.maxLength(100), noWhitespaceValidator()]);
        certCtrl?.setValidators([Validators.required, Validators.maxLength(100), noWhitespaceValidator()]);
      } else {
        groupCtrl?.clearValidators();
        groupCtrl?.setValidators([Validators.maxLength(100)]);
        groupCtrl?.setValue('');
        certCtrl?.clearValidators();
        certCtrl?.setValidators([Validators.maxLength(100)]);
        certCtrl?.setValue('');
      }
      groupCtrl?.updateValueAndValidity();
      certCtrl?.updateValueAndValidity();
    });
    if (ipSub) this.subs.add(ipSub);

    // 5. GIDA: require gidaBarangayResidence when checked
    const gidaSub = this.equityForm.get('isGidaResident')?.valueChanges.subscribe(isGida => {
      const ctrl = this.equityForm.get('gidaBarangayResidence');
      if (isGida) {
        ctrl?.setValidators([Validators.required, Validators.maxLength(150), noWhitespaceValidator()]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValidators([Validators.maxLength(150)]);
        ctrl?.setValue('');
      }
      ctrl?.updateValueAndValidity();
    });
    if (gidaSub) this.subs.add(gidaSub);

    // 6. Farmer / Fisherfolk: require rsbsaRegistrationNumber when checked
    const farmerSub = this.equityForm.get('isFarmerFisherfolk')?.valueChanges.subscribe(isFarmer => {
      const ctrl = this.equityForm.get('rsbsaRegistrationNumber');
      if (isFarmer) {
        ctrl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValidators([Validators.maxLength(60)]);
        ctrl?.setValue('');
      }
      ctrl?.updateValueAndValidity();
    });
    if (farmerSub) this.subs.add(farmerSub);

    // 7. Rebel Returnee Family: require certificateOfSurrenderNumber when checked
    const rebelSub = this.equityForm.get('isRebelReturneeFamily')?.valueChanges.subscribe(isRebel => {
      const ctrl = this.equityForm.get('certificateOfSurrenderNumber');
      if (isRebel) {
        ctrl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValidators([Validators.maxLength(60)]);
        ctrl?.setValue('');
      }
      ctrl?.updateValueAndValidity();
    });
    if (rebelSub) this.subs.add(rebelSub);
  }

  loadProfile(): void {
    this.isLoading.set(true);
    const sid = this.studentId();
    const fetch$ = (sid && sid !== '')
      ? this.equityApi.getEquityProfileByStudentProfileId(Number(sid))
      : this.equityApi.getMyEquityProfile();

    fetch$.subscribe({
      next: (data) => {
        this.profile.set(data);
        this.populateForm(data);
        if (this.isAdminMode()) {
          this.equityForm.disable({ emitEvent: false });
          this.auditForm.patchValue({
            verificationStatus: data.verificationStatus === 'SELF_DECLARED' ? 'VERIFIED' : data.verificationStatus,
            verificationRemarks: data.verificationRemarks || ''
          });
        } else {
          if (data.verificationStatus === 'VERIFIED') {
            this.equityForm.disable({ emitEvent: false });
          } else {
            this.equityForm.enable({ emitEvent: false });
          }
        }
        this.isLoading.set(false);

        const profileId = data.studentProfileId || (sid ? Number(sid) : 0);
        if (this.wsService && profileId > 0 && !this.equityWsSub) {
          this.equityWsSub = this.wsService.watch<any>(WS_TOPICS.EQUITY(profileId)).subscribe({
            next: (msg) => {
              if (msg) {
                const s = this.studentId();
                const refresh$ = (s && s !== '')
                  ? this.equityApi.getEquityProfileByStudentProfileId(Number(s))
                  : this.equityApi.getMyEquityProfile();
                refresh$.subscribe({
                  next: (refreshed) => {
                    this.profile.set(refreshed);
                    this.populateForm(refreshed);
                  }
                });
              }
            }
          });
          this.subs.add(this.equityWsSub);
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error Loading Equity Profile',
          detail: err?.error?.message || 'Failed to fetch statutory equity profile.'
        });
        this.isLoading.set(false);
      }
    });
  }

  private populateForm(data: StudentEquityProfileDto): void {
    this.equityForm.patchValue({
      isPersonWithDisability: data.isPersonWithDisability ?? false,
      pwdIdNumber: data.pwdIdNumber || '',
      disabilityType: data.disabilityType || null,

      isSoloParent: data.isSoloParent ?? false,
      isRaisedBySoloParent: data.isRaisedBySoloParent ?? false,
      soloParentIdNumber: data.soloParentIdNumber || '',

      is4psBeneficiary: data.is4psBeneficiary ?? false,
      household4psIdNumber: data.household4psIdNumber || '',
      isListahananNhts: data.isListahananNhts ?? false,
      unifastTesAwardee: data.unifastTesAwardee ?? false,
      unifastTesAwardNumber: data.unifastTesAwardNumber || '',

      isIndigenousPeople: data.isIndigenousPeople ?? false,
      ipEthnicGroup: data.ipEthnicGroup || '',
      ncipCertificateNumber: data.ncipCertificateNumber || '',

      isOrphan: data.isOrphan ?? false,

      isGidaResident: data.isGidaResident ?? false,
      gidaBarangayResidence: data.gidaBarangayResidence || '',

      isFarmerFisherfolk: data.isFarmerFisherfolk ?? false,
      rsbsaRegistrationNumber: data.rsbsaRegistrationNumber || '',

      isRebelReturneeFamily: data.isRebelReturneeFamily ?? false,
      certificateOfSurrenderNumber: data.certificateOfSurrenderNumber || '',

      isBottom40IncomeBracket: data.isBottom40IncomeBracket ?? false,
      monthlyHouseholdIncomeBracket: data.monthlyHouseholdIncomeBracket || 'POOR_BELOW_10K',

      isFirstGenerationCollege: data.isFirstGenerationCollege ?? false
    }, { emitEvent: false });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.equityForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  isAuditFieldInvalid(field: string): boolean {
    const ctrl = this.auditForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  saveProfile(): void {
    if (!this.canEditStudentFields()) {
      return;
    }

    if (this.equityForm.invalid) {
      this.equityForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete Declarations',
        detail: 'Please provide the required ID or Certificate numbers for all selected affirmative action indicators.'
      });
      return;
    }

    this.isSaving.set(true);
    const formVal = this.equityForm.getRawValue();

    const req: UpdateStudentEquityProfileRequest = {
      isPersonWithDisability: !!formVal.isPersonWithDisability,
      pwdIdNumber: formVal.isPersonWithDisability ? (formVal.pwdIdNumber?.trim() || null) : null,
      disabilityType: formVal.isPersonWithDisability ? (formVal.disabilityType || null) : null,

      isSoloParent: !!formVal.isSoloParent,
      isRaisedBySoloParent: !!formVal.isRaisedBySoloParent,
      soloParentIdNumber: (formVal.isSoloParent || formVal.isRaisedBySoloParent) ? (formVal.soloParentIdNumber?.trim() || null) : null,

      is4psBeneficiary: !!formVal.is4psBeneficiary,
      household4psIdNumber: formVal.is4psBeneficiary ? (formVal.household4psIdNumber?.trim() || null) : null,
      isListahananNhts: !!formVal.isListahananNhts,
      unifastTesAwardee: !!formVal.unifastTesAwardee,
      unifastTesAwardNumber: formVal.unifastTesAwardee ? (formVal.unifastTesAwardNumber?.trim() || null) : null,

      isIndigenousPeople: !!formVal.isIndigenousPeople,
      ipEthnicGroup: formVal.isIndigenousPeople ? (formVal.ipEthnicGroup?.trim() || null) : null,
      ncipCertificateNumber: formVal.isIndigenousPeople ? (formVal.ncipCertificateNumber?.trim() || null) : null,

      isOrphan: !!formVal.isOrphan,

      isGidaResident: !!formVal.isGidaResident,
      gidaBarangayResidence: formVal.isGidaResident ? (formVal.gidaBarangayResidence?.trim() || null) : null,

      isFarmerFisherfolk: !!formVal.isFarmerFisherfolk,
      rsbsaRegistrationNumber: formVal.isFarmerFisherfolk ? (formVal.rsbsaRegistrationNumber?.trim() || null) : null,

      isRebelReturneeFamily: !!formVal.isRebelReturneeFamily,
      certificateOfSurrenderNumber: formVal.isRebelReturneeFamily ? (formVal.certificateOfSurrenderNumber?.trim() || null) : null,

      isBottom40IncomeBracket: !!formVal.isBottom40IncomeBracket,
      monthlyHouseholdIncomeBracket: formVal.monthlyHouseholdIncomeBracket,

      isFirstGenerationCollege: !!formVal.isFirstGenerationCollege
    };

    this.equityApi.updateMyEquityProfile(req).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.populateForm(updated);
        if (updated.verificationStatus === 'VERIFIED') {
          this.equityForm.disable({ emitEvent: false });
        }
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Equity Profile Saved',
          detail: 'Your statutory equity indicator profile has been updated successfully.'
        });
      },
      error: (err) => {
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: err?.error?.message || 'An error occurred while saving your equity profile.'
        });
      }
    });
  }

  submitAuditDecision(): void {
    const prof = this.profile();
    if (!prof || !prof.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Audit Error',
        detail: 'No active student equity profile is loaded to audit.'
      });
      return;
    }

    if (this.auditForm.invalid) {
      this.auditForm.markAllAsTouched();
      return;
    }

    this.isAuditing.set(true);
    const formVal = this.auditForm.value;
    const req: VerifyEquityProfileRequest = {
      verificationStatus: formVal.verificationStatus,
      verificationRemarks: formVal.verificationRemarks ? formVal.verificationRemarks.trim() : ''
    };

    this.equityApi.verifyEquityProfile(prof.id, req).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.auditForm.patchValue({
          verificationStatus: updated.verificationStatus,
          verificationRemarks: updated.verificationRemarks || ''
        });
        this.isAuditing.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Audit Decision Recorded',
          detail: `Student equity profile verification status set to ${updated.verificationStatus}.`
        });
      },
      error: (err) => {
        this.isAuditing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Audit Submission Failed',
          detail: err?.error?.message || 'Failed to record equity profile audit decision.'
        });
      }
    });
  }
}
