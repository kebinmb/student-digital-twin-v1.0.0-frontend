import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG UI Components
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Message } from 'primeng/message';

import { CurriculumDesignerStore } from '../../state/curriculum-designer.store';
import { CreateCurriculumRequest } from '../../../../../core/models/curriculum-designer.model';
import { AcademicYearService, ProgramService } from '../../../../../core/services/institution.service';

interface CreateCurriculumForm {
  programId: FormControl<number | null>;
  code: FormControl<string>;
  name: FormControl<string>;
  effectiveAcademicYear: FormControl<string>;
}

@Component({
  selector: 'app-create-curriculum-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Dialog,
    Button,
    InputText,
    Select,
    Message
  ],
  template: `
    <p-dialog
      header="Create New Academic Curriculum"
      [visible]="visible"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [style]="{ width: '520px', maxWidth: '95vw' }">
      
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-content-body">
        <p class="dialog-intro-text">
          Establish a new academic curriculum draft revision for an institutional degree program under CHED CMO guidelines.
        </p>

        <!-- Prerequisite Banner: No operational Academic Year -->
        @if (!isLoadingPrereqs() && !currentAcademicYear()) {
          <div class="prereq-alert">
            <p-message
              severity="warn"
              text="Notice: No operational Academic Year is currently active. You may specify the effective year manually or set one in the Institutional Registry."
              styleClass="w-full text-xs">
            </p-message>
          </div>
        }

        <!-- Prerequisite Check: If No Programs Exist -->
        @if (!isLoadingPrereqs() && programs().length === 0) {
          <div class="empty-programs-card">
            <i class="pi pi-exclamation-circle empty-card-icon"></i>
            <div class="empty-card-info">
              <span class="empty-card-title">No Degree Programs Found</span>
              <span class="empty-card-subtext">A Degree Program must be registered under an institutional Department before establishing a curriculum.</span>
            </div>
            <p-button
              label="Open Registry"
              icon="pi pi-external-link"
              size="small"
              severity="warn"
              (onClick)="navigateToInstitution()">
            </p-button>
          </div>
        }

        <!-- Degree Program Selector -->
        <div class="form-field-group">
          <label for="createProgramId" class="form-field-label">Degree Program *</label>
          <p-select
            id="createProgramId"
            [options]="programOptions()"
            formControlName="programId"
            placeholder="Select Degree Program"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            filterBy="label"
            styleClass="w-full">
          </p-select>
          @if (form.controls.programId.touched && form.controls.programId.invalid) {
            <span class="field-error-text">Target degree program is mandatory.</span>
          }
        </div>

        <!-- Curriculum Code -->
        <div class="form-field-group">
          <label for="createCode" class="form-field-label">Curriculum Code *</label>
          <input
            id="createCode"
            pInputText
            type="text"
            formControlName="code"
            placeholder="e.g. BSIT-2026"
            class="form-input" />
          @if (form.controls.code.touched && form.controls.code.invalid) {
            <span class="field-error-text">Curriculum code is required (max 30 characters).</span>
          }
        </div>

        <!-- Curriculum Name -->
        <div class="form-field-group">
          <label for="createName" class="form-field-label">Curriculum Title / Name *</label>
          <input
            id="createName"
            pInputText
            type="text"
            formControlName="name"
            placeholder="e.g. Bachelor of Science in Information Technology (2026 Revision)"
            class="form-input" />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <span class="field-error-text">Curriculum name is required (max 150 characters).</span>
          }
        </div>

        <!-- Effective Academic Year -->
        <div class="form-field-group">
          <label for="createAy" class="form-field-label">Effective Academic Year *</label>
          <input
            id="createAy"
            pInputText
            type="text"
            formControlName="effectiveAcademicYear"
            placeholder="e.g. 2026-2027"
            class="form-input" />
          @if (form.controls.effectiveAcademicYear.touched && form.controls.effectiveAcademicYear.invalid) {
            <span class="field-error-text">Effective academic year is required (max 20 characters).</span>
          }
        </div>

        <!-- Footer Actions -->
        <div class="dialog-footer-row">
          <p-button
            label="Cancel"
            size="small"
            [outlined]="true"
            severity="secondary"
            type="button"
            (onClick)="onClose()">
          </p-button>
          <p-button
            label="Create Curriculum"
            icon="pi pi-check"
            size="small"
            severity="primary"
            type="submit"
            [disabled]="form.invalid || store.isSaving() || programs().length === 0">
          </p-button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .dialog-content-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0;
    }

    .dialog-intro-text {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0 0 0.5rem;
      line-height: 1.4;
    }

    .prereq-alert {
      margin-bottom: 0.25rem;
    }

    .empty-programs-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
    }

    .empty-card-icon {
      font-size: 1.25rem;
      color: #d97706;
      flex-shrink: 0;
    }

    .empty-card-info {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .empty-card-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #92400e;
    }

    .empty-card-subtext {
      font-size: 0.6875rem;
      color: #b45309;
    }

    .form-field-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-field-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
    }

    .form-input {
      width: 100%;
      font-size: 0.8125rem;
    }

    .field-error-text {
      font-size: 0.6875rem;
      color: #dc2626;
      font-weight: 500;
    }

    .dialog-footer-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
      margin-top: 0.5rem;
    }

    .w-full {
      width: 100%;
    }
  `]
})
export class CreateCurriculumDialogComponent implements OnInit, OnChanges {
  readonly store = inject(CurriculumDesignerStore);
  private readonly programService = inject(ProgramService);
  private readonly ayService = inject(AcademicYearService);
  private readonly router = inject(Router);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  readonly programs = signal<any[]>([]);
  readonly currentAcademicYear = signal<any | null>(null);
  readonly isLoadingPrereqs = signal<boolean>(false);

