import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
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
  GradeEntryDto,
  ClassRecordMatrixResponse,
  StudentScoreEntryDto,
  SectionGradingCategoryDto,
  ClassRecordItemDto
} from '../../core/models/enrollment.model';

export const VALID_CHED_GRADES = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 4.00, 5.00] as const;

export interface EditableRosterRow extends RosterStudentDto {
  isDirty?: boolean;
  gradeError?: string | null;
}

import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

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
    ConfirmDialogModule,
    SkeletonModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    EmptyStateComponent
  ],
  templateUrl: './faculty-gradebook.component.html',
  styleUrls: ['./faculty-gradebook.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FacultyGradebookComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly schedulingApi = inject(SchedulingApiService);
  private readonly termService = inject(TermService);
  readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  private sectionsSub?: Subscription;
  private rosterSub?: Subscription;

  // Active Tab State
  readonly activeTab = signal<'ROSTER' | 'CLASS_RECORD'>('ROSTER');

  // User auth state
  readonly currentUser = this.authService.currentUser;
  readonly userRole = computed(() => (this.currentUser().role || '').toUpperCase());
  readonly isAdmin = computed(() => this.userRole().includes('ADMIN'));
  readonly isFaculty = computed(() => this.userRole().includes('FACULTY'));
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

  // Dynamic Class Record State
  readonly classRecordMatrix = signal<ClassRecordMatrixResponse | null>(null);
  readonly isMatrixLoading = signal<boolean>(false);
  readonly isSavingMatrix = signal<boolean>(false);
  readonly showAddItemModal = signal<boolean>(false);
  readonly newItemCategoryId = signal<number | null>(null);
  readonly newItemTitle = signal<string>('');
  readonly newItemMaxPoints = signal<number>(50);
  readonly manualRosterOverride = signal<boolean>(false);

  // Post-Seal Grade Change Request State
  readonly isGradeChangeModalOpen = signal<boolean>(false);
  readonly selectedGradeChangeStudent = signal<EditableRosterRow | null>(null);
  readonly gradeChangeNewGrade = signal<number>(1.75);
  readonly gradeChangeReason = signal<string>('');

  // Pending Grade Change Requests State (Dean / Registrar / Admin)
  readonly pendingRequests = signal<any[]>([]);
  readonly isPendingRequestsModalOpen = signal<boolean>(false);
  readonly isLoadingPendingRequests = signal<boolean>(false);
  readonly pendingRequestsCount = computed(() => this.pendingRequests().length);


  // Computed states
  readonly currentGradeStatus = computed(() => this.roster()?.gradeStatus || 'DRAFT');
  readonly isSealed = computed(() => this.currentGradeStatus() === 'SEALED');
  readonly isSubmitted = computed(() => this.currentGradeStatus() === 'SUBMITTED');
  readonly isVerified = computed(() => this.currentGradeStatus() === 'VERIFIED');

  readonly phaseInfo = computed(() => {
    const status = this.currentGradeStatus();
    switch (status) {
      case 'SUBMITTED':
        return {
          title: 'Tier 2: Dean Review & Verification',
          severity: 'info',
          description: 'Grades have been submitted to the College Dean for academic compliance verification.'
        };
      case 'VERIFIED':
        return {
          title: 'Tier 3: Registrar Ready for Sealing',
          severity: 'help',
          description: 'Grades have been verified by the Dean and are ready for official Registrar sealing.'
        };
      case 'SEALED':
        return {
          title: 'Tier 4: Sealed & Locked Official Records',
          severity: 'success',
          description: 'Grades are permanently sealed and synchronized to student academic records.'
        };
      case 'DRAFT':
      default:
        return {
          title: 'Tier 1: Faculty Draft Mode',
          severity: 'warn',
          description: 'Faculty can edit assessment scores and grades before submitting to the Dean.'
        };
    }
  });

  readonly isAssignedInstructor = computed(() => {
    const user = this.currentUser();
    const ros = this.roster();
    if (!user || !ros) return false;
    return (user as { id?: number }).id === ros.primaryInstructorId;
  });

  readonly canEditGrades = computed(() => {
    if (this.currentGradeStatus() !== 'DRAFT') return false;
    return this.isAdmin() || this.isAssignedInstructor();
  });

  readonly unreadyStudentsCount = computed(() =>
    this.editableStudents().filter(
      s => s.finalNumericalGrade === null || 
           s.finalNumericalGrade === undefined || 
           s.completionStatus === 'IN_PROGRESS' || 
           s.completionStatus === 'ENROLLED'
    ).length
  );

  readonly hasIncompleteGrades = computed(() => this.unreadyStudentsCount() > 0);

  readonly hasGradeErrors = computed(() => this.editableStudents().some(s => !!s.gradeError));

  // Grade Curve Distribution Statistics
  readonly superiorCount = computed(() =>
    this.editableStudents().filter(s => s.finalNumericalGrade !== null && s.finalNumericalGrade !== undefined && s.finalNumericalGrade >= 1.00 && s.finalNumericalGrade <= 1.50).length
  );
  readonly satisfactoryCount = computed(() =>
    this.editableStudents().filter(s => s.finalNumericalGrade !== null && s.finalNumericalGrade !== undefined && s.finalNumericalGrade >= 1.75 && s.finalNumericalGrade <= 3.00).length
  );
  readonly conditionalCount = computed(() =>
    this.editableStudents().filter(s => s.finalNumericalGrade === 4.00 || s.completionStatus === 'INCOMPLETE').length
  );
  readonly deficientCount = computed(() =>
    this.editableStudents().filter(s => s.finalNumericalGrade === 5.00 || s.completionStatus === 'FAILED' || s.completionStatus === 'DROPPED').length
  );
  readonly unassignedCount = computed(() => this.unreadyStudentsCount());

  readonly superiorPercent = computed(() => this.totalStudents() > 0 ? (this.superiorCount() / this.totalStudents()) * 100 : 0);
  readonly satisfactoryPercent = computed(() => this.totalStudents() > 0 ? (this.satisfactoryCount() / this.totalStudents()) * 100 : 0);
  readonly conditionalPercent = computed(() => this.totalStudents() > 0 ? (this.conditionalCount() / this.totalStudents()) * 100 : 0);
  readonly deficientPercent = computed(() => this.totalStudents() > 0 ? (this.deficientCount() / this.totalStudents()) * 100 : 0);
  readonly unassignedPercent = computed(() => this.totalStudents() > 0 ? (this.unassignedCount() / this.totalStudents()) * 100 : 0);

  // Disabled Tooltip Messages
  readonly saveDisabledTooltip = computed(() => {
    if (this.isSaving()) return 'Saving changes...';
    if (!this.canEditGrades()) {
      if (this.currentGradeStatus() !== 'DRAFT') {
        return `Save disabled: Gradebook is in ${this.currentGradeStatus()} status`;
      }
      return 'Restricted to assigned primary instructor';
    }
    if (this.hasGradeErrors()) return 'Save blocked: Grade scale errors must be resolved';
    return '';
  });

  readonly submitDisabledTooltip = computed(() => {
    if (this.isSaving()) return 'Submitting grades...';
    if (this.currentGradeStatus() !== 'DRAFT') {
      return `Submission disabled: Current status is ${this.currentGradeStatus()}`;
    }
    if (this.hasGradeErrors()) return 'Submission blocked: Grade scale errors must be resolved';
    const unready = this.unreadyStudentsCount();
    if (unready > 0) {
      return `Submission blocked: ${unready} student(s) missing numerical grade or in progress`;
    }
    return '';
  });

  readonly verifyDisabledTooltip = computed(() => {
    if (this.isSaving()) return 'Verifying grades...';
    if (this.currentGradeStatus() === 'DRAFT') return 'Verification requires prior submission by instructor';
    if (this.currentGradeStatus() === 'VERIFIED') return 'Section grades are already verified by Dean';
    if (this.currentGradeStatus() === 'SEALED') return 'Section grades are permanently sealed';
    return '';
  });

  readonly sealDisabledTooltip = computed(() => {
    if (this.isSaving()) return 'Sealing grades...';
    if (this.currentGradeStatus() === 'SEALED') return 'Section grades are permanently sealed';
    if (this.currentGradeStatus() !== 'VERIFIED') {
      return `Registrar sealing requires prior Dean verification (Current: ${this.currentGradeStatus()})`;
    }
    return '';
  });

  readonly showActiveTermOnly = signal<boolean>(true);

  readonly displayedTerms = computed(() => {
    const all = this.terms();
    if (this.showActiveTermOnly()) {
      const active = all.filter(t => t.isActive);
      return active.length > 0 ? active : all;
    }
    return all;
  });

  readonly termOptions = computed(() => {
    return this.displayedTerms().map(t => ({
      label: t.academicYearCode ? `${t.academicYearCode} - ${this.formatTermType(t.termType)}${t.isActive ? ' (Active)' : ''}` : `Term ${t.id}`,
      value: t.id
    }));
  });

  toggleTermFilter(): void {
    this.showActiveTermOnly.update(v => !v);
    const available = this.displayedTerms();
    if (available.length > 0) {
      const currentSelected = this.selectedTermId();
      const stillPresent = available.some(t => t.id === currentSelected);
      if (!stillPresent) {
        this.onTermSelect(available[0].id);
      }
    }
  }

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

  // Flat list of assessment items for dynamic table columns
  readonly allAssessmentItems = computed(() => {
    const matrix = this.classRecordMatrix();
    if (!matrix || !matrix.config || !matrix.config.categories) return [];
    const items: { categoryName: string; termPeriod: string; item: ClassRecordItemDto }[] = [];
    for (const cat of matrix.config.categories) {
      if (cat.items) {
        for (const item of cat.items) {
          items.push({ categoryName: cat.categoryName, termPeriod: cat.termPeriod, item });
        }
      }
    }
    return items;
  });

  readonly categoryOptions = computed(() => {
    const matrix = this.classRecordMatrix();
    if (!matrix || !matrix.config || !matrix.config.categories) return [];
    return matrix.config.categories.map(cat => ({
      label: `${cat.termPeriod} — ${cat.categoryName} (${cat.weightPercentage}%)`,
      value: cat.id
    }));
  });

  ngOnInit(): void {
    this.loadTerms();
    if (this.isDean() || this.isRegistrar() || this.isAdmin()) {
      this.loadPendingRequests();
    }
  }

  loadTerms(): void {
    this.isLoading.set(true);
    this.termService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (terms: TermResponse[]) => {
        this.terms.set(terms || []);
        if (terms && terms.length > 0) {
          const active = terms.find(t => t.isActive) || terms[0];
          this.onTermSelect(active.id);
        } else {
          this.isLoading.set(false);
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

    if (this.sectionsSub) {
      this.sectionsSub.unsubscribe();
      this.sectionsSub = undefined;
    }
    if (this.rosterSub) {
      this.rosterSub.unsubscribe();
      this.rosterSub = undefined;
    }

    this.selectedTermId.set(id);
    this.selectedSectionId.set(null);
    this.roster.set(null);
    this.editableStudents.set([]);
    this.classRecordMatrix.set(null);

    this.isLoading.set(true);
    this.sectionsSub = this.schedulingApi.getSectionsByTerm(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
    if (this.activeTab() === 'CLASS_RECORD') {
      this.loadClassRecordMatrix(id);
    }
  }

  setTab(tab: 'ROSTER' | 'CLASS_RECORD'): void {
    this.activeTab.set(tab);
    const sid = this.selectedSectionId();
    if (tab === 'CLASS_RECORD' && sid && !this.classRecordMatrix()) {
      this.loadClassRecordMatrix(sid);
    }
  }

  toggleManualRosterOverride(): void {
    this.manualRosterOverride.update(v => !v);
    if (!this.manualRosterOverride()) {
      const matrix = this.classRecordMatrix();
      if (matrix) {
        this.syncMatrixToRoster(matrix);
      }
    }
  }

  loadClassRecordMatrix(sectionId: number): void {
    this.isMatrixLoading.set(true);
    this.enrollmentApi.getScoreMatrix(sectionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: matrix => {
          this.classRecordMatrix.set(matrix);
          this.syncMatrixToRoster(matrix);
          this.isMatrixLoading.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load class record matrix.' });
          this.isMatrixLoading.set(false);
        }
      });
  }

  syncMatrixToRoster(matrix: ClassRecordMatrixResponse | null): void {
    if (!matrix || this.manualRosterOverride()) return;
    const rosterList = this.editableStudents();
    if (!rosterList || rosterList.length === 0) return;

    const updated = rosterList.map(student => {
      const matrixRow = matrix.rows.find(r => r.studentId === student.studentId);
      if (matrixRow && matrixRow.transmutedGrade !== null && matrixRow.transmutedGrade !== undefined) {
        const grade = matrixRow.transmutedGrade;
        const status = matrixRow.completionStatus || (grade <= 3.00 ? 'PASSED' : 'FAILED');
        return {
          ...student,
          finalNumericalGrade: grade,
          completionStatus: status,
          gradeError: null
        };
      }
      return student;
    });

    this.editableStudents.set(updated);
  }

  getStudentScoreValue(studentId: number, itemId: number): number | null {
    const matrix = this.classRecordMatrix();
    if (!matrix) return null;
    const row = matrix.rows.find(r => r.studentId === studentId);
    if (!row) return null;
    const s = row.scores.find(score => score.itemId === itemId);
    return s ? (s.scoreEarned ?? null) : null;
  }

  transmutePercentageToChedGrade(pct: number): number {
    if (pct >= 96.00) return 1.00;
    if (pct >= 93.00) return 1.25;
    if (pct >= 90.00) return 1.50;
    if (pct >= 87.00) return 1.75;
    if (pct >= 84.00) return 2.00;
    if (pct >= 81.00) return 2.25;
    if (pct >= 78.00) return 2.50;
    if (pct >= 75.00) return 2.75;
    if (pct >= 70.00) return 3.00;
    return 5.00;
  }

  recalculateRowGrades(row: any): void {
    const matrix = this.classRecordMatrix();
    if (!matrix || !matrix.config || !matrix.config.categories) return;

    const categories = matrix.config.categories;
    let midtermWeightedSum = 0;
    let hasMidtermScores = false;
    let finalWeightedSum = 0;
    let hasFinalScores = false;

    for (const cat of categories) {
      const items = cat.items || [];
      if (items.length === 0) continue;

      let catMax = 0;
      let catEarned = 0;
      let hasScoresInCat = false;

      for (const item of items) {
        const scoreObj = row.scores?.find((s: any) => s.itemId === item.id);
        if (scoreObj && scoreObj.scoreEarned !== null && scoreObj.scoreEarned !== undefined && !scoreObj.isExcused) {
          catEarned += Number(scoreObj.scoreEarned);
          catMax += Number(item.maxPoints);
          hasScoresInCat = true;
        }
      }

      if (catMax > 0 && hasScoresInCat) {
        const catPct = (catEarned / catMax) * 100;
        const weighted = (catPct * Number(cat.weightPercentage)) / 100;
        if (cat.termPeriod === 'MIDTERM') {
          midtermWeightedSum += weighted;
          hasMidtermScores = true;
        } else if (cat.termPeriod === 'FINAL') {
          finalWeightedSum += weighted;
          hasFinalScores = true;
        }
      }
    }

    row.midtermRawPercentage = hasMidtermScores ? Math.round(midtermWeightedSum * 100) / 100 : null;
    row.finalRawPercentage = hasFinalScores ? Math.round(finalWeightedSum * 100) / 100 : null;

    let totalRaw = 0;
    let hasRaw = false;
    const midtermWeight = Number(matrix.config.midtermWeight || 50);
    const finalWeight = Number(matrix.config.finalWeight || 50);

    if (row.midtermRawPercentage !== null) {
      totalRaw += (row.midtermRawPercentage * midtermWeight) / 100;
      hasRaw = true;
    }
    if (row.finalRawPercentage !== null) {
      totalRaw += (row.finalRawPercentage * finalWeight) / 100;
      hasRaw = true;
    }

    if (row.totalRawPercentage !== null) {
      row.transmutedGrade = this.transmutePercentageToChedGrade(row.totalRawPercentage);
      if (row.transmutedGrade !== null && row.transmutedGrade !== undefined) {
        if (row.transmutedGrade <= 3.00) {
          row.completionStatus = 'PASSED';
        } else if (Math.abs(row.transmutedGrade - 4.00) < 0.001) {
          row.completionStatus = 'INCOMPLETE';
        } else {
          row.completionStatus = 'FAILED';
        }
      }
    } else {
      row.transmutedGrade = null;
      row.completionStatus = 'IN_PROGRESS';
    }

    if (!this.manualRosterOverride()) {
      const rosterList = this.editableStudents();
      const studentInRoster = rosterList.find(s => s.studentId === row.studentId);
      if (studentInRoster) {
        studentInRoster.finalNumericalGrade = row.transmutedGrade;
        studentInRoster.completionStatus = row.completionStatus;
        studentInRoster.isDirty = true;
        studentInRoster.gradeError = this.validateStudentRow(studentInRoster);
      }
    }
  }

  onMatrixScoreChange(studentId: number, itemId: number, newScore: number | null): void {
    const matrix = this.classRecordMatrix();
    if (!matrix) return;

    const row = matrix.rows.find(r => r.studentId === studentId);
    if (!row) return;

    let scoreObj = row.scores.find(s => s.itemId === itemId);
    if (scoreObj) {
      scoreObj.scoreEarned = newScore;
    } else {
      scoreObj = { itemId, studentId, scoreEarned: newScore, isExcused: false };
      row.scores.push(scoreObj);
    }

    this.recalculateRowGrades(row);
    this.editableStudents.update(list => [...list]);
  }

  onMatrixKeydown(event: KeyboardEvent, rowIndex: number, colIndex: number): void {
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusMatrixInput(rowIndex + 1, colIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusMatrixInput(rowIndex - 1, colIndex);
    }
  }

  private focusMatrixInput(rowIndex: number, colIndex: number): void {
    const matrix = this.classRecordMatrix();
    if (!matrix) return;
    if (rowIndex < 0 || rowIndex >= matrix.rows.length) return;

    setTimeout(() => {
      const selector = `.gb-matrix-row-${rowIndex}-col-${colIndex} input`;
      const input = document.querySelector<HTMLInputElement>(selector);
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  saveMatrixScores(): void {
    const sid = this.selectedSectionId();
    const matrix = this.classRecordMatrix();
    if (!sid || !matrix) return;

    // Client-side score validation prior to sending API payload
    for (const row of matrix.rows) {
      for (const score of row.scores) {
        if (score.scoreEarned !== null && score.scoreEarned !== undefined && !score.isExcused) {
          if (score.scoreEarned < 0) {
            this.messageService.add({
              severity: 'error',
              summary: 'Invalid Score Entry',
              detail: `Raw score for student (${row.studentNumber}) cannot be negative.`
            });
            return;
          }
          const matchedItem = this.allAssessmentItems().find(i => i.item.id === score.itemId);
          if (matchedItem && score.scoreEarned > matchedItem.item.maxPoints) {
            this.messageService.add({
              severity: 'error',
              summary: 'Score Exceeds Maximum Points',
              detail: `Score ${score.scoreEarned} for student (${row.studentNumber}) exceeds activity '${matchedItem.item.itemTitle}' maximum points (${matchedItem.item.maxPoints}).`
            });
            return;
          }
        }
      }
    }

    const allScoreEntries: StudentScoreEntryDto[] = [];
    for (const row of matrix.rows) {
      for (const score of row.scores) {
        allScoreEntries.push({
          itemId: score.itemId,
          studentId: row.studentId,
          scoreEarned: score.scoreEarned,
          isExcused: score.isExcused
        });
      }
    }

    this.isSavingMatrix.set(true);
    this.enrollmentApi.batchSaveScores(sid, { scores: allScoreEntries })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updatedMatrix => {
          this.classRecordMatrix.set(updatedMatrix);

          if (!this.manualRosterOverride() && updatedMatrix && updatedMatrix.rows) {
            const currentRoster = this.editableStudents();
            const updatedRoster = currentRoster.map(s => {
              const matrixRow = updatedMatrix.rows.find(r => r.studentId === s.studentId);
              if (matrixRow && matrixRow.transmutedGrade !== null && matrixRow.transmutedGrade !== undefined) {
                const grade = matrixRow.transmutedGrade;
                const status = matrixRow.completionStatus && matrixRow.completionStatus !== 'IN_PROGRESS'
                  ? matrixRow.completionStatus
                  : (grade <= 3.00 ? 'PASSED' : (Math.abs(grade - 4.00) < 0.001 ? 'INCOMPLETE' : 'FAILED'));
                return {
                  ...s,
                  finalNumericalGrade: grade,
                  completionStatus: status,
                  isDirty: false
                };
              }
              return s;
            });
            this.editableStudents.set(updatedRoster);
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Class Record Saved',
            detail: 'Raw scores saved & transmuted CHED grades synced to gradebook roster.'
          });
          this.isSavingMatrix.set(false);
          this.loadSectionRoster(sid);
        },
        error: err => {
          const detailMsg = err.error?.detail || err.message || 'Failed to save class record scores.';
          this.messageService.add({
            severity: 'error',
            summary: 'Save Blocked / Failed',
            detail: detailMsg
          });
          this.isSavingMatrix.set(false);
        }
      });
  }

  openAddItemModal(): void {
    const matrix = this.classRecordMatrix();
    if (matrix && matrix.config && matrix.config.categories && matrix.config.categories.length > 0) {
      this.newItemCategoryId.set(matrix.config.categories[0].id);
    }
    this.newItemTitle.set('');
    this.newItemMaxPoints.set(50);
    this.showAddItemModal.set(true);
  }

  submitAddItem(): void {
    const sid = this.selectedSectionId();
    const catId = this.newItemCategoryId();
    const title = this.newItemTitle();
    const max = this.newItemMaxPoints();

    if (!sid) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'No class section selected.' });
      return;
    }
    if (!catId) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please select a grading category.' });
      return;
    }
    if (!title || !title.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Activity title cannot be blank.' });
      return;
    }
    if (!max || max <= 0) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Maximum points must be greater than 0.' });
      return;
    }

    this.enrollmentApi.addAssessmentItem(sid, {
      categoryId: catId,
      itemTitle: title.trim(),
      maxPoints: max,
      sequenceOrder: 1
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Item Added', detail: `Added '${title}' (${max} pts)` });
        this.showAddItemModal.set(false);
        this.loadClassRecordMatrix(sid);
      },
      error: err => {
        const detailMsg = err.error?.detail || err.message || 'Failed to add assessment item.';
        this.messageService.add({ severity: 'error', summary: 'Add Item Failed', detail: detailMsg });
      }
    });
  }

  deleteItem(itemId: number, title: string): void {
    const sid = this.selectedSectionId();
    if (!sid) return;

    this.confirmationService.confirm({
      message: `Delete assessment item '${title}' and all recorded student scores for this activity?`,
      header: 'Confirm Item Deletion',
      icon: 'pi pi-trash',
      acceptLabel: 'Delete Item',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.enrollmentApi.deleteAssessmentItem(itemId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'info', summary: 'Item Removed', detail: `Assessment item '${title}' deleted.` });
              this.loadClassRecordMatrix(sid);
            },
            error: err => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to delete assessment item.' });
            }
          });
      }
    });
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

  validateStudentRow(row: EditableRosterRow): string | null {
    const grade = row.finalNumericalGrade;
    const status = row.completionStatus;

    const gradeErr = this.validatePhilippineGrade(grade);
    if (gradeErr) return gradeErr;

    if (grade !== null && grade !== undefined) {
      const rounded = Math.round(grade * 100) / 100;
      if (rounded >= 1.00 && rounded <= 3.00) {
        if (status === 'FAILED') {
          return 'Passing grade (1.00-3.00) cannot have FAILED status.';
        }
      } else if (Math.abs(rounded - 5.00) < 0.001) {
        if (status === 'PASSED') {
          return 'Failing grade (5.00) cannot have PASSED status.';
        }
      } else if (Math.abs(rounded - 4.00) < 0.001) {
        if (status !== 'INCOMPLETE') {
          return 'Conditional grade (4.00) requires INCOMPLETE status.';
        }
      }
    }
    return null;
  }

  loadSectionRoster(sectionId: number): void {
    if (this.rosterSub) {
      this.rosterSub.unsubscribe();
      this.rosterSub = undefined;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.rosterSub = this.enrollmentApi.getSectionRoster(sectionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: SectionRosterResponse) => {
          this.roster.set(res);
          const matrix = this.classRecordMatrix();
          const rows: EditableRosterRow[] = (res.students || []).map(s => {
            let initialGrade = s.finalNumericalGrade ?? null;
            let status = s.completionStatus || 'IN_PROGRESS';

            if (!this.manualRosterOverride() && matrix) {
              const matrixRow = matrix.rows.find(r => r.studentId === s.studentId);
              if (matrixRow && matrixRow.transmutedGrade !== null && matrixRow.transmutedGrade !== undefined) {
                initialGrade = matrixRow.transmutedGrade;
                status = matrixRow.completionStatus && matrixRow.completionStatus !== 'IN_PROGRESS'
                  ? matrixRow.completionStatus
                  : (initialGrade <= 3.00 ? 'PASSED' : (Math.abs(initialGrade - 4.00) < 0.001 ? 'INCOMPLETE' : 'FAILED'));
              }
            } else if (initialGrade !== null && initialGrade !== undefined && (status === 'ENROLLED' || status === 'IN_PROGRESS')) {
              status = initialGrade <= 3.00 ? 'PASSED' : (Math.abs(initialGrade - 4.00) < 0.001 ? 'INCOMPLETE' : 'FAILED');
            }

            const r: EditableRosterRow = {
              ...s,
              finalNumericalGrade: initialGrade,
              completionStatus: status,
              isDirty: false
            };
            r.gradeError = this.validateStudentRow(r);
            return r;
          });
          this.editableStudents.set(rows);
          this.isLoading.set(false);

          if (!matrix) {
            this.loadClassRecordMatrix(sectionId);
          }
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

    if (newGrade !== null && newGrade !== undefined && !isNaN(newGrade)) {
      const rounded = Math.round(newGrade * 100) / 100;
      if (rounded <= 3.00 && rounded >= 1.00) {
        row.completionStatus = 'PASSED';
      } else if (Math.abs(rounded - 5.00) < 0.001) {
        row.completionStatus = 'FAILED';
      } else if (Math.abs(rounded - 4.00) < 0.001) {
        row.completionStatus = 'INCOMPLETE';
      }
    } else if (newGrade === null || newGrade === undefined) {
      if (row.completionStatus === 'PASSED' || row.completionStatus === 'FAILED' || row.completionStatus === 'INCOMPLETE') {
        row.completionStatus = 'IN_PROGRESS';
      }
    }

    row.gradeError = this.validateStudentRow(row);

    this.editableStudents.update(list =>
      list.map(s => s.enrollmentItemId === row.enrollmentItemId ? { ...row } : s)
    );
  }

  onStatusChange(row: EditableRosterRow, newStatus: string): void {
    row.completionStatus = newStatus;
    row.isDirty = true;
    row.gradeError = this.validateStudentRow(row);

    this.editableStudents.update(list =>
      list.map(s => s.enrollmentItemId === row.enrollmentItemId ? { ...row } : s)
    );
  }

  onGradeKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusGradeInput(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusGradeInput(index - 1);
    }
  }

  private focusGradeInput(index: number): void {
    const total = this.editableStudents().length;
    if (index < 0 || index >= total) return;
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.grade-input-field input, p-inputnumber input');
      if (inputs && inputs[index]) {
        inputs[index].focus();
        inputs[index].select();
      }
    }, 0);
  }

  saveDraft(): void {
    const sectionId = this.selectedSectionId();
    if (!sectionId || this.hasGradeErrors() || !this.canEditGrades()) return;

    const payload: GradeEntryDto[] = this.editableStudents().map(s => ({
      enrollmentItemId: s.enrollmentItemId,
      finalNumericalGrade: s.finalNumericalGrade,
      completionStatus: s.completionStatus
    }));

    this.isSaving.set(true);
    this.enrollmentApi.saveSectionGrades(sectionId, {
      grades: payload,
      submitForVerification: false
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    if (!sectionId || this.hasGradeErrors() || this.hasIncompleteGrades()) return;

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
        }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const ros = this.roster();
    if (!sectionId || !ros || ros.gradeStatus !== 'SUBMITTED') return;

    this.confirmationService.confirm({
      message: 'Verify section grade sheet per institutional curriculum and grading policies? Once verified, grades will proceed to Registrar sealing.',
      header: 'Dean Grade Verification',
      icon: 'pi pi-verified',
      acceptLabel: 'Verify Grades',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-help',
      accept: () => {
        this.isSaving.set(true);
        this.enrollmentApi.verifySectionGrades(sectionId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
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

  rejectGrades(): void {
    const sectionId = this.selectedSectionId();
    const ros = this.roster();
    if (!sectionId || !ros || ros.gradeStatus !== 'SUBMITTED') return;

    this.confirmationService.confirm({
      message: 'Reject section grade sheet and return roster to Faculty for revision? Instructors will be able to edit and re-submit grades.',
      header: 'Confirm Rejection & Return to Faculty',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reject & Return to Draft',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.isSaving.set(true);
        this.enrollmentApi.rejectSectionGrades(sectionId, 'Returned by Dean for academic revision')
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: res => {
              this.messageService.add({
                severity: 'warn',
                summary: 'Grades Returned to Faculty',
                detail: `Section grades returned to DRAFT for revision. Status: ${res.gradeStatus}`
              });
              this.isSaving.set(false);
              this.loadSectionRoster(sectionId);
            },
            error: err => {
              this.messageService.add({
                severity: 'error',
                summary: 'Rejection Blocked',
                detail: err.error?.detail || 'Failed to reject section grades.'
              });
              this.isSaving.set(false);
            }
          });
      }
    });
  }

  sealGrades(): void {
    const sectionId = this.selectedSectionId();
    const ros = this.roster();
    if (!sectionId || !ros || ros.gradeStatus !== 'VERIFIED') return;

    this.confirmationService.confirm({
      message: 'Permanently SEAL section grades into official academic transcript records? Once sealed, grades become permanent and can only be altered via official post-seal grade change request.',
      header: 'Registrar Official Grade Sealing',
      icon: 'pi pi-lock',
      acceptLabel: 'Seal Section Grades',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-help',
      accept: () => {
        this.isSaving.set(true);
        this.enrollmentApi.sealSectionGrades(sectionId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: res => {
              this.messageService.add({
                severity: 'success',
                summary: 'Grades Sealed',
                detail: `Section grades permanently sealed into official academic transcripts. Status: ${res.gradeStatus}`
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

  batchVerifyAllSections(): void {
    const sectionIds = this.sections().map(s => s.id);
    if (!sectionIds || sectionIds.length === 0) return;

    this.confirmationService.confirm({
      message: `Verify all ${sectionIds.length} course sections under this term for academic compliance?`,
      header: 'Confirm Batch Verification',
      icon: 'pi pi-verified',
      acceptLabel: 'Batch Verify All Sections',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-help',
      accept: () => {
        this.isSaving.set(true);
        this.enrollmentApi.batchVerifySectionGrades(sectionIds)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (results) => {
              this.messageService.add({
                severity: 'success',
                summary: 'Batch Verification Completed',
                detail: `Processed ${results.length} sections for Dean verification.`
              });
              this.isSaving.set(false);
              const activeSec = this.selectedSectionId();
              if (activeSec) this.loadSectionRoster(activeSec);
            },
            error: err => {
              this.messageService.add({
                severity: 'error',
                summary: 'Batch Verification Error',
                detail: err.error?.detail || 'Failed to execute batch section verification.'
              });
              this.isSaving.set(false);
            }
          });
      }
    });
  }

  batchSealAllSections(): void {
    const sectionIds = this.sections().map(s => s.id);
    if (!sectionIds || sectionIds.length === 0) return;

    this.confirmationService.confirm({
      message: `Permanently SEAL all ${sectionIds.length} verified section grade rosters into permanent student transcripts and credit records?`,
      header: 'Confirm Batch Registrar Sealing',
      icon: 'pi pi-lock',
      acceptLabel: 'Batch Seal All Sections',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.isSaving.set(true);
        this.enrollmentApi.batchSealSectionGrades(sectionIds)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (results) => {
              this.messageService.add({
                severity: 'success',
                summary: 'Batch Sealing Completed',
                detail: `Sealed ${results.length} section rosters into permanent transcripts with cryptographic hashes.`
              });
              this.isSaving.set(false);
              const activeSec = this.selectedSectionId();
              if (activeSec) this.loadSectionRoster(activeSec);
            },
            error: err => {
              this.messageService.add({
                severity: 'error',
                summary: 'Batch Sealing Error',
                detail: err.error?.detail || 'Failed to execute batch section sealing.'
              });
              this.isSaving.set(false);
            }
          });
      }
    });
  }

  openGradeChangeModal(student: EditableRosterRow): void {
    this.selectedGradeChangeStudent.set(student);
    this.gradeChangeNewGrade.set(student.finalNumericalGrade || 1.75);
    this.gradeChangeReason.set('');
    this.isGradeChangeModalOpen.set(true);
  }

  submitGradeChangeRequest(): void {
    const student = this.selectedGradeChangeStudent();
    const ros = this.roster();
    const reason = this.gradeChangeReason().trim();
    if (!student || !ros || !reason) {
      this.messageService.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please specify a reason for the grade change request.' });
      return;
    }

    this.isSaving.set(true);
    this.enrollmentApi.submitGradeChangeRequest({
      studentId: student.studentId,
      courseId: ros.courseId,
      termId: ros.termId,
      previousGrade: student.finalNumericalGrade || 3.00,
      newGrade: this.gradeChangeNewGrade(),
      reason: reason
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Request Submitted',
          detail: `Grade change request for ${student.studentName} submitted for Dean/Registrar approval.`
        });
        this.isGradeChangeModalOpen.set(false);
        this.isSaving.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Request Failed',
          detail: err.error?.detail || 'Failed to submit grade change request.'
        });
        this.isSaving.set(false);
      }
    });
  }

  loadPendingRequests(): void {
    if (!this.isDean() && !this.isRegistrar() && !this.isAdmin()) return;
    this.isLoadingPendingRequests.set(true);
    this.enrollmentApi.getPendingGradeChangeRequests()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.pendingRequests.set(res || []);
          this.isLoadingPendingRequests.set(false);
        },
        error: () => {
          this.isLoadingPendingRequests.set(false);
        }
      });
  }

  openPendingRequestsModal(): void {
    this.loadPendingRequests();
    this.isPendingRequestsModalOpen.set(true);
  }

  approveGradeChange(requestId: number): void {
    this.isSaving.set(true);
    this.enrollmentApi.approveGradeChangeRequest(requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Request Approved',
            detail: 'Post-seal grade change request approved and applied to student records.'
          });
          this.loadPendingRequests();
          if (this.selectedSectionId()) {
            this.loadSectionRoster(this.selectedSectionId()!);
          }
          this.isSaving.set(false);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Approval Failed',
            detail: err.error?.detail || 'Failed to approve grade change request.'
          });
          this.isSaving.set(false);
        }
      });
  }

  rejectGradeChange(requestId: number): void {
    this.isSaving.set(true);
    this.enrollmentApi.rejectGradeChangeRequest(requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'Request Rejected',
            detail: 'Post-seal grade change request rejected.'
          });
          this.loadPendingRequests();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Rejection Failed',
            detail: err.error?.detail || 'Failed to reject grade change request.'
          });
          this.isSaving.set(false);
        }
      });
  }

  exportChedGradeSheet(): void {
    const ros = this.roster();
    const students = this.editableStudents();
    if (!ros || students.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Export Unavailable', detail: 'No student roster records to export.' });
      return;
    }

    let csvContent = 'CHED OFFICIAL GRADE REPORT SHEET\n';
    csvContent += `Course Code,${ros.courseCode}\n`;
    csvContent += `Course Title,${ros.courseTitle}\n`;
    csvContent += `Section,${ros.sectionCode}\n`;
    csvContent += `Instructor,${ros.primaryInstructorName || 'Unassigned'}\n`;

    csvContent += `Grade Status,${ros.gradeStatus}\n\n`;
    csvContent += 'STUDENT NUMBER,STUDENT NAME,PROGRAM,NUMERICAL GRADE,STATUS\n';

    for (const s of students) {
      const g = s.finalNumericalGrade !== null && s.finalNumericalGrade !== undefined ? s.finalNumericalGrade.toFixed(2) : 'N/A';
      csvContent += `"${s.studentNumber}","${s.studentName}","${s.programCode}","${g}","${s.completionStatus}"\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `CHED_GradeSheet_${ros.courseCode}_${ros.sectionCode}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.messageService.add({
      severity: 'info',
      summary: 'Grade Sheet Exported',
      detail: `Official CHED grade sheet exported for section ${ros.sectionCode}.`
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
