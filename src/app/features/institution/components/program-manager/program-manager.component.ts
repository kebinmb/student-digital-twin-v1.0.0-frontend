import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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

import { Drawer } from 'primeng/drawer';
import { Skeleton } from 'primeng/skeleton';

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
    MessageModule,
    Drawer,
    Skeleton
  ],
  templateUrl: './program-manager.component.html',
  styleUrl: './program-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramManagerComponent implements OnInit {
  private readonly programService = inject(ProgramService);
  private readonly deptService = inject(DepartmentService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON']);
  readonly canCreate = () => this.authService.hasAnyRole(['ADMIN', 'DEAN']);

  readonly selectedProgForDetail = signal<Program | null>(null);
  readonly isDetailDrawerOpen = signal<boolean>(false);

  openDetailDrawer(prog: Program): void {
    this.selectedProgForDetail.set(prog);
    this.isDetailDrawerOpen.set(true);
  }

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

  readonly departmentOptions = computed(() => {
    const user = this.authService.currentUser();
    let depts = this.departments();
    if (this.authService.hasRole('DEAN') && user?.collegeId) {
      depts = depts.filter((d) => d.id === user.collegeId || d.parentDepartmentId === user.collegeId);
    }
    return depts.map((d) => ({ label: `${d.code} - ${d.name}`, value: d.id }));
  });

  readonly departmentFilterOptions = computed(() => {
    const user = this.authService.currentUser();
    let depts = this.departments();
    if (this.authService.hasRole('DEAN') && user?.collegeId) {
      depts = depts.filter((d) => d.id === user.collegeId || d.parentDepartmentId === user.collegeId);
    }
    return [
      { label: 'All Departments', value: null },
      ...depts.map((d) => ({ label: `${d.code} - ${d.name}`, value: d.id }))
    ];
  });

  readonly filteredPrograms = computed(() => {
    const user = this.authService.currentUser();
    let list = this.programs();
    if (this.authService.hasRole('CHAIRPERSON') && user?.programId) {
      list = list.filter((p) => p.id === user.programId);
    } else if (this.authService.hasRole('DEAN') && user?.collegeId) {
      const allowedDeptIds = new Set(
        this.departments()
          .filter((d) => d.id === user.collegeId || d.parentDepartmentId === user.collegeId)
          .map((d) => d.id)
      );
      list = list.filter((p) => allowedDeptIds.has(p.departmentId));
    }
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
    const defaultDept = this.departmentOptions().length > 0 ? this.departmentOptions()[0].value : null;
    this.programForm.reset({
      departmentId: defaultDept,
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
