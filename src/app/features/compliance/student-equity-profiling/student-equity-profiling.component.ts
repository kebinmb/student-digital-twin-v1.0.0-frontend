// File: src/app/features/compliance/student-equity-profiling/student-equity-profiling.component.ts

import { Component, OnInit, signal, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';

import { EquityApiService } from '../../../core/service/compliance/equity-api.service';
import {
  StudentEquityProfileDto,
  UpdateStudentEquityProfileRequest,
  DisabilityType,
  HouseholdIncomeBracket
} from '../../../core/models/student-equity.model';
@Component({
  selector: 'app-student-equity-profiling',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToggleSwitchModule,
    TagModule,
    SkeletonModule,
    TooltipModule
  ],
  templateUrl: './student-equity-profiling.component.html',
  styleUrl: './student-equity-profiling.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentEquityProfilingComponent implements OnInit {
  private readonly equityApi = inject(EquityApiService);
  private readonly messageService = inject(MessageService);

  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly profile = signal<StudentEquityProfileDto | null>(null);

  // Form State Signals
  readonly is4psBeneficiary = signal<boolean>(false);
  readonly household4psIdNumber = signal<string>('');
  readonly isListahananNhts = signal<boolean>(false);
  readonly unifastTesAwardee = signal<boolean>(false);
  readonly unifastTesAwardNumber = signal<string>('');

  readonly isIndigenousPeople = signal<boolean>(false);
  readonly ipEthnicGroup = signal<string>('');
  readonly ncipCertificateNumber = signal<string>('');

  readonly isPersonWithDisability = signal<boolean>(false);
  readonly pwdIdNumber = signal<string>('');
  readonly disabilityType = signal<DisabilityType | null>(null);

  readonly isSoloParentOrDependent = signal<boolean>(false);
  readonly soloParentIdNumber = signal<string>('');

  readonly isFirstGenerationCollege = signal<boolean>(false);
  readonly isGidaResident = signal<boolean>(false);
  readonly monthlyHouseholdIncomeBracket = signal<HouseholdIncomeBracket>('POOR_BELOW_10K');

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
      case 'DOCUMENTED': return 'info';
      case 'REJECTED': return 'danger';
      case 'SELF_DECLARED':
      default: return 'warn';
    }
  });

  ngOnInit(): void {
    this.loadProfile();
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
    this.is4psBeneficiary.set(data.is4psBeneficiary ?? false);
    this.household4psIdNumber.set(data.household4psIdNumber || '');
    this.isListahananNhts.set(data.isListahananNhts ?? false);
    this.unifastTesAwardee.set(data.unifastTesAwardee ?? false);
    this.unifastTesAwardNumber.set(data.unifastTesAwardNumber || '');

    this.isIndigenousPeople.set(data.isIndigenousPeople ?? false);
    this.ipEthnicGroup.set(data.ipEthnicGroup || '');
    this.ncipCertificateNumber.set(data.ncipCertificateNumber || '');

    this.isPersonWithDisability.set(data.isPersonWithDisability ?? false);
    this.pwdIdNumber.set(data.pwdIdNumber || '');
    this.disabilityType.set(data.disabilityType || null);

    this.isSoloParentOrDependent.set(data.isSoloParentOrDependent ?? false);
    this.soloParentIdNumber.set(data.soloParentIdNumber || '');

    this.isFirstGenerationCollege.set(data.isFirstGenerationCollege ?? false);
    this.isGidaResident.set(data.isGidaResident ?? false);
    this.monthlyHouseholdIncomeBracket.set(data.monthlyHouseholdIncomeBracket || 'POOR_BELOW_10K');
  }

  saveProfile(): void {
    this.isSaving.set(true);
    const req: UpdateStudentEquityProfileRequest = {
      is4psBeneficiary: this.is4psBeneficiary(),
      household4psIdNumber: this.household4psIdNumber() || undefined,
      isListahananNhts: this.isListahananNhts(),
      unifastTesAwardee: this.unifastTesAwardee(),
      unifastTesAwardNumber: this.unifastTesAwardNumber() || undefined,

      isIndigenousPeople: this.isIndigenousPeople(),
      ipEthnicGroup: this.ipEthnicGroup() || undefined,
      ncipCertificateNumber: this.ncipCertificateNumber() || undefined,

      isPersonWithDisability: this.isPersonWithDisability(),
      pwdIdNumber: this.pwdIdNumber() || undefined,
      disabilityType: this.disabilityType() || undefined,

      isSoloParentOrDependent: this.isSoloParentOrDependent(),
      soloParentIdNumber: this.soloParentIdNumber() || undefined,

      isFirstGenerationCollege: this.isFirstGenerationCollege(),
      isGidaResident: this.isGidaResident(),
      monthlyHouseholdIncomeBracket: this.monthlyHouseholdIncomeBracket()
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
