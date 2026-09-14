import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  AsyncValidatorFn
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription, interval, of, timer, Observable } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

// PrimeNG Modules & Services
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { StepsModule } from 'primeng/steps';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, MenuItem } from 'primeng/api';

import { AdmissionApiService } from '../../../core/service/admission/admission-api.service';
import {
  AdmissionApplicationResponse,
  AdmissionConfigDto,
  EntranceExamSlotResponse,
  PublicProgramDto,
  PublicTermDto,
  QueueTokenResponse,
  SubmitAdmissionRequest
} from '../../../core/models/admission.model';

export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined) return null;
    const isWhitespace = (control.value.toString() || '').trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  };
}

export function applicantAgeValidator(minAge = 15, maxAge = 80): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const selectedDate = new Date(control.value);
    if (isNaN(selectedDate.getTime())) return { invalidDate: true };

    const today = new Date();
    let age = today.getFullYear() - selectedDate.getFullYear();
    const m = today.getMonth() - selectedDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) {
      age--;
    }

    if (age < minAge) return { minAge: { requiredAge: minAge, actualAge: age } };
    if (age > maxAge) return { maxAge: { requiredAge: maxAge, actualAge: age } };
    return null;
  };
}

@Component({
  selector: 'app-guest-admission',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    CheckboxModule,
    RadioButtonModule,
    StepsModule,
    TagModule,
    DialogModule,
    ProgressBarModule,
    ToastModule,
    MessageModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './guest-admission.component.html',
  styleUrl: './guest-admission.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestAdmissionComponent implements OnInit, OnDestroy {
  private readonly admissionApi = inject(AdmissionApiService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  activeTab = signal<'apply' | 'track'>('apply');
  currentStep = signal<number>(1);
  currentStepIndex = computed(() => this.currentStep() - 1);
  submitting = signal<boolean>(false);
  trackingSearched = signal<boolean>(false);

  queueTokenInfo = signal<QueueTokenResponse | null>(null);
  queueRemainingSeconds = signal<number | null>(null);
  isQueueExpired = signal<boolean>(false);

  isQueueExpiringSoon = computed(() => {
    const rem = this.queueRemainingSeconds();
    return rem !== null && rem > 0 && rem <= 120 && !this.isQueueExpired();
  });

  queueTimeRemainingFormatted = computed(() => {
    const rem = this.queueRemainingSeconds();
    if (rem === null || rem <= 0) return '00:00';
    const mins = Math.floor(rem / 60);
    const secs = rem % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  showQueueModal = computed(() => {
    const q = this.queueTokenInfo();
    return q !== null && !q.allowedToProceed && this.activeTab() === 'apply';
  });

  queueProgressPercent = computed(() => {
    const pos = this.queueTokenInfo()?.queuePosition || 1;
    return Math.max(10, Math.min(95, 100 - pos * 10));
  });

  submittedApplication = signal<AdmissionApplicationResponse | null>(null);
  trackedApplication = signal<AdmissionApplicationResponse | null>(null);
  trackNumberInput: string = '';

  publicPrograms = signal<PublicProgramDto[]>([]);
  publicTerms = signal<PublicTermDto[]>([]);
  activeTermLabel = signal<string>('Loading active term...');
  examSlots = signal<EntranceExamSlotResponse[]>([]);
  admissionConfig = signal<AdmissionConfigDto | null>(null);
  isAdmissionLocked = computed(() => !this.admissionConfig()?.isActive);
  loadingPrograms = signal<boolean>(false);
  loadingSlots = signal<boolean>(false);

  programOptions = computed(() =>
    this.publicPrograms().map(p => ({ label: `${p.code} - ${p.name}`, value: p.id }))
  );

  wizardStepItems: MenuItem[] = [
    { label: 'Program & Personal' },
    { label: 'Form 137 & Academic' },
    { label: 'Address & Emergency' },
    { label: 'Statutory Equity' },
    { label: 'Exam Slot Booking' }
  ];

  genderOptions = [
    { label: 'Female', value: 'FEMALE' },
    { label: 'Male', value: 'MALE' },
    { label: 'Other / Prefer not to say', value: 'OTHER' }
  ];

  civilStatusOptions = [
    { label: 'Single', value: 'SINGLE' },
    { label: 'Married', value: 'MARRIED' },
    { label: 'Widowed', value: 'WIDOWED' },
    { label: 'Separated', value: 'SEPARATED' }
  ];

  schoolTypeOptions = [
    { label: 'Public High School', value: 'PUBLIC' },
    { label: 'Private High School', value: 'PRIVATE' },
    { label: 'SUC / LUC High School', value: 'STATE_UNIVERSITY' }
  ];

  readonly incomeBracketOptions = [
    { label: 'Poor (Below ₱10,000 / month)', value: 'POOR_BELOW_10K' },
    { label: 'Low Income (₱10,000 - ₱20,000 / month)', value: 'LOW_INCOME_10K_TO_20K' },
    { label: 'Lower Middle Income (₱20,000 - ₱40,000 / month)', value: 'LOWER_MIDDLE_20K_TO_40K' },
    { label: 'Middle Income (₱40,000 - ₱70,000 / month)', value: 'MIDDLE_40K_TO_70K' },
    { label: 'Upper Income (₱70,000+ / month)', value: 'UPPER_70K_PLUS' }
  ];

  private readonly stepFieldsMap: Record<number, string[]> = {
    1: ['targetProgramId', 'termId', 'firstName', 'lastName', 'birthDate', 'gender', 'civilStatus', 'citizenship', 'mobileNumber', 'email'],
    2: ['highSchoolName', 'highSchoolType', 'lrnNumber', 'highSchoolGwa'],
    3: ['streetAddress', 'barangay', 'cityMunicipality', 'province', 'zipCode', 'emergencyContactName', 'emergencyContactRelationship', 'emergencyContactNumber', 'emergencyContactEmail'],
    4: [
      'is4psBeneficiary', 'household4psIdNumber',
      'isIndigenousPeople', 'ipEthnicGroup', 'ncipCertificateNumber',
      'isPersonWithDisability', 'disabilityType', 'pwdIdNumber',
      'isSoloParent', 'isRaisedBySoloParent', 'soloParentIdNumber',
      'isOrphan',
      'isGidaResident', 'gidaBarangayResidence',
      'isFarmerFisherfolk', 'rsbsaRegistrationNumber',
      'isRebelReturneeFamily', 'certificateOfSurrenderNumber',
      'isBottom40IncomeBracket', 'monthlyHouseholdIncomeBracket',
      'isFirstGenerationCollege'
    ],
    5: ['examSlotId']
  };

  private queuePollSubscription?: Subscription;
  private queueCountdownSub?: Subscription;
  private readonly equitySubs = new Subscription();

  private createEmailValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const val = control.value;
      if (!val) {
        return of(null);
      }
      const email = val.toString().trim();
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return of(null);
      }
      return timer(400).pipe(
        switchMap(() => {
          const termId = control.parent?.get('termId')?.value || undefined;
          return this.admissionApi.checkEmailAvailability(email, termId).pipe(
            map(res => (res && !res.available ? { emailTaken: true } : null)),
            catchError(() => of(null))
          );
        })
      );
    };
  }

  // Schema-aligned constraints:
  // Names: VARCHAR(50), Suffix: VARCHAR(10), Mobile: 11 Digits (09XXXXXXXXX)
  admissionForm: FormGroup = this.fb.group({
    targetProgramId: [null, [Validators.required]],
    termId: [{ value: null, disabled: true }, [Validators.required]],
    examSlotId: [null],
    firstName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      noWhitespaceValidator(),
      Validators.pattern(/^[a-zA-Z\sñÑ\-'.]+$/)
    ]],
    middleName: ['', [
      Validators.maxLength(50),
      Validators.pattern(/^[a-zA-Z\sñÑ\-'.]*$/)
    ]],
    lastName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      noWhitespaceValidator(),
      Validators.pattern(/^[a-zA-Z\sñÑ\-'.]+$/)
    ]],
    suffix: ['', [
      Validators.maxLength(10),
      Validators.pattern(/^[a-zA-Z0-9.\s]*$/)
    ]],
    birthDate: ['', [Validators.required, applicantAgeValidator(15, 80)]],
    gender: ['FEMALE', [Validators.required]],
    civilStatus: ['SINGLE', [Validators.required]],
    citizenship: ['FILIPINO', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
    mobileNumber: ['', [
      Validators.required,
      Validators.pattern(/^09\d{9}$/)
    ]],
    email: ['', [
      Validators.required,
      Validators.maxLength(100),
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ], [
      this.createEmailValidator()
    ]],
    lrnNumber: ['', [Validators.pattern(/^\d{12}$/)]],
    highSchoolName: ['', [Validators.required, Validators.maxLength(150), noWhitespaceValidator()]],
    highSchoolType: ['PUBLIC', [Validators.required]],
    shsTrackAndStrand: ['', [Validators.maxLength(100)]],
    highSchoolGwa: [null, [Validators.required, Validators.min(75), Validators.max(100)]],
    streetAddress: ['', [Validators.required, Validators.maxLength(255), noWhitespaceValidator()]],
    barangay: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
    cityMunicipality: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
    province: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
    zipCode: ['', [Validators.pattern(/^\d{4}$/)]],
    emergencyContactName: ['', [
      Validators.required,
      Validators.maxLength(100),
      noWhitespaceValidator(),
      Validators.pattern(/^[a-zA-Z\sñÑ\-'.]+$/)
    ]],
    emergencyContactRelationship: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
    emergencyContactNumber: ['', [
      Validators.required,
      Validators.pattern(/^09\d{9}$/)
    ]],
    emergencyContactEmail: ['', [
      Validators.maxLength(100),
      Validators.pattern(/^$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ]],

    // 1. DSWD 4Ps
    is4psBeneficiary: [false],
    household4psIdNumber: ['', [Validators.maxLength(60)]],

    // 2. IPRA Indigenous Peoples
    isIndigenousPeople: [false],
    ipEthnicGroup: ['', [Validators.maxLength(100)]],
    ncipCertificateNumber: ['', [Validators.maxLength(100)]],

    // 3. Person with Disability
    isPersonWithDisability: [false],
    disabilityType: ['', [Validators.maxLength(60)]],
    pwdIdNumber: ['', [Validators.maxLength(60)]],

    // 4. Solo Parent & Raised by Solo Parent
    isSoloParent: [false],
    isRaisedBySoloParent: [false],
    soloParentIdNumber: ['', [Validators.maxLength(60)]],

    // 5. Orphan Status
    isOrphan: [false],

    // 6. GIDA Resident
    isGidaResident: [false],
    gidaBarangayResidence: ['', [Validators.maxLength(150)]],

    // 7. Subsistence Farmer / Fisherfolk
    isFarmerFisherfolk: [false],
    rsbsaRegistrationNumber: ['', [Validators.maxLength(60)]],

    // 8. Rebel Returnee Family
    isRebelReturneeFamily: [false],
    certificateOfSurrenderNumber: ['', [Validators.maxLength(60)]],

    // 9. Bottom 40% & Income Bracket
    isBottom40IncomeBracket: [false],
    monthlyHouseholdIncomeBracket: ['POOR_BELOW_10K', [Validators.required]],

    // 10. First-Generation College Student
    isFirstGenerationCollege: [false]
  });

  ngOnInit(): void {
    this.setupConditionalValidators();
    this.loadInitialData();
    this.initQueueToken();
  }

  ngOnDestroy(): void {
    if (this.queuePollSubscription) {
      this.queuePollSubscription.unsubscribe();
    }
    if (this.queueCountdownSub) {
      this.queueCountdownSub.unsubscribe();
    }
    this.equitySubs.unsubscribe();
  }

  private setupConditionalValidators(): void {
    // 1. 4Ps
    const fourPsSub = this.admissionForm.get('is4psBeneficiary')?.valueChanges.subscribe(is4ps => {
      const idControl = this.admissionForm.get('household4psIdNumber');
      if (is4ps) {
        idControl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
      } else {
        idControl?.clearValidators();
        idControl?.setValue('');
      }
      idControl?.updateValueAndValidity();
    });
    if (fourPsSub) this.equitySubs.add(fourPsSub);

    // 2. IP
    const ipSub = this.admissionForm.get('isIndigenousPeople')?.valueChanges.subscribe(isIp => {
      const groupControl = this.admissionForm.get('ipEthnicGroup');
      const certControl = this.admissionForm.get('ncipCertificateNumber');
      if (isIp) {
        groupControl?.setValidators([Validators.required, Validators.maxLength(100), noWhitespaceValidator()]);
        certControl?.setValidators([Validators.required, Validators.maxLength(100), noWhitespaceValidator()]);
      } else {
        groupControl?.clearValidators();
        groupControl?.setValue('');
        certControl?.clearValidators();
        certControl?.setValue('');
      }
      groupControl?.updateValueAndValidity();
      certControl?.updateValueAndValidity();
    });
    if (ipSub) this.equitySubs.add(ipSub);

    // 3. PWD
    const pwdSub = this.admissionForm.get('isPersonWithDisability')?.valueChanges.subscribe(isPwd => {
      const typeControl = this.admissionForm.get('disabilityType');
      const pwdIdControl = this.admissionForm.get('pwdIdNumber');
      if (isPwd) {
        typeControl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
        pwdIdControl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
      } else {
        typeControl?.clearValidators();
        typeControl?.setValue('');
        pwdIdControl?.clearValidators();
        pwdIdControl?.setValue('');
      }
      typeControl?.updateValueAndValidity();
      pwdIdControl?.updateValueAndValidity();
    });
    if (pwdSub) this.equitySubs.add(pwdSub);

    // 4. Solo Parent
    const soloSub = this.admissionForm.valueChanges.subscribe(val => {
      const isSolo = val.isSoloParent || val.isRaisedBySoloParent;
      const soloIdControl = this.admissionForm.get('soloParentIdNumber');
      if (isSolo) {
        if (!soloIdControl?.hasValidator(Validators.required)) {
          soloIdControl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
          soloIdControl?.updateValueAndValidity({ emitEvent: false });
        }
      } else {
        if (soloIdControl?.hasValidator(Validators.required)) {
          soloIdControl?.clearValidators();
          soloIdControl?.setValue('', { emitEvent: false });
          soloIdControl?.updateValueAndValidity({ emitEvent: false });
        }
      }
    });
    this.equitySubs.add(soloSub);

    // 5. GIDA
    const gidaSub = this.admissionForm.get('isGidaResident')?.valueChanges.subscribe(isGida => {
      const gidaControl = this.admissionForm.get('gidaBarangayResidence');
      if (isGida) {
        gidaControl?.setValidators([Validators.required, Validators.maxLength(150), noWhitespaceValidator()]);
      } else {
        gidaControl?.clearValidators();
        gidaControl?.setValue('');
      }
      gidaControl?.updateValueAndValidity();
    });
    if (gidaSub) this.equitySubs.add(gidaSub);

    // 6. Farmer / Fisherfolk
    const farmerSub = this.admissionForm.get('isFarmerFisherfolk')?.valueChanges.subscribe(isFarmer => {
      const rsbsaControl = this.admissionForm.get('rsbsaRegistrationNumber');
      if (isFarmer) {
        rsbsaControl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
      } else {
        rsbsaControl?.clearValidators();
        rsbsaControl?.setValue('');
      }
      rsbsaControl?.updateValueAndValidity();
    });
    if (farmerSub) this.equitySubs.add(farmerSub);

    // 7. Rebel Returnee Family
    const rebelSub = this.admissionForm.get('isRebelReturneeFamily')?.valueChanges.subscribe(isRebel => {
      const certControl = this.admissionForm.get('certificateOfSurrenderNumber');
      if (isRebel) {
        certControl?.setValidators([Validators.required, Validators.maxLength(60), noWhitespaceValidator()]);
      } else {
        certControl?.clearValidators();
        certControl?.setValue('');
      }
      certControl?.updateValueAndValidity();
    });
    if (rebelSub) this.equitySubs.add(rebelSub);
  }

  private loadInitialData(): void {
    this.loadingPrograms.set(true);
    this.admissionApi.getPublicPrograms().subscribe({
      next: progs => {
        this.publicPrograms.set(progs);
        this.loadingPrograms.set(false);
      },
      error: () => {
        this.loadingPrograms.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load public academic programs.' });
      }
    });

    this.admissionApi.getPublicTerms().subscribe({
      next: termsList => {
        this.publicTerms.set(termsList);
        const activeTerm = termsList.find(t => t.isActive) || (termsList.length > 0 ? termsList[0] : null);
        if (activeTerm) {
          this.admissionForm.get('termId')?.setValue(activeTerm.id);
          this.activeTermLabel.set(this.formatAcademicTerm(activeTerm.academicYearCode, activeTerm.termType));
          this.loadAdmissionConfig(activeTerm.id);
          this.loadExamSlots(activeTerm.id);
        } else {
          this.activeTermLabel.set('No active academic term configured.');
          this.loadAdmissionConfig();
        }
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load academic terms.' })
    });
  }

  initQueueToken(): void {
    this.admissionApi.requestQueueToken({ clientIdentifier: 'guest-' + Date.now() }).subscribe({
      next: res => {
        this.queueTokenInfo.set(res);
        if (res.allowedToProceed) {
          this.isQueueExpired.set(false);
          this.startQueueCountdown(res.expiresAt, res.ttlSeconds);
        } else {
          this.startQueuePolling(res.queueToken);
        }
      },
      error: err => console.warn('Queue init fallback', err)
    });
  }

  private startQueuePolling(token: string): void {
    if (this.queuePollSubscription) this.queuePollSubscription.unsubscribe();
    this.queuePollSubscription = interval(5000).subscribe(() => {
      this.admissionApi.checkQueueStatus(token).subscribe({
        next: statusRes => {
          this.queueTokenInfo.set(statusRes);
          if (statusRes.allowedToProceed) {
            if (this.queuePollSubscription) {
              this.queuePollSubscription.unsubscribe();
            }
            this.isQueueExpired.set(false);
            this.startQueueCountdown(statusRes.expiresAt, statusRes.ttlSeconds);
          }
        }
      });
    });
  }

  private startQueueCountdown(expiresAtStr?: string, ttlSeconds?: number): void {
    if (this.queueCountdownSub) {
      this.queueCountdownSub.unsubscribe();
    }

    let expiryMs: number;
    if (expiresAtStr) {
      const parsed = new Date(expiresAtStr).getTime();
      expiryMs = isNaN(parsed) ? Date.now() + (ttlSeconds ?? 600) * 1000 : parsed;
    } else if (ttlSeconds !== undefined && ttlSeconds !== null) {
      expiryMs = Date.now() + ttlSeconds * 1000;
    } else {
      expiryMs = Date.now() + 600 * 1000;
    }

    const calcRemaining = () => Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
    const initialRem = calcRemaining();
    this.queueRemainingSeconds.set(initialRem);
    this.isQueueExpired.set(initialRem <= 0);

    if (initialRem > 0) {
      this.queueCountdownSub = interval(1000).subscribe(() => {
        const rem = calcRemaining();
        this.queueRemainingSeconds.set(rem);
        if (rem <= 0) {
          this.isQueueExpired.set(true);
          if (this.queueCountdownSub) {
            this.queueCountdownSub.unsubscribe();
          }
          this.messageService.add({
            severity: 'warn',
            summary: 'Queue Session Expired',
            detail: 'Your application queue window has expired. Please refresh your queue spot to submit.'
          });
        }
      });
    }
  }

  refreshQueueToken(): void {
    this.isQueueExpired.set(false);
    this.initQueueToken();
    this.messageService.add({
      severity: 'info',
      summary: 'Refreshing Queue Spot',
      detail: 'Acquiring a fresh queue token. Your entered application data remains intact.'
    });
  }

  switchToTrackTab(): void {
    this.activeTab.set('track');
    this.messageService.add({
      severity: 'info',
      summary: 'Track Application',
      detail: 'Enter your application reference number to check your status.'
    });
  }

  private loadAdmissionConfig(termId?: number): void {
    this.admissionApi.getPublicAdmissionConfig(termId).subscribe({
      next: cfg => this.admissionConfig.set(cfg),
      error: err => console.warn('Failed to load admission config', err)
    });
  }

  private loadExamSlots(termId: number): void {
    this.loadingSlots.set(true);
    this.admissionApi.getAvailableExamSlots(termId).subscribe({
      next: slots => {
        this.examSlots.set(slots);
        this.loadingSlots.set(false);
      },
      error: err => {
        this.loadingSlots.set(false);
        console.warn('Failed to load exam slots', err);
      }
    });
  }

  selectExamSlot(slotId: number): void {
    this.admissionForm.patchValue({ examSlotId: slotId });
    this.admissionForm.get('examSlotId')?.markAsDirty();
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.admissionForm.get(fieldName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  getFieldError(fieldName: string): string {
    const control = this.admissionForm.get(fieldName);
    if (!control || !control.errors || !(control.touched || control.dirty)) return '';

    if (control.errors['required'] || control.errors['whitespace']) return 'This field is required.';
    if (control.errors['emailTaken']) return 'This email address is already registered for this admission term.';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters required.`;
    if (control.errors['maxlength']) return `Maximum allowed length is ${control.errors['maxlength'].requiredLength} characters.`;
    if (control.errors['minAge']) return `Applicant must be at least ${control.errors['minAge'].requiredAge} years old.`;
    if (control.errors['maxAge']) return `Please enter a valid birth year (under ${control.errors['maxAge'].requiredAge} years old).`;
    if (control.errors['invalidDate']) return 'Please enter a valid calendar date.';

    if (control.errors['pattern']) {
      if (fieldName === 'mobileNumber' || fieldName === 'emergencyContactNumber') {
        return 'Must be an 11-digit mobile number starting with 09 (e.g. 09171234567).';
      }
      if (fieldName === 'lrnNumber') {
        return 'DepEd LRN must be exactly 12 numeric digits.';
      }
      if (fieldName === 'zipCode') {
        return 'ZIP code must be 4 digits.';
      }
      if (fieldName === 'email' || fieldName === 'emergencyContactEmail') {
        return 'Please enter a valid email address (e.g. applicant@domain.com).';
      }
      if (fieldName === 'firstName' || fieldName === 'lastName' || fieldName === 'middleName' || fieldName === 'emergencyContactName') {
        return 'Name should contain letters, spaces, hyphens, and apostrophes only.';
      }
      if (fieldName === 'suffix') {
        return 'Suffix must be alphanumeric (e.g. Jr, III, Sr).';
      }
    }

    if (control.errors['min'] || control.errors['max']) {
      return 'GWA must be between 75.00 and 100.00.';
    }

    return 'Invalid input.';
  }

  isStepValid(step: number): boolean {
    const fields = this.stepFieldsMap[step] || [];
    let valid = true;

    for (const field of fields) {
      const control = this.admissionForm.get(field);
      if (field === 'household4psIdNumber' && !this.admissionForm.get('is4psBeneficiary')?.value) continue;
      if (field === 'ipEthnicGroup' && !this.admissionForm.get('isIndigenousPeople')?.value) continue;
      if (field === 'ncipCertificateNumber' && !this.admissionForm.get('isIndigenousPeople')?.value) continue;
      if (field === 'disabilityType' && !this.admissionForm.get('isPersonWithDisability')?.value) continue;
      if (field === 'pwdIdNumber' && !this.admissionForm.get('isPersonWithDisability')?.value) continue;
      if (field === 'soloParentIdNumber' && !this.admissionForm.get('isSoloParent')?.value && !this.admissionForm.get('isRaisedBySoloParent')?.value) continue;
      if (field === 'gidaBarangayResidence' && !this.admissionForm.get('isGidaResident')?.value) continue;
      if (field === 'rsbsaRegistrationNumber' && !this.admissionForm.get('isFarmerFisherfolk')?.value) continue;
      if (field === 'certificateOfSurrenderNumber' && !this.admissionForm.get('isRebelReturneeFamily')?.value) continue;

      if (control && control.invalid) {
        valid = false;
        control.markAsTouched();
        control.markAsDirty();
      }
    }
    return valid;
  }

  nextStep(): void {
    if (this.isAdmissionLocked()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Admission Closed',
        detail: 'Public admission applications are currently closed by Admin / Guidance.'
      });
      return;
    }

    if (this.isStepValid(this.currentStep())) {
      this.currentStep.update(s => Math.min(5, s + 1));
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete Section',
        detail: 'Please complete all required fields highlighted in red before proceeding.'
      });
    }
  }

  prevStep(): void {
    this.currentStep.update(s => Math.max(1, s - 1));
  }

  onSubmit(): void {
    if (this.isAdmissionLocked()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Admission Closed',
        detail: 'Public admission applications are currently closed by Admin / Guidance.'
      });
      return;
    }

    if (this.isQueueExpired()) {
      this.refreshQueueToken();
      return;
    }

    if (this.admissionForm.invalid) {
      this.admissionForm.markAllAsTouched();
      for (let s = 1; s <= 5; s++) {
        if (!this.isStepValid(s)) {
          this.currentStep.set(s);
          break;
        }
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Incomplete Form',
        detail: 'Please correct highlighted errors in the form before submitting.'
      });
      return;
    }

    this.submitting.set(true);

    const formVal = this.admissionForm.getRawValue();
    const req: SubmitAdmissionRequest = {
      ...formVal,
      queueToken: this.queueTokenInfo()?.queueToken
    };

    this.admissionApi.submitApplication(req).subscribe({
      next: res => {
        this.submitting.set(false);
        this.submittedApplication.set(res);
        if (this.queueCountdownSub) {
          this.queueCountdownSub.unsubscribe();
        }
        this.messageService.add({ severity: 'success', summary: 'Application Submitted', detail: 'Exam slot booking confirmed.' });
      },
      error: err => {
        this.submitting.set(false);
        const errDetail = err.error?.detail || err.error?.message || err.message || '';
        const isQueueSessionExpired =
          err.error?.errorCode === 'QUEUE_SESSION_EXPIRED' ||
          err.error?.code === 'QUEUE_SESSION_EXPIRED' ||
          errDetail.includes('QUEUE_SESSION_EXPIRED') ||
          errDetail.toLowerCase().includes('queuing session has expired');

        if (isQueueSessionExpired) {
          this.isQueueExpired.set(true);
          this.messageService.add({
            severity: 'error',
            summary: 'Queue Session Expired',
            detail: 'Your queuing window has expired. Your form entries have been preserved! Please click "Refresh Queue Spot" to acquire a fresh token and proceed.'
          });
        } else {
          const msg = err.error?.detail || err.error?.message || err.message || 'Submission failed.';
          this.messageService.add({ severity: 'error', summary: 'Submission Failed', detail: msg });
        }
      }
    });
  }

  trackApplication(): void {
    if (!this.trackNumberInput.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Reference Required', detail: 'Please enter an application reference number.' });
      return;
    }
    this.trackingSearched.set(true);
    this.admissionApi.trackApplication(this.trackNumberInput.trim()).subscribe({
      next: res => {
        this.trackedApplication.set(res);
        this.messageService.add({ severity: 'success', summary: 'Record Found', detail: 'Application tracking updated.' });
      },
      error: () => {
        this.trackedApplication.set(null);
        this.messageService.add({ severity: 'warn', summary: 'Not Found', detail: 'No application found with that reference number.' });
      }
    });
  }

  printTicket(): void {
    window.print();
  }

  resetForm(): void {
    this.submittedApplication.set(null);
    this.currentStep.set(1);
    this.admissionForm.reset({
      gender: 'FEMALE',
      civilStatus: 'SINGLE',
      citizenship: 'FILIPINO',
      highSchoolType: 'PUBLIC',
      is4psBeneficiary: false,
      isIndigenousPeople: false,
      isPersonWithDisability: false,
      isSoloParent: false,
      isRaisedBySoloParent: false,
      isOrphan: false,
      isGidaResident: false,
      isFarmerFisherfolk: false,
      isRebelReturneeFamily: false,
      isBottom40IncomeBracket: false,
      monthlyHouseholdIncomeBracket: 'POOR_BELOW_10K',
      isFirstGenerationCollege: false
    });
    const activeTerm = this.publicTerms().find(t => t.isActive);
    if (activeTerm) {
      this.admissionForm.get('termId')?.setValue(activeTerm.id);
      this.activeTermLabel.set(this.formatAcademicTerm(activeTerm.academicYearCode, activeTerm.termType));
    }
    this.initQueueToken();
  }

  private formatAcademicTerm(ayCode?: string, termType?: string): string {
    if (!ayCode || !termType) return 'N/A';

    const normalizedAy = ayCode.replace(/^AY[-_]?/i, 'A.Y. ').replace('-', '–');

    const termMap: Record<string, string> = {
      'FIRST_SEM': '1st Semester',
      'SECOND_SEM': '2nd Semester',
      'SUMMER': 'Summer Term',
      'MIDYEAR': 'Midyear Term',
      'TRIMESTER_1': '1st Trimester',
      'TRIMESTER_2': '2nd Trimester',
      'TRIMESTER_3': '3rd Trimester'
    };

    const normalizedSem = termMap[termType.toUpperCase()] || termType.replace(/_/g, ' ');

    return `${normalizedAy} • ${normalizedSem}`;
  }

  allowDigitsOnly(event: KeyboardEvent): boolean {
    const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab'];
    if (allowedKeys.includes(event.key)) {
      return true;
    }
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  sanitizeNumberInput(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 11);
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
      this.admissionForm.get(controlName)?.setValue(digitsOnly);
    }
  }
}