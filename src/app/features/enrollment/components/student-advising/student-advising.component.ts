import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
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
import { EnrollmentStore } from '../../state/enrollment.store';
import { CourseEligibilityItemDto, AvailableSectionOptionDto } from '../../../../core/models/enrollment.model';

import { Skeleton } from 'primeng/skeleton';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgramService } from '../../../../core/services/institution.service';
import { CurriculumApiService } from '../../../../core/service/curriculum/curriculum-api.service';

import { AuthService } from '../../../../core/service/authentication/auth-service';

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

  readonly canAdmitStudent = computed(() => this.authService.hasAnyRole(['ADMIN', 'REGISTRAR']));
  readonly canCreditTransferee = computed(() => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'REGISTRAR']));

  readonly isSectionModalVisible = signal<boolean>(false);
  readonly selectedCourse = signal<CourseEligibilityItemDto | null>(null);
  readonly searchFilter = signal<string>('');
  readonly statusFilter = signal<string>('ELIGIBLE');
  readonly yearFilter = signal<string>('ALL');
  readonly semesterFilter = signal<string>('ALL');

  // Admissions Intake Reactive Form & State
  readonly isAdmissionsDialogVisible = signal<boolean>(false);
  readonly isAdmissionsSubmitted = signal<boolean>(false);
  readonly programOptions = signal<{ label: string; value: number }[]>([]);
  readonly curriculumOptions = signal<{ label: string; value: number }[]>([]);

  readonly admissionsForm = new FormGroup({
    studentNumber: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{4}-[0-9]{4,6}$/)]
    }),
    firstName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, (c) => (c.value || '').trim() ? null : { whitespace: true }]
    }),
    lastName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, (c) => (c.value || '').trim() ? null : { whitespace: true }]
    }),
    username: new FormControl<string>('', { nonNullable: true }),
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
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

  // Backward-compatibility signal accessors for existing tests
  readonly admitStudentNumber = computed(() => this.admissionsForm.get('studentNumber')?.value || '');
  readonly admitClassification = computed(() => this.admissionsForm.get('classification')?.value || 'INCOMING_FIRST_YEAR');
  readonly admitYearLevel = computed(() => this.admissionsForm.get('yearLevel')?.value || 1);

  // Transferee Crediting Reactive Form & State
  readonly isCreditingDialogVisible = signal<boolean>(false);
  readonly isCreditingSubmitted = signal<boolean>(false);
  readonly selectedCreditingInternalId = signal<number | null>(null);

  readonly creditingForm = new FormGroup({
    externalInstitution: new FormControl<string>('Polytechnic State College', {
      nonNullable: true,
      validators: [Validators.required, (c) => (c.value || '').trim() ? null : { whitespace: true }]
    }),
    externalCourseCode: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, (c) => (c.value || '').trim() ? null : { whitespace: true }]
    }),
    externalCourseTitle: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, (c) => (c.value || '').trim() ? null : { whitespace: true }]
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
      nonNullable: true
    })
  });

  // Backward-compatibility signal accessors for crediting
  readonly creditingExternalSchool = computed(() => this.creditingForm.get('externalInstitution')?.value || '');
  readonly creditingGrade = computed(() => this.creditingForm.get('externalNumericalGrade')?.value ?? 1.50);
  readonly creditingUnits = computed(() => this.creditingForm.get('creditsGranted')?.value ?? 3.00);

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

  // Live Equivalency Preview & Prerequisite Impact
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
    { label: '1st Year', value: '1' },
    { label: '2nd Year', value: '2' },
    { label: '3rd Year', value: '3' },
    { label: '4th Year', value: '4' }
  ];

  readonly semesterOptions = [
    { label: 'All Semesters', value: 'ALL' },
    { label: '1st Semester', value: '1ST_SEM' },
    { label: '2nd Semester', value: '2ND_SEM' },
    { label: 'Summer Term', value: 'SUMMER' }
  ];

  ngOnInit(): void {
    this.store.loadInitialData();
    if (this.store.studentId() && this.store.selectedTermId()) {
      this.store.refreshAdvising();
    }
  }

  onStudentSelect(studentId: number | { value: number } | string | null): void {
    const id = typeof studentId === 'object' ? studentId?.value : Number(studentId);
    if (id) {
      this.store.setStudentId(id);
    }
  }

  onTermSelect(termId: number | { value: number } | string | null): void {
    const id = typeof termId === 'object' ? termId?.value : Number(termId);
    if (id) {
      this.store.setSelectedTermId(id);
    }
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
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['whitespace']) return 'Field cannot be empty whitespace.';
    if (control.errors['pattern']) return 'Format must match YYYY-XXXX (e.g. 2026-0001).';
    if (control.errors['email']) return 'Please enter a valid institutional email address.';
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
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['whitespace']) return 'Field cannot be empty whitespace.';
    if (control.errors['min'] || control.errors['max']) {
      if (controlName === 'externalNumericalGrade') return 'CMO 25 credit transfer requires passing mark between 1.00 and 3.00.';
      if (controlName === 'creditsGranted') return 'Units must be between 1.0 and 6.0.';
    }
    return 'Invalid value.';
  }

  openAdmissionsDialog(): void {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const genStudentNumber = `2026-${randomSuffix}`;
    const defaultEmail = `${genStudentNumber.toLowerCase().replace('-', '')}@student.university.edu.ph`;

    this.isAdmissionsSubmitted.set(false);
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

    this.programService.getAll().subscribe({
      next: programs => {
        const options = (programs || []).map(p => ({ label: `${p.code} - ${p.name}`, value: p.id }));
        this.programOptions.set(options);
        if (options.length > 0) {
          this.onAdmitProgramChange(options[0].value);
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load degree programs.' });
      }
    });

    this.isAdmissionsDialogVisible.set(true);
  }

  closeAdmissionsDialog(): void {
    this.isAdmissionsDialogVisible.set(false);
    this.isAdmissionsSubmitted.set(false);
  }

  onAdmitProgramChange(programId: number | { value: number } | null): void {
    const id = typeof programId === 'object' && programId !== null ? programId.value : Number(programId);
    if (!id) return;
    this.admissionsForm.patchValue({ programId: id });

    this.curriculumApi.getCurriculaByProgram(id).subscribe({
      next: curricula => {
        const options = (curricula || []).map(c => ({
          label: `${c.code} (${c.status})`,
          value: c.id
        }));
        this.curriculumOptions.set(options);
        if (options.length > 0) {
          this.admissionsForm.patchValue({ curriculumId: options[0].value });
        } else {
          this.admissionsForm.patchValue({ curriculumId: null });
        }
      },
      error: () => {
        this.curriculumOptions.set([]);
        this.admissionsForm.patchValue({ curriculumId: null });
      }
    });
  }

  onAdmitNameOrIdChange(): void {
    const studentNum = (this.admissionsForm.get('studentNumber')?.value || '').trim();
    const currentUsername = this.admissionsForm.get('username')?.value || '';
    const currentEmail = this.admissionsForm.get('email')?.value || '';

    // Auto-populate username & email if left default or blank
    if (!currentUsername || currentUsername.startsWith('2026')) {
      const newUsername = studentNum.toLowerCase().replace('-', '_');
      this.admissionsForm.patchValue({
        username: newUsername,
        email: `${newUsername}@student.university.edu.ph`
      });
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

    this.store.createStudent(
      {
        studentNumber,
        username,
        email,
        programId,
        curriculumId,
        classification: formVal.classification,
        yearLevel: formVal.yearLevel
      },
      (res) => {
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
    if (!studentId) {
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

  onCreditingInternalCourseChange(courseId: number | { value: number } | null): void {
    const id = typeof courseId === 'object' && courseId !== null ? courseId.value : Number(courseId);
    this.creditingForm.patchValue({ internalCourseId: id });
    this.selectedCreditingInternalId.set(id);
  }

  submitCrediting(): void {
    const studentId = this.store.studentId();
    if (!studentId) {
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
}
