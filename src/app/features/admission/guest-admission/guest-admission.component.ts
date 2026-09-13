import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';

// PrimeNG 21 Modules & Services
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
  examSlots = signal<EntranceExamSlotResponse[]>([]);
  admissionConfig = signal<AdmissionConfigDto | null>(null);
  isAdmissionLocked = computed(() => !this.admissionConfig()?.isActive);
  loadingPrograms = signal<boolean>(false);
  loadingSlots = signal<boolean>(false);

  programOptions = computed(() =>
    this.publicPrograms().map(p => ({ label: `${p.code} - ${p.name}`, value: p.id }))
  );

  termOptions = computed(() =>
    this.publicTerms().map(t => ({
      label: `${t.academicYearCode} - ${t.termType} ${t.isActive ? '(Active Term)' : ''}`,
      value: t.id
    }))
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

  private readonly stepFieldsMap: Record<number, string[]> = {
    1: ['targetProgramId', 'termId', 'firstName', 'lastName', 'birthDate', 'gender', 'civilStatus', 'citizenship', 'mobileNumber', 'email'],
    2: ['highSchoolName', 'highSchoolType', 'lrnNumber', 'highSchoolGwa'],
    3: ['streetAddress', 'barangay', 'cityMunicipality', 'province', 'emergencyContactName', 'emergencyContactRelationship', 'emergencyContactNumber'],
    4: ['is4psBeneficiary', 'household4psIdNumber', 'isIndigenousPeople', 'ipEthnicGroup', 'isPersonWithDisability', 'disabilityType'],
    5: ['examSlotId']
  };

  private queuePollSubscription?: Subscription;

  admissionForm: FormGroup = this.fb.group({
    targetProgramId: [null, Validators.required],
    termId: [null, Validators.required],
    examSlotId: [null],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    middleName: [''],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    suffix: [''],
    birthDate: ['2007-01-01', Validators.required],
    gender: ['FEMALE', Validators.required],
    civilStatus: ['SINGLE', Validators.required],
    citizenship: ['FILIPINO', Validators.required],
    mobileNumber: ['', [Validators.required, Validators.pattern(/^(09|\+639)\d{9}$/)]],
    email: ['', [Validators.required, Validators.email]],
    lrnNumber: ['', [Validators.pattern(/^\d{12}$/)]],
    highSchoolName: ['', Validators.required],
    highSchoolType: ['PUBLIC', Validators.required],
    shsTrackAndStrand: [''],
    highSchoolGwa: [null, [Validators.min(75), Validators.max(100)]],
    streetAddress: ['', Validators.required],
    barangay: ['', Validators.required],
    cityMunicipality: ['', Validators.required],
    province: ['', Validators.required],
    zipCode: [''],
    emergencyContactName: ['', Validators.required],
    emergencyContactRelationship: ['', Validators.required],
    emergencyContactNumber: ['', [Validators.required, Validators.pattern(/^(09|\+639)\d{9}$/)]],
    emergencyContactEmail: ['', [Validators.email]],
    is4psBeneficiary: [false],
    household4psIdNumber: [''],
    isIndigenousPeople: [false],
    ipEthnicGroup: [''],
    isPersonWithDisability: [false],
    disabilityType: [''],
    isSoloParentOrDependent: [false]
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
  }

  private setupConditionalValidators(): void {
    this.admissionForm.get('is4psBeneficiary')?.valueChanges.subscribe(is4ps => {
      const idControl = this.admissionForm.get('household4psIdNumber');
      if (is4ps) {
        idControl?.setValidators([Validators.required]);
      } else {
        idControl?.clearValidators();
        idControl?.setValue('');
      }
      idControl?.updateValueAndValidity();
    });

    this.admissionForm.get('isIndigenousPeople')?.valueChanges.subscribe(isIp => {
      const groupControl = this.admissionForm.get('ipEthnicGroup');
      if (isIp) {
        groupControl?.setValidators([Validators.required]);
      } else {
        groupControl?.clearValidators();
        groupControl?.setValue('');
      }
      groupControl?.updateValueAndValidity();
    });

    this.admissionForm.get('isPersonWithDisability')?.valueChanges.subscribe(isPwd => {
      const typeControl = this.admissionForm.get('disabilityType');
      if (isPwd) {
        typeControl?.setValidators([Validators.required]);
      } else {
        typeControl?.clearValidators();
        typeControl?.setValue('');
      }
      typeControl?.updateValueAndValidity();
    });
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
        const activeTerm = termsList.find(t => t.isActive);
        if (activeTerm) {
          this.admissionForm.patchValue({ termId: activeTerm.id });
          this.loadAdmissionConfig(activeTerm.id);
          this.loadExamSlots(activeTerm.id);
        } else if (termsList.length > 0) {
          this.admissionForm.patchValue({ termId: termsList[0].id });
          this.loadAdmissionConfig(termsList[0].id);
          this.loadExamSlots(termsList[0].id);
        } else {
          this.loadAdmissionConfig();
        }
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load public terms.' })
    });
  }

  private initQueueToken(): void {
    this.admissionApi.requestQueueToken({ clientIdentifier: 'guest-' + Date.now() }).subscribe({
      next: res => {
        this.queueTokenInfo.set(res);
        if (!res.allowedToProceed) {
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
          if (statusRes.allowedToProceed && this.queuePollSubscription) {
            this.queuePollSubscription.unsubscribe();
          }
        }
      });
    });
  }

  onTermChange(): void {
    const termId = this.admissionForm.get('termId')?.value;
    if (termId) {
      this.loadAdmissionConfig(termId);
      this.loadExamSlots(termId);
    }
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
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.admissionForm.get(fieldName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  getFieldError(fieldName: string): string {
    const control = this.admissionForm.get(fieldName);
    if (!control || !control.errors || !(control.touched || control.dirty)) return '';
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['email']) return 'Please enter a valid email address.';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters required.`;
    if (control.errors['pattern']) {
      if (fieldName === 'mobileNumber' || fieldName === 'emergencyContactNumber') {
        return 'Must be a valid 11-digit PH mobile number (e.g. 09171234567).';
      }
      if (fieldName === 'lrnNumber') {
        return 'LRN must be exactly 12 digits.';
      }
    }
    if (control.errors['min'] || control.errors['max']) return 'GWA must be between 75.00 and 100.00.';
    return 'Invalid input.';
  }

  isStepValid(step: number): boolean {
    const fields = this.stepFieldsMap[step] || [];
    let valid = true;
    for (const field of fields) {
      const control = this.admissionForm.get(field);
      if (control && control.invalid) {
        valid = false;
        control.markAsTouched();
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
    if (this.admissionForm.invalid) {
      this.admissionForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Incomplete Form',
        detail: 'Please fill in all required fields highlighted in red across all sections.'
      });
      return;
    }

    this.submitting.set(true);

    const formVal = this.admissionForm.value;
    const req: SubmitAdmissionRequest = {
      ...formVal,
      queueToken: this.queueTokenInfo()?.queueToken
    };

    this.admissionApi.submitApplication(req).subscribe({
      next: res => {
        this.submitting.set(false);
        this.submittedApplication.set(res);
        this.messageService.add({ severity: 'success', summary: 'Application Submitted', detail: 'Exam slot booking confirmed.' });
      },
      error: err => {
        this.submitting.set(false);
        const msg = err.error?.message || err.message || 'Submission failed.';
        this.messageService.add({ severity: 'error', summary: 'Submission Failed', detail: msg });
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
      highSchoolType: 'PUBLIC'
    });
    const activeTerm = this.publicTerms().find(t => t.isActive);
    if (activeTerm) {
      this.admissionForm.patchValue({ termId: activeTerm.id });
    }
  }
}
