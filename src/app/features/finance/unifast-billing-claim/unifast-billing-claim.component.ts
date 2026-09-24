// File: src/app/features/finance/unifast-billing-claim/unifast-billing-claim.component.ts

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import { TermService, CampusService } from '../../../core/services/institution.service';
import { Term, Campus } from '../../../core/models/institution.model';
import {
  UnifastFheClaimDto,
  CreateUnifastClaimRequest,
  UnifastClaimItemDto
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
    SelectModule,
    TagModule,
    CardModule,
    DialogModule,
    SkeletonModule,
    EmptyStateComponent,
    DecimalPipe
  ],
  templateUrl: './unifast-billing-claim.component.html',
  styleUrl: './unifast-billing-claim.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnifastBillingClaimComponent implements OnInit {
  private readonly financialApi = inject(FinancialApiService);
  private readonly termService = inject(TermService);
  private readonly campusService = inject(CampusService);
  private readonly messageService = inject(MessageService);

  // Form Field Signals
  readonly availableTerms = signal<Term[]>([]);
  readonly availableCampuses = signal<Campus[]>([]);
  readonly searchTermId = signal<number | null>(null);
  readonly createCampusId = signal<number | null>(null);

  // Component Signals
  readonly claimBatches = signal<UnifastFheClaimDto[]>([]);
  readonly selectedBatch = signal<UnifastFheClaimDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  readonly showDetailModal = signal<boolean>(false);

  // Disallowance Modal Signals
  readonly showDisallowModal = signal<boolean>(false);
  readonly disallowingItem = signal<UnifastClaimItemDto | null>(null);
  readonly isDisallowing = signal<boolean>(false);
  readonly disallowReason = signal<string>('');

  ngOnInit(): void {
    this.loadTerms();
    this.loadCampuses();
  }

  loadTerms(): void {
    this.termService.getAll().subscribe({
      next: (terms) => {
        const formatted = (terms || []).map((t) => ({
          ...t,
          termName: `${t.academicYearCode || 'AY'} ${t.termType ? t.termType.replace(/_/g, ' ') : ''}${t.isActive ? ' (Active)' : ''}`
        }));
        this.availableTerms.set(formatted);
      },
      error: () => this.availableTerms.set([])
    });

    this.termService.getActive().subscribe({
      next: (active) => {
        if (active) {
          this.searchTermId.set(active.id);
          this.loadClaimBatches();
        }
      },
      error: () => {
        // Fallback: if active term endpoint fails, load first available term
        const terms = this.availableTerms();
        if (terms.length > 0) {
          this.searchTermId.set(terms[0].id);
          this.loadClaimBatches();
        }
      }
    });
  }

  loadCampuses(): void {
    this.campusService.getActive().subscribe({
      next: (campuses) => {
        this.availableCampuses.set(campuses || []);
        if (campuses && campuses.length > 0 && !this.createCampusId()) {
          this.createCampusId.set(campuses[0].id);
        }
      },
      error: () => this.availableCampuses.set([])
    });
  }

  onTermChange(termId: number | null): void {
    this.searchTermId.set(termId);
    if (termId) {
      this.loadClaimBatches();
    }
  }

  loadClaimBatches(): void {
    const termId = this.searchTermId();
    if (!termId) return;

    this.isLoading.set(true);
    this.financialApi.getClaimsByTerm(termId).subscribe({
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
    const termId = this.searchTermId();
    const campusId = this.createCampusId();
    if (!termId || !campusId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Term ID and Campus ID are required.' });
      return;
    }

    const req: CreateUnifastClaimRequest = {
      termId: termId,
      campusId: campusId
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

  exportStatutoryForm2(batchId: number): void {
    this.financialApi.exportForm2Csv(batchId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `UniFAST_Form_2_Batch_${batchId}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Export Success', detail: 'UniFAST Form 2 statutory CSV downloaded.' });
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Export Failed', detail: err.error?.message || 'Could not export Form 2 CSV.' });
      }
    });
  }

  openDisallowModal(item: UnifastClaimItemDto): void {
    this.disallowingItem.set(item);
    this.disallowReason.set('');
    this.showDisallowModal.set(true);
  }

  submitDisallowItem(): void {
    const item = this.disallowingItem();
    if (!item) return;

    const reason = this.disallowReason().trim();
    if (!reason) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please specify the reason for audit disallowance.' });
      return;
    }

    this.isDisallowing.set(true);
    this.financialApi.disallowClaimItem(item.id, { reason }).subscribe({
      next: (updatedItem) => {
        this.isDisallowing.set(false);
        this.showDisallowModal.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Claim Disallowed',
          detail: `Student ${item.studentNumber} subsidy reverted and ledger charged.`
        });
        const currentBatch = this.selectedBatch();
        if (currentBatch) {
          this.viewBatchDetails(currentBatch.id);
        }
        this.loadClaimBatches();
      },
      error: (err) => {
        this.isDisallowing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Disallowance Failed',
          detail: err.error?.message || 'Failed to disallow claim item.'
        });
      }
    });
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
