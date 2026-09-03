import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AcademicYearService } from '../../../../core/services/institution.service';
import { AcademicYear, CreateAcademicYearRequest, UpdateAcademicYearRequest } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

interface AcademicYearForm {
  code: FormControl<string>;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
  isCurrent: FormControl<boolean>;
}

@Component({
  selector: 'app-academic-year-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TagModule,
    InputTextModule,
    ToggleSwitchModule,
    ConfirmDialogModule
  ],
  template: `
    <div class="institution-sub-card">
      <div class="card-header-row">
        <div>
          <h2 class="card-section-title">Academic Years & Calendar Periods</h2>
          <p class="card-section-subtitle">
            Define academic cycles and designate the active operational academic year for curriculum and enrollment engines.
          </p>
        </div>
        @if (canManage()) {
          <p-button
            label="New Academic Year"
            icon="pi pi-plus"
            size="small"
            severity="primary"
            (onClick)="openCreateDialog()">
          </p-button>
        }
      </div>

      <p-table
        [value]="academicYears()"
        [loading]="isLoading()"
        responsiveLayout="scroll"
        styleClass="p-datatable-sm institutional-table">
        <ng-template pTemplate="header">
          <tr>
            <th>Academic Year Code</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th style="width: 130px;">Operational Status</th>
            @if (canManage()) {
              <th style="width: 240px; text-align: right;">Actions</th>
            }
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-ay>
          <tr>
            <td>
              <span class="code-badge">{{ ay.code }}</span>
            </td>
            <td>{{ ay.startDate }}</td>
            <td>{{ ay.endDate }}</td>
            <td>
              @if (ay.isCurrent) {
                <p-tag severity="success" value="CURRENT" icon="pi pi-check-circle"></p-tag>
              } @else {
                <p-tag severity="secondary" value="INACTIVE"></p-tag>
              }
            </td>
            @if (canManage()) {
              <td style="text-align: right;">
                <div class="action-buttons-cell">
                  @if (!ay.isCurrent) {
                    <p-button
                      label="Set Current"
                      icon="pi pi-bolt"
                      size="small"
                      severity="warn"
                      [outlined]="true"
                      (onClick)="confirmSetCurrent(ay)">
                    </p-button>
                  }
                  <p-button
                    icon="pi pi-pencil"
                    size="small"
                    [text]="true"
                    severity="secondary"
                    (onClick)="openEditDialog(ay)">
                  </p-button>
                  <p-button
                    icon="pi pi-trash"
                    size="small"
                    [text]="true"
                    severity="danger"
                    (onClick)="confirmDelete(ay)">
                  </p-button>
                </div>
              </td>
            }
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td [attr.colspan]="canManage() ? 5 : 4" class="empty-table-cell">
              <i class="pi pi-calendar-times empty-icon"></i>
              <p>No academic years registered yet. Click "New Academic Year" to establish an academic period.</p>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Create / Edit Dialog -->
      <p-dialog
        [header]="editingId() ? 'Edit Academic Year' : 'Establish New Academic Year'"
        [(visible)]="isDialogVisible"
        [modal]="true"
        [style]="{ width: '480px', maxWidth: '95vw' }">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-form">
          <div class="form-group">
            <label for="ayCode" class="form-label">Academic Year Code *</label>
            <input
              id="ayCode"
              pInputText
              type="text"
              formControlName="code"
              placeholder="e.g. AY 2026-2027"
              class="form-control-input"
              [readOnly]="!!editingId()" />
            @if (form.controls.code.touched && form.controls.code.invalid) {
              <span class="error-hint">Valid academic year code is required (max 20 chars).</span>
            }
          </div>

          <div class="form-row-2col">
            <div class="form-group">
              <label for="ayStartDate" class="form-label">Start Date *</label>
              <input
                id="ayStartDate"
                pInputText
                type="date"
                formControlName="startDate"
                class="form-control-input" />
              @if (form.controls.startDate.touched && form.controls.startDate.invalid) {
                <span class="error-hint">Start date is required.</span>
              }
            </div>

            <div class="form-group">
              <label for="ayEndDate" class="form-label">End Date *</label>
              <input
                id="ayEndDate"
                pInputText
                type="date"
                formControlName="endDate"
                class="form-control-input" />
              @if (form.controls.endDate.touched && form.controls.endDate.invalid) {
                <span class="error-hint">End date is required.</span>
              }
            </div>
          </div>

          @if (form.errors?.['dateOrder']) {
            <div class="form-alert-error">
              <i class="pi pi-exclamation-triangle"></i>
              <span>End date must be strictly after the start date.</span>
            </div>
          }

          @if (!editingId()) {
            <div class="toggle-group-row">
              <div class="toggle-info">
                <span class="toggle-label">Set as Operational Current Year</span>
                <span class="toggle-desc">Automatically designates this academic year as active across all faculties.</span>
              </div>
              <p-toggleswitch formControlName="isCurrent"></p-toggleswitch>
            </div>
          }

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
              [label]="editingId() ? 'Update Academic Year' : 'Create Academic Year'"
              icon="pi pi-check"
              size="small"
              severity="primary"
              type="submit"
              [disabled]="form.invalid || isSaving()">
            </p-button>
          </div>
        </form>
      </p-dialog>

      <p-confirmdialog></p-confirmdialog>
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
    .code-badge {
      font-family: monospace;
      font-weight: 600;
      background: #f1f5f9;
      color: #0f172a;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      font-size: 0.8125rem;
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
    .error-hint {
      font-size: 0.6875rem;
      color: #dc2626;
      font-weight: 500;
    }
    .form-alert-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
    }
    .toggle-group-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
    }
    .toggle-info {
      display: flex;
      flex-direction: column;
    }
    .toggle-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #1e293b;
    }
    .toggle-desc {
      font-size: 0.6875rem;
      color: #64748b;
    }
    .dialog-actions-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }
  `]
})
export class AcademicYearManagerComponent implements OnInit {
  private readonly ayService = inject(AcademicYearService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly academicYears = signal<AcademicYear[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);
  readonly editingId = signal<number | null>(null);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'REGISTRAR']);

  readonly form = new FormGroup<AcademicYearForm>({
    code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
    startDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    isCurrent: new FormControl<boolean>(false, { nonNullable: true })
  }, { validators: this.dateOrderValidator });

  ngOnInit(): void {
    this.loadAcademicYears();
  }

  loadAcademicYears(): void {
    this.isLoading.set(true);
    this.ayService.getAll().subscribe({
      next: (years) => {
        this.academicYears.set(years);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: err.error?.detail || 'Unable to retrieve academic years.'
        });
      }
    });
  }

  openCreateDialog(): void {
    this.editingId.set(null);
    this.form.reset({
      code: '',
      startDate: '',
      endDate: '',
      isCurrent: false
    });
    this.isDialogVisible.set(true);
  }

  openEditDialog(ay: AcademicYear): void {
    this.editingId.set(ay.id);
    this.form.reset({
      code: ay.code,
      startDate: ay.startDate,
      endDate: ay.endDate,
      isCurrent: ay.isCurrent
    });
    this.isDialogVisible.set(true);
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
      const req: UpdateAcademicYearRequest = {
        startDate: val.startDate,
        endDate: val.endDate
      };
      this.ayService.update(editId, req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Academic year dates updated.' });
          this.loadAcademicYears();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Update Error', detail: err.error?.detail || 'Update failed.' });
        }
      });
    } else {
      const req: CreateAcademicYearRequest = {
        code: val.code.trim().toUpperCase(),
        startDate: val.startDate,
        endDate: val.endDate,
        isCurrent: val.isCurrent
      };
      this.ayService.create(req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Academic year registered.' });
          this.loadAcademicYears();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Creation Error', detail: err.error?.detail || 'Creation failed.' });
        }
      });
    }
  }

  confirmSetCurrent(ay: AcademicYear): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to designate "${ay.code}" as the active operational current academic year? This will demote any previously active year.`,
      header: 'Designate Operational Academic Year',
      icon: 'pi pi-exclamation-circle',
      acceptLabel: 'Confirm Switch',
      rejectLabel: 'Cancel',
      accept: () => {
        this.ayService.setCurrent(ay.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Activated', detail: `${ay.code} is now the active academic year.` });
            this.loadAcademicYears();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Activation Failed', detail: err.error?.detail || 'Action failed.' });
          }
        });
      }
    });
  }

  confirmDelete(ay: AcademicYear): void {
    this.confirmationService.confirm({
      message: `Delete academic year "${ay.code}"? Deletion is blocked if classes, terms, or enrollments reference it.`,
      header: 'Delete Academic Period',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.ayService.delete(ay.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${ay.code} removed.` });
            this.loadAcademicYears();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Deletion Blocked', detail: err.error?.detail || 'Cannot delete academic year in use.' });
          }
        });
      }
    });
  }

  private dateOrderValidator(group: any) {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    if (start && end && new Date(end) <= new Date(start)) {
      return { dateOrder: true };
    }
    return null;
  }
}
