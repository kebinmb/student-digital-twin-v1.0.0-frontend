import { Component, OnInit, inject, signal } from '@angular/core';
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

import { CourseService } from '../../../../core/services/institution.service';
import { Course, CreateCourseRequest, UpdateCourseRequest } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';
import { CourseDetailDialogComponent } from '../course-detail-dialog/course-detail-dialog.component';

interface CourseForm {
  code: FormControl<string>;
  title: FormControl<string>;
  lectureUnits: FormControl<number>;
  labUnits: FormControl<number>;
  contactHoursLec: FormControl<number>;
  contactHoursLab: FormControl<number>;
  description: FormControl<string>;
}

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
    ConfirmDialogModule,
    CourseDetailDialogComponent
  ],
  template: `
    <div class="institution-sub-card">
      <div class="card-header-row">
        <div>
          <h2 class="card-section-title">Institutional Course Catalog</h2>
          <p class="card-section-subtitle">
            Catalog master courses, CHED lecture/lab unit weights, weekly contact hours, learning outcomes (CILOs), and prerequisite chains.
          </p>
        </div>

        <div class="header-actions-group">
          <!-- Search field -->
          <p-iconfield>
            <p-inputicon styleClass="pi pi-search"></p-inputicon>
            <input
              pInputText
              type="text"
              [(ngModel)]="searchKeyword"
              (input)="onSearchInput()"
              placeholder="Search code or title..."
              class="search-box-input" />
          </p-iconfield>

          @if (canManage()) {
            <p-button
              label="New Course"
              icon="pi pi-plus"
              size="small"
              severity="primary"
              (onClick)="openCreateDialog()">
            </p-button>
          }
        </div>
      </div>

      <p-table
        [value]="courses()"
        [loading]="isLoading()"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageSize"
        [totalRecords]="totalElements()"
        (onLazyLoad)="onPageChange($event)"
        responsiveLayout="scroll"
        styleClass="p-datatable-sm institutional-table">
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 130px;">Course Code</th>
            <th>Descriptive Title</th>
            <th style="width: 90px; text-align: center;">Lec</th>
            <th style="width: 90px; text-align: center;">Lab</th>
            <th style="width: 100px; text-align: center;">Units</th>
            <th style="width: 130px; text-align: center;">Hrs (Lec/Lab)</th>
            <th style="width: 90px; text-align: center;">Status</th>
            <th style="width: 220px; text-align: right;">Curricular Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td>
              <span class="code-badge">{{ c.code }}</span>
            </td>
            <td>
              <div class="primary-text">{{ c.title }}</div>
              @if (c.description) {
                <div class="secondary-text course-desc-truncate">{{ c.description }}</div>
              }
            </td>
            <td style="text-align: center;">{{ c.lectureUnits }}</td>
            <td style="text-align: center;">{{ c.labUnits }}</td>
            <td style="text-align: center;">
              <span class="units-pill">{{ c.creditUnits }}</span>
            </td>
            <td style="text-align: center;">
              <span class="hours-text">{{ c.contactHoursLec }}h / {{ c.contactHoursLab }}h</span>
            </td>
            <td style="text-align: center;">
              @if (c.isActive) {
                <p-tag severity="success" value="ACTIVE"></p-tag>
              } @else {
                <p-tag severity="danger" value="INACTIVE"></p-tag>
              }
            </td>
            <td style="text-align: right;">
              <div class="action-buttons-cell">
                <!-- Open CILO & Prerequisite Drawer -->
                <p-button
                  icon="pi pi-sliders-h"
                  label="Rules"
                  size="small"
                  severity="info"
                  [outlined]="true"
                  title="Manage CILOs & Prerequisite Rules"
                  (onClick)="openDetailDialog(c)">
                </p-button>

                @if (canManage()) {
                  <p-button
                    icon="pi pi-pencil"
                    size="small"
                    [text]="true"
                    severity="secondary"
                    (onClick)="openEditDialog(c)">
                  </p-button>
                  <p-button
                    icon="pi pi-trash"
                    size="small"
                    [text]="true"
                    severity="danger"
                    (onClick)="confirmDelete(c)">
                  </p-button>
                }
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="empty-table-cell">
              <i class="pi pi-book empty-icon"></i>
              <p>No courses found. Add courses to build curriculums and learning matrices.</p>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Create / Edit Course Dialog -->
      <p-dialog
        [header]="editingId() ? 'Edit Course Details' : 'Register Master Catalog Course'"
        [(visible)]="isDialogVisible"
        [modal]="true"
        [style]="{ width: '560px', maxWidth: '95vw' }">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-form">
          <div class="form-row-2col">
            <div class="form-group">
              <label for="crCode" class="form-label">Course Code *</label>
              <input
                id="crCode"
                pInputText
                type="text"
                formControlName="code"
                placeholder="e.g. IT 101"
                class="form-control-input"
                [readOnly]="!!editingId()" />
              @if (form.controls.code.touched && form.controls.code.invalid) {
                <span class="error-hint">Course code is required (max 30 chars).</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label">Total Credit Units</label>
              <div class="computed-unit-card">
                <span class="computed-value">{{ computedTotalUnits }}</span>
                <span class="computed-subtext">Sum of Lec + Lab Units</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="crTitle" class="form-label">Descriptive Course Title *</label>
            <input
              id="crTitle"
              pInputText
              type="text"
              formControlName="title"
              placeholder="e.g. Introduction to Computing"
              class="form-control-input" />
            @if (form.controls.title.touched && form.controls.title.invalid) {
              <span class="error-hint">Course title is required (max 150 chars).</span>
            }
          </div>

          <div class="form-row-2col">
            <div class="form-group">
              <label for="crLecUnits" class="form-label">Lecture Units *</label>
              <p-inputnumber
                id="crLecUnits"
                formControlName="lectureUnits"
                [min]="0"
                [max]="20"
                [minFractionDigits]="0"
                [maxFractionDigits]="2"
                styleClass="w-full">
              </p-inputnumber>
            </div>

            <div class="form-group">
              <label for="crLabUnits" class="form-label">Laboratory Units *</label>
              <p-inputnumber
                id="crLabUnits"
                formControlName="labUnits"
                [min]="0"
                [max]="20"
                [minFractionDigits]="0"
                [maxFractionDigits]="2"
                styleClass="w-full">
              </p-inputnumber>
            </div>
          </div>

          <div class="form-row-2col">
            <div class="form-group">
              <label for="crLecHours" class="form-label">Contact Hours / Week (Lec)</label>
              <p-inputnumber
                id="crLecHours"
                formControlName="contactHoursLec"
                [min]="0"
                [max]="40"
                styleClass="w-full">
              </p-inputnumber>
              <span class="field-hint">Standard CHED: 1 unit = 1 hr</span>
            </div>

            <div class="form-group">
              <label for="crLabHours" class="form-label">Contact Hours / Week (Lab)</label>
              <p-inputnumber
                id="crLabHours"
                formControlName="contactHoursLab"
                [min]="0"
                [max]="40"
                styleClass="w-full">
              </p-inputnumber>
              <span class="field-hint">Standard CHED: 1 unit = 3 hrs</span>
            </div>
          </div>

          <div class="form-group">
            <label for="crDesc" class="form-label">Course Description & Scope</label>
            <textarea
              id="crDesc"
              pTextarea
              formControlName="description"
              rows="3"
              placeholder="Summary of course coverage, prerequisites context, and competencies..."
              class="w-full">
            </textarea>
          </div>

          <div class="dialog-actions-footer">
            <p-button
              label="Cancel"
              size="small"
              severity="secondary"
              [outlined]="true"
              type="button"
              (onClick)="isDialogVisible.set(false)">
            </p-button>
            <p-button
              [label]="editingId() ? 'Update Course' : 'Register Course'"
              icon="pi pi-check"
              size="small"
              severity="primary"
              type="submit"
              [disabled]="form.invalid || isSaving()">
            </p-button>
          </div>
        </form>
      </p-dialog>

      <!-- Manage Outcomes & Prerequisites Dialog -->
      <app-course-detail-dialog
        [(visible)]="isDetailVisible"
        [course]="selectedCourseForDetail()"
        [allCourses]="courses()"
        (courseUpdated)="loadCourses()">
      </app-course-detail-dialog>

      <!-- Delete Confirmation Dialog -->
      <p-confirmdialog key="courseDeleteConfirm"></p-confirmdialog>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .institution-sub-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04);
    }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .card-section-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .card-section-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0.25rem 0 0;
    }
    .header-actions-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .search-box-input {
      font-size: 0.8125rem;
      width: 220px;
    }
    .code-badge {
      font-family: monospace;
      font-weight: 700;
      background: #f1f5f9;
      color: #0f172a;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      font-size: 0.8125rem;
    }
    .primary-text {
      font-weight: 600;
      color: #0f172a;
      font-size: 0.875rem;
    }
    .secondary-text {
      font-size: 0.75rem;
      color: #64748b;
    }
    .course-desc-truncate {
      max-width: 320px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .units-pill {
      font-family: monospace;
      font-weight: 700;
      background: #ecfdf5;
      color: #047857;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.8125rem;
    }
    .hours-text {
      font-size: 0.75rem;
      color: #64748b;
    }
    .action-buttons-cell {
      display: flex;
      justify-content: flex-end;
      gap: 0.35rem;
      align-items: center;
    }
    .empty-table-cell {
      text-align: center;
      padding: 2.5rem 1rem !important;
      color: #94a3b8;
    }
    .empty-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      display: block;
      color: #cbd5e1;
    }
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-top: 0.5rem;
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
    .computed-unit-card {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      height: 28px;
    }
    .computed-value {
      font-size: 1.125rem;
      font-weight: 700;
      color: #116834;
    }
    .computed-subtext {
      font-size: 0.6875rem;
      color: #64748b;
    }
    .field-hint {
      font-size: 0.6875rem;
      color: #64748b;
    }
    .error-hint {
      font-size: 0.6875rem;
      color: #dc2626;
      font-weight: 500;
    }
    .dialog-actions-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }
    .w-full { width: 100%; }
  `]
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

  searchKeyword: string = '';
  currentPage: number = 0;
  pageSize: number = 15;
  private searchTimeout: any;

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON']);

  readonly form = new FormGroup<CourseForm>({
    code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(30)] }),
    title: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    lectureUnits: new FormControl<number>(3, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    labUnits: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    contactHoursLec: new FormControl<number>(3, { nonNullable: true, validators: [Validators.min(0)] }),
    contactHoursLab: new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0)] }),
    description: new FormControl<string>('', { nonNullable: true })
  });

  get computedTotalUnits(): number {
    const lec = this.form.get('lectureUnits')?.value || 0;
    const lab = this.form.get('labUnits')?.value || 0;
    return Number((Number(lec) + Number(lab)).toFixed(2));
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

  onPageChange(event: any): void {
    this.currentPage = Math.floor(event.first / event.rows);
    this.pageSize = event.rows;
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
      description: ''
    });
    this.isDialogVisible.set(true);
  }

  openEditDialog(c: Course): void {
    this.editingId.set(c.id);
    this.form.reset({
      code: c.code,
      title: c.title,
      lectureUnits: c.lectureUnits,
      labUnits: c.labUnits,
      contactHoursLec: c.contactHoursLec,
      contactHoursLab: c.contactHoursLab,
      description: c.description || ''
    });
    this.isDialogVisible.set(true);
  }

  openDetailDialog(c: Course): void {
    this.selectedCourseForDetail.set(c);
    this.isDetailVisible.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    this.isSaving.set(true);

    const editId = this.editingId();
    if (editId) {
      const req: UpdateCourseRequest = {
        title: val.title.trim(),
        lectureUnits: Number(val.lectureUnits),
        labUnits: Number(val.labUnits),
        contactHoursLec: Number(val.contactHoursLec),
        contactHoursLab: Number(val.contactHoursLab),
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
        code: val.code.trim().toUpperCase(),
        title: val.title.trim(),
        lectureUnits: Number(val.lectureUnits),
        labUnits: Number(val.labUnits),
        contactHoursLec: Number(val.contactHoursLec),
        contactHoursLab: Number(val.contactHoursLab),
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
      acceptButtonStyleClass: 'p-button-danger',
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
