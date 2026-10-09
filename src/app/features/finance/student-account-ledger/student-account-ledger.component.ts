import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, effect, untracked, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { TermService } from '../../../core/services/institution.service';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';
import { Term } from '../../../core/models/institution.model';
import { StudentProfileResponse, StudentSearchResultDto, StudentEnrollmentResponse } from '../../../core/models/enrollment.model';
import {
  StudentAccountLedgerDto,
  StudentAssessmentInvoiceDto
} from '../../../core/models/financial.model';

import { SkeletonModule } from 'primeng/skeleton';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';

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
    SelectModule,
    TagModule,
    CardModule,
    TooltipModule,
    HasRoleDirective,
    SkeletonModule,
    EmptyStateComponent,
    DecimalPipe
  ],
  templateUrl: './student-account-ledger.component.html',
  styleUrl: './student-account-ledger.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAccountLedgerComponent implements OnInit {
  private readonly financialApi = inject(FinancialApiService);
  private readonly authService = inject(AuthService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly termService = inject(TermService);
  readonly periodStore = inject(AcademicPeriodStore);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // RBAC & Student Profile State
  readonly isStudentRole = computed(() => this.authService.hasRole('STUDENT'));
  readonly currentStudentProfile = signal<StudentProfileResponse | null>(null);
  readonly isLoadingProfile = signal<boolean>(false);

  // Search Controls Signals (For Querying Student Ledger)
  readonly searchStudentId = signal<number | null>(null);
  readonly searchedStudents = signal<StudentSearchResultDto[]>([]);
  readonly selectedStudent = signal<StudentSearchResultDto | null>(null);
  readonly isSearchingStudents = signal<boolean>(false);

  // Tuition Assessment Signals (For Staff Roles)
  readonly assessStudentId = signal<number | null>(null);
  readonly assessSelectedStudent = signal<StudentSearchResultDto | null>(null);
  readonly assessEnrollment = signal<StudentEnrollmentResponse | null>(null);
  readonly isResolvingEnrollment = signal<boolean>(false);
  readonly assessEnrollmentId = signal<number | null>(null);
  readonly manualEnrollmentMode = signal<boolean>(false);

  // Academic Term Signals
  readonly availableTerms = signal<Term[]>([]);
  readonly selectedTermId = signal<number | null>(null);

  // Ledger & Invoice Signals
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

  // Derived Invoice for Fee Breakdown & UniFAST Benefits display
  readonly displayInvoice = computed<StudentAssessmentInvoiceDto | null>(() => {
    return this.activeInvoice();
  });

  constructor() {
    effect(() => {
      const globalTermId = this.periodStore.selectedTermId();
      untracked(() => {
        if (globalTermId && globalTermId !== this.selectedTermId()) {
          this.selectedTermId.set(globalTermId);
          const studentId = this.searchStudentId();
          if (studentId) {
            this.loadStudentInvoice(studentId, globalTermId);
          }
          const assessStudent = this.assessStudentId();
          if (assessStudent) {
            this.resolveEnrollmentForAssessment(assessStudent, globalTermId);
          }
        }
      });
    });
  }

  ngOnInit(): void {
    this.loadTerms();

    if (this.isStudentRole()) {
      // Automatic RBAC Auto-Population: Load authenticated student profile
      this.loadAuthenticatedStudentProfile();
    } else {
      // Staff Lookup: Preload student list for search box
      this.searchStudents('');
    }
  }

  loadTerms(): void {
    if (this.termService?.allTerms$?.pipe) {
      this.termService.allTerms$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (terms) => {
          if (terms && terms.length > 0) {
            const formatted = terms.map((t) => ({
              ...t,
              termName: `${t.academicYearCode || 'AY'} ${t.termType ? t.termType.replace(/_/g, ' ') : ''}${t.isActive ? ' (Active)' : ''}`
            }));
            this.availableTerms.set(formatted);
          }
        }
      });
    }

    if (this.termService?.getAll) {
      this.termService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (terms) => {
          const formatted = (terms || []).map((t) => ({
            ...t,
            termName: `${t.academicYearCode || 'AY'} ${t.termType ? t.termType.replace(/_/g, ' ') : ''}${t.isActive ? ' (Active)' : ''}`
          }));
          this.availableTerms.set(formatted);
        },
        error: () => this.availableTerms.set([])
      });
    }

    if (this.termService?.activeTerm$?.pipe) {
      this.termService.activeTerm$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (active) => {
          if (active) {
            this.selectedTermId.set(active.id);
            const studentId = this.searchStudentId();
            if (studentId) {
              this.loadStudentInvoice(studentId, active.id);
            }
            const assessStudent = this.assessStudentId();
            if (assessStudent) {
              this.resolveEnrollmentForAssessment(assessStudent, active.id);
            }
          }
        }
      });
    }

    if (this.termService?.getActive) {
      this.termService.getActive().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (active) => {
          if (active) {
            this.selectedTermId.set(active.id);
            const studentId = this.searchStudentId();
            if (studentId) {
              this.loadStudentInvoice(studentId, active.id);
            }
            const assessStudent = this.assessStudentId();
            if (assessStudent) {
              this.resolveEnrollmentForAssessment(assessStudent, active.id);
            }
          }
        },
        error: () => {}
      });
    }
  }

  loadAuthenticatedStudentProfile(): void {
    this.isLoadingProfile.set(true);
    this.enrollmentApi.getCurrentStudentProfile().subscribe({
      next: (profile) => {
        this.isLoadingProfile.set(false);
        this.currentStudentProfile.set(profile);
        this.searchStudentId.set(profile.id);
        this.loadLedgerHistory();
        const termId = this.selectedTermId();
        if (termId) {
          this.loadStudentInvoice(profile.id, termId);
        }
      },
      error: (err) => {
        this.isLoadingProfile.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Student Profile',
          detail: err.error?.message || 'Could not resolve authenticated student record.'
        });
      }
    });
  }

  searchStudents(query: string = ''): void {
    if (this.isStudentRole()) return;
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

  onStudentFilter(event: any): void {
    const query = (event?.filter || '').trim();
    if (query.length >= 2) {
      this.searchStudents(query);
    } else if (query.length === 0) {
      this.searchStudents('');
    }
  }

  onStudentSelect(studentId: number | null): void {
    // RBAC Guard: Student cannot switch to another student's account
    if (this.isStudentRole()) return;

    this.searchStudentId.set(studentId);
    const student = this.searchedStudents().find((s) => s.id === studentId) || null;
    this.selectedStudent.set(student);
    if (studentId) {
      this.loadLedgerHistory();
      const termId = this.selectedTermId();
      if (termId) {
        this.loadStudentInvoice(studentId, termId);
      }
    }
  }

  onAssessStudentSelect(studentId: number | null): void {
    this.assessStudentId.set(studentId);
    if (!studentId) {
      this.assessSelectedStudent.set(null);
      this.assessEnrollment.set(null);
      this.assessEnrollmentId.set(null);
      return;
    }

    const student = this.searchedStudents().find((s) => s.id === studentId) || null;
    this.assessSelectedStudent.set(student);

    const termId = this.selectedTermId();
    if (termId) {
      this.resolveEnrollmentForAssessment(studentId, termId);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Term Required',
        detail: 'Please select an Academic Term to check student enrollment.'
      });
    }
  }

  resolveEnrollmentForAssessment(studentId: number, termId: number): void {
    this.isResolvingEnrollment.set(true);
    this.enrollmentApi.getEnrollment(studentId, termId).subscribe({
      next: (enrollment) => {
        this.isResolvingEnrollment.set(false);
        if (enrollment && enrollment.enrollmentId && enrollment.status !== 'NOT_ENROLLED') {
          this.assessEnrollment.set(enrollment);
          this.assessEnrollmentId.set(enrollment.enrollmentId);
        } else {
          this.assessEnrollment.set(null);
          this.assessEnrollmentId.set(null);
          this.messageService.add({
            severity: 'info',
            summary: 'Enrollment Not Found',
            detail: 'Student has no active course enlistment for the selected academic term.'
          });
        }
      },
      error: () => {
        this.isResolvingEnrollment.set(false);
        this.assessEnrollment.set(null);
        this.assessEnrollmentId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Resolution Error',
          detail: 'Failed to retrieve student enrollment record.'
        });
      }
    });
  }

  toggleManualEnrollmentMode(): void {
    this.manualEnrollmentMode.update((v) => !v);
  }

  onTermChange(termId: number | null): void {
    this.selectedTermId.set(termId);
    if (termId) {
      this.periodStore.setTerm(termId);
    }
    const studentId = this.searchStudentId();
    if (studentId && termId) {
      this.loadStudentInvoice(studentId, termId);
    } else {
      this.activeInvoice.set(null);
    }
    const assessStudent = this.assessStudentId();
    if (assessStudent && termId) {
      this.resolveEnrollmentForAssessment(assessStudent, termId);
    }
  }

  loadStudentInvoice(studentProfileId: number, termId: number): void {
    this.financialApi.getInvoiceByStudentAndTerm(studentProfileId, termId).subscribe({
      next: (invoice) => this.activeInvoice.set(invoice),
      error: () => this.activeInvoice.set(null)
    });
  }

  loadLedgerHistory(): void {
    const studentId = this.searchStudentId();
    if (!studentId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please select a student account.' });
      return;
    }

    this.isLoading.set(true);
    this.financialApi.getStudentLedgerHistory(studentId).subscribe({
      next: (data) => {
        this.ledgerEntries.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.ledgerEntries.set([]);
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load student ledger history.' });
      }
    });
  }

  assessStudentEnrollment(): void {
    const enrollmentId = this.assessEnrollmentId();
    if (!enrollmentId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Enrollment Required',
        detail: 'Please select an enrolled student or enter a Student Enrollment ID.'
      });
      return;
    }

    this.isAssessing.set(true);
    this.financialApi.assessEnrollment(enrollmentId).subscribe({
      next: (inv: StudentAssessmentInvoiceDto) => {
        this.activeInvoice.set(inv);
        this.isAssessing.set(false);
        if (this.assessEnrollment()) {
          this.assessEnrollment.update((curr) => (curr ? { ...curr, status: 'ASSESSED' } : null));
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Assessment Generated',
          detail: `Invoice ${inv.invoiceNumber} created. Net: ₱${(inv.netAssessedAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        });
        const currentQueryStudent = this.searchStudentId();
        if (currentQueryStudent && (currentQueryStudent === this.assessStudentId() || currentQueryStudent === inv.studentProfileId)) {
          this.loadLedgerHistory();
        }
      },
      error: (err: any) => {
        this.isAssessing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Assessment Failed',
          detail: err.error?.message || 'Failed to assess tuition fees.'
        });
      }
    });
  }

  getTransactionTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (type) {
      case 'PAYMENT':
      case 'FHE_SUBSIDY':
      case 'DISCOUNT':
        return 'success';
      case 'CHARGE':
        return 'danger';
      case 'ADJUSTMENT':
        return 'warn';
      default:
        return 'secondary';
    }
  }
}
