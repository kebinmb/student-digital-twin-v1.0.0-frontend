// File: src/app/features/compliance/student-clearance/student-clearance.component.ts

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';

// Services & DTOs
import { ActivatedRoute } from '@angular/router';
import { filter, take } from 'rxjs';
import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import {
  ClearanceRequestDto,
  ClearanceSignoffDto,
  ClearanceStudentSuggestionDto,
  InitiateClearanceRequest,
  ProcessSignoffRequest
} from '../../../core/models/compliance.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { TermService } from '../../../core/services/institution.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';
import { ClearanceService } from '../../../core/services/clearance.service';
import { ClearanceRequestsService } from '../../../core/services/clearance-requests.service';
import { effect } from '@angular/core';

interface StudentSuggestionOption {
  label: string;
  value: string;
  suggestion: ClearanceStudentSuggestionDto;
}

interface SignoffDecisionOption {
  label: string;
  value: string;
  icon: string;
  severity: string;
}

@Component({
  selector: 'app-student-clearance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    SelectButtonModule,
    TagModule,
    DialogModule,
    TooltipModule,
    ConfirmDialogModule,
    SkeletonModule,
    ProgressBarModule,
    EmptyStateComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './student-clearance.component.html',
  styleUrl: './student-clearance.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentClearanceComponent implements OnInit {
  private readonly complianceApi = inject(ComplianceApiService);
  private readonly authService = inject(AuthService);
  private readonly termService = inject(TermService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly periodStore = inject(AcademicPeriodStore);
  readonly clearanceService = inject(ClearanceService);
  readonly clearanceRequestsService = inject(ClearanceRequestsService);

  // Clearance Requests Array for dynamic display & specs
  clearanceRequests: any[] = [];

  // User Role & Context Signals
  readonly isStudentUser = signal<boolean>(false);
  readonly suggestionOptions = signal<StudentSuggestionOption[]>([]);

  // Search & Filter State
  searchStudentNumber: string = '';
  searchTermId: number | null = null;
  initiatePurpose: string = 'GRADUATION';
  readonly activeTermDisplay = signal<string>('Loading Active Term...');

  constructor() {
    effect(() => {
      const globalTermId = this.periodStore.selectedTermId();
      if (globalTermId && globalTermId !== this.searchTermId) {
        this.searchTermId = globalTermId;
        const currentTerm = this.periodStore.selectedTerm();
        if (currentTerm) {
          const yearCode = currentTerm.academicYearCode || '';
          const type = currentTerm.termName || currentTerm.termType || `Term ${currentTerm.id}`;
          this.activeTermDisplay.set(yearCode ? `${type} (${yearCode})` : `${type}`);
        }
        if (this.searchStudentNumber?.trim()) {
          this.loadClearanceStatus();
        }
      }
    });
  }

  readonly purposes = [
    { label: 'Graduation & Special Order', value: 'GRADUATION', icon: 'pi pi-graduation-cap' },
    { label: 'Transfer Credentials', value: 'TRANSFER', icon: 'pi pi-send' },
    { label: 'Leave of Absence (LOA)', value: 'LOA', icon: 'pi pi-calendar-minus' },
    { label: 'General Clearance', value: 'GENERAL', icon: 'pi pi-file-check' }
  ];

  readonly signoffOptions: SignoffDecisionOption[] = [
    { label: 'Approve Clearance', value: 'APPROVED', icon: 'pi pi-check', severity: 'success' },
    { label: 'Hold / Reject', value: 'REJECTED', icon: 'pi pi-times-circle', severity: 'danger' }
  ];

  // Component Async Signals
  readonly clearanceRequest = signal<ClearanceRequestDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isInitiating = signal<boolean>(false);
  readonly isSubmittingSignoff = signal<boolean>(false);
  readonly selectedSignoff = signal<ClearanceSignoffDto | null>(null);
  readonly showSignoffModal = signal<boolean>(false);

  // Signoff Dialog Form State
  signoffActionStatus: string = 'APPROVED';
  signoffRemarks: string = '';

  // Computed Progress Signals
  readonly clearedCount = computed(() => {
    const req = this.clearanceRequest();
    if (!req || !req.signoffs) return 0;
    return req.signoffs.filter((s) => s.signoffStatus === 'APPROVED' || s.signoffStatus === 'CLEARED').length;
  });

  readonly totalSignoffs = computed(() => {
    const req = this.clearanceRequest();
    return req && req.signoffs ? req.signoffs.length : 0;
  });

  readonly progressPercentage = computed(() => {
    const total = this.totalSignoffs();
    if (total === 0) return 0;
    return Math.round((this.clearedCount() / total) * 100);
  });

  ngOnInit(): void {
    this.loadActiveTerm();

    // 1. Subscribe to ClearanceRequestsService requests$ stream
    this.clearanceRequestsService.requests$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((requests: any) => {
        if (Array.isArray(requests)) {
          this.clearanceRequests = requests;
          if (requests.length > 0 && requests[0]) {
            const first = requests[0];
            if (first.signoffs) {
              this.clearanceRequest.set(first);
            }
          }
        } else if (requests) {
          this.clearanceRequests = [requests];
          if (requests.signoffs) {
            this.clearanceRequest.set(requests);
          }
        } else {
          this.clearanceRequests = [];
        }
      });

    // 2. Subscribe to ClearanceService clearanceRequest$ stream
    this.clearanceService.clearanceRequest$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((req) => {
        if (req) {
          this.clearanceRequest.set(req);
          if (this.clearanceRequests.length === 0) {
            this.clearanceRequests = [req];
          }
          if (req.studentNumber && (!this.searchStudentNumber || this.isStudentUser())) {
            this.searchStudentNumber = req.studentNumber;
          }
        }
      });

    // 3. Resolve student ID dynamically from Route Param or Authenticated User
    const routeStudentId = this.route?.snapshot?.paramMap?.get('studentId') ||
                           this.route?.snapshot?.paramMap?.get('id') ||
                           this.route?.snapshot?.queryParamMap?.get('studentId') ||
                           this.route?.snapshot?.queryParamMap?.get('id');

    let isRegistrarOrAdmin = false;
    let currentUser: any = null;
    try {
      currentUser = typeof this.authService.currentUser === 'function' ? this.authService.currentUser() : null;
      isRegistrarOrAdmin = currentUser && (
        currentUser.role === 'REGISTRAR' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' ||
        currentUser.roles?.includes('REGISTRAR') || currentUser.roles?.includes('ADMIN') || currentUser.roles?.includes('SUPER_ADMIN')
      );
    } catch {}

    if (routeStudentId && (isRegistrarOrAdmin || !this.authService.hasRole('STUDENT'))) {
      const parsedId = Number(routeStudentId);
      if (!isNaN(parsedId) && parsedId > 0) {
        this.clearanceRequestsService.initializeForStudent(parsedId);
        this.clearanceService.initializeForStudent(parsedId);
        this.searchStudentNumber = routeStudentId;
        return;
      }
    }

    const currentStudentId = currentUser?.studentId ?? currentUser?.studentProfileId ?? this.authService.getStudentProfileId?.();
    if (currentStudentId && currentStudentId > 0) {
      this.clearanceRequestsService.initializeForStudent(currentStudentId);
      this.clearanceService.initializeForStudent(currentStudentId);
    } else if (this.authService.currentUser$?.pipe) {
      this.authService.currentUser$.pipe(
        filter(u => !!(u?.studentId || u?.studentProfileId)),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(u => {
        const resolvedId = u?.studentId || u?.studentProfileId;
        if (resolvedId && resolvedId > 0) {
          this.clearanceRequestsService.initializeForStudent(resolvedId);
          this.clearanceService.initializeForStudent(resolvedId);
        }
      });
    }
  }

  loadActiveTerm(): void {
    const selected = this.periodStore.selectedTerm();
    const selectedId = this.periodStore.selectedTermId();
    if (selected && selectedId) {
      this.searchTermId = selectedId;
      const yearCode = selected.academicYearCode || (selected as any).academicYear?.code || '';
      const termTypeName = selected.termName || selected.termType || `Term ${selected.id}`;
      this.activeTermDisplay.set(yearCode ? `${termTypeName} (${yearCode})` : `${termTypeName}`);
      this.initUserContext();
    }

    if (this.termService?.activeTerm$?.pipe) {
      this.termService.activeTerm$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (term) => {
          if (!term) return;
          const previousTermId = this.searchTermId;
          this.searchTermId = this.periodStore.selectedTermId() || term.id;
          const yearCode = term.academicYearCode || (term as any).academicYear?.code || '';
          const termTypeName = term.termName || term.termType || `Term ${term.id}`;
          const displayLabel = yearCode ? `${termTypeName} (${yearCode})` : `${termTypeName}`;
          this.activeTermDisplay.set(displayLabel);
          if (!previousTermId) {
            this.initUserContext();
          } else if (this.searchStudentNumber?.trim()) {
            this.loadClearanceStatus();
          }
        },
        error: () => {
          if (!this.searchTermId) {
            this.searchTermId = this.periodStore.selectedTermId() || this.periodStore.activeTerm()?.id || null;
            if (this.searchTermId) {
              this.activeTermDisplay.set(`Term ${this.searchTermId} (Active)`);
              this.initUserContext();
            }
          }
        }
      });
    }

    if (this.termService?.getActive) {
      this.termService.getActive().subscribe({
        error: () => {
          if (!this.searchTermId) {
            this.searchTermId = this.periodStore.selectedTermId() || this.periodStore.activeTerm()?.id || null;
            if (this.searchTermId) {
              this.activeTermDisplay.set(`Term ${this.searchTermId} (Active)`);
              this.initUserContext();
            }
          }
        }
      });
    }
  }

  private initUserContext(): void {
    const isStudent = this.authService.hasRole('STUDENT');
    this.isStudentUser.set(isStudent);

    if (isStudent) {
      this.enrollmentApi.getCurrentStudentProfile().subscribe({
        next: (profile) => {
          if (profile?.studentNumber) {
            this.searchStudentNumber = profile.studentNumber;
            if (profile.id) {
              this.clearanceService.initializeForStudent(profile.id);
            }
            this.loadClearanceStatus();
          }
        },
        error: () => {
          const studentIdent = this.authService.getStudentNumber() || this.authService.getStudentProfileId()?.toString() || this.authService.getUserId()?.toString();
          if (studentIdent) {
            this.searchStudentNumber = studentIdent;
            const profileId = this.authService.getStudentProfileId();
            if (profileId) {
              this.clearanceService.initializeForStudent(profileId);
            }
            this.loadClearanceStatus();
          }
        }
      });
    } else {
      this.loadStudentSuggestions();
    }
  }

  loadStudentSuggestions(query: string = ''): void {
    this.complianceApi.getClearanceStudentSuggestions(query).subscribe({
      next: (suggestions) => {
        const options: StudentSuggestionOption[] = (suggestions || []).map((s) => ({
          label: `${s.studentName} (${s.studentNumber}) - ${s.programCode}`,
          value: s.studentNumber,
          suggestion: s
        }));
        this.suggestionOptions.set(options);
        if (!this.searchStudentNumber && options.length > 0) {
          this.searchStudentNumber = options[0].value;
          this.loadClearanceStatus();
        }
      },
      error: () => {
        this.suggestionOptions.set([]);
      }
    });
  }

  onSuggestionChange(event: any): void {
    if (event?.value) {
      this.searchStudentNumber = event.value;
      const matchedSuggestion = this.suggestionOptions().find((opt) => opt.value === event.value);
      if (matchedSuggestion?.suggestion?.studentProfileId) {
        this.clearanceService.initializeForStudent(matchedSuggestion.suggestion.studentProfileId);
      }
      this.loadClearanceStatus();
    }
  }

  loadClearanceStatus(): void {
    if (!this.searchStudentNumber?.trim() || !this.searchTermId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Student Number required.' });
      return;
    }

    this.isLoading.set(true);
    const trimmed = this.searchStudentNumber.trim();
    const matchedSuggestion = this.suggestionOptions().find(
      (opt) => opt.value === trimmed || opt.suggestion?.studentNumber === trimmed
    );
    if (matchedSuggestion?.suggestion?.studentProfileId) {
      this.clearanceService.initializeForStudent(matchedSuggestion.suggestion.studentProfileId);
    }

    this.complianceApi.getClearanceByStudentAndTerm(trimmed, this.searchTermId).subscribe({
      next: (data) => {
        this.clearanceRequest.set(data);
        this.isLoading.set(false);
        if (data?.studentProfileId) {
          this.clearanceService.initializeForStudent(data.studentProfileId);
        }
      },
      error: () => {
        this.clearanceRequest.set(null);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'No Active Record',
          detail: 'No clearance request found for this student and academic term.'
        });
      }
    });
  }

  initiateClearance(): void {
    if (!this.searchStudentNumber?.trim() || !this.searchTermId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Student Number required.' });
      return;
    }

    const req: InitiateClearanceRequest = {
      studentNumber: this.searchStudentNumber.trim(),
      termId: this.searchTermId,
      purpose: this.initiatePurpose
    };

    this.isInitiating.set(true);
    this.complianceApi.initiateClearance(req).subscribe({
      next: (data) => {
        this.isInitiating.set(false);
        this.clearanceRequest.set(data);
        if (data?.studentProfileId) {
          this.clearanceService.initializeForStudent(data.studentProfileId);
        }
        this.clearanceService.refresh();
        this.messageService.add({
          severity: 'success',
          summary: 'Clearance Initiated',
          detail: 'Multi-department clearance request started.'
        });
        if (!this.isStudentUser()) {
          this.loadStudentSuggestions();
        }
      },
      error: (err) => {
        this.isInitiating.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Failed to initiate clearance.'
        });
      }
    });
  }

  openSignoffModal(signoff: ClearanceSignoffDto): void {
    this.selectedSignoff.set(signoff);
    this.signoffActionStatus = 'APPROVED';
    this.signoffRemarks = '';
    this.showSignoffModal.set(true);
  }

  submitSignoff(): void {
    const signoff = this.selectedSignoff();
    if (!signoff) return;

    if (this.signoffActionStatus === 'REJECTED') {
      this.confirmationService.confirm({
        message: `Are you sure you want to REJECT or HOLD clearance for ${this.clearanceRequest()?.studentName}?`,
        header: 'Confirm Clearance Hold',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => this.executeSignoffSubmit(signoff.id)
      });
    } else {
      this.executeSignoffSubmit(signoff.id);
    }
  }

  private executeSignoffSubmit(signoffId: number): void {
    const req: ProcessSignoffRequest = {
      signoffStatus: this.signoffActionStatus,
      remarks: this.signoffRemarks.trim() || undefined
    };

    this.isSubmittingSignoff.set(true);
    this.complianceApi.processSignoff(signoffId, req).subscribe({
      next: () => {
        this.isSubmittingSignoff.set(false);
        this.showSignoffModal.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Sign-off Processed',
          detail: `Department sign-off marked as ${this.signoffActionStatus}.`
        });
        this.clearanceService.refresh();
        this.loadClearanceStatus();
      },
      error: (err) => {
        this.isSubmittingSignoff.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Processing Failed',
          detail: err.error?.message || 'Failed to process sign-off.'
        });
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status?.toUpperCase()) {
      case 'CLEARED':
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warn';
      case 'REJECTED':
      case 'HOLD':
        return 'danger';
      default:
        return 'info';
    }
  }

  getDepartmentDisplayName(dept: string): string {
    switch (dept?.toUpperCase()) {
      case 'ACCOUNTING':
      case 'CASHIER':
        return 'Accounting & Cashier';
      case 'DEAN':
        return 'College Dean';
      case 'STUDENT_AFFAIRS':
      case 'OSAS':
        return 'Student Affairs (OSAS)';
      case 'LIBRARY':
        return 'University Library';
      case 'LABORATORY':
      case 'LAB':
        return 'Science & Computer Lab';
      case 'REGISTRAR':
        return 'Office of the Registrar';
      default:
        return dept;
    }
  }

  getDepartmentIcon(dept: string): string {
    switch (dept?.toUpperCase()) {
      case 'ACCOUNTING':
      case 'CASHIER':
        return 'pi pi-wallet';
      case 'DEAN':
        return 'pi pi-id-card';
      case 'STUDENT_AFFAIRS':
      case 'OSAS':
        return 'pi pi-users';
      case 'LIBRARY':
        return 'pi pi-book';
      case 'LABORATORY':
      case 'LAB':
        return 'pi pi-desktop';
      case 'REGISTRAR':
        return 'pi pi-file';
      default:
        return 'pi pi-building';
    }
  }

  getDepartmentRoleLabel(dept: string): string {
    switch (dept?.toUpperCase()) {
      case 'ACCOUNTING':
      case 'CASHIER':
        return 'Cashier / Accountant';
      case 'DEAN':
        return 'College Dean';
      case 'STUDENT_AFFAIRS':
      case 'OSAS':
        return 'OSAS / Guidance';
      case 'LIBRARY':
        return 'Librarian';
      case 'LABORATORY':
      case 'LAB':
        return 'Lab Custodian / Faculty';
      case 'REGISTRAR':
        return 'Registrar';
      default:
        return 'Department Officer';
    }
  }

  canUserProcessSignoff(signoff: ClearanceSignoffDto): boolean {
    if (this.authService.hasRole('STUDENT')) {
      return false;
    }
    if (
      this.authService.hasRole('ADMIN') ||
      this.authService.hasRole('SUPER_ADMIN') ||
      this.authService.hasRole('REGISTRAR')
    ) {
      return true;
    }
    const dept = signoff?.departmentType?.toUpperCase();
    switch (dept) {
      case 'ACCOUNTING':
      case 'CASHIER':
        return this.authService.hasRole('CASHIER') || this.authService.hasRole('ACCOUNTANT');
      case 'DEAN':
        return this.authService.hasRole('DEAN');
      case 'STUDENT_AFFAIRS':
      case 'OSAS':
        return this.authService.hasRole('GUIDANCE') || this.authService.hasRole('STUDENT_AFFAIRS');
      case 'LIBRARY':
        return this.authService.hasRole('LIBRARY') || this.authService.hasRole('FACULTY');
      case 'LABORATORY':
      case 'LAB':
        return this.authService.hasRole('FACULTY') || this.authService.hasRole('CHAIRPERSON');
      case 'REGISTRAR':
        return this.authService.hasRole('REGISTRAR');
      default:
        return false;
    }
  }
}

export { StudentClearanceComponent as ClearanceComponent };