import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed, effect } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { Drawer } from 'primeng/drawer';
import { Skeleton } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SchedulingStore } from '../../state/scheduling.store';
import { CreateSectionRequest, ScheduleSlotDto, SectionDetailResponse } from '../../../../core/models/scheduling.model';
import { CurriculumApiService } from '../../../../core/service/curriculum/curriculum-api.service';
import { CourseItemDto } from '../../../../core/models/curriculum-designer.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

function timeOrderValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get('startTime')?.value;
    const end = group.get('endTime')?.value;
    if (!start || !end) return null;
    const [h1, m1] = String(start).split(':').map(Number);
    const [h2, m2] = String(end).split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;
    return (h2 * 60 + m2) > (h1 * 60 + m1) ? null : { invalidTimeOrder: true };
  };
}

function nonWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const isWhitespace = String(control.value).trim().length === 0;
    return !isWhitespace ? null : { whitespace: true };
  };
}

@Component({
  selector: 'app-section-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    MessageModule,
    InputTextModule,
    SelectModule,
    SelectButtonModule,
    CheckboxModule,
    ToastModule,
    ProgressBarModule,
    TooltipModule,
    Drawer,
    Skeleton
  ],
  templateUrl: './section-builder.component.html',
  styleUrls: ['./section-builder.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionBuilderComponent implements OnInit {
  readonly store = inject(SchedulingStore);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly curriculumApi = inject(CurriculumApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  // RBAC permissions
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly isChairperson = computed(() => this.auth.hasRole('CHAIRPERSON'));
  readonly canOverrideWorkload = computed(() => this.auth.hasAnyRole(['ADMIN', 'DEAN']));
  readonly canAddSchedule = computed(() => this.auth.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON']));

  // Modals visibility
  readonly isCreateModalVisible = signal<boolean>(false);
  readonly isSlotDetailsModalVisible = signal<boolean>(false);
  readonly isFacultyLoadModalVisible = signal<boolean>(false);
  readonly isEditMaxHoursModalVisible = signal<boolean>(false);

  // Override panel & settings state
  readonly isOverridePanelOpen = signal<boolean>(false);
  readonly overrideCustomUnits = signal<number | null>(null);
  readonly overrideReason = signal<string>('');
  readonly editMaxHoursValue = signal<number>(3.0);

  // Selection state
  readonly submitted = signal<boolean>(false);
  readonly availableCourses = signal<CourseItemDto[]>([]);
  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedSectionForDetails = signal<SectionDetailResponse | null>(null);
  readonly selectedFacultyId = signal<number | null>(null);

  // Real-time form slots cache for computations
  readonly formSlots = signal<any[]>([]);

  sectionForm!: FormGroup;

  readonly yearLevelOptions = [
    { label: '1st Year', value: 1 },
    { label: '2nd Year', value: 2 },
    { label: '3rd Year', value: 3 },
    { label: '4th Year', value: 4 }
  ];

  readonly sectionLetterOptions = [
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'C', value: 'C' },
    { label: 'D', value: 'D' },
    { label: 'E', value: 'E' },
    { label: 'F', value: 'F' },
    { label: 'G', value: 'G' },
    { label: 'H', value: 'H' }
  ];

  readonly daysOfWeek = [
    { label: 'Mon', value: 'MONDAY' },
    { label: 'Tue', value: 'TUESDAY' },
    { label: 'Wed', value: 'WEDNESDAY' },
    { label: 'Thu', value: 'THURSDAY' },
    { label: 'Fri', value: 'FRIDAY' },
    { label: 'Sat', value: 'SATURDAY' }
  ];

  readonly scheduleTypes = [
    { label: 'Lecture', value: 'LECTURE' },
    { label: 'Laboratory', value: 'LABORATORY' }
  ];

  readonly programOptions = computed(() => {
    const user = this.auth.currentUser();
    const progs = this.store.programs();
    if (this.isChairperson() && user?.programId) {
      return progs.filter(p => p.id === user.programId);
    }
    return progs;
  });

  constructor() {
    effect(() => {
      if (this.store.openModalRequest()) {
        this.store.openModalRequest.set(false);
        this.openCreateModal();
      }
    });
  }

  getDefaultProgramCode(): string {
    const user = this.auth.currentUser();
    if (this.isChairperson() && user?.programId) {
      const match = this.store.programs().find(p => p.id === user.programId);
      if (match) return match.code;
    }
    const selectedCurr = this.store.selectedCurriculum();
    if (selectedCurr && selectedCurr.code) {
      const parts = selectedCurr.code.split('-');
      if (parts.length > 0 && parts[0]) {
        const match = this.store.programs().find(p => p.code.toUpperCase() === parts[0].toUpperCase());
        if (match) return match.code;
      }
    }
    const programs = this.programOptions();
    if (programs.length > 0) {
      return programs[0].code;
    }
    return 'BSIT';
  }

  // --- CHED CMO No. 25 Live Duration Computations ---
  readonly selectedCourse = computed(() => {
    const id = this.selectedCourseId();
    if (!id) return null;
    return this.availableCourses().find(c => c.courseId === id) || null;
  });

  readonly requiredLecMinutes = computed(() => {
    const c = this.selectedCourse();
    return c ? (c.lectureUnits || 0) * 60 : 0;
  });

  readonly requiredLabMinutes = computed(() => {
    const c = this.selectedCourse();
    return c ? (c.labUnits || 0) * 180 : 0;
  });

  readonly requiredMinutes = computed(() => {
    return this.requiredLecMinutes() + this.requiredLabMinutes();
  });

  readonly allocatedLecMinutes = computed(() => {
    return this.formSlots()
      .filter(s => s?.scheduleType === 'LECTURE')
      .reduce((sum, s) => {
        const dayCount = (s?.daysOfWeek && s.daysOfWeek.length > 0) ? s.daysOfWeek.length : (s?.dayOfWeek ? 1 : 0);
        return sum + (this.slotDurationMinutes(s.startTime, s.endTime) * dayCount);
      }, 0);
  });

  readonly allocatedLabMinutes = computed(() => {
    return this.formSlots()
      .filter(s => s?.scheduleType === 'LABORATORY')
      .reduce((sum, s) => {
        const dayCount = (s?.daysOfWeek && s.daysOfWeek.length > 0) ? s.daysOfWeek.length : (s?.dayOfWeek ? 1 : 0);
        return sum + (this.slotDurationMinutes(s.startTime, s.endTime) * dayCount);
      }, 0);
  });

  readonly currentDurationMinutes = computed(() => {
    return this.allocatedLecMinutes() + this.allocatedLabMinutes();
  });

  readonly isLecDurationValid = computed(() => {
    const req = this.requiredLecMinutes();
    return req === 0 || this.allocatedLecMinutes() === req;
  });

  readonly isLabDurationValid = computed(() => {
    const req = this.requiredLabMinutes();
    return req === 0 || this.allocatedLabMinutes() === req;
  });

  readonly areSessionDurationsValid = computed(() => {
    const slots = this.formSlots();
    const maxAllowedMinutes = (this.store.maxHoursPerClass() || 3.0) * 60;
    for (const s of slots) {
      if (s?.startTime && s?.endTime) {
        if (this.slotDurationMinutes(s.startTime, s.endTime) > maxAllowedMinutes) {
          return false;
        }
      }
    }
    return true;
  });

  readonly isDurationValid = computed(() => {
    if (!this.selectedCourse()) return false;
    return this.isLecDurationValid() && this.isLabDurationValid() && this.currentDurationMinutes() > 0 && this.areSessionDurationsValid();
  });

  ngOnInit(): void {
    this.store.loadInitialData();
    this.initForm();
  }

  initForm(): void {
    this.submitted.set(false);
    const defaultProgramCode = this.getDefaultProgramCode();

    this.sectionForm = this.fb.group({
      termId: [this.store.selectedTermId(), Validators.required],
      curriculumId: [this.store.selectedCurriculumId(), Validators.required],
      courseId: [null, Validators.required],
      programCode: [defaultProgramCode, Validators.required],
      yearLevel: [1, Validators.required],
      sectionLetter: ['A', Validators.required],
      sectionCode: [`${defaultProgramCode}-1A`, [Validators.required, Validators.maxLength(30), nonWhitespaceValidator()]],
      maxCapacity: [40, [Validators.required, Validators.min(1), Validators.max(100)]],
      scheduleSlots: this.fb.array([])
    });

    this.selectedCourseId.set(null);
    this.addSlot(['MONDAY', 'WEDNESDAY']);

    if (this.isChairperson()) {
      this.sectionForm.get('programCode')?.disable();
    }

    const updateSectionCode = () => {
      const pCode = this.sectionForm.get('programCode')?.value || '';
      const yLevel = this.sectionForm.get('yearLevel')?.value || '';
      const sLetter = this.sectionForm.get('sectionLetter')?.value || '';
      if (pCode && yLevel && sLetter) {
        const derivedCode = `${pCode}-${yLevel}${sLetter}`;
        this.sectionForm.get('sectionCode')?.setValue(derivedCode, { emitEvent: false });
      }
    };

    this.sectionForm.get('programCode')?.valueChanges.subscribe(updateSectionCode);
    this.sectionForm.get('yearLevel')?.valueChanges.subscribe(updateSectionCode);
    this.sectionForm.get('sectionLetter')?.valueChanges.subscribe(updateSectionCode);

    this.sectionForm.valueChanges.subscribe(val => {
      this.formSlots.set(val?.scheduleSlots || []);
      this.cdr.markForCheck();
    });

    this.sectionForm.get('courseId')?.valueChanges.subscribe(id => {
      this.selectedCourseId.set(id ? Number(id) : null);
      this.formSlots.set(this.sectionForm.value.scheduleSlots || []);
      this.cdr.markForCheck();
    });
  }

  get scheduleSlotsArray(): FormArray {
    return this.sectionForm.get('scheduleSlots') as FormArray;
  }

  addSlot(initialDays: string[] = ['MONDAY']): void {
    const slotGroup = this.fb.group({
      roomId: [null, Validators.required],
      instructorUserId: [null],
      dayOfWeek: [initialDays[0] || 'MONDAY', Validators.required],
      daysOfWeek: [initialDays, [Validators.required]],
      startTime: ['08:00', Validators.required],
      endTime: ['10:00', Validators.required],
      scheduleType: ['LECTURE', Validators.required]
    }, { validators: [timeOrderValidator()] });

    this.scheduleSlotsArray.push(slotGroup);
    this.formSlots.set(this.sectionForm?.value?.scheduleSlots || []);
    this.cdr.markForCheck();
  }

  removeSlot(index: number): void {
    if (this.scheduleSlotsArray.length > 1) {
      this.scheduleSlotsArray.removeAt(index);
      this.formSlots.set(this.sectionForm?.value?.scheduleSlots || []);
      this.cdr.markForCheck();
    }
  }

  isDaySelected(slotIndex: number, day: string): boolean {
    const slot = this.scheduleSlotsArray.at(slotIndex);
    const days: string[] = slot?.get('daysOfWeek')?.value || [];
    return days.includes(day);
  }

  isDayChecked(slotIndex: number, day: string): boolean {
    return this.isDaySelected(slotIndex, day);
  }

  onDayCheckboxChange(slotIndex: number, day?: string, isChecked?: boolean): void {
    const slot = this.scheduleSlotsArray.at(slotIndex);
    if (!slot) return;
    let days: string[] = [...(slot.get('daysOfWeek')?.value || [])];

    if (day && isChecked !== undefined) {
      if (isChecked && !days.includes(day)) {
        days.push(day);
      } else if (!isChecked && days.includes(day)) {
        if (days.length <= 1) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Meeting Day Required',
            detail: 'At least one meeting day must be selected for the schedule slot.'
          });
          return;
        }
        days = days.filter(d => d !== day);
      }
      slot.get('daysOfWeek')?.setValue([...days]);
    } else if (days.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Meeting Day Required',
        detail: 'At least one meeting day must be selected for the schedule slot.'
      });
      const fallbackDay = day || 'MONDAY';
      days = [fallbackDay];
      slot.get('daysOfWeek')?.setValue([...days]);
    }

    slot.get('dayOfWeek')?.setValue(days[0] || 'MONDAY');
    slot.get('daysOfWeek')?.markAsDirty();
    slot.get('daysOfWeek')?.markAsTouched();

    this.formSlots.set(this.sectionForm?.value?.scheduleSlots || []);
    this.cdr.markForCheck();
  }

  toggleSlotDay(slotIndex: number, day: string): void {
    const currentlySelected = this.isDaySelected(slotIndex, day);
    const slot = this.scheduleSlotsArray.at(slotIndex);
    if (!slot) return;
    const days: string[] = [...(slot.get('daysOfWeek')?.value || [])];
    const idx = days.indexOf(day);
    if (currentlySelected && idx > -1) {
      days.splice(idx, 1);
    } else if (!currentlySelected && idx === -1) {
      days.push(day);
    }
    slot.get('daysOfWeek')?.setValue([...days]);
    this.onDayCheckboxChange(slotIndex, day);
  }

  applyDayPreset(slotIndex: number, preset: 'MW' | 'TTH' | 'MWF' | 'SAT'): void {
    const slot = this.scheduleSlotsArray.at(slotIndex);
    if (!slot) return;
    let days: string[] = [];
    if (preset === 'MW') days = ['MONDAY', 'WEDNESDAY'];
    else if (preset === 'TTH') days = ['TUESDAY', 'THURSDAY'];
    else if (preset === 'MWF') days = ['MONDAY', 'WEDNESDAY', 'FRIDAY'];
    else if (preset === 'SAT') days = ['SATURDAY'];

    slot.get('daysOfWeek')?.setValue([...days]);
    slot.get('dayOfWeek')?.setValue(days[0] || 'MONDAY');
    slot.get('daysOfWeek')?.markAsDirty();
    slot.get('daysOfWeek')?.markAsTouched();

    this.formSlots.set(this.sectionForm?.value?.scheduleSlots || []);
    this.cdr.markForCheck();
  }

  getActivePreset(slotIndex: number): string {
    const slot = this.scheduleSlotsArray.at(slotIndex);
    const rawDays: string[] = slot?.get('daysOfWeek')?.value || [];
    const days: string[] = [...rawDays].sort();

    const mw = ['MONDAY', 'WEDNESDAY'].sort();
    const tth = ['THURSDAY', 'TUESDAY'].sort();
    const mwf = ['FRIDAY', 'MONDAY', 'WEDNESDAY'].sort();
    const sat = ['SATURDAY'];

    if (days.length === mw.length && days.every((val, index) => val === mw[index])) return 'MW';
    if (days.length === tth.length && days.every((val, index) => val === tth[index])) return 'TTH';
    if (days.length === mwf.length && days.every((val, index) => val === mwf[index])) return 'MWF';
    if (days.length === sat.length && days.every((val, index) => val === sat[index])) return 'SAT';
    return 'CUSTOM';
  }

  getSlotDurationError(index: number): string | null {
    const slots = this.formSlots();
    const s = slots[index];
    if (!s || !s.startTime || !s.endTime) return null;
    const durationMinutes = this.slotDurationMinutes(s.startTime, s.endTime);
    const maxAllowedMinutes = (this.store.maxHoursPerClass() || 3.0) * 60;
    if (durationMinutes > maxAllowedMinutes) {
      return `Session duration (${(durationMinutes / 60).toFixed(1)} hrs) exceeds term maximum allowed duration of ${this.store.maxHoursPerClass()} hrs/session.`;
    }
    return null;
  }

  onCourseSelect(courseId: number | { value: number } | string | null): void {
    const id = (courseId && typeof courseId === 'object' && 'value' in courseId)
      ? courseId.value
      : (courseId !== null && courseId !== undefined ? Number(courseId) : null);
    this.selectedCourseId.set(id);
    if (this.sectionForm.get('courseId')?.value !== id) {
      this.sectionForm.get('courseId')?.setValue(id);
    }
    this.formSlots.set(this.sectionForm.value.scheduleSlots || []);
    this.cdr.markForCheck();
  }

  onCourseChange(courseId: number | { value: number } | string | null): void {
    this.onCourseSelect(courseId);
  }

  openCreateModal(): void {
    if (!this.store.isCurriculumActive()) {
      const activeCurr = this.store.curricula().find(c => c.status === 'ACTIVE');
      if (activeCurr) {
        this.store.selectedCurriculumId.set(activeCurr.id);
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Gate 1 Notice',
          detail: 'No ACTIVE curriculum selected. Please select an active curriculum to schedule class sections.'
        });
      }
    }

    this.initForm();
    this.loadAvailableCourses();
    this.isCreateModalVisible.set(true);
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.isCreateModalVisible.set(false);
    this.initForm();
    this.cdr.markForCheck();
  }

  loadAvailableCourses(): void {
    const currId = this.store.selectedCurriculumId();
    if (currId) {
      this.curriculumApi.getDesignerView(currId).subscribe({
        next: view => {
          const courses: CourseItemDto[] = [];
          if (view.yearBlocks) {
            view.yearBlocks.forEach(yb => {
              if (yb.semesters) {
                yb.semesters.forEach(sb => {
                  if (sb.courses) {
                    courses.push(...sb.courses);
                  }
                });
              }
            });
          }
          this.availableCourses.set(courses);
          this.cdr.markForCheck();
        },
        error: () => {
          this.availableCourses.set([]);
          this.cdr.markForCheck();
        }
      });
    }
  }

  onTermSelect(termId: number | { value: number } | string | null): void {
    const id = (termId && typeof termId === 'object' && 'value' in termId)
      ? termId.value
      : (termId !== null && termId !== undefined ? Number(termId) : null);
    if (id !== null) {
      this.store.selectedTermId.set(id);
      this.store.loadSections(id);
      this.cdr.markForCheck();
    }
  }

  onCurriculumSelect(currId: number | { value: number } | string | null): void {
    const id = (currId && typeof currId === 'object' && 'value' in currId)
      ? currId.value
      : (currId !== null && currId !== undefined ? Number(currId) : null);
    if (id !== null) {
      this.store.selectedCurriculumId.set(id);
      this.loadAvailableCourses();
      this.cdr.markForCheck();
    }
  }

  // --- Client-Side Real-Time Collision Pre-Checks ---
  getSlotRoomCollision(index: number): string | null {
    const slots = this.formSlots();
    const s = slots[index];
    if (!s || !s.roomId || !s.startTime || !s.endTime) return null;
    const days: string[] = (s.daysOfWeek && s.daysOfWeek.length > 0) ? s.daysOfWeek : [s.dayOfWeek];

    for (const day of days) {
      // 1. External collision with existing sections in term
      const ext = this.store.checkRoomCollision(s.roomId, day, s.startTime, s.endTime);
      if (ext.hasCollision) return ext.message || `Room conflict on ${day}.`;

      // 2. Internal collision within this form's slots
      for (let i = 0; i < slots.length; i++) {
        if (i !== index) {
          const other = slots[i];
          const otherDays: string[] = (other.daysOfWeek && other.daysOfWeek.length > 0) ? other.daysOfWeek : [other.dayOfWeek];
          if (other.roomId === s.roomId && otherDays.some(d => d.toUpperCase() === day.toUpperCase())) {
            if (this.isTimeOverlapping(s.startTime, s.endTime, other.startTime, other.endTime)) {
              return `Internal conflict: Room is already booked for Slot #${i + 1} on ${day} at this time.`;
            }
          }
        }
      }
    }
    return null;
  }

  getSlotFacultyCollision(index: number): string | null {
    const slots = this.formSlots();
    const s = slots[index];
    if (!s || !s.instructorUserId || !s.startTime || !s.endTime) return null;
    const days: string[] = (s.daysOfWeek && s.daysOfWeek.length > 0) ? s.daysOfWeek : [s.dayOfWeek];

    for (const day of days) {
      // 1. External collision with existing sections in term
      const ext = this.store.checkFacultyCollision(s.instructorUserId, day, s.startTime, s.endTime);
      if (ext.hasCollision) return ext.message || `Faculty conflict on ${day}.`;

      // 2. Internal collision within this form's slots
      for (let i = 0; i < slots.length; i++) {
        if (i !== index) {
          const other = slots[i];
          const otherDays: string[] = (other.daysOfWeek && other.daysOfWeek.length > 0) ? other.daysOfWeek : [other.dayOfWeek];
          if (other.instructorUserId === s.instructorUserId && otherDays.some(d => d.toUpperCase() === day.toUpperCase())) {
            if (this.isTimeOverlapping(s.startTime, s.endTime, other.startTime, other.endTime)) {
              return `Internal conflict: Faculty is already assigned to Slot #${i + 1} on ${day} at this time.`;
            }
          }
        }
      }
    }
    return null;
  }

  private isTimeOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
    if (!start1 || !end1 || !start2 || !end2) return false;
    const [s1h, s1m] = start1.split(':').map(Number);
    const [e1h, e1m] = end1.split(':').map(Number);
    const [s2h, s2m] = start2.split(':').map(Number);
    const [e2h, e2m] = end2.split(':').map(Number);
    const mStart1 = s1h * 60 + s1m;
    const mEnd1 = e1h * 60 + e1m;
    const mStart2 = s2h * 60 + s2m;
    const mEnd2 = e2h * 60 + e2m;
    return mStart1 < mEnd2 && mStart2 < mEnd1;
  }

  slotDurationMinutes(start: string, end: string): number {
    if (!start || !end) return 0;
    const [h1, m1] = String(start).split(':').map(Number);
    const [h2, m2] = String(end).split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    const mins1 = h1 * 60 + m1;
    const mins2 = h2 * 60 + m2;
    return mins2 > mins1 ? mins2 - mins1 : 0;
  }

  private formatTimeValue(val: string | Date | null | undefined): string {
    if (!val) return '08:00:00';
    if (val instanceof Date) {
      const hours = String(val.getHours()).padStart(2, '0');
      const mins = String(val.getMinutes()).padStart(2, '0');
      const secs = String(val.getSeconds()).padStart(2, '0');
      return `${hours}:${mins}:${secs}`;
    }
    if (typeof val === 'string') {
      const parts = val.split(':');
      if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
      if (parts.length === 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }
    return String(val);
  }

  isControlInvalid(name: string): boolean {
    const control = this.sectionForm.get(name);
    return !!control && control.invalid && (control.dirty || control.touched || this.submitted());
  }

  isControlTouchedOrDirty(name: string): boolean {
    const control = this.sectionForm.get(name);
    return !!control && (control.dirty || control.touched || this.submitted());
  }

  submitSection(): void {
    this.submitted.set(true);

    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete Form',
        detail: 'Please fill in all required fields and resolve schedule slot errors.'
      });
      return;
    }

    if (!this.isDurationValid()) {
      this.messageService.add({
        severity: 'error',
        summary: 'CHED Duration Mismatch',
        detail: `Allocated duration (${this.currentDurationMinutes()}m) does not match CHED CMO No. 25 required duration (${this.requiredMinutes()}m).`
      });
      return;
    }

    const formValue = this.sectionForm.getRawValue();
    const request: CreateSectionRequest = {
      termId: Number(formValue.termId || this.store.selectedTermId()),
      curriculumId: Number(formValue.curriculumId || this.store.selectedCurriculumId()),
      courseId: Number(formValue.courseId),
      sectionCode: String(formValue.sectionCode).trim(),
      maxCapacity: Number(formValue.maxCapacity),
      scheduleSlots: (formValue.scheduleSlots || []).map((s: { roomId?: number; instructorUserId?: number; dayOfWeek?: string; daysOfWeek?: string[]; startTime?: string | Date; endTime?: string | Date; scheduleType?: string }) => {
        const days: string[] = (s.daysOfWeek && s.daysOfWeek.length > 0) ? s.daysOfWeek : [s.dayOfWeek || 'MONDAY'];
        return {
          roomId: Number(s.roomId),
          instructorUserId: s.instructorUserId ? Number(s.instructorUserId) : null,
          dayOfWeek: days[0].toUpperCase(),
          daysOfWeek: days.map((d: string) => d.toUpperCase()),
          startTime: this.formatTimeValue(s.startTime),
          endTime: this.formatTimeValue(s.endTime),
          scheduleType: String(s.scheduleType || 'LECTURE').toUpperCase()
        };
      })
    };

    this.store.createSection(
      request,
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Section Created',
          detail: `Class section ${request.sectionCode} has been scheduled successfully.`
        });
        this.closeCreateModal();
        this.cdr.markForCheck();
      },
      errorMsg => {
        this.messageService.add({
          severity: 'error',
          summary: 'Scheduling Error',
          detail: errorMsg
        });
        this.cdr.markForCheck();
      }
    );
  }

  // --- Slot Details Modal Methods ---
  openSlotDetailsModal(section: SectionDetailResponse): void {
    this.selectedSectionForDetails.set(section);
    this.isSlotDetailsModalVisible.set(true);
    this.cdr.markForCheck();
  }

  closeSlotDetailsModal(): void {
    this.isSlotDetailsModalVisible.set(false);
    this.selectedSectionForDetails.set(null);
    this.cdr.markForCheck();
  }

  // --- Faculty Load Modal & Admin Override Methods ---
  openFacultyLoadModal(facultyId?: number | null): void {
    const termId = this.store.selectedTermId() || this.store.terms()[0]?.id || null;
    const targetId = facultyId || this.store.instructors()[0]?.id || null;
    this.selectedFacultyId.set(targetId);
    this.isOverridePanelOpen.set(false);

    if (termId && targetId) {
      this.store.loadFacultyWorkload(termId, targetId);
    }
    this.isFacultyLoadModalVisible.set(true);
    this.cdr.markForCheck();
  }

  closeFacultyLoadModal(): void {
    this.isFacultyLoadModalVisible.set(false);
    this.isOverridePanelOpen.set(false);
    this.cdr.markForCheck();
  }

  onFacultyWorkloadSelect(facultyId: number | { value: number } | string | null): void {
    const id = (facultyId && typeof facultyId === 'object' && 'value' in facultyId)
      ? facultyId.value
      : (facultyId !== null && facultyId !== undefined ? Number(facultyId) : null);
    this.selectedFacultyId.set(id);
    this.isOverridePanelOpen.set(false);
    const termId = this.store.selectedTermId();
    if (termId && id) {
      this.store.loadFacultyWorkload(termId, id);
    }
    this.cdr.markForCheck();
  }

  toggleOverridePanel(): void {
    const current = this.isOverridePanelOpen();
    this.isOverridePanelOpen.set(!current);
    if (!current && this.store.selectedFacultyWorkload()) {
      const wl = this.store.selectedFacultyWorkload()!;
      this.overrideCustomUnits.set(wl.customMaxLoadUnits ?? wl.effectiveMaxUnits ?? 21.0);
      this.overrideReason.set(wl.overrideReason ?? '');
    }
    this.cdr.markForCheck();
  }

  applyWorkloadOverride(): void {
    const termId = this.store.selectedTermId();
    const facultyId = this.selectedFacultyId();
    const customUnits = this.overrideCustomUnits();
    const reason = this.overrideReason().trim();

    if (!termId || !facultyId) return;
    if (customUnits === null || customUnits === undefined || isNaN(customUnits)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Limit',
        detail: 'Please provide a valid custom unit limit (0.0 to 36.0 units).'
      });
      return;
    }
    if (!reason) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Reason Required',
        detail: 'Please provide a clear justification for this administrative override.'
      });
      return;
    }

    this.store.updateFacultyWorkloadLimit(
      facultyId,
      termId,
      customUnits,
      reason,
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Override Saved',
          detail: `Faculty load cap overridden to ${customUnits} units successfully.`
        });
        this.isOverridePanelOpen.set(false);
        this.cdr.markForCheck();
      },
      err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Override Failed',
          detail: err
        });
        this.cdr.markForCheck();
      }
    );
  }

  openEditMaxHoursModal(): void {
    this.editMaxHoursValue.set(this.store.maxHoursPerClass());
    this.isEditMaxHoursModalVisible.set(true);
    this.cdr.markForCheck();
  }

  closeEditMaxHoursModal(): void {
    this.isEditMaxHoursModalVisible.set(false);
    this.cdr.markForCheck();
  }

  saveMaxHoursPerClass(): void {
    const termId = this.store.selectedTermId();
    const maxHours = this.editMaxHoursValue();
    if (!termId || !maxHours || maxHours <= 0) return;

    this.store.updateTermMaxHoursPerClass(
      termId,
      maxHours,
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Term Limit Updated',
          detail: `Max class session duration updated to ${maxHours} hrs.`
        });
        this.closeEditMaxHoursModal();
        this.cdr.markForCheck();
      },
      err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: err
        });
        this.cdr.markForCheck();
      }
    );
  }

  approveOverload(): void {
    const termId = this.store.selectedTermId();
    const facultyId = this.selectedFacultyId();
    if (!termId || !facultyId) return;

    this.confirmationService.confirm({
      key: 'schedulingConfirmDialog',
      header: 'Approve Faculty Overload',
      message: 'Are you sure you want to approve overload contact hours for this faculty member?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.store.approveFacultyOverload(
          termId,
          facultyId,
          () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Overload Approved',
              detail: 'Faculty overload units have been approved successfully.'
            });
            this.cdr.markForCheck();
          },
          err => {
            this.messageService.add({
              severity: 'error',
              summary: 'Approval Failed',
              detail: err
            });
            this.cdr.markForCheck();
          }
        );
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'OPEN': return 'success';
      case 'PLANNED': return 'info';
      case 'CLOSED': return 'danger';
      case 'CANCELLED': return 'secondary';
      default: return 'info';
    }
  }
}
