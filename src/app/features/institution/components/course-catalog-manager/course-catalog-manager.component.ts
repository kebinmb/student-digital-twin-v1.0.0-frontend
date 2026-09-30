import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';

import { CourseService } from '../../../../core/services/institution.service';
import { Course, CourseCategory, CreateCourseRequest, UpdateCourseRequest } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';
import { CourseDetailDialogComponent } from '../course-detail-dialog/course-detail-dialog.component';

interface CourseForm {
  code: FormControl<string>;
  title: FormControl<string>;
  lectureUnits: FormControl<number>;
  labUnits: FormControl<number>;
  contactHoursLec: FormControl<number>;
  contactHoursLab: FormControl<number>;
  category: FormControl<CourseCategory>;
  description: FormControl<string>;
}

import { Skeleton } from 'primeng/skeleton';

@Component({
  selector: 'app-course-catalog-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TagModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    IconField,
    InputIcon,
    SelectModule,
    ConfirmDialogModule,
    Skeleton,
    CourseDetailDialogComponent
  ],
  templateUrl: './course-catalog-manager.component.html',
  styleUrl: './course-catalog-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseCatalogManagerComponent implements OnInit {
  private readonly courseService = inject(CourseService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly courses = signal<Course[]>([]);
  readonly totalElements = signal<number>(0);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);
  readonly editingId = signal<number | null>(null);

  readonly isDetailVisible = signal<boolean>(false);
  readonly selectedCourseForDetail = signal<Course | null>(null);

  readonly categoryOptions = [
    { label: 'General Education (GEN_ED)', value: 'GEN_ED' },
    { label: 'Professional Major', value: 'PROFESSIONAL_MAJOR' },
    { label: 'Professional Elective', value: 'ELECTIVE' },
    { label: 'Capstone / Thesis', value: 'CAPSTONE' },
    { label: 'Practicum / Internship', value: 'PRACTICUM' },
    { label: 'Mandated (PE / NSTP / Rizal)', value: 'MANDATED' }
  ];

  searchKeyword: string = '';
  currentPage: number = 0;
  pageSize: number = 15;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON']);

  readonly form = new FormGroup<CourseForm>({
    code: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(30),
        (control) => {
          if (!control.value) return null;
          const val = control.value.trim();
          return val.includes('-') ? null : { missingHyphen: true };
        }
      ]
    }),
    title: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    lectureUnits: new FormControl<number>(3, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    labUnits: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    contactHoursLec: new FormControl<number>(3, { nonNullable: true, validators: [Validators.min(0)] }),
    contactHoursLab: new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0)] }),
    category: new FormControl<CourseCategory>('PROFESSIONAL_MAJOR', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string>('', { nonNullable: true })
  });

  normalizeCourseCode(code: string): string {
    if (!code) return '';
    let clean = code.trim().toUpperCase();
    clean = clean.replace(/[\s_]+/g, '-').replace(/-+/g, '-');
    if (!clean.includes('-')) {
      clean = clean.replace(/^([A-Z]+)(\d.*)$/, '$1-$2');
    }
    return clean;
  }
  preventWhitespace(event: KeyboardEvent): void {
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
  }
}
  onCodeBlur(): void {
    const current = this.form.controls.code.value;
    if (current) {
      const normalized = this.normalizeCourseCode(current);
      this.form.controls.code.setValue(normalized);
    }
  }

  get computedTotalUnits(): number {
    const lec = Number(this.form.get('lectureUnits')?.value) || 0;
    const lab = Number(this.form.get('labUnits')?.value) || 0;
    return Number((lec + lab).toFixed(2));
  }

  ngOnInit(): void {
    this.loadCourses();

    // Auto-update default contact hours when units change (if untouched by user)
    this.form.get('lectureUnits')?.valueChanges.subscribe((lec) => {
      if (this.form.get('contactHoursLec')?.pristine) {
        this.form.get('contactHoursLec')?.setValue(Math.round(Number(lec)));
      }
    });
    this.form.get('labUnits')?.valueChanges.subscribe((lab) => {
      if (this.form.get('contactHoursLab')?.pristine) {
        this.form.get('contactHoursLab')?.setValue(Math.round(Number(lab) * 3));
      }
    });
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.courseService.search(this.searchKeyword, this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.courses.set(page.content);
        this.totalElements.set(page.totalElements);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Load Failed', detail: err.error?.detail || 'Failed to load courses.' });
      }
    });
  }

  onSearchInput(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 0;
      this.loadCourses();
    }, 350);
  }

  onPageChange(event: { first?: number | null; rows?: number | null }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? 15;
    this.currentPage = Math.floor(first / rows);
    this.pageSize = rows;
    this.loadCourses();
  }

  openCreateDialog(): void {
    this.editingId.set(null);
    this.form.reset({
      code: '',
      title: '',
      lectureUnits: 3,
      labUnits: 0,
      contactHoursLec: 3,
      contactHoursLab: 0,
      category: 'PROFESSIONAL_MAJOR',
      description: ''
    });
    this.isDialogVisible.set(true);
  }

  openEditDialog(c: Course): void {
    this.editingId.set(c.id);
    this.form.reset({
      code: this.normalizeCourseCode(c.code),
      title: c.title,
      lectureUnits: c.lectureUnits,
      labUnits: c.labUnits,
      contactHoursLec: c.contactHoursLec,
      contactHoursLab: c.contactHoursLab,
      category: c.category || 'PROFESSIONAL_MAJOR',
      description: c.description || ''
    });
    this.isDialogVisible.set(true);
  }

  openDetailDialog(c: Course): void {
    this.selectedCourseForDetail.set(c);
    this.isDetailVisible.set(true);
  }

  getCategorySeverity(category: CourseCategory | string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (category) {
      case 'GEN_ED': return 'info';
      case 'PROFESSIONAL_MAJOR': return 'success';
      case 'ELECTIVE': return 'warn';
      case 'CAPSTONE': return 'danger';
      case 'PRACTICUM': return 'secondary';
      case 'MANDATED': return 'contrast';
      default: return 'secondary';
    }
  }

  onSubmit(): void {
    const val = this.form.getRawValue();
    const normalizedCode = this.normalizeCourseCode(val.code);
    this.form.controls.code.setValue(normalizedCode);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const editId = this.editingId();
    if (editId) {
      const req: UpdateCourseRequest = {
        title: val.title.trim(),
        lectureUnits: Number(val.lectureUnits),
        labUnits: Number(val.labUnits),
        contactHoursLec: Number(val.contactHoursLec),
        contactHoursLab: Number(val.contactHoursLab),
        category: val.category,
        description: val.description.trim()
      };
      this.courseService.update(editId, req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Course catalog updated.' });
          this.loadCourses();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: err.error?.detail || 'Course update failed.' });
        }
      });
    } else {
      const req: CreateCourseRequest = {
        code: normalizedCode,
        title: val.title.trim(),
        lectureUnits: Number(val.lectureUnits),
        labUnits: Number(val.labUnits),
        contactHoursLec: Number(val.contactHoursLec),
        contactHoursLab: Number(val.contactHoursLab),
        category: val.category,
        description: val.description.trim()
      };
      this.courseService.create(req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Registered', detail: 'Course successfully registered.' });
          this.loadCourses();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Registration Error', detail: err.error?.detail || 'Registration failed.' });
        }
      });
    }
  }

  confirmDelete(c: Course): void {
    this.confirmationService.confirm({
      key: 'courseDeleteConfirm',
      message: `Permanently delete "${c.code} - ${c.title}"? Deletion is blocked if the course is assigned to any curriculum or referenced as a prerequisite.`,
      header: 'Delete Master Course',
      icon: 'pi pi-trash',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => {
        this.courseService.delete(c.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${c.code} removed.` });
            this.loadCourses();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Deletion Blocked', detail: err.error?.detail || 'Cannot delete course in use.' });
          }
        });
      }
    });
  }
}
