// File: src/app/features/finance/cashier-terminal/cashier-terminal.component.ts

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { DividerModule } from 'primeng/divider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';

import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import {
  StudentAssessmentInvoiceDto,
  CashierReceiptDto,
  ProcessPaymentRequest
} from '../../../core/models/financial.model';

import { SkeletonModule } from 'primeng/skeleton';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-cashier-terminal',
  standalone: true,
  providers: [ConfirmationService],
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
    DividerModule,
    SkeletonModule,
    ConfirmDialogModule,
    IconField,
    InputIcon,
    EmptyStateComponent
  ],
  templateUrl: './cashier-terminal.component.html',
  styleUrl: './cashier-terminal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashierTerminalComponent implements OnInit {
  private readonly financialApi = inject(FinancialApiService);
  private readonly messageService = inject(MessageService);

  // Search Controls
  searchStudentId: number | null = null;
  searchTermId: number = 1;
  searchOrNumber: string = '';

  // Component Signals
  readonly activeInvoice = signal<StudentAssessmentInvoiceDto | null>(null);
  readonly studentReceipts = signal<CashierReceiptDto[]>([]);
  readonly issuedReceipt = signal<CashierReceiptDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);
  readonly showReceiptModal = signal<boolean>(false);

  // Payment Form Fields
  amountTendered: number = 0;
  amountPaid: number = 0;
  paymentMethod: string = 'CASH';
  referenceNumber: string = '';
  remarks: string = '';

  readonly paymentMethods = [
    { label: 'Cash', value: 'CASH' },
    { label: 'GCash', value: 'GCASH' },
    { label: 'Maya', value: 'MAYA' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { label: 'Check', value: 'CHECK' }
  ];

  readonly changeAmount = computed(() => {
    const t = this.amountTendered || 0;
    const p = this.amountPaid || 0;
    return Math.max(0, t - p);
  });

  ngOnInit(): void {}

  lookupStudentInvoice(): void {
    if (!this.searchStudentId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please enter a Student Profile ID.' });
      return;
    }

    this.isLoading.set(true);
    this.financialApi.getInvoiceByStudentAndTerm(this.searchStudentId, this.searchTermId).subscribe({
      next: (inv) => {
        this.activeInvoice.set(inv);
        this.amountPaid = inv.outstandingBalance;
        this.amountTendered = inv.outstandingBalance;
        this.loadReceiptHistory(this.searchStudentId!);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.activeInvoice.set(null);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Invoice Not Found',
          detail: err.error?.message || 'No active assessment invoice found for this student and term.'
        });
      }
    });
  }

  loadReceiptHistory(studentProfileId: number): void {
    this.financialApi.getReceiptsByStudentProfile(studentProfileId).subscribe({
      next: (receipts) => this.studentReceipts.set(receipts),
      error: () => this.studentReceipts.set([])
    });
  }

  lookupReceiptByOr(): void {
    if (!this.searchOrNumber.trim()) return;
    this.financialApi.getReceiptByOrNumber(this.searchOrNumber.trim()).subscribe({
      next: (receipt) => {
        this.issuedReceipt.set(receipt);
        this.showReceiptModal.set(true);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Receipt Not Found', detail: 'No receipt found with that OR number.' });
      }
    });
  }

  clearSearch(): void {
    this.searchStudentId = null;
    this.activeInvoice.set(null);
    this.studentReceipts.set([]);
  }

  processPayment(): void {
    const inv = this.activeInvoice();
    if (!inv || !this.searchStudentId) {
      this.messageService.add({ severity: 'warn', summary: 'No Invoice', detail: 'Please search for a student invoice first.' });
      return;
    }

    if (this.amountPaid <= 0) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Payment', detail: 'Amount paid must be greater than ₱0.00.' });
      return;
    }

    if (this.amountTendered < this.amountPaid) {
      this.messageService.add({ severity: 'error', summary: 'Insufficient Tender', detail: 'Amount tendered cannot be less than amount paid.' });
      return;
    }

    if (this.paymentMethod !== 'CASH' && !this.referenceNumber.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Reference Required', detail: `Reference Number / Transaction ID is required for ${this.paymentMethod} payments.` });
      return;
    }

    const req: ProcessPaymentRequest = {
      studentProfileId: this.searchStudentId,
      assessmentInvoiceId: inv.id,
      amountTendered: this.amountTendered,
      amountPaid: this.amountPaid,
      paymentMethod: this.paymentMethod,
      referenceNumber: this.referenceNumber.trim() || undefined,
      remarks: this.remarks.trim() || undefined
    };

    this.isProcessing.set(true);
    this.financialApi.processPayment(req).subscribe({
      next: (receipt) => {
        this.isProcessing.set(false);
        this.issuedReceipt.set(receipt);
        this.showReceiptModal.set(true);
        this.messageService.add({ severity: 'success', summary: 'Payment Successful', detail: `OR Number: ${receipt.orNumber}` });
        // Refresh invoice & receipts
        this.lookupStudentInvoice();
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Payment Failed',
          detail: err.error?.message || 'Failed to process cashier payment.'
        });
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'FULLY_PAID':
      case 'FHE_COVERED':
      case 'ISSUED':
        return 'success';
      case 'PARTIALLY_PAID':
        return 'warn';
      case 'PENDING':
        return 'danger';
      case 'VOIDED':
        return 'secondary';
      default:
        return 'info';
    }
  }
}
