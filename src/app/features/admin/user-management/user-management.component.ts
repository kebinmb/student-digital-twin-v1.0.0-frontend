import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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

import { UserApiService } from '../../../core/service/user/user-api.service';
import { UserDetail, CreateUserRequest, UpdateUserRequest } from '../../../core/models/user-management.model';
import { AuthService } from '../../../core/service/authentication/auth-service';

export const AVAILABLE_ROLES = [
  'ADMIN',
  'REGISTRAR',
  'DEAN',
  'CHAIRPERSON',
  'FACULTY',
  'STUDENT',
  'CASHIER',
  'GUIDANCE'
];

@Component({
  selector: 'app-user-management',
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
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  private readonly userApiService = inject(UserApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  protected readonly authService = inject(AuthService);

  readonly users = signal<UserDetail[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);
  readonly editingUser = signal<UserDetail | null>(null);

  readonly availableRoles = AVAILABLE_ROLES;
  readonly selectedRoles = signal<string[]>([]);

  readonly userForm = new FormGroup({
    username: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl<string>('', { nonNullable: true }),
    enabled: new FormControl<boolean>(true, { nonNullable: true })
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
  }

  openCreateDialog(): void {
    this.editingUser.set(null);
    this.selectedRoles.set(['STUDENT']);
    this.userForm.reset({
      username: '',
      email: '',
      password: '',
      enabled: true
    });
    this.userForm.controls.username.enable();
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.controls.password.updateValueAndValidity();
    this.isDialogVisible.set(true);
  }

  openEditDialog(user: UserDetail): void {
    this.editingUser.set(user);
    this.selectedRoles.set([...user.roles]);
    this.userForm.reset({
      username: user.username,
      email: user.email,
      password: '',
      enabled: user.enabled
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
      this.selectedRoles.set([...current, role]);
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
    this.isSaving.set(true);

    if (this.editingUser()) {
      const updateReq: UpdateUserRequest = {
        email: formVal.email,
        password: formVal.password ? formVal.password : undefined,
        roles: this.selectedRoles(),
        enabled: formVal.enabled
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
        enabled: formVal.enabled
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
