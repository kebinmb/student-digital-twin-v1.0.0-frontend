import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of, filter, distinctUntilChanged, switchMap, catchError } from 'rxjs';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { Skeleton } from 'primeng/skeleton';
import { InputNumberModule } from 'primeng/inputnumber';

import { EnrollmentStore } from '../../state/enrollment.store';
import { CourseEligibilityItemDto, AvailableSectionOptionDto } from '../../../../core/models/enrollment.model';
import { ProgramService } from '../../../../core/services/institution.service';
import { CurriculumApiService } from '../../../../core/service/curriculum/curriculum-api.service';
import { AuthService } from '../../../../core/service/authentication/auth-service';
import { EnrollmentApiService } from '../../../../core/service/enrollment/enrollment-api.service';
import { AdmissionApiService } from '../../../../core/service/admission/admission-api.service';
import { AdmissionApplicationResponse } from '../../../../core/models/admission.model';

export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined) return null;
    const isWhitespace = (control.value.toString() || '').trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  };
}

@Component({
  selector: 'app-student-advising',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    Skeleton,
    ProgressBarModule,
    MessageModule,
    ToastModule,
    SelectModule,
    InputText,
    InputNumberModule,
    IconField,
    InputIcon
  ],
  templateUrl: './student-advising.component.html',
  styleUrls: ['./student-advising.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAdvisingComponent implements OnInit {
  readonly store = inject(EnrollmentStore);
  readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly programService = inject(ProgramService);
  private readonly curriculumApi = inject(CurriculumApiService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly admissionApi = inject(AdmissionApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly programSelect$ = new Subject<number>();
  private currentAdmitProgramId: number | null = null;

  readonly isStudentUser = computed(() => this.authService.hasRole('STUDENT'));
  readonly canAdmitStudent = computed(() => this.authService.hasAnyRole(['ADMIN', 'REGISTRAR']));
  readonly canCreditTransferee = computed(() => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'REGISTRAR']));

  readonly isSectionModalVisible = signal<boolean>(false);
  readonly selectedCourse = signal<CourseEligibilityItemDto | null>(null);
  readonly searchFilter = signal<string>('');
  readonly statusFilter = signal<string>('ELIGIBLE');
  readonly yearFilter = signal<string>('ALL');
  readonly semesterFilter = signal<string>('ALL');

  // Admissions Intake State
  readonly isAdmissionsDialogVisible = signal<boolean>(false);
  readonly isAdmissionsSubmitted = signal<boolean>(false);
  readonly programOptions = signal<{ label: string; value: number }[]>([]);
  readonly curriculumOptions = signal<{ label: string; value: number }[]>([]);
  readonly rawApplications = signal<AdmissionApplicationResponse[]>([]);
  readonly pendingApplications = this.rawApplications;
  readonly selectedAdmissionAppId = signal<number | null>(null);

  readonly availableApplications = computed(() => {
    return this.rawApplications().filter(app => {
      const st = (app.status || app.applicationStatus || '').toUpperCase();
      const isApproved = st === 'APPROVED' || st === 'ELIGIBLE_FOR_ENROLLMENT' || st === 'INTERVIEW_ACCEPTED';
      const isEnrolled = st === 'ENROLLED' || app.isEnrolled === true || !!app.studentId || !!app.studentProfileId;
      return isApproved && !isEnrolled;
    });
  });

  readonly admissionAppOptions = computed(() => {
    return this.availableApplications().map(app => ({
      label: `${app.applicationNumber} — ${app.fullName} (${app.targetProgramCode || 'Program'})`,
      value: app.id
    }));
  });

  // Schema-aligned validators: student_number VARCHAR(30), username VARCHAR(50), email VARCHAR(100), names VARCHAR(50)
  readonly admissionsForm = new FormGroup({
    studentNumber: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(30),
        Validators.pattern(/^[0-9]{4}-[0-9]{4,6}$/)
      ]
    }),
    firstName: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        noWhitespaceValidator(),
        Validators.pattern(/^[a-zA-Z\sñÑ\-'.]+$/)
      ]
    }),
    lastName: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        noWhitespaceValidator(),
        Validators.pattern(/^[a-zA-Z\sñÑ\-'.]+$/)
      ]
    }),
    username: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9._-]+$/)
      ]
    }),
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]
    }),
    classification: new FormControl<'INCOMING_FIRST_YEAR' | 'TRANSFEREE' | 'RETURNEE' | 'CONTINUING'>('INCOMING_FIRST_YEAR', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    yearLevel: new FormControl<number>(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(4)]
    }),
    programId: new FormControl<number | null>(null, {
      validators: [Validators.required]
    }),
    curriculumId: new FormControl<number | null>(null, {
      validators: [Validators.required]
    })
  });

  // Transferee Crediting State
  readonly isCreditingDialogVisible = signal<boolean>(false);
  readonly isCreditingSubmitted = signal<boolean>(false);
  readonly selectedCreditingInternalId = signal<number | null>(null);

  // Schema: external_institution VARCHAR(150), external_course_code VARCHAR(30), external_course_title VARCHAR(150), remarks VARCHAR(255)
  readonly creditingForm = new FormGroup({
    externalInstitution: new FormControl<string>('Polytechnic State College', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(150),
        noWhitespaceValidator()
      ]
    }),
    externalCourseCode: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(30),
        noWhitespaceValidator(),
        Validators.pattern(/^[a-zA-Z0-9\-\s]+$/)
      ]
    }),
    externalCourseTitle: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(150),
        noWhitespaceValidator()
      ]
    }),
    internalCourseId: new FormControl<number | null>(null, {
      validators: [Validators.required]
    }),
    externalNumericalGrade: new FormControl<number>(1.50, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1.00), Validators.max(3.00)]
    }),
    creditsGranted: new FormControl<number>(3.00, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1.0), Validators.max(6.0)]
    }),
    remarks: new FormControl<string>('Accredited under CMO 25 equivalency matrix', {
      nonNullable: true,
      validators: [Validators.maxLength(255)]
    })
  });

  // Backward-compatibility signal accessors for existing tests
  readonly admitStudentNumber = computed(() => this.admissionsForm.get('studentNumber')?.value || '');
  readonly admitClassification = computed(() => this.admissionsForm.get('classification')?.value || 'INCOMING_FIRST_YEAR');
  readonly admitYearLevel = computed(() => this.admissionsForm.get('yearLevel')?.value || 1);
  readonly creditingExternalSchool = computed(() => this.creditingForm.get('externalInstitution')?.value || '');
  readonly creditingGrade = computed(() => this.creditingForm.get('externalNumericalGrade')?.value || 0);
  readonly creditingUnits = computed(() => this.creditingForm.get('creditsGranted')?.value || 0);

  readonly classificationOptions = [
    { label: 'Incoming First Year (Freshman)', value: 'INCOMING_FIRST_YEAR' },
    { label: 'Transferee (CMO 25 Crediting Required)', value: 'TRANSFEREE' },
    { label: 'Returnee', value: 'RETURNEE' },
    { label: 'Continuing', value: 'CONTINUING' }
  ];

  readonly yearLevelOptions = [
    { label: '1st Year', value: 1 },
    { label: '2nd Year', value: 2 },
    { label: '3rd Year', value: 3 },
    { label: '4th Year', value: 4 }
  ];

  readonly selectedStudent = computed(() => {
    const currId = this.store.studentId();
    return this.store.searchedStudents().find(s => s.id === currId) || null;
  });

  readonly isTransfereeSelected = computed(() => {
    const s = this.selectedStudent();
    return s?.academicStatus === 'TRANSFEREE' || this.store.advising() !== null;
  });

  readonly availableCurriculumCourses = computed(() => {
    const adv = this.store.advising();
    if (!adv || !adv.courses) return [];
    return adv.courses.map(c => ({
      label: `${c.code} - ${c.title} (${c.creditUnits} units)`,
      value: c.courseId
    }));
  });

  readonly selectedInternalCourse = computed(() => {
    const id = this.selectedCreditingInternalId();
    if (!id) return null;
    return this.store.advising()?.courses.find(c => c.courseId === id) || null;
  });

  readonly dependentCoursesToUnlock = computed(() => {
    const target = this.selectedInternalCourse();
    if (!target) return [];
    const code = target.code.toUpperCase();
    const courses = this.store.advising()?.courses || [];
    return courses.filter(c =>
      c.courseId !== target.courseId &&
      c.prerequisites &&
      c.prerequisites.some(p => p.prerequisiteCode.toUpperCase() === code || p.prerequisiteCourseId === target.courseId)
    );
  });

  readonly eligibleCount = computed(() => {
    return (this.store.advising()?.courses || []).filter(c => c.eligibilityStatus === 'ELIGIBLE').length;
  });

  readonly passedCount = computed(() => {
    return (this.store.advising()?.courses || []).filter(c => c.eligibilityStatus === 'ALREADY_PASSED').length;
  });

  readonly allCount = computed(() => {
    return (this.store.advising()?.courses || []).length;
  });

  readonly filteredCourses = computed(() => {
    const courses = this.store.advising()?.courses || [];
    const search = this.searchFilter().toLowerCase().trim();
    const status = this.statusFilter();
    const year = this.yearFilter();
    const sem = this.semesterFilter();

    return courses.filter((c) => {
      const matchesSearch = !search || c.code.toLowerCase().includes(search) || c.title.toLowerCase().includes(search);
      const matchesStatus = status === 'ALL' || c.eligibilityStatus === status;
      const matchesYear = year === 'ALL' || String(c.yearLevel) === year;

      let matchesSem = true;
      if (sem !== 'ALL') {
        const courseSem = (c.semester || '').toUpperCase();
        if (sem === '1ST_SEM') matchesSem = courseSem.includes('1') || courseSem.includes('FIRST');
        else if (sem === '2ND_SEM') matchesSem = courseSem.includes('2') || courseSem.includes('SECOND');
        else if (sem === 'SUMMER') matchesSem = courseSem.includes('SUMMER');
      }

      return matchesSearch && matchesStatus && matchesYear && matchesSem;
    });
  });

  readonly statusOptions = [
    { label: 'Eligible Only', value: 'ELIGIBLE' },
    { label: 'Already Passed', value: 'ALREADY_PASSED' },
    { label: 'All Courses', value: 'ALL' }
  ];

  readonly yearOptions = [
    { label: 'All Years', value: 'ALL' },
    { label: '1st Year', value: 1 },
    { label: '2nd Year', value: 2 },
    { label: '3rd Year', value: 3 },
    { label: '4th Year', value: 4 }
  ];

  readonly semesterOptions = [
    { label: 'All Semesters', value: 'ALL' },
    { label: '1st Semester', value: '1ST_SEM' },
    { label: '2nd Semester', value: '2ND_SEM' },
    { label: 'Summer Term', value: 'SUMMER' }
  ];

  constructor() {
    this.setupCurriculumPipeline();
  }

  ngOnInit(): void {
    this.store.loadInitialData();
    const sid = this.store.studentId();
    const tid = this.store.selectedTermId();
    if (sid && sid > 0 && tid && tid > 0) {
      this.store.refreshAdvising();
    }
  }

  onStudentSelect(studentId: number | { value: number } | string | null | undefined): void {
    const id = typeof studentId === 'object' && studentId !== null ? (studentId as any).value : Number(studentId);
    if (!id || isNaN(id) || id <= 0 || this.store.studentId() === id) {
      if (id && !isNaN(id) && id < 0) {
        this.openAdmissionsDialog();
        this.onImportAdmissionAppChange(Math.abs(id));
      }
      return;
    }
    this.store.setStudentId(id);
  }

  onTermSelect(termId: number | { value: number } | string | null | undefined): void {
    const id = typeof termId === 'object' && termId !== null ? (termId as any).value : Number(termId);
    if (!id || isNaN(id) || id <= 0 || this.store.selectedTermId() === id) {
      return;
    }
    this.store.setSelectedTermId(id);
  }

  openSectionChooser(course: CourseEligibilityItemDto): void {
    const latest = this.store.advising()?.courses.find(c => c.courseId === course.courseId) || course;
    this.selectedCourse.set(latest);
    this.isSectionModalVisible.set(true);
  }

  closeSectionChooser(): void {
    this.isSectionModalVisible.set(false);
    this.selectedCourse.set(null);
  }

  enlistInSection(section: AvailableSectionOptionDto): void {
    this.store.enlistSection(
      section.sectionId,
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Enlistment Successful',
          detail: `Enlisted in section ${section.sectionCode}`
        });
        this.closeSectionChooser();
      },
      errorMsg => {
        this.messageService.add({
          severity: 'error',
          summary: 'Enlistment Blocked',
          detail: errorMsg
        });
      }
    );
  }

  formatScheduleSlots(summary: string | undefined): { day: string; timeRoom: string }[] {
    if (!summary || summary === 'Schedule TBA' || summary === 'No timetable assigned' || summary === 'No schedule') {
      return [{ day: 'Schedule', timeRoom: 'To Be Announced (TBA)' }];
    }

    const parts = summary.includes(';') || summary.includes('\n')
      ? summary.split(/;|\n/)
      : summary.split(/,\s*(?=[A-Za-z]{3,}\s+\d{1,2}:\d{2})/);
    const slots: { day: string; timeRoom: string }[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const match = trimmed.match(/^([A-Za-z,\s]+?)\s+(\d{1,2}:\d{2}.*)$/);
      if (match) {
        const daysRaw = match[1].trim();
        const timeRoom = match[2].trim();
        const days = daysRaw.split(',').map(d => d.trim());
        if (days.length > 1) {
          for (const d of days) {
            slots.push({ day: d, timeRoom });
          }
        } else {
          slots.push({ day: daysRaw, timeRoom });
        }
      } else {
        slots.push({ day: 'Slot', timeRoom: trimmed });
      }
    }

    return slots.length > 0 ? slots : [{ day: 'Schedule', timeRoom: summary }];
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ELIGIBLE': return 'success';
      case 'CURRENTLY_ENROLLED': return 'info';
      case 'LOCKED_PREREQUISITE': return 'danger';
      case 'ALREADY_PASSED': return 'secondary';
      default: return 'info';
    }
  }

  getOptionIcon(value: string): string {
    switch (value) {
      case 'ALL': return 'pi pi-list text-slate-600';
      case 'ELIGIBLE': return 'pi pi-check-circle text-emerald-600';
      case 'LOCKED_PREREQUISITE': return 'pi pi-lock text-rose-600';
      case 'ALREADY_PASSED': return 'pi pi-verified text-blue-600';
      default: return 'pi pi-filter';
    }
  }

  isAdmissionsControlInvalid(controlName: string): boolean {
    const control = this.admissionsForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched || this.isAdmissionsSubmitted());
  }

  getAdmissionsControlError(controlName: string): string {
    const control = this.admissionsForm.get(controlName);
    if (!control || !control.errors) return '';
    if (control.errors['required'] || control.errors['whitespace']) return 'This field is required.';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters required.`;
    if (control.errors['maxlength']) return `Maximum allowed length is ${control.errors['maxlength'].requiredLength} characters.`;
    if (control.errors['pattern']) {
      if (controlName === 'studentNumber') return 'Student ID format must be YYYY-XXXX (e.g. 2026-0001).';
      if (controlName === 'firstName' || controlName === 'lastName') return 'Name should only contain letters, spaces, hyphens, and apostrophes.';
      if (controlName === 'username') return 'Username can only contain alphanumeric characters, dots, underscores, and hyphens.';
      if (controlName === 'email') return 'Please enter a valid institutional email address.';
    }
    if (control.errors['email']) return 'Please enter a valid email address.';
    if (control.errors['min'] || control.errors['max']) return 'Year level must be between 1 and 4.';
    return 'Invalid value.';
  }

  isCreditingControlInvalid(controlName: string): boolean {
    const control = this.creditingForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched || this.isCreditingSubmitted());
  }

  getCreditingControlError(controlName: string): string {
    const control = this.creditingForm.get(controlName);
    if (!control || !control.errors) return '';
    if (control.errors['required'] || control.errors['whitespace']) return 'This field is required.';
    if (control.errors['maxlength']) return `Maximum allowed length is ${control.errors['maxlength'].requiredLength} characters.`;
    if (control.errors['pattern']) return 'Alphanumeric and standard code characters only.';
    if (control.errors['min'] || control.errors['max']) {
      if (controlName === 'externalNumericalGrade') return 'CHED CMO 25 requires a passing grade between 1.00 and 3.00.';
      if (controlName === 'creditsGranted') return 'Units must be between 1.0 and 6.0.';
    }
    return 'Invalid value.';
  }

  openAdmissionsDialog(): void {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const genStudentNumber = `2026-${randomSuffix}`;
    const defaultEmail = `${genStudentNumber.toLowerCase().replace('-', '')}@student.university.edu.ph`;

    this.isAdmissionsSubmitted.set(false);
    this.selectedAdmissionAppId.set(null);
    this.currentAdmitProgramId = null;
    this.admissionsForm.reset({
      studentNumber: genStudentNumber,
      firstName: '',
      lastName: '',
      username: genStudentNumber.toLowerCase().replace('-', '_'),
      email: defaultEmail,
      classification: 'INCOMING_FIRST_YEAR',
      yearLevel: 1,
      programId: null,
      curriculumId: null
    });

    this.curriculumOptions.set([]);

    const fetch$ = this.admissionApi.getUnclaimedApplications
      ? this.admissionApi.getUnclaimedApplications().pipe(
          catchError(() => this.admissionApi.getAllApplications().pipe(catchError(() => of([]))))
        )
      : this.admissionApi.getAllApplications().pipe(catchError(() => of([])));

    fetch$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: apps => this.rawApplications.set(apps || []),
      error: () => this.rawApplications.set([])
    });

    this.programService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: programs => {
        const options = (programs || []).map(p => ({ label: `${p.code} - ${p.name}`, value: p.id }));
        this.programOptions.set(options);
        if (options.length > 0 && !this.admissionsForm.get('programId')?.value) {
          this.onAdmitProgramChange(options[0].value);
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load degree programs.' });
      }
    });

    this.isAdmissionsDialogVisible.set(true);
  }

  onImportAdmissionAppChange(appId: number | { value: number } | null | undefined): void {
    const id = typeof appId === 'object' && appId !== null ? (appId as any).value : Number(appId);
    if (!id || isNaN(id) || id <= 0) return;
    this.selectedAdmissionAppId.set(id);

    const app = this.availableApplications().find(a => a.id === id) || this.rawApplications().find(a => a.id === id);
    if (!app) return;

    this.admissionsForm.patchValue({
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email || `${app.applicationNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.university.edu.ph`,
      classification: 'INCOMING_FIRST_YEAR',
      yearLevel: 1
    }, { emitEvent: false });

    if (app.targetProgramId) {
      this.onAdmitProgramChange(app.targetProgramId);
    }

    this.onAdmitNameOrIdChange();
  }

  closeAdmissionsDialog(): void {
    this.isAdmissionsDialogVisible.set(false);
    this.isAdmissionsSubmitted.set(false);
    this.currentAdmitProgramId = null;
  }

  onAdmitProgramChange(programId: number | { value: number } | null | undefined): void {
    const id = typeof programId === 'object' && programId !== null ? (programId as any).value : Number(programId);
    if (!id || isNaN(id) || id <= 0) return;

    if (this.currentAdmitProgramId === id) return;
    this.currentAdmitProgramId = id;

    this.admissionsForm.patchValue({ programId: id }, { emitEvent: false });

    this.curriculumApi.getCurriculaByProgram(id).pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(curricula => {
      const options = (curricula || []).map(c => ({
        label: `${c.code} (${c.status})`,
        value: c.id
      }));
      this.curriculumOptions.set(options);

      // Auto-select the active or first curriculum
      const activeOrFirst = curricula.find(c => c.status === 'ACTIVE') || (curricula.length > 0 ? curricula[0] : null);
      if (activeOrFirst) {
        this.admissionsForm.patchValue({ curriculumId: activeOrFirst.id });
      } else {
        this.admissionsForm.patchValue({ curriculumId: null });
      }
      this.cdr.markForCheck();
    });
  }

  private setupCurriculumPipeline(): void {
    this.programSelect$.pipe(
      filter((id): id is number => id != null && id > 0),
      distinctUntilChanged(),
      switchMap(programId =>
        this.curriculumApi.getCurriculaByProgram(programId).pipe(
          catchError(() => of([]))
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(curricula => {
      const options = (curricula || []).map(c => ({
        label: `${c.code} (${c.status})`,
        value: c.id
      }));
      this.curriculumOptions.set(options);
      if (options.length > 0) {
        this.admissionsForm.patchValue({ curriculumId: options[0].value }, { emitEvent: false });
      } else {
        this.admissionsForm.patchValue({ curriculumId: null }, { emitEvent: false });
      }
    });
  }

  onAdmitNameOrIdChange(): void {
    const studentNum = (this.admissionsForm.get('studentNumber')?.value || '').trim();
    const currentUsername = this.admissionsForm.get('username')?.value || '';

    if (!currentUsername || currentUsername.startsWith('2026')) {
      const newUsername = studentNum.toLowerCase().replace('-', '_');
      this.admissionsForm.patchValue({
        username: newUsername,
        email: `${newUsername}@student.university.edu.ph`
      }, { emitEvent: false });
    }
  }

  submitAdmitStudent(): void {
    this.isAdmissionsSubmitted.set(true);

    if (this.admissionsForm.invalid) {
      this.admissionsForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete Intake Information',
        detail: 'Please fix the highlighted validation errors before admitting student.'
      });
      return;
    }

    const formVal = this.admissionsForm.getRawValue();
    const studentNumber = formVal.studentNumber.trim();
    const programId = formVal.programId!;
    const curriculumId = formVal.curriculumId!;
    const username = formVal.username.trim() || studentNumber.toLowerCase().replace('-', '_');
    const email = formVal.email.trim();

    const admittedAppId = this.selectedAdmissionAppId();

    this.store.createStudent(
      {
        studentNumber,
        username,
        email,
        programId,
        curriculumId,
        classification: formVal.classification,
        yearLevel: formVal.yearLevel,
        admissionApplicationId: admittedAppId || undefined
      },
      (res) => {
        if (admittedAppId) {
          this.rawApplications.update(apps => apps.filter(a => a.id !== admittedAppId));
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Student Intake Successful',
          detail: `Admitted student ${res.studentNumber} (${res.username}) as ${res.classification}`
        });
        this.closeAdmissionsDialog();
      },
      (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Admission Failed',
          detail: err
        });
      }
    );
  }

  openCreditingDialog(): void {
    const studentId = this.store.studentId();
    if (!studentId || studentId <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'No Student Selected', detail: 'Please select an active student first.' });
      return;
    }

    const courses = this.availableCurriculumCourses();
    const defaultCourseId = courses.length > 0 ? courses[0].value : null;

    this.isCreditingSubmitted.set(false);
    this.selectedCreditingInternalId.set(defaultCourseId);

    this.creditingForm.reset({
      externalInstitution: 'Polytechnic State College',
      externalCourseCode: '',
      externalCourseTitle: '',
      internalCourseId: defaultCourseId,
      externalNumericalGrade: 1.50,
      creditsGranted: 3.00,
      remarks: 'Accredited under CMO 25 equivalency matrix'
    });

    this.isCreditingDialogVisible.set(true);
  }

  closeCreditingDialog(): void {
    this.isCreditingDialogVisible.set(false);
    this.isCreditingSubmitted.set(false);
  }

  onCreditingInternalCourseChange(courseId: number | { value: number } | null | undefined): void {
    const id = typeof courseId === 'object' && courseId !== null ? (courseId as any).value : Number(courseId);
    if (!id || isNaN(id) || id <= 0) return;
    this.creditingForm.patchValue({ internalCourseId: id });
    this.selectedCreditingInternalId.set(id);
  }

  submitCrediting(): void {
    const studentId = this.store.studentId();
    if (!studentId || studentId <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please select an active student.' });
      return;
    }

    this.isCreditingSubmitted.set(true);

    if (this.creditingForm.invalid) {
      this.creditingForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete Articulation Details',
        detail: 'Please complete all required fields conforming to CMO 25 passing grade benchmarks.'
      });
      return;
    }

    const val = this.creditingForm.getRawValue();

    this.store.creditTransfereeCourses(
      studentId,
      {
        items: [
          {
            externalInstitution: val.externalInstitution.trim(),
            externalCourseCode: val.externalCourseCode.trim(),
            externalCourseTitle: val.externalCourseTitle.trim(),
            internalCourseId: val.internalCourseId!,
            externalNumericalGrade: val.externalNumericalGrade,
            creditsGranted: val.creditsGranted,
            remarks: val.remarks.trim()
          }
        ]
      },
      (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Course Credited Successfully',
          detail: `Credited ${res.creditedCoursesCount} course(s). Total units credited: ${res.totalUnitsCredited}. Prerequisite gates unlocked!`
        });
        this.closeCreditingDialog();
      },
      (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Crediting Failed',
          detail: err
        });
      }
    );
  }

  requestOverloadApproval(): void {
    const advising = this.store.advising();
    if (!advising) return;
    const enrollment = this.store.enrollment();
    if (!enrollment) {
      this.messageService.add({ severity: 'warn', summary: 'Enrollment Record Missing', detail: 'Student must enlist in at least one section before requesting overload approval.' });
      return;
    }

    this.enrollmentApi.updateEnrollmentStatus(enrollment.enrollmentId, { isOverloadApproved: true }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Overload Approved',
          detail: 'Unit overload permit approved for graduating student. Unit ceiling expanded!'
        });
        this.store.loadStudentAdvising(advising.studentId, this.store.selectedTermId() || 1);
      },
      error: (err: any) => {
        this.messageService.add({ severity: 'error', summary: 'Overload Approval Failed', detail: err.error?.detail || 'Failed to approve overload.' });
      }
    });
  }
}