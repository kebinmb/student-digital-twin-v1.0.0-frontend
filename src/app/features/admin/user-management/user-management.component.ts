import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/service/user/user-api.service';
import { UserDetail, CreateUserRequest, UpdateUserRequest } from '../../../core/models/user-management.model';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { DepartmentService, ProgramService } from '../../../core/services/institution.service';
import { Department, Program } from '../../../core/models/institution.model';

import { SelectModule } from 'primeng/select';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';

export const AVAILABLE_ROLES = [
  'ADMIN',
  'REGISTRAR',
  'DEAN',
  'CHAIRPERSON',
  'FACULTY',
  'STUDENT',
  'CASHIER',
  'ACCOUNTANT',
  'GUIDANCE'
];

@Component({
  selector: 'app-user-management',
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
    ToggleSwitchModule,
    ConfirmDialogModule,
    SelectModule,
    HasRoleDirective
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  private readonly userApiService = inject(UserApiService);
  private readonly departmentService = inject(DepartmentService);
  private readonly programService = inject(ProgramService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  protected readonly authService = inject(AuthService);

  readonly users = signal<UserDetail[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly colleges = computed<Department[]>(() =>
    this.departments().filter(d => d.type === 'COLLEGE' || d.type === 'DEPARTMENT')
  );
  readonly allPrograms = signal<Program[]>([]);
  readonly selectedCollegeId = signal<number | null>(null);

  readonly filteredPrograms = computed<Program[]>(() => {
    const cid = this.selectedCollegeId();
    if (!cid) return this.allPrograms();
    return this.allPrograms().filter(p => p.departmentId === cid);
  });

  readonly collegeOptions = computed(() => [
    { label: '-- None / Institutional Unrestricted --', value: null },
    ...this.colleges().map(col => ({ label: `${col.code} - ${col.name}`, value: col.id }))
  ]);

  readonly programOptions = computed(() => [
    { label: '-- None / Unassigned --', value: null },
    ...this.filteredPrograms().map(prog => ({ label: `${prog.code} - ${prog.name}`, value: prog.id }))
  ]);

  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);
  readonly editingUser = signal<UserDetail | null>(null);

  readonly isAuditDialogVisible = signal<boolean>(false);
  readonly isAuditLoading = signal<boolean>(false);
  readonly auditLogs = signal<import('../../../core/models/user-management.model').AuditLogEntry[]>([]);

  readonly availableRoles = AVAILABLE_ROLES;

  readonly selectedRoles = signal<string[]>([]);

  readonly userForm = new FormGroup({
    username: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl<string>('', { nonNullable: true }),
    enabled: new FormControl<boolean>(true, { nonNullable: true }),
    collegeId: new FormControl<number | null>(null),
    programId: new FormControl<number | null>(null)
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userApiService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: 'Failed to retrieve user accounts.'
        });
        this.isLoading.set(false);
      }
    });

    this.departmentService.getAll().subscribe({
      next: (data) => this.departments.set(data),
      error: () => console.warn('Could not load departments')
    });

    this.programService.getAll().subscribe({
      next: (data) => this.allPrograms.set(data),
      error: () => console.warn('Could not load programs')
    });
  }

  openAuditLogs(): void {
    this.isAuditDialogVisible.set(true);
    this.isAuditLoading.set(true);
    this.userApiService.getAuditLogs().subscribe({
      next: (logs) => {
        const sorted = [...(logs || [])].sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const diff = timeA - timeB;
          return diff !== 0 ? diff : (a.id || 0) - (b.id || 0);
        });
        this.auditLogs.set(sorted);
        this.isAuditLoading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Audit Logs Error',
          detail: 'Failed to retrieve system security audit logs.'
        });
        this.isAuditLoading.set(false);
      }
    });
  }

  isDeanSelected(): boolean {

    return this.selectedRoles().includes('DEAN');
  }

  isChairpersonSelected(): boolean {
    return this.selectedRoles().includes('CHAIRPERSON');
  }

  isFacultySelected(): boolean {
    return this.selectedRoles().includes('FACULTY');
  }

  onCollegeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const cid = value ? Number(value) : null;
    this.onCollegeSelect(cid);
  }

  onCollegeSelect(cid: number | null): void {
    this.selectedCollegeId.set(cid);
    this.userForm.controls.collegeId.setValue(cid);

    const currentProgId = this.userForm.controls.programId.value;
    if (currentProgId) {
      const prog = this.allPrograms().find(p => p.id === currentProgId);
      if (prog && cid && prog.departmentId !== cid) {
        this.userForm.controls.programId.setValue(null);
      }
    }
  }

  onProgramChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const pid = value ? Number(value) : null;
    this.onProgramSelect(pid);
  }

  onProgramSelect(pid: number | null): void {
    this.userForm.controls.programId.setValue(pid);

    if (pid && !this.selectedCollegeId()) {
      const prog = this.allPrograms().find(p => p.id === pid);
      if (prog) {
        this.selectedCollegeId.set(prog.departmentId);
        this.userForm.controls.collegeId.setValue(prog.departmentId);
      }
    }
  }

  openCreateDialog(): void {
    this.editingUser.set(null);
    this.selectedRoles.set(['STUDENT']);
    this.selectedCollegeId.set(null);
    this.userForm.reset({
      username: '',
      email: '',
      password: '',
      enabled: true,
      collegeId: null,
      programId: null
    });
    this.userForm.controls.username.enable();
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.controls.password.updateValueAndValidity();
    this.isDialogVisible.set(true);
  }

  openEditDialog(user: UserDetail): void {
    this.editingUser.set(user);
    this.selectedRoles.set([...user.roles]);
    this.selectedCollegeId.set(user.collegeId ?? null);
    this.userForm.reset({
      username: user.username,
      email: user.email,
      password: '',
      enabled: user.enabled,
      collegeId: user.collegeId ?? null,
      programId: user.programId ?? null
    });
    this.userForm.controls.username.disable();
    this.userForm.controls.password.clearValidators();
    this.userForm.controls.password.updateValueAndValidity();
    this.isDialogVisible.set(true);
  }

  toggleRole(role: string): void {
    const current = this.selectedRoles();
    if (current.includes(role)) {
      if (current.length === 1) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'User must have at least one assigned role.'
        });
        return;
      }
      this.selectedRoles.set(current.filter(r => r !== role));
    } else {
      const updated = [...current, role];
      this.selectedRoles.set(updated);
      if (role === 'DEAN') {
        this.userForm.controls.programId.setValue(null);
      }
    }
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    if (this.selectedRoles().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'At least one role must be selected.'
      });
      return;
    }

    const formVal = this.userForm.getRawValue();

    if (this.isDeanSelected()) {
      if (!formVal.collegeId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Scoping Validation',
          detail: 'DEAN role requires a College assignment.'
        });
        return;
      }
      if (formVal.programId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Scoping Validation',
          detail: 'DEAN cannot be assigned to a specific Program; only a College.'
        });
        return;
      }
    }

    if (this.isChairpersonSelected()) {
      if (!formVal.collegeId || !formVal.programId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Scoping Validation',
          detail: 'CHAIRPERSON role requires both College and Program assignments.'
        });
        return;
      }
    }

    this.isSaving.set(true);

    if (this.editingUser()) {
      const updateReq: UpdateUserRequest = {
        email: formVal.email,
        password: formVal.password ? formVal.password : undefined,
        roles: this.selectedRoles(),
        enabled: formVal.enabled,
        collegeId: formVal.collegeId,
        programId: formVal.programId,
        clearCollege: !formVal.collegeId,
        clearProgram: !formVal.programId
      };

      this.userApiService.updateUser(this.editingUser()!.id, updateReq).subscribe({
        next: (updated) => {
          this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
          this.messageService.add({
            severity: 'success',
            summary: 'Account Updated',
            detail: `User ${updated.username} updated successfully.`
          });
          this.isDialogVisible.set(false);
          this.isSaving.set(false);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Update Failed',
            detail: err.error?.message || 'Failed to update user account.'
          });
          this.isSaving.set(false);
        }
      });
    } else {
      const createReq: CreateUserRequest = {
        username: formVal.username,
        email: formVal.email,
        password: formVal.password,
        roles: this.selectedRoles(),
        enabled: formVal.enabled,
        collegeId: formVal.collegeId,
        programId: formVal.programId
      };

      this.userApiService.createUser(createReq).subscribe({
        next: (created) => {
          this.users.update(list => [created, ...list]);
          this.messageService.add({
            severity: 'success',
            summary: 'Account Provisioned',
            detail: `User ${created.username} created successfully.`
          });
          this.isDialogVisible.set(false);
          this.isSaving.set(false);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Creation Failed',
            detail: err.error?.message || 'Failed to provision user account.'
          });
          this.isSaving.set(false);
        }
      });
    }
  }

  confirmDelete(user: UserDetail): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to permanently delete user account "${user.username}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.userApiService.deleteUser(user.id).subscribe({
          next: () => {
            this.users.update(list => list.filter(u => u.id !== user.id));
            this.messageService.add({
              severity: 'success',
              summary: 'Account Deleted',
              detail: `User ${user.username} was removed.`
            });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Delete Failed',
              detail: err.error?.message || 'Failed to delete user account.'
            });
          }
        });
      }
    });
  }
}
