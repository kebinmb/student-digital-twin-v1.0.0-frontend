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

import { CampusService } from '../../../../core/services/institution.service';
import { Campus, CreateCampusRequest, UpdateCampusRequest } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

interface CampusForm {
  code: FormControl<string>;
  name: FormControl<string>;
  chedInstitutionalCode: FormControl<string>;
  address: FormControl<string>;
  region: FormControl<string>;
  contactNumber: FormControl<string>;
  email: FormControl<string>;
  isMain: FormControl<boolean>;
}

@Component({
  selector: 'app-campus-manager',
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
  templateUrl: './campus-manager.component.html',
  styleUrl: './campus-manager.component.css'
})
export class CampusManagerComponent implements OnInit {
  private readonly campusService = inject(CampusService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly campuses = signal<Campus[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);
  readonly editingId = signal<number | null>(null);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN']);

  readonly form = new FormGroup<CampusForm>({
    code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    chedInstitutionalCode: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(20)] }),
    address: new FormControl<string>('', { nonNullable: true }),
    region: new FormControl<string>('REGION VI', { nonNullable: true }),
    contactNumber: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(100)] }),
    isMain: new FormControl<boolean>(false, { nonNullable: true })
  });

  ngOnInit(): void {
    this.loadCampuses();
  }

  loadCampuses(): void {
    this.isLoading.set(true);
    this.campusService.getAll().subscribe({
      next: (list) => {
        this.campuses.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Load Failed', detail: err.error?.detail || 'Unable to load campuses.' });
      }
    });
  }

  openCreateDialog(): void {
    this.editingId.set(null);
    this.form.reset({
      code: '',
      name: '',
      chedInstitutionalCode: '',
      address: '',
      region: 'REGION VI',
      contactNumber: '',
      email: '',
      isMain: false
    });
    this.isDialogVisible.set(true);
  }

  openEditDialog(campus: Campus): void {
    this.editingId.set(campus.id);
    this.form.reset({
      code: campus.code,
      name: campus.name,
      chedInstitutionalCode: campus.chedInstitutionalCode || '',
      address: campus.address || '',
      region: campus.region || 'REGION VI',
      contactNumber: campus.contactNumber || '',
      email: campus.email || '',
      isMain: campus.isMain
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
      const req: UpdateCampusRequest = {
        name: val.name.trim(),
        chedInstitutionalCode: val.chedInstitutionalCode ? val.chedInstitutionalCode.trim() : undefined,
        address: val.address ? val.address.trim() : undefined,
        contactNumber: val.contactNumber ? val.contactNumber.trim() : undefined,
        email: val.email ? val.email.trim() : undefined
      };
      this.campusService.update(editId, req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Campus details updated.' });
          this.loadCampuses();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Update Error', detail: err.error?.detail || 'Update failed.' });
        }
      });
    } else {
      const req: CreateCampusRequest = {
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        chedInstitutionalCode: val.chedInstitutionalCode ? val.chedInstitutionalCode.trim() : undefined,
        address: val.address ? val.address.trim() : undefined,
        region: val.region ? val.region.trim() : 'REGION VI',
        contactNumber: val.contactNumber ? val.contactNumber.trim() : undefined,
        email: val.email ? val.email.trim() : undefined,
        isMain: val.isMain
      };
      this.campusService.create(req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Registered', detail: 'Campus successfully created.' });
          this.loadCampuses();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Creation Error', detail: err.error?.detail || 'Registration failed.' });
        }
      });
    }
  }

  confirmToggleStatus(campus: Campus): void {
    const nextStatus = !campus.isActive;
    const actionWord = nextStatus ? 'activate' : 'deactivate';
    this.confirmationService.confirm({
      message: `Are you sure you want to ${actionWord} "${campus.name}"?`,
      header: `${actionWord.toUpperCase()} Campus`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `Confirm ${actionWord}`,
      accept: () => {
        this.campusService.toggleStatus(campus.id, nextStatus).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Status Changed', detail: `${campus.code} is now ${nextStatus ? 'active' : 'inactive'}.` });
            this.loadCampuses();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Action Failed', detail: err.error?.detail || 'Failed to toggle status.' });
          }
        });
      }
    });
  }

  confirmDelete(campus: Campus): void {
    this.confirmationService.confirm({
      message: `Permanently delete campus "${campus.name}"? This operation will be rejected if existing departments belong to it.`,
      header: 'Delete Campus',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.campusService.delete(campus.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${campus.code} removed.` });
            this.loadCampuses();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Deletion Blocked', detail: err.error?.detail || 'Cannot delete campus with existing departments.' });
          }
        });
      }
    });
  }
}
