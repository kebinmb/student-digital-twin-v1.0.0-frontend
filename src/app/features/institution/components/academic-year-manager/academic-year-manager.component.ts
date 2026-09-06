import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

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

import { Drawer } from 'primeng/drawer';
import { Skeleton } from 'primeng/skeleton';

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
    ConfirmDialogModule,
    Drawer,
    Skeleton
  ],
  templateUrl: './academic-year-manager.component.html',
  styleUrl: './academic-year-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
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

  readonly selectedAyForDetail = signal<AcademicYear | null>(null);
  readonly isDetailDrawerOpen = signal<boolean>(false);

  openDetailDrawer(ay: AcademicYear): void {
    this.selectedAyForDetail.set(ay);
    this.isDetailDrawerOpen.set(true);
  }

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

  private dateOrderValidator(group: AbstractControl) {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    if (start && end && new Date(end) <= new Date(start)) {
      return { dateOrder: true };
    }
    return null;
  }
}