  readonly programOptions = computed(() =>
    this.programs().map((p) => ({ label: `${p.code} - ${p.name}`, value: p.id }))
  );

  readonly form = new FormGroup<CreateCurriculumForm>({
    programId: new FormControl<number | null>(null, [Validators.required]),
    code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(30)] }),
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    effectiveAcademicYear: new FormControl<string>('2026-2027', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] })
  });

  ngOnInit(): void {
    this.loadPrerequisites();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.loadPrerequisites();
    }
  }

  loadPrerequisites(): void {
    this.isLoadingPrereqs.set(true);

    this.programService.getAll().subscribe({
      next: (list) => {
        this.programs.set(list);
        if (list.length > 0 && !this.form.controls.programId.value) {
          this.form.controls.programId.setValue(list[0].id);
        }
        this.isLoadingPrereqs.set(false);
      },
      error: () => this.isLoadingPrereqs.set(false)
    });

    this.ayService.getCurrent().subscribe({
      next: (ay) => {
        this.currentAcademicYear.set(ay);
        if (ay?.code) {
          this.form.controls.effectiveAcademicYear.setValue(ay.code);
        }
      },
      error: () => this.currentAcademicYear.set(null)
    });
  }

  navigateToInstitution(): void {
    this.onClose();
    this.router.navigate(['/dashboard/institution'], { queryParams: { tab: 'departments' } });
  }

  onClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    const request: CreateCurriculumRequest = {
      programId: val.programId!,
      code: val.code.trim().toUpperCase(),
      name: val.name.trim(),
      effectiveAcademicYear: val.effectiveAcademicYear.trim()
    };

    this.store.createCurriculum(request, (newId) => {
      this.onClose();
      this.form.reset({
        programId: this.programs().length > 0 ? this.programs()[0].id : null,
        code: '',
        name: '',
        effectiveAcademicYear: this.currentAcademicYear()?.code || '2026-2027'
      });
      this.router.navigate(['/dashboard/curriculum/designer', newId]);
    });
  }
}
