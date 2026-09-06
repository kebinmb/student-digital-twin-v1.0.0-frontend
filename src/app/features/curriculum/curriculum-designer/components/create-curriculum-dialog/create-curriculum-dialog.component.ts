import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, computed, signal, ChangeDetectionStrategy } from '@angular/core';
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
import { AcademicYear, Program } from '../../../../../core/models/institution.model';

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
  templateUrl: './create-curriculum-dialog.component.html',
  styleUrl: './create-curriculum-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateCurriculumDialogComponent implements OnInit, OnChanges {
  readonly store = inject(CurriculumDesignerStore);
  private readonly programService = inject(ProgramService);
  private readonly ayService = inject(AcademicYearService);
  private readonly router = inject(Router);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  readonly programs = signal<Program[]>([]);
  readonly currentAcademicYear = signal<AcademicYear | null>(null);
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
