import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { CampusService, DepartmentService } from '../../../../core/services/institution.service';
import { Campus, CreateDepartmentRequest, Department, DepartmentType, UpdateDepartmentRequest } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

interface DepartmentForm {
  campusId: FormControl<number | null>;
  code: FormControl<string>;
  name: FormControl<string>;
  type: FormControl<DepartmentType>;
  parentDepartmentId: FormControl<number | null>;
  deanUserId: FormControl<number | null>;
}

@Component({
  selector: 'app-department-manager',
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
    SelectModule,
    MessageModule,
    ConfirmDialogModule
  ],
  template: `
    <div class="institution-sub-card">
      <!-- Prerequisite Warning Banner if No Campuses Exist -->
      @if (!isLoadingCampuses() && campuses().length === 0) {
        <div class="prerequisite-banner">
          <p-message
            severity="warn"
            text="Relational Precondition: An institutional Campus must be created and active before Departments can be registered."
            styleClass="w-full">
          </p-message>
        </div>
      }

      <div class="card-header-row">
        <div>
          <h2 class="card-section-title">Academic & Administrative Departments</h2>
          <p class="card-section-subtitle">
            Manage academic colleges, academic departments, administrative divisions, and hierarchical parent units.
          </p>
        </div>

        <div class="header-actions-group">
          <!-- Campus filter -->
          <div class="filter-box">
            <p-select
              [options]="campusFilterOptions()"
              [(ngModel)]="selectedCampusFilter"
              (onChange)="onFilterChange()"
              placeholder="Filter by Campus"
              optionLabel="label"
              optionValue="value"
              styleClass="p-inputtext-sm">
            </p-select>
          </div>

          @if (canManage()) {
            <p-button
              label="New Department"
              icon="pi pi-plus"
              size="small"
              severity="primary"
              [disabled]="campuses().length === 0"
              (onClick)="openCreateDialog()">
            </p-button>
          }
        </div>
      </div>

      <p-table
        [value]="filteredDepartments()"
        [loading]="isLoading()"
        responsiveLayout="scroll"
        styleClass="p-datatable-sm institutional-table">
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th>
            <th>Department / College Name</th>
            <th>Campus</th>
            <th style="width: 130px;">Type</th>
            <th>Parent Department</th>
            <th style="width: 100px;">Status</th>
            @if (canManage()) {
              <th style="width: 130px; text-align: right;">Actions</th>
            }
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-dept>
          <tr>
            <td>
              <span class="code-badge">{{ dept.code }}</span>
            </td>
            <td>
              <div class="primary-text">{{ dept.name }}</div>
              @if (dept.deanUserId) {
                <div class="secondary-text">Dean / Head ID: {{ dept.deanUserId }}</div>
              }
            </td>
            <td>
              <span class="campus-tag">{{ dept.campusCode || getCampusCode(dept.campusId) }}</span>
            </td>
            <td>
              @switch (dept.type) {
                @case ('COLLEGE') {
                  <p-tag severity="info" value="COLLEGE"></p-tag>
                }
                @case ('DEPARTMENT') {
                  <p-tag severity="secondary" value="DEPARTMENT"></p-tag>
                }
                @default {
                  <p-tag severity="warn" value="ADMIN"></p-tag>
                }
              }
            </td>
            <td>
              @if (dept.parentDepartmentCode || dept.parentDepartmentId) {
                <span class="parent-dept-pill">
                  <i class="pi pi-arrow-up-right"></i>
                  {{ dept.parentDepartmentCode || getDeptCode(dept.parentDepartmentId) }}
                </span>
              } @else {
                <span class="text-muted">Top-level</span>
              }
            </td>
            <td>
              @if (dept.isActive) {
                <p-tag severity="success" value="ACTIVE"></p-tag>
              } @else {
                <p-tag severity="danger" value="INACTIVE"></p-tag>
              }
            </td>
            @if (canManage()) {
              <td style="text-align: right;">
                <div class="action-buttons-cell">
                  <p-button
                    icon="pi pi-pencil"
                    size="small"
                    [text]="true"
                    severity="secondary"
                    (onClick)="openEditDialog(dept)">
                  </p-button>
                  <p-button
                    icon="pi pi-trash"
                    size="small"
                    [text]="true"
                    severity="danger"
                    (onClick)="confirmDelete(dept)">
                  </p-button>
                </div>
              </td>
            }
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td [attr.colspan]="canManage() ? 7 : 6" class="empty-table-cell">
              <i class="pi pi-sitemap empty-icon"></i>
              <p>No departments found for the selected campus scope.</p>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Create / Edit Department Dialog -->
      <p-dialog
        [header]="editingId() ? 'Edit Department' : 'Establish New Academic Department'"
        [(visible)]="isDialogVisible"
        [modal]="true"
        [style]="{ width: '520px', maxWidth: '95vw' }">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-form">
          <div class="form-group">
            <label for="dCampus" class="form-label">Assigned Campus *</label>
            <p-select
              id="dCampus"
              [options]="campusSelectOptions()"
              formControlName="campusId"
              placeholder="Select Campus"
              optionLabel="label"
              optionValue="value"
              [disabled]="!!editingId()"
              styleClass="w-full">
            </p-select>
            @if (form.controls.campusId.touched && form.controls.campusId.invalid) {
              <span class="error-hint">Target campus is mandatory.</span>
            }
          </div>

          <div class="form-row-2col">
            <div class="form-group">
              <label for="dCode" class="form-label">Department Code *</label>
              <input
                id="dCode"
                pInputText
                type="text"
                formControlName="code"
                placeholder="e.g. CCS"
                class="form-control-input"
                [readOnly]="!!editingId()" />
              @if (form.controls.code.touched && form.controls.code.invalid) {
                <span class="error-hint">Code is required (max 20 chars).</span>
              }
            </div>

            <div class="form-group">
              <label for="dType" class="form-label">Department Type *</label>
              <p-select
                id="dType"
                [options]="typeOptions"
                formControlName="type"
                placeholder="Select Type"
                optionLabel="label"
                optionValue="value"
                styleClass="w-full">
              </p-select>
            </div>
          </div>

          <div class="form-group">
            <label for="dName" class="form-label">Department Name *</label>
            <input
              id="dName"
              pInputText
              type="text"
              formControlName="name"
              placeholder="e.g. College of Computer Studies"
              class="form-control-input" />
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <span class="error-hint">Department name is required.</span>
            }
          </div>

          <div class="form-group">
            <label for="dParent" class="form-label">Parent Department (Optional Hierarchy)</label>
            <p-select
              id="dParent"
              [options]="parentSelectOptions()"
              formControlName="parentDepartmentId"
              placeholder="None (Top-Level Unit)"
              optionLabel="label"
              optionValue="value"
              [showClear]="true"
              styleClass="w-full">
            </p-select>
            <span class="field-hint">Filtered strictly to units within the selected campus; cyclic self-assignment is excluded.</span>
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
              [label]="editingId() ? 'Update Department' : 'Establish Department'"
              icon="pi pi-check"
              size="small"
              severity="primary"
              type="submit"
              [disabled]="form.invalid || isSaving()">
            </p-button>
          </div>
        </form>
      </p-dialog>
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
    .prerequisite-banner {
      margin-bottom: 1.25rem;
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
    .filter-box {
      min-width: 200px;
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
    .campus-tag {
      font-size: 0.75rem;
      font-weight: 600;
      color: #0369a1;
      background: #e0f2fe;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
    }
    .parent-dept-pill {
      font-size: 0.75rem;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #475569;
      background: #f8fafc;
      padding: 0.2rem 0.45rem;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
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
    .text-muted {
      font-size: 0.75rem;
      color: #94a3b8;
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
  `]
})
export class DepartmentManagerComponent implements OnInit {
  private readonly departmentService = inject(DepartmentService);
  private readonly campusService = inject(CampusService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly departments = signal<Department[]>([]);
  readonly campuses = signal<Campus[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingCampuses = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);
  readonly editingId = signal<number | null>(null);

  selectedCampusFilter: number | null = null;

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN']);

  readonly typeOptions = [
    { label: 'College', value: 'COLLEGE' },
    { label: 'Academic Department', value: 'DEPARTMENT' },
    { label: 'Administrative Division', value: 'ADMINISTRATIVE' }
  ];

  readonly campusFilterOptions = computed(() => [
    { label: 'All Campuses', value: null },
    ...this.campuses().map((c) => ({ label: `${c.code} - ${c.name}`, value: c.id }))
  ]);

  readonly campusSelectOptions = computed(() =>
    this.campuses().map((c) => ({ label: `${c.code} - ${c.name}`, value: c.id }))
  );

  readonly filteredDepartments = computed(() => {
    const filter = this.selectedCampusFilter;
    if (filter === null) {
      return this.departments();
    }
    return this.departments().filter((d) => d.campusId === filter);
  });

  readonly parentSelectOptions = computed(() => {
    const currentCampusId = this.form.get('campusId')?.value;
    const currentId = this.editingId();
    if (!currentCampusId) return [];

    return this.departments()
      .filter((d) => d.campusId === currentCampusId && (!currentId || d.id !== currentId))
      .map((d) => ({ label: `${d.code} - ${d.name}`, value: d.id }));
  });

  readonly form = new FormGroup<DepartmentForm>({
    campusId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    type: new FormControl<DepartmentType>('COLLEGE', { nonNullable: true, validators: [Validators.required] }),
    parentDepartmentId: new FormControl<number | null>(null),
    deanUserId: new FormControl<number | null>(null)
  });

  ngOnInit(): void {
    this.loadCampuses();
    this.loadDepartments();
  }

  loadCampuses(): void {
    this.isLoadingCampuses.set(true);
    this.campusService.getAll().subscribe({
      next: (list) => {
        this.campuses.set(list);
        this.isLoadingCampuses.set(false);
      },
      error: () => this.isLoadingCampuses.set(false)
    });
  }

  loadDepartments(): void {
    this.isLoading.set(true);
    this.departmentService.getAll().subscribe({
      next: (list) => {
        this.departments.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Load Error', detail: err.error?.detail || 'Failed to load departments.' });
      }
    });
  }

  onFilterChange(): void {
    // Computed property filteredDepartments handles reactivity
  }

  getCampusCode(campusId: number): string {
    return this.campuses().find((c) => c.id === campusId)?.code || `Campus #${campusId}`;
  }

  getDeptCode(deptId?: number | null): string {
    if (!deptId) return '—';
    return this.departments().find((d) => d.id === deptId)?.code || `Dept #${deptId}`;
  }

  openCreateDialog(): void {
    const defaultCampus = this.selectedCampusFilter || (this.campuses().length > 0 ? this.campuses()[0].id : null);
    this.editingId.set(null);
    this.form.reset({
      campusId: defaultCampus,
      code: '',
      name: '',
      type: 'COLLEGE',
      parentDepartmentId: null,
      deanUserId: null
    });
    this.isDialogVisible.set(true);
  }

  openEditDialog(dept: Department): void {
    this.editingId.set(dept.id);
    this.form.reset({
      campusId: dept.campusId,
      code: dept.code,
      name: dept.name,
      type: dept.type,
      parentDepartmentId: dept.parentDepartmentId || null,
      deanUserId: dept.deanUserId || null
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
      const req: UpdateDepartmentRequest = {
        name: val.name.trim(),
        type: val.type,
        parentDepartmentId: val.parentDepartmentId,
        deanUserId: val.deanUserId
      };
      this.departmentService.update(editId, req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Department updated.' });
          this.loadDepartments();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: err.error?.detail || 'Failed to update department.' });
        }
      });
    } else {
      const req: CreateDepartmentRequest = {
        campusId: val.campusId!,
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        type: val.type,
        parentDepartmentId: val.parentDepartmentId,
        deanUserId: val.deanUserId
      };
      this.departmentService.create(req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Established', detail: 'Department registered.' });
          this.loadDepartments();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Establish Error', detail: err.error?.detail || 'Registration failed.' });
        }
      });
    }
  }

  confirmDelete(dept: Department): void {
    this.confirmationService.confirm({
      message: `Permanently delete "${dept.name}"? Deletion is blocked if child departments or degree programs belong to this department.`,
      header: 'Delete Department',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.departmentService.delete(dept.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${dept.code} removed.` });
            this.loadDepartments();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Deletion Blocked', detail: err.error?.detail || 'Cannot delete department with active programs.' });
          }
        });
      }
    });
  }
}
