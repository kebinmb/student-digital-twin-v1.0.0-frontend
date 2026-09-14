// File: src/app/features/compliance/student-equity-profiling/student-equity-profiling.component.ts

import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ChangeDetectionStrategy,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Subscription } from 'rxjs';

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

import { EquityApiService } from '../../../core/service/compliance/equity-api.service';
import {
  StudentEquityProfileDto,
  UpdateStudentEquityProfileRequest,
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
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    TagModule,
    SkeletonModule,
    TooltipModule
  ],
  templateUrl: './student-equity-profiling.component.html',
  styleUrl: './student-equity-profiling.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentEquityProfilingComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly equityApi = inject(EquityApiService);
  private readonly messageService = inject(MessageService);

  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly profile = signal<StudentEquityProfileDto | null>(null);

  private readonly subs = new Subscription();

  // Reactive Form Group
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

  ngOnInit(): void {
    this.setupConditionalValidators();
    this.loadProfile();
  }

  ngOnDestroy(): void {
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
        idCtrl?.setValue('');
        typeCtrl?.clearValidators();
        typeCtrl?.setValue(null);
      }
      idCtrl?.updateValueAndValidity();
      typeCtrl?.updateValueAndValidity();
    });
    if (pwdSub) this.subs.add(pwdSub);

    // 2. Solo Parent: require soloParentIdNumber when either isSoloParent or isRaisedBySoloParent is checked
    const soloSub = this.equityForm.valueChanges.subscribe(val => {
      const isSolo = val.isSoloParent || val.isRaisedBySoloParent;
      const soloIdCtrl = this.equityForm.get('soloParentIdNumber');
      if (isSolo) {
        if (!soloIdCtrl?.hasValidator(Validators.required)) {
          soloIdCtrl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
          soloIdCtrl?.updateValueAndValidity({ emitEvent: false });
        }
      } else {
        if (soloIdCtrl?.hasValidator(Validators.required)) {
          soloIdCtrl?.clearValidators();
          soloIdCtrl?.setValue('', { emitEvent: false });
          soloIdCtrl?.updateValueAndValidity({ emitEvent: false });
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
        groupCtrl?.setValue('');
        certCtrl?.clearValidators();
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
        ctrl?.setValue('');
      }
      ctrl?.updateValueAndValidity();
    });
    if (rebelSub) this.subs.add(rebelSub);
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.equityApi.getMyEquityProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.populateForm(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error Loading Equity Profile',
          detail: err?.error?.message || 'Failed to fetch equity profile declaration.'
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
    });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.equityForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  saveProfile(): void {
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
    const formVal = this.equityForm.value;

    const req: UpdateStudentEquityProfileRequest = {
      isPersonWithDisability: !!formVal.isPersonWithDisability,
      pwdIdNumber: formVal.pwdIdNumber ? formVal.pwdIdNumber.trim() : undefined,
      disabilityType: formVal.disabilityType || undefined,

      isSoloParent: !!formVal.isSoloParent,
      isRaisedBySoloParent: !!formVal.isRaisedBySoloParent,
      soloParentIdNumber: formVal.soloParentIdNumber ? formVal.soloParentIdNumber.trim() : undefined,

      is4psBeneficiary: !!formVal.is4psBeneficiary,
      household4psIdNumber: formVal.household4psIdNumber ? formVal.household4psIdNumber.trim() : undefined,
      isListahananNhts: !!formVal.isListahananNhts,
      unifastTesAwardee: !!formVal.unifastTesAwardee,
      unifastTesAwardNumber: formVal.unifastTesAwardNumber ? formVal.unifastTesAwardNumber.trim() : undefined,

      isIndigenousPeople: !!formVal.isIndigenousPeople,
      ipEthnicGroup: formVal.ipEthnicGroup ? formVal.ipEthnicGroup.trim() : undefined,
      ncipCertificateNumber: formVal.ncipCertificateNumber ? formVal.ncipCertificateNumber.trim() : undefined,

      isOrphan: !!formVal.isOrphan,

      isGidaResident: !!formVal.isGidaResident,
      gidaBarangayResidence: formVal.gidaBarangayResidence ? formVal.gidaBarangayResidence.trim() : undefined,

      isFarmerFisherfolk: !!formVal.isFarmerFisherfolk,
      rsbsaRegistrationNumber: formVal.rsbsaRegistrationNumber ? formVal.rsbsaRegistrationNumber.trim() : undefined,

      isRebelReturneeFamily: !!formVal.isRebelReturneeFamily,
      certificateOfSurrenderNumber: formVal.certificateOfSurrenderNumber ? formVal.certificateOfSurrenderNumber.trim() : undefined,

      isBottom40IncomeBracket: !!formVal.isBottom40IncomeBracket,
      monthlyHouseholdIncomeBracket: formVal.monthlyHouseholdIncomeBracket,

      isFirstGenerationCollege: !!formVal.isFirstGenerationCollege
    };

    this.equityApi.updateMyEquityProfile(req).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.populateForm(updated);
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
}
