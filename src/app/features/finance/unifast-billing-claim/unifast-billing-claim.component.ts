// File: src/app/features/finance/unifast-billing-claim/unifast-billing-claim.component.ts

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import {
  UnifastFheClaimDto,
  CreateUnifastClaimRequest
} from '../../../core/models/financial.model';

import { SkeletonModule } from 'primeng/skeleton';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-unifast-billing-claim',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TagModule,
    CardModule,
    DialogModule,
    SkeletonModule,
    EmptyStateComponent
  ],
  templateUrl: './unifast-billing-claim.component.html',
  styleUrl: './unifast-billing-claim.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnifastBillingClaimComponent implements OnInit {
  private readonly financialApi = inject(FinancialApiService);
  private readonly messageService = inject(MessageService);

  // Form Fields
  searchTermId: number = 1;
  createCampusId: number = 1;

  // Component Signals
  readonly claimBatches = signal<UnifastFheClaimDto[]>([]);
  readonly selectedBatch = signal<UnifastFheClaimDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  readonly showDetailModal = signal<boolean>(false);

  ngOnInit(): void {
    this.loadClaimBatches();
  }

  loadClaimBatches(): void {
    if (!this.searchTermId) return;

    this.isLoading.set(true);
    this.financialApi.getClaimsByTerm(this.searchTermId).subscribe({
      next: (batches) => {
        this.claimBatches.set(batches);
        this.isLoading.set(false);
      },
      error: () => {
        this.claimBatches.set([]);
        this.isLoading.set(false);
      }
    });
  }

  generateClaimBatch(): void {
    if (!this.searchTermId || !this.createCampusId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Term ID and Campus ID are required.' });
      return;
    }

    const req: CreateUnifastClaimRequest = {
      termId: this.searchTermId,
      campusId: this.createCampusId
    };

    this.isGenerating.set(true);
    this.financialApi.generateUnifastClaimBatch(req).subscribe({
      next: (batch) => {
        this.isGenerating.set(false);
        this.selectedBatch.set(batch);
        this.showDetailModal.set(true);
        this.messageService.add({
          severity: 'success',
          summary: 'Claim Batch Generated',
          detail: `Batch ${batch.claimBatchNumber} created with ${batch.totalBeneficiaries} beneficiaries.`
        });
        this.loadClaimBatches();
      },
      error: (err) => {
        this.isGenerating.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Generation Failed',
          detail: err.error?.message || 'Failed to generate UniFAST claim batch.'
        });
      }
    });
  }

  viewBatchDetails(batchId: number): void {
    this.financialApi.getClaimBatchDetails(batchId).subscribe({
      next: (batch) => {
        this.selectedBatch.set(batch);
        this.showDetailModal.set(true);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load batch details.' });
      }
    });
  }

  exportToCsv(batch: UnifastFheClaimDto): void {
    if (!batch.items || batch.items.length === 0) return;

    const headers = ['Student ID', 'Student Name', 'Program', 'Enrolled Units', 'Tuition Claim (PHP)', 'TOSF/Misc Claim (PHP)', 'Lab Claim (PHP)', 'Total Claim (PHP)', 'Status'];
    const rows = batch.items.map(item => [
      `"${item.studentNumber}"`,
      `"${item.studentName}"`,
      `"${item.programCode}"`,
      item.enrolledUnits,
      item.tuitionAmount,
      item.miscAmount,
      item.labAmount,
      item.totalClaimedAmount,
      item.verificationStatus
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UniFAST_FHE_Claim_${batch.claimBatchNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'APPROVED':
      case 'DISBURSED':
      case 'VERIFIED':
        return 'success';
      case 'SUBMITTED':
        return 'info';
      case 'DRAFT':
        return 'warn';
      case 'DISQUALIFIED':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
