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
  templateUrl: './department-manager.component.html',
  styleUrl: './department-manager.component.css'
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
