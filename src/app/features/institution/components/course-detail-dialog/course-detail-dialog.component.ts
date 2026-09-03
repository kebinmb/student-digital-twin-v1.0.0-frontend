import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { DialogModule } from 'primeng/dialog';
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
    DialogModule,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    SelectButtonModule,
    ConfirmDialogModule
  ],
  template: `
    <p-dialog
      [header]="dialogTitle"
      [(visible)]="visible"
      (visibleChange)="onVisibilityChange($event)"
      [modal]="true"
      [style]="{ width: '800px', maxWidth: '95vw' }">
      
      @if (course) {
        <div class="course-summary-banner">
          <div class="summary-left">
            <span class="course-code-pill">{{ course.code }}</span>
            <span class="course-name">{{ course.title }}</span>
          </div>
          <div class="summary-right">
            <span class="units-badge">{{ course.creditUnits }} Credit Units ({{ course.lectureUnits }} Lec / {{ course.labUnits }} Lab)</span>
          </div>
        </div>

        <div class="dialog-tabs-header">
          <p-selectbutton
            [options]="tabs"
            [(ngModel)]="activeTab"
            optionLabel="label"
            optionValue="value"
            styleClass="dialog-tab-switch">
          </p-selectbutton>
        </div>

        <!-- TAB 1: Course Learning Outcomes (CILOs) -->
        @if (activeTab === 'outcomes') {
          <div class="tab-panel-content">
            <div class="panel-action-bar">
              <span class="section-instruction">
                Defined Course Intended Learning Outcomes (CILOs) and aligned Bloom's taxonomy levels.
              </span>
              @if (canManage() && !isAddingCilo()) {
                <p-button
                  label="Add Outcome (CILO)"
                  icon="pi pi-plus"
                  size="small"
                  severity="primary"
                  (onClick)="startAddCilo()">
                </p-button>
              }
            </div>

            <!-- Inline CILO Creation / Edit Form -->
            @if (isAddingCilo() && canManage()) {
              <div class="inline-form-card">
                <div class="inline-form-header">
                  <span class="inline-title">{{ editingCiloId() ? 'Edit Outcome' : 'Define New Course Outcome' }}</span>
                  <p-button icon="pi pi-times" [text]="true" size="small" severity="secondary" (onClick)="cancelCiloForm()"></p-button>
                </div>
                <form [formGroup]="ciloForm" (ngSubmit)="submitCiloForm()">
                  <div class="form-row-2col">
                    <div class="form-group">
                      <label class="form-label">CILO Code *</label>
                      <input pInputText type="text" formControlName="code" placeholder="e.g. CILO 1" class="form-control-input" [readOnly]="!!editingCiloId()" />
                      @if (ciloForm.controls.code.touched && ciloForm.controls.code.invalid) {
                        <span class="error-hint">Code is required (max 30 chars).</span>
                      }
                    </div>
                    <div class="form-group">
                      <label class="form-label">Bloom's Taxonomy Level *</label>
                      <p-select [options]="bloomsOptions" formControlName="bloomsLevel" placeholder="Select Bloom's Level" optionLabel="label" optionValue="value" styleClass="w-full"></p-select>
                    </div>
                  </div>
                  <div class="form-group mt-2">
                    <label class="form-label">Outcome Statement / Description *</label>
                    <textarea pTextarea formControlName="description" rows="2" placeholder="State measurable performance criteria (e.g. Design normalized relational database schemas...)" class="w-full"></textarea>
                    @if (ciloForm.controls.description.touched && ciloForm.controls.description.invalid) {
                      <span class="error-hint">Description statement is required.</span>
                    }
                  </div>
                  <div class="inline-form-actions mt-2">
                    <p-button label="Cancel" size="small" severity="secondary" [outlined]="true" type="button" (onClick)="cancelCiloForm()"></p-button>
                    <p-button [label]="editingCiloId() ? 'Update CILO' : 'Save CILO'" icon="pi pi-check" size="small" severity="primary" type="submit" [disabled]="ciloForm.invalid || isSavingCilo()"></p-button>
                  </div>
                </form>
              </div>
            }

            <p-table [value]="outcomes()" [loading]="isLoadingOutcomes()" responsiveLayout="scroll" styleClass="p-datatable-sm nested-table">
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 110px;">CILO Code</th>
                  <th>Outcome Description</th>
                  <th style="width: 140px;">Bloom's Level</th>
                  @if (canManage()) {
                    <th style="width: 100px; text-align: right;">Actions</th>
                  }
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-outcome>
                <tr>
                  <td><span class="code-badge">{{ outcome.code }}</span></td>
                  <td>{{ outcome.description }}</td>
                  <td>
                    <p-tag [severity]="getBloomsSeverity(outcome.bloomsLevel)" [value]="outcome.bloomsLevel"></p-tag>
                  </td>
                  @if (canManage()) {
                    <td style="text-align: right;">
                      <p-button icon="pi pi-pencil" size="small" [text]="true" severity="secondary" (onClick)="startEditCilo(outcome)"></p-button>
                      <p-button icon="pi pi-trash" size="small" [text]="true" severity="danger" (onClick)="confirmDeleteCilo(outcome)"></p-button>
                    </td>
                  }
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td [attr.colspan]="canManage() ? 4 : 3" class="empty-table-cell">
                    <p>No learning outcomes defined for this course yet.</p>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        }

        <!-- TAB 2: Course Prerequisites -->
        @if (activeTab === 'prerequisites') {
          <div class="tab-panel-content">
            <div class="panel-action-bar">
              <span class="section-instruction">
                Prerequisites, co-requisites, and academic standing rules governing enrollment eligibility.
              </span>
              @if (canManage() && !isAddingPrereq()) {
                <p-button
                  label="Add Prerequisite Rule"
                  icon="pi pi-plus"
                  size="small"
                  severity="primary"
                  (onClick)="startAddPrereq()">
                </p-button>
              }
            </div>

            <!-- Inline Prerequisite Creation Form -->
            @if (isAddingPrereq() && canManage()) {
              <div class="inline-form-card">
                <div class="inline-form-header">
                  <span class="inline-title">Define Prerequisite Constraint</span>
                  <p-button icon="pi pi-times" [text]="true" size="small" severity="secondary" (onClick)="cancelPrereqForm()"></p-button>
                </div>
                <form [formGroup]="prereqForm" (ngSubmit)="submitPrereqForm()">
                  <div class="form-group">
                    <label class="form-label">Required Prerequisite Course *</label>
                    <p-select
                      [options]="filteredAvailableCourses"
                      formControlName="prerequisiteCourseId"
                      placeholder="Select Prerequisite Course"
                      optionLabel="label"
                      optionValue="value"
                      [filter]="true"
                      filterBy="label"
                      styleClass="w-full">
                    </p-select>
                    <span class="field-hint">The current course itself ({{ course.code }}) is strictly excluded to prevent self-prerequisite references.</span>
                  </div>

                  <div class="form-row-2col mt-2">
                    <div class="form-group">
                      <label class="form-label">Rule Type *</label>
                      <p-select [options]="ruleTypeOptions" formControlName="ruleType" optionLabel="label" optionValue="value" styleClass="w-full"></p-select>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Minimum Required Grade</label>
                      <input pInputText type="text" formControlName="minGradeRequired" placeholder="e.g. 3.00" class="form-control-input" />
                    </div>
                  </div>

                  <div class="inline-form-actions mt-2">
                    <p-button label="Cancel" size="small" severity="secondary" [outlined]="true" type="button" (onClick)="cancelPrereqForm()"></p-button>
                    <p-button label="Add Prerequisite" icon="pi pi-check" size="small" severity="primary" type="submit" [disabled]="prereqForm.invalid || isSavingPrereq()"></p-button>
                  </div>
                </form>
              </div>
            }

            <p-table [value]="prerequisites()" [loading]="isLoadingPrereqs()" responsiveLayout="scroll" styleClass="p-datatable-sm nested-table">
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 140px;">Prerequisite Code</th>
                  <th>Prerequisite Course Title</th>
                  <th style="width: 140px;">Rule Type</th>
                  <th style="width: 120px;">Min Grade</th>
                  @if (canManage()) {
                    <th style="width: 80px; text-align: right;">Action</th>
                  }
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-prereq>
                <tr>
                  <td><span class="code-badge">{{ prereq.prerequisiteCourseCode }}</span></td>
                  <td>{{ prereq.prerequisiteCourseTitle || '—' }}</td>
                  <td>
                    @switch (prereq.ruleType) {
                      @case ('HARD') { <p-tag severity="danger" value="HARD PREREQ"></p-tag> }
                      @case ('CO_REQUISITE') { <p-tag severity="info" value="CO-REQUISITE"></p-tag> }
                      @default { <p-tag severity="warn" [value]="prereq.ruleType"></p-tag> }
                    }
                  </td>
                  <td><span class="grade-pill">{{ prereq.minGradeRequired || '3.00' }}</span></td>
                  @if (canManage()) {
                    <td style="text-align: right;">
                      <p-button icon="pi pi-trash" size="small" [text]="true" severity="danger" (onClick)="confirmDeletePrereq(prereq)"></p-button>
                    </td>
                  }
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td [attr.colspan]="canManage() ? 5 : 4" class="empty-table-cell">
                    <p>No prerequisite rules assigned. This course has no prior course requirements.</p>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        }
      }
    </p-dialog>
  `,
  styles: [`
    :host { display: block; }
    .course-summary-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .summary-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .course-code-pill {
      font-family: monospace;
      font-weight: 700;
      background: #116834;
      color: #ffffff;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.8125rem;
    }
    .course-name {
      font-weight: 600;
      color: #0f172a;
      font-size: 0.9375rem;
    }
    .units-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
    }
    .dialog-tabs-header {
      margin-bottom: 1rem;
    }
    .panel-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .section-instruction {
      font-size: 0.75rem;
      color: #64748b;
    }
    .inline-form-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05);
    }
    .inline-form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .inline-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #1e293b;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-row-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
    }
    .form-control-input {
      width: 100%;
      font-size: 0.8125rem;
    }
    .error-hint {
      font-size: 0.6875rem;
      color: #dc2626;
    }
    .field-hint {
      font-size: 0.6875rem;
      color: #64748b;
    }
    .inline-form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .code-badge {
      font-family: monospace;
      font-weight: 600;
      background: #f1f5f9;
      color: #0f172a;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-size: 0.8125rem;
    }
    .grade-pill {
      font-family: monospace;
      font-weight: 600;
      color: #047857;
      background: #ecfdf5;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .empty-table-cell {
      text-align: center;
      padding: 1.5rem !important;
      color: #94a3b8;
      font-size: 0.8125rem;
    }
    .mt-2 { margin-top: 0.5rem; }
    .w-full { width: 100%; }
  `]
})
export class CourseDetailDialogComponent implements OnChanges {
  @Input() course: Course | null = null;
  @Input() allCourses: Course[] = [];
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() courseUpdated = new EventEmitter<void>();

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
    return this.course ? `Curricular Configuration: ${this.course.code}` : 'Course Details';
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
    if (!this.course) return [];
    return this.allCourses
      .filter((c) => c.id !== this.course!.id)
      .map((c) => ({ label: `${c.code} - ${c.title}`, value: c.id }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['course'] && this.course) {
      this.loadCourseData();
    }
  }

