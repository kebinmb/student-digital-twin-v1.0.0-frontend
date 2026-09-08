// File: src/app/features/scheduling/state/scheduling.store.ts

import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SchedulingApiService } from '../../../core/service/scheduling/scheduling-api.service';
import { ProgramService, TermService } from '../../../core/services/institution.service';
import { Program } from '../../../core/models/institution.model';
import { CurriculumApiService } from '../../../core/service/curriculum/curriculum-api.service';
import {
  CreateSectionRequest,
  FacultyLoadSummaryResponse,
  InstructorOptionDto,
  RoomResponse,
  SchedulingTermDto,
  SectionDetailResponse
} from '../../../core/models/scheduling.model';
import { CurriculumLookupOption } from '../../../core/models/curriculum-designer.model';
import { EnrollmentStore } from '../../enrollment/state/enrollment.store';
import { catchError, finalize, forkJoin, map, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SchedulingStore {
  private readonly schedulingApi = inject(SchedulingApiService);
  private readonly termService = inject(TermService);
  private readonly curriculumApi = inject(CurriculumApiService);
  private readonly programService = inject(ProgramService);
  private readonly enrollmentStore = inject(EnrollmentStore);
  private readonly destroyRef = inject(DestroyRef);

  // Signals
  readonly terms = signal<SchedulingTermDto[]>([]);
  readonly curricula = signal<CurriculumLookupOption[]>([]);
  readonly rooms = signal<RoomResponse[]>([]);
  readonly instructors = signal<InstructorOptionDto[]>([]);
  readonly programs = signal<Program[]>([]);
  readonly sections = signal<SectionDetailResponse[]>([]);

  readonly selectedTermId = signal<number | null>(null);
  readonly selectedCurriculumId = signal<number | null>(null);
  readonly selectedFacultyWorkload = signal<FacultyLoadSummaryResponse | null>(null);

  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isWorkloadLoading = signal<boolean>(false);
  readonly isApprovingOverload = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly openModalRequest = signal<boolean>(false);

  // Computed
  readonly selectedTerm = computed(() => {
    const id = this.selectedTermId();
    return this.terms().find(t => t.id === id) || null;
  });

  readonly maxHoursPerClass = computed(() => {
    return this.selectedTerm()?.maxHoursPerClass ?? 3.0;
  });

  readonly selectedCurriculum = computed(() => {
    const id = this.selectedCurriculumId();
    return this.curricula().find(c => c.id === id) || null;
  });

  readonly isCurriculumActive = computed(() => {
    const c = this.selectedCurriculum();
    return c ? c.status === 'ACTIVE' : false;
  });

  readonly totalSections = computed(() => this.sections().length);

  loadInitialData(): void {
    this.isLoading.set(true);

    const terms$ = this.schedulingApi.getSchedulingTerms().pipe(
      catchError(() => {
        return this.termService.getAll().pipe(
          map((rawTerms): SchedulingTermDto[] => {
            return rawTerms.map(t => ({
              id: t.id,
              academicYearId: t.academicYearId || 0,
              academicYearCode: t.academicYearCode || 'AY',
              termType: t.termType,
              termName: t.academicYearCode ? `${t.academicYearCode} - ${t.termType}` : `Term ${t.id}`,
              isCurrent: t.isCurrent || false,
              isActive: t.isActive || false,
              isEnrollmentOpen: t.enrollmentOpen || false
            }));
          }),
          catchError(() => of([]))
        );
      })
    );

    const curricula$ = this.curriculumApi.getCurriculumLookupOptions().pipe(
      catchError(() => of([]))
    );

    const rooms$ = this.schedulingApi.getAllRooms().pipe(
      catchError(() => of([]))
    );

    const instructors$ = this.schedulingApi.getAvailableInstructors().pipe(
      catchError(() => of([]))
    );

    const programs$ = this.programService.getAll().pipe(
      catchError(() => of([]))
    );

    forkJoin({
      terms: terms$,
      curricula: curricula$,
      rooms: rooms$,
      instructors: instructors$,
      programs: programs$
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(({ terms, curricula, rooms, instructors, programs }) => {
        this.terms.set(terms);
        this.curricula.set(curricula);
        this.rooms.set(rooms);
        this.instructors.set(instructors);
        this.programs.set(programs);

        if (terms.length > 0 && !this.selectedTermId()) {
          const activeTerm = terms.find(t => t.isActive) || terms.find(t => t.isCurrent) || terms[0];
          if (activeTerm) {
            this.selectedTermId.set(activeTerm.id);
            this.loadSections(activeTerm.id);
          }
        }

        if (curricula.length > 0 && !this.selectedCurriculumId()) {
          const activeCurr = curricula.find(c => c.status === 'ACTIVE') || curricula[0];
          if (activeCurr) {
            this.selectedCurriculumId.set(activeCurr.id);
          }
        }
      }),
      catchError(err => {
        this.errorMessage.set('Failed to load initial scheduling dataset.');
        return of(null);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  loadSections(termId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.schedulingApi.getSectionsByTerm(termId).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(sections => this.sections.set(sections)),
      catchError(err => {
        this.errorMessage.set(err.error?.detail || 'Failed to load class sections.');
        return of([]);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  createSection(request: CreateSectionRequest, onSuccess?: () => void, onError?: (msg: string) => void): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.schedulingApi.createSection(request).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(newSection => {
        this.sections.update(list => [...list, newSection]);
        this.enrollmentStore.refreshAdvising();
        if (onSuccess) onSuccess();
      }),
      catchError(err => {
        const msg = err.error?.detail || 'Failed to create class section.';
        this.errorMessage.set(msg);
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isSaving.set(false))
    ).subscribe();
  }

  requestOpenCreateModal(): void {
    this.openModalRequest.set(true);
  }

  loadFacultyWorkload(termId: number, facultyId: number): void {
    this.isWorkloadLoading.set(true);
    this.schedulingApi.getFacultyWorkload(termId, facultyId).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(workload => this.selectedFacultyWorkload.set(workload)),
      catchError(err => {
        const msg = err.error?.detail || 'Failed to load faculty workload.';
        this.errorMessage.set(msg);
        return of(null);
      }),
      finalize(() => this.isWorkloadLoading.set(false))
    ).subscribe();
  }

  approveFacultyOverload(termId: number, facultyUserId: number, onSuccess?: () => void, onError?: (msg: string) => void): void {
    this.isApprovingOverload.set(true);
    this.schedulingApi.approveOverload(termId, facultyUserId).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        if (this.selectedFacultyWorkload()) {
          this.selectedFacultyWorkload.update(w => w ? { ...w, isOverloadApproved: true } : null);
        }
        if (onSuccess) onSuccess();
      }),
      catchError(err => {
        const msg = err.error?.detail || 'Failed to approve faculty overload.';
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isApprovingOverload.set(false))
    ).subscribe();
  }

  updateFacultyWorkloadLimit(
    facultyUserId: number,
    termId: number,
    customMaxUnits: number,
    reason: string,
    onSuccess?: () => void,
    onError?: (msg: string) => void
  ): void {
    this.isWorkloadLoading.set(true);
    this.schedulingApi.updateFacultyWorkloadLimit(facultyUserId, { termId, customMaxUnits, reason }).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(workload => {
        this.selectedFacultyWorkload.set(workload);
        if (onSuccess) onSuccess();
      }),
      catchError(err => {
        const msg = err.error?.detail || 'Failed to update faculty load limit.';
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isWorkloadLoading.set(false))
    ).subscribe();
  }

  updateTermMaxHoursPerClass(
    termId: number,
    maxHoursPerClass: number,
    onSuccess?: () => void,
    onError?: (msg: string) => void
  ): void {
    this.isSaving.set(true);
    this.schedulingApi.updateTermMaxHoursPerClass(termId, maxHoursPerClass).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(updatedTerm => {
        this.terms.update(list => list.map(t => t.id === updatedTerm.id ? updatedTerm : t));
        if (onSuccess) onSuccess();
      }),
      catchError(err => {
        const msg = err.error?.detail || 'Failed to update term max class session hours.';
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isSaving.set(false))
    ).subscribe();
  }

  checkRoomCollision(
    roomId: number,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    excludeSectionId?: number
  ): { hasCollision: boolean; message?: string } {
    if (!roomId || !dayOfWeek || !startTime || !endTime) return { hasCollision: false };
    const normStart = this.formatTimeForComparison(startTime);
    const normEnd = this.formatTimeForComparison(endTime);
    if (normEnd <= normStart) return { hasCollision: false };

    for (const sec of this.sections()) {
      if (excludeSectionId && sec.id === excludeSectionId) continue;
      for (const slot of sec.schedules) {
        if (slot.roomId === roomId && slot.dayOfWeek.toUpperCase() === dayOfWeek.toUpperCase()) {
          const slotStart = this.formatTimeForComparison(slot.startTime);
          const slotEnd = this.formatTimeForComparison(slot.endTime);
          if (normStart < slotEnd && slotStart < normEnd) {
            return {
              hasCollision: true,
              message: `Room conflict: ${slot.roomCode} occupied by ${sec.sectionCode} (${sec.courseCode}) on ${slot.dayOfWeek} (${slot.startTime.substring(0, 5)} - ${slot.endTime.substring(0, 5)})`
            };
          }
        }
      }
    }
    return { hasCollision: false };
  }

  checkFacultyCollision(
    instructorUserId: number,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    excludeSectionId?: number
  ): { hasCollision: boolean; message?: string } {
    if (!instructorUserId || !dayOfWeek || !startTime || !endTime) return { hasCollision: false };
    const normStart = this.formatTimeForComparison(startTime);
    const normEnd = this.formatTimeForComparison(endTime);
    if (normEnd <= normStart) return { hasCollision: false };

    for (const sec of this.sections()) {
      if (excludeSectionId && sec.id === excludeSectionId) continue;
      for (const slot of sec.schedules) {
        if (slot.instructorUserId === instructorUserId && slot.dayOfWeek.toUpperCase() === dayOfWeek.toUpperCase()) {
          const slotStart = this.formatTimeForComparison(slot.startTime);
          const slotEnd = this.formatTimeForComparison(slot.endTime);
          if (normStart < slotEnd && slotStart < normEnd) {
            return {
              hasCollision: true,
              message: `Faculty conflict: ${slot.instructorName || 'Instructor'} assigned to ${sec.sectionCode} (${sec.courseCode}) on ${slot.dayOfWeek} (${slot.startTime.substring(0, 5)} - ${slot.endTime.substring(0, 5)})`
            };
          }
        }
      }
    }
    return { hasCollision: false };
  }

  private formatTimeForComparison(t: string): string {
    if (!t) return '';
    const parts = t.split(':');
    const hh = parts[0]?.padStart(2, '0') || '00';
    const mm = parts[1]?.padStart(2, '0') || '00';
    const ss = parts[2]?.padStart(2, '0') || '00';
    return `${hh}:${mm}:${ss}`;
  }
}