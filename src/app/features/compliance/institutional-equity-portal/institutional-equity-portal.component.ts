// File: src/app/features/compliance/institutional-equity-portal/institutional-equity-portal.component.ts

import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';

import { EquityApiService } from '../../../core/service/compliance/equity-api.service';
import {
  StudentEquityProfileDto,
  EquityStatisticsSummaryDto,
  EquityVerificationStatus,
  VerifyEquityProfileRequest
} from '../../../core/models/student-equity.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-institutional-equity-portal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DialogModule,
    TextareaModule,
    SkeletonModule,
    TooltipModule,
    IconField,
    InputIcon,
    EmptyStateComponent
  ],
  templateUrl: './institutional-equity-portal.component.html',
  styleUrl: './institutional-equity-portal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstitutionalEquityPortalComponent implements OnInit {
  private readonly equityApi = inject(EquityApiService);
  private readonly messageService = inject(MessageService);

  readonly isLoading = signal<boolean>(true);
  readonly isSavingVerification = signal<boolean>(false);
  readonly stats = signal<EquityStatisticsSummaryDto | null>(null);
  readonly profiles = signal<StudentEquityProfileDto[]>([]);
  readonly totalElements = signal<number>(0);

  // Filter Signals
  readonly searchQuery = signal<string>('');
  readonly selectedStatus = signal<string>('');
  readonly is4psFilter = signal<boolean | null>(null);
  readonly isIpFilter = signal<boolean | null>(null);
  readonly isPwdFilter = signal<boolean | null>(null);
  readonly isGidaFilter = signal<boolean | null>(null);
  readonly isFirstGenFilter = signal<boolean | null>(null);

  readonly page = signal<number>(0);
  readonly size = signal<number>(10);

  // Audit Dialog Signals
  readonly showVerifyDialog = signal<boolean>(false);
  readonly selectedProfile = signal<StudentEquityProfileDto | null>(null);
  readonly verificationStatus = signal<EquityVerificationStatus>('VERIFIED');
  readonly verificationRemarks = signal<string>('');

  readonly statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Self Declared', value: 'SELF_DECLARED' },
    { label: 'Documented', value: 'DOCUMENTED' },
    { label: 'Verified', value: 'VERIFIED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  readonly flagOptions = [
    { label: 'All', value: null },
    { label: 'Yes', value: true },
    { label: 'No', value: false }
  ];

  readonly verifyStatusOptions = [
    { label: 'VERIFIED', value: 'VERIFIED' },
    { label: 'DOCUMENTED', value: 'DOCUMENTED' },
    { label: 'REJECTED', value: 'REJECTED' },
    { label: 'SELF_DECLARED', value: 'SELF_DECLARED' }
  ];

  ngOnInit(): void {
    this.loadStats();
    this.loadProfiles();
  }

  loadStats(): void {
    this.equityApi.getEquityStatisticsSummary().subscribe({
      next: (data) => this.stats.set(data),
      error: () => {}
    });
  }

  loadProfiles(): void {
    this.isLoading.set(true);
    this.equityApi.searchEquityProfiles({
      search: this.searchQuery() || undefined,
      status: this.selectedStatus() || undefined,
      is4ps: this.is4psFilter() ?? undefined,
      isIp: this.isIpFilter() ?? undefined,
      isPwd: this.isPwdFilter() ?? undefined,
      isGida: this.isGidaFilter() ?? undefined,
      isFirstGen: this.isFirstGenFilter() ?? undefined,
      page: this.page(),
      size: this.size()
    }).subscribe({
      next: (res) => {
        this.profiles.set(res.content || []);
        this.totalElements.set(res.totalElements || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'Failed to load equity profiles.'
        });
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.page.set(0);
    this.loadProfiles();
  }

  openVerifyDialog(item: StudentEquityProfileDto): void {
    this.selectedProfile.set(item);
    this.verificationStatus.set(item.verificationStatus === 'REJECTED' ? 'REJECTED' : 'VERIFIED');
    this.verificationRemarks.set(item.verificationRemarks || '');
    this.showVerifyDialog.set(true);
  }

  saveVerification(): void {
    const prof = this.selectedProfile();
    if (!prof) return;

    this.isSavingVerification.set(true);
    const req: VerifyEquityProfileRequest = {
      verificationStatus: this.verificationStatus(),
      verificationRemarks: this.verificationRemarks()
    };

    this.equityApi.verifyEquityProfile(prof.id, req).subscribe({
      next: (updated) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Verification Saved',
          detail: `Equity profile status updated to ${updated.verificationStatus}.`
        });
        this.isSavingVerification.set(false);
        this.showVerifyDialog.set(false);
        this.loadStats();
        this.loadProfiles();
      },
      error: (err) => {
        this.isSavingVerification.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Verification Failed',
          detail: err?.error?.message || 'An error occurred during verification.'
        });
      }
    });
  }

  getStatusSeverity(status?: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (status) {
      case 'VERIFIED': return 'success';
      case 'DOCUMENTED': return 'info';
      case 'REJECTED': return 'danger';
      case 'SELF_DECLARED':
      default: return 'warn';
    }
  }

  formatIncome(bracket?: string): string {
    switch (bracket) {
      case 'POOR_BELOW_10K': return 'Poor (< ₱10k)';
      case 'LOW_INCOME_10K_TO_20K': return 'Low Income (₱10k-20k)';
      case 'LOWER_MIDDLE_20K_TO_40K': return 'Lower Middle (₱20k-40k)';
      case 'MIDDLE_40K_TO_70K': return 'Middle (₱40k-70k)';
      case 'UPPER_70K_PLUS': return 'Upper (₱70k+)';
      default: return 'Unspecified';
    }
  }
}
