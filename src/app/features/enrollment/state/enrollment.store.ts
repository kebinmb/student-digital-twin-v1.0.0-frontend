import { inject, Injectable, signal, computed } from '@angular/core';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { TermService } from '../../../core/services/institution.service';
import {
  AdvisingEligibilityResponse,
  CourseEligibilityItemDto,
  EnrollmentConfirmationDto,
  StudentEnrollmentResponse
} from '../../../core/models/enrollment.model';
import { TermResponse } from '../../../core/models/institution.model';
import { catchError, finalize, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentStore {
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly termService = inject(TermService);

  // State Signals
  readonly studentId = signal<number>(1);
  readonly selectedTermId = signal<number | null>(null);
  readonly terms = signal<TermResponse[]>([]);

  readonly advising = signal<AdvisingEligibilityResponse | null>(null);
  readonly enrollment = signal<StudentEnrollmentResponse | null>(null);

  readonly isLoading = signal<boolean>(false);
  readonly isEnlisting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Computed Derivations
  readonly totalUnits = computed(() => {
    const e = this.enrollment();
    if (e) return e.totalCreditUnits;
    return this.advising()?.currentEnrolledUnits || 0;
  });

  readonly maxUnits = computed(() => this.advising()?.maxAllowedUnits || 24);

  readonly unitPercentage = computed(() => {
    const max = this.maxUnits();
    if (max === 0) return 0;
    return Math.min(100, Math.round((this.totalUnits() / max) * 100));
  });

  readonly isUnitCapReached = computed(() => this.totalUnits() >= this.maxUnits());

  readonly eligibleCourses = computed(() => {
    return this.advising()?.courses.filter(c => c.eligibilityStatus === 'ELIGIBLE') || [];
  });

  readonly lockedCourses = computed(() => {
    return this.advising()?.courses.filter(c => c.eligibilityStatus === 'LOCKED_PREREQUISITE') || [];
  });

  readonly passedCourses = computed(() => {
    return this.advising()?.courses.filter(c => c.eligibilityStatus === 'ALREADY_PASSED') || [];
  });

  // Actions
  loadInitialData(): void {
    this.isLoading.set(true);
    this.termService.getAll().pipe(
      tap((terms: TermResponse[]) => {
        const formattedTerms = terms.map(t => ({
          ...t,
          termName: t.academicYearCode ? `${t.academicYearCode} - ${t.termType}` : `Term ${t.id}`
        }));
        this.terms.set(formattedTerms);
        if (formattedTerms.length > 0 && !this.selectedTermId()) {
          const activeTerm = formattedTerms.find(t => t.isActive) || formattedTerms[0];
          this.selectedTermId.set(activeTerm.id);
          this.loadStudentAdvising(this.studentId(), activeTerm.id);
        }
      }),
      catchError(() => {
        this.errorMessage.set('Failed to load terms.');
        return of([]);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  loadStudentAdvising(studentId: number, termId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.enrollmentApi.getAdvisingEligibility(studentId, termId).pipe(
      tap(advising => {
        this.advising.set(advising);
      }),
      catchError(err => {
        this.errorMessage.set(err.error?.detail || 'Failed to load advising checklist.');
        return of(null);
      })
    ).subscribe();

    // Also load existing enrollment
    this.enrollmentApi.getEnrollment(studentId, termId).pipe(
      tap(enrollment => {
        this.enrollment.set(enrollment);
      }),
      catchError(() => {
        this.enrollment.set(null);
        return of(null);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  enlistSection(sectionId: number, onSuccess?: () => void, onError?: (msg: string) => void): void {
    const termId = this.selectedTermId();
    if (!termId) return;

    this.isEnlisting.set(true);
    this.errorMessage.set(null);

    this.enrollmentApi.enlistSection(this.studentId(), { termId, sectionId }).pipe(
      tap(updatedEnrollment => {
        this.enrollment.set(updatedEnrollment);
        // Refresh advising to update course status and capacities
        this.loadStudentAdvising(this.studentId(), termId);
        if (onSuccess) onSuccess();
      }),
      catchError(err => {
        const msg = err.error?.detail || 'Failed to enlist in class section.';
        this.errorMessage.set(msg);
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isEnlisting.set(false))
    ).subscribe();
  }

  removeEnlistedSection(sectionId: number, onSuccess?: () => void, onError?: (msg: string) => void): void {
    const termId = this.selectedTermId();
    if (!termId) return;

    this.isEnlisting.set(true);
    this.enrollmentApi.removeEnlistedSection(this.studentId(), termId, sectionId).pipe(
      tap(updatedEnrollment => {
        this.enrollment.set(updatedEnrollment);
        this.loadStudentAdvising(this.studentId(), termId);
        if (onSuccess) onSuccess();
      }),
      catchError(err => {
        const msg = err.error?.detail || 'Failed to remove enlisted section.';
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isEnlisting.set(false))
    ).subscribe();
  }

  confirmEnrollment(onSuccess?: (conf: EnrollmentConfirmationDto) => void, onError?: (msg: string) => void): void {
    const termId = this.selectedTermId();
    if (!termId) return;

    this.isEnlisting.set(true);
    this.enrollmentApi.confirmEnrollment(this.studentId(), termId).pipe(
      tap(conf => {
        if (this.enrollment()) {
          this.enrollment.update(e => e ? { ...e, status: 'ENROLLED' } : null);
        }
        if (onSuccess) onSuccess(conf);
      }),
      catchError(err => {
        const msg = err.error?.detail || 'Failed to confirm enrollment.';
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isEnlisting.set(false))
    ).subscribe();
  }
}
