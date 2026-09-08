import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

// Core Services & Models
import { EnrollmentApiService } from '../../core/service/enrollment/enrollment-api.service';
import { SchedulingApiService } from '../../core/service/scheduling/scheduling-api.service';
import { TermService } from '../../core/services/institution.service';
import { AuthService } from '../../core/service/authentication/auth-service';
import { SectionDetailResponse } from '../../core/models/scheduling.model';
import { TermResponse } from '../../core/models/institution.model';
import {
  SectionRosterResponse,
  RosterStudentDto,
  GradeEntryDto
} from '../../core/models/enrollment.model';

export const VALID_CHED_GRADES = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 4.00, 5.00] as const;

export interface EditableRosterRow extends RosterStudentDto {
  isDirty?: boolean;
  gradeError?: string | null;
}

@Component({
  selector: 'app-faculty-gradebook',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    SelectModule,
    InputNumberModule,
    ToastModule,
    MessageModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './faculty-gradebook.component.html',
  styleUrls: ['./faculty-gradebook.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FacultyGradebookComponent implements OnInit {
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly schedulingApi = inject(SchedulingApiService);
  private readonly termService = inject(TermService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // User auth state
  readonly currentUser = this.authService.currentUser;
  readonly userRole = computed(() => (this.currentUser().role || '').toUpperCase());
  readonly isAdmin = computed(() => this.userRole().includes('ADMIN'));
  readonly isDean = computed(() => this.isAdmin() || this.userRole().includes('DEAN'));
  readonly isRegistrar = computed(() => this.isAdmin() || this.userRole().includes('REGISTRAR'));

  // Term & Section State
  readonly terms = signal<TermResponse[]>([]);
  readonly selectedTermId = signal<number | null>(null);
  readonly sections = signal<SectionDetailResponse[]>([]);
  readonly selectedSectionId = signal<number | null>(null);

  // Gradebook Roster State
  readonly roster = signal<SectionRosterResponse | null>(null);
  readonly editableStudents = signal<EditableRosterRow[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Computed states
  readonly currentGradeStatus = computed(() => this.roster()?.gradeStatus || 'DRAFT');
  readonly isSealed = computed(() => this.currentGradeStatus() === 'SEALED');
  readonly isSubmitted = computed(() => this.currentGradeStatus() === 'SUBMITTED');
  readonly isVerified = computed(() => this.currentGradeStatus() === 'VERIFIED');

  readonly canEditGrades = computed(() => {
    if (this.isSealed()) return false;
    if (this.isAdmin()) return true;
    if (this.isDean() && (this.currentGradeStatus() === 'DRAFT' || this.isSubmitted())) return true;
    return this.currentGradeStatus() === 'DRAFT';
  });

  readonly hasGradeErrors = computed(() => this.editableStudents().some(s => !!s.gradeError));

  readonly phaseInfo = computed(() => {
    const status = this.currentGradeStatus();
    switch (status) {
      case 'SUBMITTED':
        return {
          title: 'Tier 2: Awaiting Dean Compliance Verification',
          description: 'Grades submitted to the College Dean for academic compliance and prerequisite verification. Grade editing is locked for instructors unless returned by Dean.',
          icon: 'pi pi-send',
          severity: 'info' as const,
          badgeClass: 'bg-sky-100 text-sky-800 border-sky-300'
        };
      case 'VERIFIED':
        return {
          title: 'Tier 3: Dean Verified & Ready for Registrar Sealing',
          description: 'Dean verification completed successfully. Class roster is cleared for Registrar Sealing Engine execution and official transcript synchronization.',
          icon: 'pi pi-verified',
          severity: 'help' as const,
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-300'
        };
      case 'SEALED':
        return {
          title: 'Tier 4: Officially Sealed & Locked by Registrar',
          description: 'Official academic records finalized. Grades locked in permanent transcript ledger, cumulative GPA updated, and subsequent course prerequisites satisfied.',
          icon: 'pi pi-lock',
          severity: 'success' as const,
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
      case 'DRAFT':
      default:
        return {
          title: 'Tier 1: Faculty Grade Encoding (Draft Open)',
          description: 'Faculty members encode final numerical grades (1.00 to 5.00) adhering to CHED CMO No. 25 standards. All draft changes can be saved locally before final submission.',
          icon: 'pi pi-pencil',
          severity: 'warn' as const,
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
        };
    }
  });

  readonly termOptions = computed(() => {
    return this.terms().map(t => ({
      label: t.academicYearCode ? `${t.academicYearCode} - ${this.formatTermType(t.termType)}` : `Term ${t.id}`,
      value: t.id
    }));
  });

  readonly sectionOptions = computed(() => {
    return this.sections().map(s => ({
      label: `${s.sectionCode} — ${s.courseCode}: ${s.courseTitle} (${s.enrolledCount} enrolled)`,
      value: s.id
    }));
  });

  readonly completionStatusOptions = [
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Passed', value: 'PASSED' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Incomplete (INC)', value: 'INCOMPLETE' },
    { label: 'Dropped (DRP)', value: 'DROPPED' }
  ];

  // Statistics Computations
  readonly totalStudents = computed(() => this.editableStudents().length);
  readonly passedCount = computed(() => this.editableStudents().filter(s => s.completionStatus === 'PASSED').length);
  readonly failedCount = computed(() => this.editableStudents().filter(s => s.completionStatus === 'FAILED').length);
  readonly incCount = computed(() => this.editableStudents().filter(s => s.completionStatus === 'INCOMPLETE').length);
  readonly averageGrade = computed(() => {
    const valid = this.editableStudents().filter(s => s.finalNumericalGrade != null && s.finalNumericalGrade > 0);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, curr) => acc + (curr.finalNumericalGrade || 0), 0);
    return sum / valid.length;
  });

  ngOnInit(): void {
    this.loadTerms();
  }

  loadTerms(): void {
    this.isLoading.set(true);
    this.termService.getAll().subscribe({
      next: (terms: TermResponse[]) => {
        this.terms.set(terms || []);
        if (terms && terms.length > 0) {
          const active = terms.find(t => t.isActive) || terms[0];
          this.onTermSelect(active.id);
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load academic terms.' });
        this.isLoading.set(false);
      }
    });
  }

  onTermSelect(termId: number | { value: number } | null): void {
    const id = typeof termId === 'object' && termId !== null ? termId.value : Number(termId);
    if (!id) return;
    this.selectedTermId.set(id);
    this.selectedSectionId.set(null);
    this.roster.set(null);
    this.editableStudents.set([]);

    this.isLoading.set(true);
    this.schedulingApi.getSectionsByTerm(id).subscribe({
      next: (secs: SectionDetailResponse[]) => {
        this.sections.set(secs || []);
        if (secs && secs.length > 0) {
          this.onSectionSelect(secs[0].id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.sections.set([]);
        this.isLoading.set(false);
      }
    });
  }

  onSectionSelect(sectionId: number | { value: number } | null): void {
    const id = typeof sectionId === 'object' && sectionId !== null ? sectionId.value : Number(sectionId);
    if (!id) return;
    this.selectedSectionId.set(id);
    this.loadSectionRoster(id);
  }

  validatePhilippineGrade(grade: number | null | undefined): string | null {
    if (grade === null || grade === undefined) {
      return null;
    }
    if (typeof grade !== 'number' || isNaN(grade)) {
      return 'Must be a valid numerical grade.';
    }
    const rounded = Math.round(grade * 100) / 100;
    const isValid = VALID_CHED_GRADES.some(valid => Math.abs(valid - rounded) < 0.001);
    if (!isValid) {
      return 'Must be valid CHED increment (1.00, 1.25, 1.50, ..., 3.00, 4.00, 5.00)';
    }
    return null;
  }

  loadSectionRoster(sectionId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.enrollmentApi.getSectionRoster(sectionId).subscribe({
      next: (res: SectionRosterResponse) => {
        this.roster.set(res);
        const rows: EditableRosterRow[] = (res.students || []).map(s => {
          const initialGrade = s.finalNumericalGrade ?? null;
          return {
            ...s,
            finalNumericalGrade: initialGrade,
            completionStatus: s.completionStatus || 'IN_PROGRESS',
            isDirty: false,
            gradeError: this.validatePhilippineGrade(initialGrade)
          };
        });
        this.editableStudents.set(rows);
        this.isLoading.set(false);
      },
      error: err => {
        const msg = err.error?.detail || 'Failed to load section gradebook roster.';
        this.errorMessage.set(msg);
        this.roster.set(null);
        this.editableStudents.set([]);
        this.isLoading.set(false);
      }
    });
  }

  onGradeChange(row: EditableRosterRow, newGrade: number | null): void {
    row.finalNumericalGrade = newGrade;
    row.isDirty = true;
    row.gradeError = this.validatePhilippineGrade(newGrade);

    // Automated smart status recommendation based on CMO 25 grading threshold (3.00 passing cap)
    if (!row.gradeError && newGrade !== null && newGrade !== undefined) {
      if (newGrade <= 3.00 && newGrade >= 1.00) {
        row.completionStatus = 'PASSED';
      } else if (newGrade === 5.00) {
        row.completionStatus = 'FAILED';
      } else if (newGrade === 4.00) {
        row.completionStatus = 'INCOMPLETE';
      }
    } else if (newGrade === null || newGrade === undefined) {
      if (row.completionStatus === 'PASSED' || row.completionStatus === 'FAILED' || row.completionStatus === 'INCOMPLETE') {
        row.completionStatus = 'IN_PROGRESS';
      }
    }

    this.editableStudents.update(list => [...list]);
  }

  onStatusChange(row: EditableRosterRow, newStatus: string): void {
    row.completionStatus = newStatus;
    row.isDirty = true;
    this.editableStudents.update(list => [...list]);
  }

  saveDraft(): void {
    const sectionId = this.selectedSectionId();
    if (!sectionId || this.hasGradeErrors()) return;

    const payload: GradeEntryDto[] = this.editableStudents().map(s => ({
      enrollmentItemId: s.enrollmentItemId,
      finalNumericalGrade: s.finalNumericalGrade,
      completionStatus: s.completionStatus
    }));

    this.isSaving.set(true);
    this.enrollmentApi.saveSectionGrades(sectionId, {
      grades: payload,
      submitForVerification: false
    }).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: 'Draft Saved',
          detail: `Grades draft saved successfully. Current status: ${res.gradeStatus}`
        });
        this.isSaving.set(false);
        this.loadSectionRoster(sectionId);
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: err.error?.detail || 'Failed to save grade entries.'
        });
        this.isSaving.set(false);
      }
    });
  }

  submitToDean(): void {
    const sectionId = this.selectedSectionId();
    if (!sectionId || this.hasGradeErrors()) return;

    this.confirmationService.confirm({
      message: 'Submit grades to College Dean for academic compliance review? You will not be able to modify grades once submitted unless returned by the Dean.',
      header: 'Confirm Submission to Dean',
      icon: 'pi pi-send',
      acceptLabel: 'Submit Grades',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-info',
      accept: () => {
        const payload: GradeEntryDto[] = this.editableStudents().map(s => ({
          enrollmentItemId: s.enrollmentItemId,
          finalNumericalGrade: s.finalNumericalGrade,
          completionStatus: s.completionStatus
        }));

        this.isSaving.set(true);
        this.enrollmentApi.saveSectionGrades(sectionId, {
          grades: payload,
          submitForVerification: true
        }).subscribe({
          next: res => {
            this.messageService.add({
              severity: 'success',
              summary: 'Submitted to Dean',
              detail: `Section grades submitted for Dean verification. Status: ${res.gradeStatus}`
            });
            this.isSaving.set(false);
            this.loadSectionRoster(sectionId);
          },
          error: err => {
            this.messageService.add({
              severity: 'error',
              summary: 'Submission Blocked',
              detail: err.error?.detail || 'Failed to submit section grades.'
            });
            this.isSaving.set(false);
          }
        });
      }
    });
  }

  verifyGrades(): void {
    const sectionId = this.selectedSectionId();
    if (!sectionId) return;

    this.confirmationService.confirm({
      message: 'Verify section grade sheet per institutional curriculum and grading policies? Once verified, grades will proceed to Registrar sealing.',
      header: 'Dean Grade Verification',
      icon: 'pi pi-verified',
      acceptLabel: 'Verify Grades',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-help',
      accept: () => {
        this.isSaving.set(true);
        this.enrollmentApi.verifySectionGrades(sectionId).subscribe({
          next: res => {
            this.messageService.add({
              severity: 'success',
              summary: 'Grades Verified',
              detail: `Section grades verified successfully by Dean. Status: ${res.gradeStatus}`
            });
            this.isSaving.set(false);
            this.loadSectionRoster(sectionId);
          },
          error: err => {
            this.messageService.add({
              severity: 'error',
              summary: 'Verification Blocked',
              detail: err.error?.detail || 'Failed to verify section grades.'
            });
            this.isSaving.set(false);
          }
        });
      }
    });
  }

  sealGrades(): void {
    const sectionId = this.selectedSectionId();
    if (!sectionId) return;

    this.confirmationService.confirm({
      message: 'CRITICAL: Execute Registrar Sealing Engine? This permanently locks the section gradebook, syncs official grades to student academic records, recalculates cumulative GPA, and satisfies CHED CMO 25 prerequisites for subsequent term enrollment.',
      header: 'Registrar Grade Sealing & GPA Finalization',
      icon: 'pi pi-lock',
      acceptLabel: 'Seal & Finalize Records',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.isSaving.set(true);
        this.enrollmentApi.sealSectionGrades(sectionId).subscribe({
          next: res => {
            this.messageService.add({
              severity: 'success',
              summary: 'Grades Sealed & Locked',
              detail: `Registrar Sealing Engine successfully executed! Student records finalized. Status: ${res.gradeStatus}`
            });
            this.isSaving.set(false);
            this.loadSectionRoster(sectionId);
          },
          error: err => {
            this.messageService.add({
              severity: 'error',
              summary: 'Sealing Blocked',
              detail: err.error?.detail || 'Failed to seal section grades.'
            });
            this.isSaving.set(false);
          }
        });
      }
    });
  }

  formatTermType(type: string): string {
    if (!type) return '';
    if (type === '1ST_SEM' || type === 'FIRST_SEM') return '1st Sem';
    if (type === '2ND_SEM' || type === 'SECOND_SEM') return '2nd Sem';
    if (type === 'SUMMER') return 'Summer';
    return type;
  }

  getStatusBadgeSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'DRAFT': return 'warn';
      case 'SUBMITTED': return 'info';
      case 'VERIFIED': return 'secondary';
      case 'SEALED': return 'success';
      default: return 'info';
    }
  }

  getGradeStatusLabel(status: string): string {
    switch (status) {
      case 'DRAFT': return 'Faculty Draft (Open)';
      case 'SUBMITTED': return 'Submitted to Dean (Pending Review)';
      case 'VERIFIED': return 'Dean Verified (Ready to Seal)';
      case 'SEALED': return 'Sealed & Locked (Official Records)';
      default: return status;
    }
  }

  getCompletionSeverity(status: string | undefined | null): 'success' | 'danger' | 'warn' | 'info' | 'secondary' {
    switch (status) {
      case 'PASSED': return 'success';
      case 'FAILED': return 'danger';
      case 'INCOMPLETE': return 'warn';
      case 'DROPPED': return 'danger';
      case 'IN_PROGRESS': return 'info';
      default: return 'secondary';
    }
  }
}
