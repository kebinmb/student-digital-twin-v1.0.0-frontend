// File: src/app/features/finance/student-account-ledger/student-account-ledger.component.ts

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
import { MessageService } from 'primeng/api';

import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import {
  StudentAccountLedgerDto,
  StudentAssessmentInvoiceDto
} from '../../../core/models/financial.model';

@Component({
  selector: 'app-student-account-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TagModule,
    CardModule
  ],
  templateUrl: './student-account-ledger.component.html',
  styleUrl: './student-account-ledger.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAccountLedgerComponent implements OnInit {
  private readonly financialApi = inject(FinancialApiService);
  private readonly messageService = inject(MessageService);

  // Search Fields
  searchStudentId: number | null = null;
  assessEnrollmentId: number | null = null;

  // Signals
  readonly ledgerEntries = signal<StudentAccountLedgerDto[]>([]);
  readonly activeInvoice = signal<StudentAssessmentInvoiceDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isAssessing = signal<boolean>(false);

  readonly totalDebits = computed(() =>
    this.ledgerEntries().reduce((sum, item) => sum + (item.debitAmount || 0), 0)
  );

  readonly totalCredits = computed(() =>
    this.ledgerEntries().reduce((sum, item) => sum + (item.creditAmount || 0), 0)
  );

  readonly currentBalance = computed(() => {
    const entries = this.ledgerEntries();
    if (entries.length === 0) return 0;
    return entries[entries.length - 1].runningBalance;
  });

  ngOnInit(): void {}

  loadLedgerHistory(): void {
    if (!this.searchStudentId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please enter a Student Profile ID.' });
      return;
    }

    this.isLoading.set(true);
    this.financialApi.getStudentLedgerHistory(this.searchStudentId).subscribe({
      next: (data) => {
        this.ledgerEntries.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.ledgerEntries.set([]);
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load student ledger history.' });
      }
    });
  }

  assessStudentEnrollment(): void {
    if (!this.assessEnrollmentId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please enter an Enrollment ID to assess.' });
      return;
    }

    this.isAssessing.set(true);
    this.financialApi.assessEnrollment(this.assessEnrollmentId).subscribe({
      next: (invoice) => {
        this.isAssessing.set(false);
        this.activeInvoice.set(invoice);
        this.messageService.add({
          severity: 'success',
          summary: 'Assessment Complete',
          detail: `Invoice ${invoice.invoiceNumber} created. Net Assessed: ₱${invoice.netAssessedAmount}`
        });
        if (this.searchStudentId) {
          this.loadLedgerHistory();
        }
      },
      error: (err) => {
        this.isAssessing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Assessment Failed',
          detail: err.error?.message || 'Could not assess enrollment tuition fees.'
        });
      }
    });
  }

  getTransactionTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (type) {
      case 'GROSS_ASSESSMENT':
        return 'danger';
      case 'FHE_SUBSIDY_CREDIT':
      case 'SCHOLARSHIP_CREDIT':
      case 'CASHIER_PAYMENT':
        return 'success';
      case 'ADJUSTMENT_DEBIT':
        return 'warn';
      case 'ADJUSTMENT_CREDIT':
        return 'info';
      default:
        return 'secondary';
    }
  }
}
