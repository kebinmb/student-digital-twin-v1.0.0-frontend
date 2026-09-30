import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { Drawer } from 'primeng/drawer';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { CourseOutcomeService, CoursePrerequisiteService, CourseService } from '../../../../core/services/institution.service';
import { Course, CourseOutcome, CoursePrerequisite, CreateCourseOutcomeRequest, CreateCoursePrerequisiteRequest, UpdateCourseOutcomeRequest } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

interface CiloForm {
  code: FormControl<string>;
  description: FormControl<string>;
  bloomsLevel: FormControl<string>;
}

interface PrereqForm {
  prerequisiteCourseId: FormControl<number | null>;
  ruleType: FormControl<string>;
  minGradeRequired: FormControl<string>;
}

@Component({
  selector: 'app-course-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Drawer,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    SelectButtonModule,
    ConfirmDialogModule
  ],
  templateUrl: './course-detail-dialog.component.html',
  styleUrl: './course-detail-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseDetailDialogComponent {
  readonly course = input<Course | null>(null);
  readonly allCourses = input<Course[]>([]);
  readonly visible = model<boolean>(false);
  readonly courseUpdated = output<void>();

  private readonly outcomeService = inject(CourseOutcomeService);
  private readonly prereqService = inject(CoursePrerequisiteService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON']);

  activeTab: 'outcomes' | 'prerequisites' = 'outcomes';

  readonly tabs = [
    { label: 'Learning Outcomes (CILOs)', value: 'outcomes' },
    { label: 'Prerequisites & Rules', value: 'prerequisites' }
  ];

  readonly bloomsOptions = [
    { label: 'Remembering', value: 'Remembering' },
    { label: 'Understanding', value: 'Understanding' },
    { label: 'Applying', value: 'Applying' },
    { label: 'Analyzing', value: 'Analyzing' },
    { label: 'Evaluating', value: 'Evaluating' },
    { label: 'Creating', value: 'Creating' }
  ];

  readonly ruleTypeOptions = [
    { label: 'Hard Prerequisite (Prior Completion)', value: 'HARD' },
    { label: 'Co-Requisite (Simultaneous Enrollment)', value: 'CO_REQUISITE' },
    { label: 'Standing Prerequisite (Year Level)', value: 'STANDING' }
  ];

  readonly outcomes = signal<CourseOutcome[]>([]);
  readonly prerequisites = signal<CoursePrerequisite[]>([]);
  readonly isLoadingOutcomes = signal<boolean>(false);
  readonly isLoadingPrereqs = signal<boolean>(false);

  readonly isAddingCilo = signal<boolean>(false);
  readonly isSavingCilo = signal<boolean>(false);
  readonly editingCiloId = signal<number | null>(null);

  readonly isAddingPrereq = signal<boolean>(false);
  readonly isSavingPrereq = signal<boolean>(false);

  get dialogTitle(): string {
    const c = this.course();
    return c ? `Curricular Configuration: ${c.code}` : 'Course Details';
  }

  readonly ciloForm = new FormGroup<CiloForm>({
    code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(30)] }),
    description: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    bloomsLevel: new FormControl<string>('Applying', { nonNullable: true, validators: [Validators.required] })
  });

  readonly prereqForm = new FormGroup<PrereqForm>({
    prerequisiteCourseId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    ruleType: new FormControl<string>('HARD', { nonNullable: true, validators: [Validators.required] }),
    minGradeRequired: new FormControl<string>('3.00', { nonNullable: true })
  });

  get filteredAvailableCourses() {
    const c = this.course();
    if (!c) return [];
    return this.allCourses()
      .filter((item) => item.id !== c.id)
      .map((item) => ({ label: `${item.code} - ${item.title}`, value: item.id }));
  }

  constructor() {
    effect(() => {
      const c = this.course();
      if (c && this.visible()) {
        this.loadCourseData();
      }
    });
  }

  loadCourseData(): void {
    const c = this.course();
    if (!c) return;
    const cid = c.id;

    this.isLoadingOutcomes.set(true);
    this.outcomeService.getByCourse(cid).subscribe({
      next: (list) => {
        this.outcomes.set(list);
        this.isLoadingOutcomes.set(false);
      },
      error: () => this.isLoadingOutcomes.set(false)
    });

    this.isLoadingPrereqs.set(true);
    this.prereqService.getByCourse(cid).subscribe({
      next: (list) => {
        this.prerequisites.set(list);
        this.isLoadingPrereqs.set(false);
      },
      error: () => this.isLoadingPrereqs.set(false)
    });
  }

  onVisibilityChange(val: boolean): void {
    this.visible.set(val);
  }

  // --- CILO Actions ---
  startAddCilo(): void {
    this.editingCiloId.set(null);
    const nextIndex = this.outcomes().length + 1;
    this.ciloForm.reset({
      code: `CILO ${nextIndex}`,
      description: '',
      bloomsLevel: 'Applying'
    });
    this.isAddingCilo.set(true);
  }

  startEditCilo(co: CourseOutcome): void {
    this.editingCiloId.set(co.id);
    this.ciloForm.reset({
      code: co.code,
      description: co.description,
      bloomsLevel: co.bloomsLevel
    });
    this.isAddingCilo.set(true);
  }

  cancelCiloForm(): void {
    this.isAddingCilo.set(false);
    this.editingCiloId.set(null);
  }

  submitCiloForm(): void {
    const currentCourse = this.course();
    if (this.ciloForm.invalid || !currentCourse) return;
    const val = this.ciloForm.getRawValue();
    this.isSavingCilo.set(true);

    const editId = this.editingCiloId();
    if (editId) {
      const req: UpdateCourseOutcomeRequest = {
        description: val.description.trim(),
        bloomsLevel: val.bloomsLevel
      };
      this.outcomeService.update(currentCourse.id, editId, req).subscribe({
        next: () => {
          this.isSavingCilo.set(false);
          this.cancelCiloForm();
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Outcome updated.' });
          this.loadCourseData();
        },
        error: (err) => {
          this.isSavingCilo.set(false);
          this.messageService.add({ severity: 'error', summary: 'Update Error', detail: err.error?.detail || 'Update failed.' });
        }
      });
    } else {
      const req: CreateCourseOutcomeRequest = {
        code: val.code.trim().toUpperCase(),
        description: val.description.trim(),
        bloomsLevel: val.bloomsLevel
      };
      this.outcomeService.create(currentCourse.id, req).subscribe({
        next: () => {
          this.isSavingCilo.set(false);
          this.cancelCiloForm();
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Learning outcome registered.' });
          this.loadCourseData();
        },
        error: (err) => {
          this.isSavingCilo.set(false);
          this.messageService.add({ severity: 'error', summary: 'Create Error', detail: err.error?.detail || 'Registration failed.' });
        }
      });
    }
  }

  confirmDeleteCilo(co: CourseOutcome): void {
    const currentCourse = this.course();
    if (!currentCourse) return;
    this.confirmationService.confirm({
      message: `Delete outcome "${co.code}"? Blocked if linked in the CILO-PILO curriculum alignment matrix.`,
      header: 'Delete Course Outcome',
      icon: 'pi pi-trash',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => {
        this.outcomeService.delete(currentCourse.id, co.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${co.code} removed.` });
            this.loadCourseData();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Deletion Blocked', detail: err.error?.detail || 'Cannot delete outcome in matrix.' });
          }
        });
      }
    });
  }

  getBloomsSeverity(level: string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (level.toLowerCase()) {
      case 'creating': return 'success';
      case 'evaluating': return 'warn';
      case 'analyzing': return 'info';
      case 'applying': return 'secondary';
      default: return 'secondary';
    }
  }

  // --- Prerequisite Actions ---
  startAddPrereq(): void {
    this.prereqForm.reset({
      prerequisiteCourseId: null,
      ruleType: 'HARD',
      minGradeRequired: '3.00'
    });
    this.isAddingPrereq.set(true);
  }

  cancelPrereqForm(): void {
    this.isAddingPrereq.set(false);
  }

  submitPrereqForm(): void {
    const currentCourse = this.course();
    if (this.prereqForm.invalid || !currentCourse) return;
    const val = this.prereqForm.getRawValue();
    this.isSavingPrereq.set(true);

    const req: CreateCoursePrerequisiteRequest = {
      courseId: currentCourse.id,
      prerequisiteCourseId: val.prerequisiteCourseId!,
      ruleType: val.ruleType,
      minGradeRequired: val.minGradeRequired.trim()
    };

    this.prereqService.create(currentCourse.id, req).subscribe({
      next: () => {
        this.isSavingPrereq.set(false);
        this.cancelPrereqForm();
        this.messageService.add({ severity: 'success', summary: 'Prerequisite Added', detail: 'Prerequisite rule established.' });
        this.loadCourseData();
      },
      error: (err) => {
        this.isSavingPrereq.set(false);
        this.messageService.add({ severity: 'error', summary: 'Rule Violation', detail: err.error?.detail || 'Could not add prerequisite (potential circular dependency).' });
      }
    });
  }

  confirmDeletePrereq(prereq: CoursePrerequisite): void {
    const currentCourse = this.course();
    if (!currentCourse) return;
    this.confirmationService.confirm({
      message: `Remove prerequisite requirement "${prereq.prerequisiteCourseCode}"?`,
      header: 'Remove Prerequisite Rule',
      icon: 'pi pi-trash',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => {
        this.prereqService.delete(currentCourse.id, prereq.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Removed', detail: 'Prerequisite rule detached.' });
            this.loadCourseData();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Removal Failed', detail: err.error?.detail || 'Action failed.' });
          }
        });
      }
    });
  }
}
