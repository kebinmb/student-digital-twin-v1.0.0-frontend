import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';

import { FacultyApiService } from '../../core/service/faculty/faculty-api.service';
import { FacultyProfile, CreateFacultyAccountRequest } from '../../core/models/faculty-management.model';
import { AuthService } from '../../core/service/authentication/auth-service';
import { DepartmentService, ProgramService } from '../../core/services/institution.service';
import { Department, Program } from '../../core/models/institution.model';

export const DEGREES = ['BACHELORS', 'MASTERS', 'DOCTORATE', 'POST_DOCTORATE'];
export const RANKS = [
  'INSTRUCTOR_I', 'INSTRUCTOR_II', 'INSTRUCTOR_III',
  'ASSISTANT_PROFESSOR_I', 'ASSISTANT_PROFESSOR_II', 'ASSISTANT_PROFESSOR_III', 'ASSISTANT_PROFESSOR_IV',
  'ASSOCIATE_PROFESSOR_I', 'ASSOCIATE_PROFESSOR_II', 'ASSOCIATE_PROFESSOR_III', 'ASSOCIATE_PROFESSOR_IV',
  'PROFESSOR_I', 'PROFESSOR_II', 'PROFESSOR_III', 'PROFESSOR_IV', 'PROFESSOR_V', 'PROFESSOR_VI',
  'UNIVERSITY_PROFESSOR'
];
export const EMPLOYMENT_STATUSES = ['FULL_TIME', 'PART_TIME', 'ADJUNCT'];

@Component({
  selector: 'app-faculty-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TagModule,
    InputTextModule,
    ToggleSwitchModule
  ],
  templateUrl: './faculty-management.component.html',
  styleUrl: './faculty-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FacultyManagementComponent implements OnInit {
  private readonly facultyApiService = inject(FacultyApiService);
  private readonly departmentService = inject(DepartmentService);
  private readonly programService = inject(ProgramService);
  private readonly messageService = inject(MessageService);
  protected readonly authService = inject(AuthService);

  readonly facultyList = signal<FacultyProfile[]>([]);
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

  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);

  readonly availableDegrees = DEGREES;
  readonly availableRanks = RANKS;
  readonly availableStatuses = EMPLOYMENT_STATUSES;

  readonly facultyForm = new FormGroup({
    username: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl<string>('', { nonNullable: true }),
    facultyIdNumber: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    highestDegree: new FormControl<string>('BACHELORS', { nonNullable: true, validators: [Validators.required] }),
    academicRank: new FormControl<string>('INSTRUCTOR_I', { nonNullable: true, validators: [Validators.required] }),
    prcLicenseNo: new FormControl<string>('', { nonNullable: true }),
    employmentStatus: new FormControl<string>('FULL_TIME', { nonNullable: true, validators: [Validators.required] }),
    isTenured: new FormControl<boolean>(false, { nonNullable: true }),
    collegeId: new FormControl<number | null>(null),
    programId: new FormControl<number | null>(null)
  });

  ngOnInit(): void {
    this.loadFaculty();
  }

  loadFaculty(): void {
    this.isLoading.set(true);
    this.facultyApiService.getAllFaculty().subscribe({
      next: (data) => {
        this.facultyList.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: 'Failed to retrieve faculty directory.'
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

  onCollegeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const cid = value ? Number(value) : null;
    this.selectedCollegeId.set(cid);
    this.facultyForm.controls.collegeId.setValue(cid);

    const currentProgId = this.facultyForm.controls.programId.value;
    if (currentProgId) {
      const prog = this.allPrograms().find(p => p.id === currentProgId);
      if (prog && cid && prog.departmentId !== cid) {
        this.facultyForm.controls.programId.setValue(null);
      }
    }
  }

  onProgramChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const pid = value ? Number(value) : null;
    this.facultyForm.controls.programId.setValue(pid);

    if (pid && !this.selectedCollegeId()) {
      const prog = this.allPrograms().find(p => p.id === pid);
      if (prog) {
        this.selectedCollegeId.set(prog.departmentId);
        this.facultyForm.controls.collegeId.setValue(prog.departmentId);
      }
    }
  }

  openCreateDialog(): void {
    this.selectedCollegeId.set(null);
    this.facultyForm.reset({
      username: '',
      email: '',
      password: '',
      facultyIdNumber: '',
      highestDegree: 'BACHELORS',
      academicRank: 'INSTRUCTOR_I',
      prcLicenseNo: '',
      employmentStatus: 'FULL_TIME',
      isTenured: false,
      collegeId: null,
      programId: null
    });
    this.isDialogVisible.set(true);
  }

  saveFaculty(): void {
    if (this.facultyForm.invalid) {
      this.facultyForm.markAllAsTouched();
      return;
    }

    const formVal = this.facultyForm.getRawValue();
    this.isSaving.set(true);

    const createReq: CreateFacultyAccountRequest = {
      username: formVal.username,
      email: formVal.email,
      password: formVal.password ? formVal.password : undefined,
      facultyIdNumber: formVal.facultyIdNumber,
      highestDegree: formVal.highestDegree,
      academicRank: formVal.academicRank,
      prcLicenseNo: formVal.prcLicenseNo ? formVal.prcLicenseNo : undefined,
      employmentStatus: formVal.employmentStatus,
      isTenured: formVal.isTenured,
      collegeId: formVal.collegeId,
      programId: formVal.programId
    };

    this.facultyApiService.createFacultyAccount(createReq).subscribe({
      next: (created) => {
        this.facultyList.update(list => [created, ...list]);
        this.messageService.add({
          severity: 'success',
          summary: 'Faculty Account Provisioned',
          detail: `Faculty ${created.facultyIdNumber} (${created.username}) registered successfully.`
        });
        this.isDialogVisible.set(false);
        this.isSaving.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Provisioning Failed',
          detail: err.error?.message || 'Failed to provision faculty account.'
        });
        this.isSaving.set(false);
      }
    });
  }
}
