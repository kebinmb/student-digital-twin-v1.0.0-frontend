import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';

import { DepartmentService, ProgramService } from '../../../../core/services/institution.service';
import { Department, Program, ProgramOutcome } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

interface ProgramForm {
  departmentId: FormControl<number | null>;
  code: FormControl<string>;
  name: FormControl<string>;
  degreeLevel: FormControl<string>;
  major: FormControl<string>;
  totalUnitsRequired: FormControl<number | null>;
}

@Component({
  selector: 'app-program-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    MessageModule
  ],
  template: `
    <div class="institution-sub-card">
      <div class="card-header-row">
        <div>
          <h2 class="card-section-title">Degree Programs & Outcomes</h2>
          <p class="card-section-subtitle">
            Manage institutional degree programs and their Program Educational Outcomes (PILOs) under academic departments.
          </p>
        </div>
        <div class="header-actions">
          <p-button
            label="Register Program"
            icon="pi pi-plus"
            size="small"
            severity="primary"
            [disabled]="!canManage() || departments().length === 0"
            (onClick)="openCreateDialog()">
          </p-button>
        </div>
      </div>

      <!-- Prerequisite Warning: If no departments exist -->
      @if (!isLoading() && departments().length === 0) {
        <div class="mb-4">
          <p-message
            severity="warn"
            text="Prerequisite Notice: No academic departments found. Please create a Department under an active Campus first."
            styleClass="w-full">
          </p-message>
        </div>
      }

      <!-- Department Filter Selector -->
      <div class="filter-row">
        <label class="filter-label">Filter by Department:</label>
        <p-select
          [options]="departmentFilterOptions()"
          [(ngModel)]="selectedDepartmentId"
          (onChange)="onDepartmentFilterChange()"
          placeholder="All Departments"
          optionLabel="label"
          optionValue="value"
          styleClass="dept-filter-dropdown">
        </p-select>
      </div>

      <!-- Programs Data Table -->
      <p-table
        [value]="filteredPrograms()"
        [loading]="isLoading()"
        responsiveLayout="scroll"
        styleClass="p-datatable-sm p-datatable-gridlines">
        <ng-template #header>
          <tr>
            <th style="width: 130px">Program Code</th>
            <th>Program Name</th>
            <th style="width: 140px">Department</th>
            <th style="width: 130px">Degree Level</th>
            <th style="width: 100px; text-align: center">Units</th>
            <th style="width: 90px; text-align: center">Status</th>
            <th style="width: 170px; text-align: right">Actions</th>
          </tr>
        </ng-template>

        <ng-template #body let-p>
          <tr>
            <td class="font-mono font-bold text-primary">{{ p.code }}</td>
            <td>
              <div class="prog-title">{{ p.name }}</div>
              @if (p.major) {
                <div class="prog-major">Major in {{ p.major }}</div>
              }
            </td>
            <td><span class="dept-badge">{{ p.departmentCode || getDeptCode(p.departmentId) }}</span></td>
            <td><p-tag [value]="p.degreeLevel" severity="info" styleClass="text-xs"></p-tag></td>
            <td style="text-align: center">{{ p.totalUnitsRequired || '—' }}</td>
            <td style="text-align: center">
              <p-tag [value]="p.isActive ? 'Active' : 'Inactive'" [severity]="p.isActive ? 'success' : 'secondary'"></p-tag>
            </td>
            <td style="text-align: right">
              <div class="action-buttons-cell">
                <p-button
                  icon="pi pi-flag"
                  size="small"
                  label="PILOs"
                  [outlined]="true"
                  severity="help"
                  title="Manage Program Outcomes"
                  (onClick)="openPiloDialog(p)">
                </p-button>
                <p-button
                  icon="pi pi-pencil"
                  size="small"
                  [text]="true"
                  severity="secondary"
                  [disabled]="!canManage()"
                  title="Edit Program"
                  (onClick)="openEditDialog(p)">
                </p-button>
                <p-button
                  icon="pi pi-trash"
                  size="small"
                  [text]="true"
                  severity="danger"
                  [disabled]="!canManage()"
                  title="Delete Program"
                  (onClick)="confirmDelete(p)">
                </p-button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td colspan="7" class="empty-message-cell">
              No degree programs found for the selected criteria.
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Program Create/Edit Modal -->
      <p-dialog
        [header]="isEditing ? 'Edit Degree Program' : 'Register Degree Program'"
        [(visible)]="displayDialog"
        [modal]="true"
        [style]="{ width: '480px', maxWidth: '95vw' }"
        (onHide)="resetForm()">
        
        <form [formGroup]="programForm" (ngSubmit)="saveProgram()" class="dialog-form">
          <!-- Target Department -->
          @if (!isEditing) {
            <div class="form-group">
              <label class="form-label">Parent Department *</label>
              <p-select
                [options]="departmentOptions()"
                formControlName="departmentId"
                placeholder="Select Department"
                optionLabel="label"
                optionValue="value"
                styleClass="w-full">
              </p-select>
            </div>
          }

          <div class="form-group">
            <label class="form-label">Program Code *</label>
            <input
              pInputText
              formControlName="code"
              placeholder="e.g. BSIT"
              class="form-input"
              [readonly]="isEditing" />
          </div>

          <div class="form-group">
            <label class="form-label">Program Name / Title *</label>
            <input
              pInputText
              formControlName="name"
              placeholder="e.g. Bachelor of Science in Information Technology"
              class="form-input" />
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Degree Level *</label>
              <p-select
                [options]="degreeLevelOptions"
                formControlName="degreeLevel"
                placeholder="Select Level"
                styleClass="w-full">
              </p-select>
            </div>
            <div class="form-group">
              <label class="form-label">Total Units Required *</label>
              <p-inputnumber
                formControlName="totalUnitsRequired"
                placeholder="e.g. 146"
                [min]="1"
                styleClass="w-full">
              </p-inputnumber>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Major / Specialization (Optional)</label>
            <input
              pInputText
              formControlName="major"
              placeholder="e.g. Enterprise Application Development"
              class="form-input" />
          </div>

          <div class="dialog-actions">
            <p-button
              label="Cancel"
              size="small"
              [outlined]="true"
              severity="secondary"
              (onClick)="displayDialog = false">
            </p-button>
            <p-button
              [label]="isEditing ? 'Save Changes' : 'Register Program'"
              icon="pi pi-check"
              size="small"
              severity="primary"
              type="submit"
              [disabled]="programForm.invalid || isSubmitting">
            </p-button>
          </div>
        </form>
      </p-dialog>

      <!-- PILO Management Modal -->
      <p-dialog
        [header]="'Program Educational Outcomes: ' + (activePiloProgram?.code || '')"
        [(visible)]="displayPiloDialog"
        [modal]="true"
        [style]="{ width: '650px', maxWidth: '95vw' }">
        <div class="pilo-dialog-container">
          <p class="dialog-subtext">
            Outcomes defining the graduate profile and competencies for {{ activePiloProgram?.name }}.
          </p>

          <!-- Add PILO inline -->
          @if (canManage()) {
            <div class="pilo-inline-add">
              <input
                pInputText
                [(ngModel)]="newPiloCode"
                placeholder="PILO Code (e.g. PILO-1)"
                style="width: 140px; font-size: 0.8125rem" />
              <input
                pInputText
                [(ngModel)]="newPiloDescription"
                placeholder="Outcome Description"
                class="flex-1"
                style="font-size: 0.8125rem" />
              <p-button
                label="Add"
                icon="pi pi-plus"
                size="small"
                severity="primary"
                [disabled]="!newPiloCode.trim() || !newPiloDescription.trim()"
                (onClick)="addPilo()">
              </p-button>
            </div>
          }

          <!-- PILO List Table -->
          <p-table [value]="programOutcomes()" [loading]="isLoadingPilos" styleClass="p-datatable-sm">
            <ng-template #header>
              <tr>
                <th style="width: 110px">Code</th>
                <th>Outcome Statement</th>
                @if (canManage()) {
                  <th style="width: 70px; text-align: right">Action</th>
                }
              </tr>
            </ng-template>
            <ng-template #body let-po>
              <tr>
                <td class="font-mono font-bold">{{ po.code }}</td>
                <td class="text-xs">{{ po.description }}</td>
                @if (canManage()) {
                  <td style="text-align: right">
                    <p-button
                      icon="pi pi-trash"
                      size="small"
                      [text]="true"
                      severity="danger"
                      (onClick)="deletePilo(po.id)">
                    </p-button>
                  </td>
                }
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td [attr.colspan]="canManage() ? 3 : 2" class="empty-message-cell">
                  No program outcomes registered yet.
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
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
    .filter-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      background: #f8fafc;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
    }
    .filter-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
    }
    .dept-filter-dropdown {
      min-width: 240px;
    }
    .prog-title {
      font-weight: 600;
      color: #1e293b;
      font-size: 0.8125rem;
    }
    .prog-major {
      font-size: 0.75rem;
      color: #64748b;
    }
    .dept-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: #116834;
      background: #ecfdf5;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      border: 1px solid #bbf7d0;
    }
    .action-buttons-cell {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.25rem;
    }
    .empty-message-cell {
      text-align: center;
      padding: 2rem !important;
      color: #94a3b8;
      font-size: 0.8125rem;
    }
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
    }
    .form-input {
      width: 100%;
      font-size: 0.8125rem;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }
    .pilo-dialog-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .dialog-subtext {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0;
    }
    .pilo-inline-add {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .w-full { width: 100%; }
    .flex-1 { flex: 1; }
    .text-xs { font-size: 0.75rem !important; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #116834; }
  `]
})
export class ProgramManagerComponent implements OnInit {
  private readonly programService = inject(ProgramService);
  private readonly deptService = inject(DepartmentService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON']);

  readonly programs = signal<Program[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly programOutcomes = signal<ProgramOutcome[]>([]);
  readonly isLoading = signal<boolean>(false);
  isLoadingPilos = false;
  isSubmitting = false;

  displayDialog = false;
  isEditing = false;
  selectedProgram: Program | null = null;
  selectedDepartmentId: number | null = null;

  displayPiloDialog = false;
  activePiloProgram: Program | null = null;
  newPiloCode = '';
  newPiloDescription = '';

  readonly degreeLevelOptions = [
    { label: 'Undergraduate', value: 'UNDERGRADUATE' },
    { label: 'Graduate / Masteral', value: 'GRADUATE' },
    { label: 'Postgraduate / Doctoral', value: 'POSTGRADUATE' },
    { label: 'Diploma / Certificate', value: 'DIPLOMA' }
  ];

  readonly departmentOptions = computed(() =>
    this.departments().map((d) => ({ label: `${d.code} - ${d.name}`, value: d.id }))
  );

  readonly departmentFilterOptions = computed(() => [
    { label: 'All Departments', value: null },
    ...this.departments().map((d) => ({ label: `${d.code} - ${d.name}`, value: d.id }))
  ]);

  readonly filteredPrograms = computed(() => {
    const list = this.programs();
    if (!this.selectedDepartmentId) return list;
    return list.filter((p) => p.departmentId === this.selectedDepartmentId);
  });

  readonly programForm = new FormGroup<ProgramForm>({
    departmentId: new FormControl<number | null>(null, [Validators.required]),
    code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    degreeLevel: new FormControl<string>('UNDERGRADUATE', { nonNullable: true, validators: [Validators.required] }),
    major: new FormControl<string>('', { nonNullable: true }),
    totalUnitsRequired: new FormControl<number | null>(146, [Validators.required, Validators.min(1)])
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.deptService.getAll().subscribe({
      next: (depts) => {
        this.departments.set(depts);
        this.programService.getAll().subscribe({
          next: (progs) => {
            this.programs.set(progs);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false)
        });
      },
      error: () => this.isLoading.set(false)
    });
  }

  onDepartmentFilterChange(): void {}

  getDeptCode(deptId: number): string {
    return this.departments().find((d) => d.id === deptId)?.code || `Dept #${deptId}`;
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.selectedProgram = null;
    this.programForm.reset({
      departmentId: this.departments().length > 0 ? this.departments()[0].id : null,
      code: '',
      name: '',
      degreeLevel: 'UNDERGRADUATE',
      major: '',
      totalUnitsRequired: 146
    });
    this.displayDialog = true;
  }

  openEditDialog(p: Program): void {
    this.isEditing = true;
    this.selectedProgram = p;
    this.programForm.patchValue({
      departmentId: p.departmentId,
      code: p.code,
      name: p.name,
      degreeLevel: p.degreeLevel || 'UNDERGRADUATE',
      major: p.major || '',
      totalUnitsRequired: p.totalUnitsRequired || 146
    });
    this.displayDialog = true;
  }

  resetForm(): void {
    this.programForm.reset();
    this.isSubmitting = false;
  }

  saveProgram(): void {
    if (this.programForm.invalid) {
      this.programForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = this.programForm.getRawValue();

    if (this.isEditing && this.selectedProgram) {
      this.programService.update(this.selectedProgram.id, {
        name: val.name.trim(),
        degreeLevel: val.degreeLevel,
        major: val.major?.trim() || undefined,
        totalUnitsRequired: val.totalUnitsRequired || undefined
      }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Program Updated', detail: `${val.code} updated successfully.` });
          this.displayDialog = false;
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: err.error?.detail || 'Failed to update program.' });
        }
      });
    } else {
      this.programService.create({
        departmentId: val.departmentId!,
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        degreeLevel: val.degreeLevel,
        major: val.major?.trim() || undefined,
        totalUnitsRequired: val.totalUnitsRequired || 146
      }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Program Created', detail: `${val.code} registered successfully.` });
          this.displayDialog = false;
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Creation Failed', detail: err.error?.detail || 'Failed to register program.' });
        }
      });
    }
  }

  confirmDelete(p: Program): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete degree program "${p.code} - ${p.name}"? This action cannot be undone if curricula are already established.`,
      header: 'Confirm Program Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.programService.delete(p.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `Program ${p.code} removed.` });
            this.loadData();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Deletion Guarded', detail: err.error?.detail || 'Cannot delete program referenced by existing curricula.' });
          }
        });
      }
    });
  }

  openPiloDialog(p: Program): void {
    this.activePiloProgram = p;
    this.newPiloCode = '';
    this.newPiloDescription = '';
    this.displayPiloDialog = true;
    this.loadPilos(p.id);
  }

  loadPilos(programId: number): void {
    this.isLoadingPilos = true;
    this.programService.getOutcomes(programId).subscribe({
      next: (list) => {
        this.programOutcomes.set(list);
        this.isLoadingPilos = false;
      },
      error: () => {
        this.programOutcomes.set([]);
        this.isLoadingPilos = false;
      }
    });
  }

  addPilo(): void {
    if (!this.activePiloProgram || !this.newPiloCode.trim() || !this.newPiloDescription.trim()) return;

    this.programService.createOutcome(this.activePiloProgram.id, {
      code: this.newPiloCode.trim().toUpperCase(),
      description: this.newPiloDescription.trim()
    }).subscribe({
      next: () => {
        this.newPiloCode = '';
        this.newPiloDescription = '';
        this.loadPilos(this.activePiloProgram!.id);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to add outcome.' });
      }
    });
  }

  deletePilo(id: number): void {
    this.programService.deleteOutcome(id).subscribe({
      next: () => {
        if (this.activePiloProgram) this.loadPilos(this.activePiloProgram.id);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to delete outcome.' });
      }
    });
  }
}