  loadCourseData(): void {
    if (!this.course) return;
    const cid = this.course.id;

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
    this.visible = val;
    this.visibleChange.emit(val);
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
    if (this.ciloForm.invalid || !this.course) return;
    const val = this.ciloForm.getRawValue();
    this.isSavingCilo.set(true);

    const editId = this.editingCiloId();
    if (editId) {
      const req: UpdateCourseOutcomeRequest = {
        description: val.description.trim(),
        bloomsLevel: val.bloomsLevel
      };
      this.outcomeService.update(this.course.id, editId, req).subscribe({
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
      this.outcomeService.create(this.course.id, req).subscribe({
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
    this.confirmationService.confirm({
      message: `Delete outcome "${co.code}"? Blocked if linked in the CILO-PILO curriculum alignment matrix.`,
      header: 'Delete Course Outcome',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.outcomeService.delete(this.course!.id, co.id).subscribe({
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
    if (this.prereqForm.invalid || !this.course) return;
    const val = this.prereqForm.getRawValue();
    this.isSavingPrereq.set(true);

    const req: CreateCoursePrerequisiteRequest = {
      courseId: this.course.id,
      prerequisiteCourseId: val.prerequisiteCourseId!,
      ruleType: val.ruleType,
      minGradeRequired: val.minGradeRequired.trim()
    };

    this.prereqService.create(this.course.id, req).subscribe({
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
    this.confirmationService.confirm({
      message: `Remove prerequisite requirement "${prereq.prerequisiteCourseCode}"?`,
      header: 'Remove Prerequisite Rule',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.prereqService.delete(this.course!.id, prereq.id).subscribe({
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
