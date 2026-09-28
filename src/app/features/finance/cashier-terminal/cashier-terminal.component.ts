// File: src/app/features/finance/cashier-terminal/cashier-terminal.component.ts

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
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import { TermService } from '../../../core/services/institution.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { UserApiService } from '../../../core/service/user/user-api.service';
import { Term } from '../../../core/models/institution.model';
import { StudentSearchResultDto } from '../../../core/models/enrollment.model';
import {
  StudentAssessmentInvoiceDto,
  CashierReceiptDto,
  ProcessPaymentRequest,
  OrBookletDto,
  CreateOrBookletRequest,
  VoidOfficialReceiptRequest,
  EodRcdReportDto
} from '../../../core/models/financial.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-cashier-terminal',
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
    DividerModule,
    SkeletonModule,
    ConfirmDialogModule,
    IconField,
    InputIcon,
    EmptyStateComponent,
    DecimalPipe
  ],
  templateUrl: './cashier-terminal.component.html',
  styleUrl: './cashier-terminal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashierTerminalComponent implements OnInit {
  private readonly financialApi = inject(FinancialApiService);
  private readonly termService = inject(TermService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly userApi = inject(UserApiService);
  private readonly messageService = inject(MessageService);

  // Search Controls Signals
  readonly searchStudentId = signal<number | null>(null);
  readonly searchTermId = signal<number>(1);
  readonly searchOrNumber = signal<string>('');

  // Cashier Users Dropdown Options Signal
  readonly cashierUsers = signal<{ label: string; value: number }[]>([]);

  // Term & Student Autocomplete Signals
  readonly availableTerms = signal<Term[]>([]);
  readonly selectedTermId = signal<number | null>(null);
  readonly searchedStudents = signal<StudentSearchResultDto[]>([]);
  readonly selectedStudent = signal<StudentSearchResultDto | null>(null);
  readonly isSearchingStudents = signal<boolean>(false);

  // Component Signals
  readonly activeInvoice = signal<StudentAssessmentInvoiceDto | null>(null);
  readonly studentReceipts = signal<CashierReceiptDto[]>([]);
  readonly issuedReceipt = signal<CashierReceiptDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);
  readonly showReceiptModal = signal<boolean>(false);

  // Booklet & RCD Signals
  readonly activeBooklet = signal<OrBookletDto | null>(null);
  readonly showAssignBookletModal = signal<boolean>(false);
  readonly showVoidReceiptModal = signal<boolean>(false);
  readonly showEodRcdModal = signal<boolean>(false);
  readonly isAssigningBooklet = signal<boolean>(false);
  readonly isVoidingReceipt = signal<boolean>(false);
  readonly isLoadingRcd = signal<boolean>(false);
  readonly eodRcdReport = signal<EodRcdReportDto | null>(null);

  // Payment Form Signals
  readonly amountTendered = signal<number>(0);
  readonly amountPaid = signal<number>(0);
  readonly paymentMethod = signal<string>('CASH');
  readonly referenceNumber = signal<string>('');
  readonly remarks = signal<string>('');
  readonly checkNumber = signal<string>('');
  readonly draweeBank = signal<string>('');
  readonly fundClusterCode = signal<string>('FUND_164');

  readonly paymentMethods = [
    { label: 'Cash', value: 'CASH' },
    { label: 'GCash', value: 'GCASH' },
    { label: 'Maya', value: 'MAYA' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { label: 'Check', value: 'CHECK' }
  ];

  readonly fundClusters = [
    { label: 'Fund 164 - Special Trust Fund (Tuition & TOSF)', value: 'FUND_164' },
    { label: 'Fund 101 - Regular Agency Fund (GAA Subsidy)', value: 'FUND_101' },
    { label: 'Fund 184 - Revolving Fund / IGP', value: 'FUND_184' }
  ];

  // Assign Booklet Form Signals
  readonly newBookletCode = signal<string>('');
  readonly newStartOrNumber = signal<string>('');
  readonly newEndOrNumber = signal<string>('');
  readonly newAssignedCashierId = signal<number>(1);

  // Void Receipt Form Signals
  readonly voidOrNumber = signal<string>('');
  readonly voidReason = signal<string>('');

  readonly changeAmount = computed(() => {
    const t = this.amountTendered() || 0;
    const p = this.amountPaid() || 0;
    return Math.max(0, t - p);
  });

  ngOnInit(): void {
    this.loadActiveBooklet();
    this.loadTerms();
    this.searchStudents('');
    this.loadCashierUsers();
  }

  loadCashierUsers(): void {
    this.userApi.getUsers().subscribe({
      next: (users) => {
        const cashiers = (users || [])
          .filter((u) => u.roles && u.roles.some((r) => r === 'CASHIER' || r === 'ROLE_CASHIER'))
          .map((u) => ({
            label: `${u.username} (${u.email || 'ID: ' + u.id})`,
            value: u.id
          }));

        if (cashiers.length > 0) {
          this.cashierUsers.set(cashiers);
          if (!cashiers.some((c) => c.value === this.newAssignedCashierId())) {
            this.newAssignedCashierId.set(cashiers[0].value);
          }
        } else {
          const allUsers = (users || []).map((u) => ({
            label: `${u.username} (${u.email || 'ID: ' + u.id})`,
            value: u.id
          }));
          const fallback = allUsers.length > 0 ? allUsers : [{ label: 'Default Cashier (ID: 1)', value: 1 }];
          this.cashierUsers.set(fallback);
        }
      },
      error: () => {
        this.cashierUsers.set([{ label: 'Default Cashier (ID: 1)', value: 1 }]);
      }
    });
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
          this.selectedTermId.set(active.id);
          this.searchTermId.set(active.id);
        }
      },
      error: () => {}
    });
  }

  onTermChange(termId: number | null): void {
    this.selectedTermId.set(termId);
    if (termId) {
      this.searchTermId.set(termId);
      if (this.searchStudentId()) {
        this.lookupStudentInvoice();
      }
    }
  }

  searchStudents(query: string = ''): void {
    this.isSearchingStudents.set(true);
    this.enrollmentApi.searchStudents(query).subscribe({
      next: (results) => {
        this.searchedStudents.set(results || []);
        this.isSearchingStudents.set(false);
      },
      error: () => {
        this.searchedStudents.set([]);
        this.isSearchingStudents.set(false);
      }
    });
  }

  onStudentSelect(studentId: number | null): void {
    this.searchStudentId.set(studentId);
    const student = this.searchedStudents().find((s) => s.id === studentId) || null;
    this.selectedStudent.set(student);
    if (studentId) {
      this.lookupStudentInvoice();
    } else {
      this.clearSearch();
    }
  }

  loadActiveBooklet(): void {
    this.financialApi.getActiveBooklet().subscribe({
      next: (booklet) => this.activeBooklet.set(booklet),
      error: () => this.activeBooklet.set(null)
    });
  }

  openAssignBookletModal(): void {
    this.newBookletCode.set('');
    this.newStartOrNumber.set('');
    this.newEndOrNumber.set('');
    this.showAssignBookletModal.set(true);
  }

  submitAssignBooklet(): void {
    const code = this.newBookletCode().trim();
    const start = this.newStartOrNumber().trim();
    const end = this.newEndOrNumber().trim();
    if (!code || !start || !end) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'All booklet fields are required.' });
      return;
    }
    const req: CreateOrBookletRequest = {
      bookletCode: code,
      startOrNumber: start,
      endOrNumber: end,
      assignedCashierId: this.newAssignedCashierId() || 1
    };
    this.isAssigningBooklet.set(true);
    this.financialApi.assignOrBooklet(req).subscribe({
      next: (b) => {
        this.isAssigningBooklet.set(false);
        this.activeBooklet.set(b);
        this.showAssignBookletModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Booklet Assigned', detail: `Booklet ${b.bookletCode} is now active.` });
      },
      error: (err) => {
        this.isAssigningBooklet.set(false);
        this.messageService.add({ severity: 'error', summary: 'Assignment Failed', detail: err.error?.message || 'Could not assign booklet.' });
      }
    });
  }

  openVoidReceiptModal(): void {
    this.voidOrNumber.set('');
    this.voidReason.set('');
    this.showVoidReceiptModal.set(true);
  }

  submitVoidReceipt(): void {
    const booklet = this.activeBooklet();
    if (!booklet) {
      this.messageService.add({ severity: 'error', summary: 'No Booklet', detail: 'No active booklet to void against.' });
      return;
    }
    const orNum = this.voidOrNumber().trim();
    const reason = this.voidReason().trim();
    if (!orNum || !reason) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'OR Number and Void Reason are required.' });
      return;
    }
    const req: VoidOfficialReceiptRequest = {
      orNumber: orNum,
      bookletId: booklet.id,
      voidReason: reason
    };
    this.isVoidingReceipt.set(true);
    this.financialApi.voidOfficialReceipt(req).subscribe({
      next: (res) => {
        this.isVoidingReceipt.set(false);
        this.showVoidReceiptModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Receipt Voided', detail: `OR ${res.orNumber} has been officially voided.` });
        this.loadActiveBooklet();
        const studentId = this.searchStudentId();
        if (studentId) {
          this.loadReceiptHistory(studentId);
        }
      },
      error: (err) => {
        this.isVoidingReceipt.set(false);
        this.messageService.add({ severity: 'error', summary: 'Void Failed', detail: err.error?.message || 'Failed to void receipt.' });
      }
    });
  }

  openEodRcdModal(): void {
    this.isLoadingRcd.set(true);
    this.financialApi.getEodRcdReport().subscribe({
      next: (report) => {
        this.eodRcdReport.set(report);
        this.isLoadingRcd.set(false);
        this.showEodRcdModal.set(true);
      },
      error: (err) => {
        this.isLoadingRcd.set(false);
        this.messageService.add({ severity: 'error', summary: 'Report Error', detail: err.error?.message || 'Failed to generate EOD RCD report.' });
      }
    });
  }

  lookupStudentInvoice(): void {
    const studentId = this.searchStudentId();
    if (!studentId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please select or enter a Student Profile.' });
      return;
    }

    const termId = this.selectedTermId() || this.searchTermId() || 1;
    this.isLoading.set(true);
    this.financialApi.getInvoiceByStudentAndTerm(studentId, termId).subscribe({
      next: (inv) => {
        this.activeInvoice.set(inv);
        this.amountPaid.set(inv.outstandingBalance);
        this.amountTendered.set(inv.outstandingBalance);
        this.loadReceiptHistory(studentId);
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
    const orNum = this.searchOrNumber().trim();
    if (!orNum) return;
    this.financialApi.getReceiptByOrNumber(orNum).subscribe({
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
    this.searchStudentId.set(null);
    this.selectedStudent.set(null);
    this.activeInvoice.set(null);
    this.studentReceipts.set([]);
  }

  processPayment(): void {
    const inv = this.activeInvoice();
    const studentId = this.searchStudentId();
    if (!inv || !studentId) {
      this.messageService.add({ severity: 'warn', summary: 'No Invoice', detail: 'Please search for a student invoice first.' });
      return;
    }

    const paid = this.amountPaid();
    const tendered = this.amountTendered();
    const method = this.paymentMethod();

    if (paid <= 0) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Payment', detail: 'Amount paid must be greater than ₱0.00.' });
      return;
    }

    if (tendered < paid) {
      this.messageService.add({ severity: 'error', summary: 'Insufficient Tender', detail: 'Amount tendered cannot be less than amount paid.' });
      return;
    }

    const ref = this.referenceNumber().trim();
    if (method !== 'CASH' && method !== 'CHECK' && !ref) {
      this.messageService.add({ severity: 'error', summary: 'Reference Required', detail: `Reference Number / Transaction ID is required for ${method} payments.` });
      return;
    }

    const chk = this.checkNumber().trim();
    const bank = this.draweeBank().trim();
    if (method === 'CHECK') {
      if (!chk || !bank) {
        this.messageService.add({ severity: 'error', summary: 'Check Details Required', detail: 'Check Number and Drawee Bank are required for Check payments.' });
        return;
      }
    }

    const req: ProcessPaymentRequest = {
      studentProfileId: studentId,
      assessmentInvoiceId: inv.id,
      amountTendered: tendered,
      amountPaid: paid,
      paymentMethod: method,
      referenceNumber: ref || undefined,
      remarks: this.remarks().trim() || undefined,
      checkNumber: method === 'CHECK' ? chk : undefined,
      draweeBank: method === 'CHECK' ? bank : undefined,
      fundClusterCode: this.fundClusterCode() || 'FUND_164'
    };

    this.isProcessing.set(true);
    this.financialApi.processPayment(req).subscribe({
      next: (receipt) => {
        this.isProcessing.set(false);
        this.issuedReceipt.set(receipt);
        this.showReceiptModal.set(true);
        this.messageService.add({ severity: 'success', summary: 'Payment Successful', detail: `OR Number: ${receipt.orNumber}` });
        this.loadActiveBooklet();
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
      case 'VALID':
        return 'success';
      case 'PARTIALLY_PAID':
      case 'PARTIAL':
        return 'warn';
      case 'PENDING':
      case 'UNPAID':
        return 'danger';
      case 'VOIDED':
      case 'VOID':
        return 'secondary';
      default:
        return 'info';
    }
  }
}
