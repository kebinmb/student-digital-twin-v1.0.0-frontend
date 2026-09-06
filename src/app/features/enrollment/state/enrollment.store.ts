import { inject, Injectable, signal, computed } from '@angular/core';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { TermService } from '../../../core/services/institution.service';
import {
  AdvisingEligibilityResponse,
  CourseEligibilityItemDto,
  EnrollmentConfirmationDto,
  StudentEnrollmentResponse,
  StudentSearchResultDto
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
  readonly searchedStudents = signal<StudentSearchResultDto[]>([]);
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

  formatTermType(type: string): string {
    if (!type) return '';
    if (type === '1ST_SEM' || type === 'FIRST_SEM') return '1st Semester';
    if (type === '2ND_SEM' || type === 'SECOND_SEM') return '2nd Semester';
    if (type === 'SUMMER') return 'Summer Term';
    return type;
  }

  setSelectedTermId(termId: number): void {
    this.selectedTermId.set(termId);
    this.loadStudentAdvising(this.studentId(), termId);
    this.loadTermEnrollments(termId);
  }

  setStudentId(studentId: number): void {
    this.studentId.set(studentId);
    const termId = this.selectedTermId();
    if (termId) {
      this.loadStudentAdvising(studentId, termId);
      this.loadTermEnrollments(termId);
    }
  }

  searchStudents(query: string = ''): void {
    this.enrollmentApi.searchStudents(query).pipe(
      tap(students => {
        if (students && students.length > 0) {
          this.searchedStudents.set(students);
        } else {
          this.useFallbackStudents();
        }
      }),
      catchError(() => {
        this.useFallbackStudents();
        return of([]);
      })
    ).subscribe();
  }

  private useFallbackStudents(): void {
    const fallback: StudentSearchResultDto[] = [
      { id: 1, studentIdNumber: '2024-0001', fullName: 'Juan Dela Cruz', programCode: 'BSIT', yearLevel: 1, academicStatus: 'REGULAR' },
      { id: 2, studentIdNumber: '2024-0002', fullName: 'Maria Santos', programCode: 'BSCS', yearLevel: 2, academicStatus: 'REGULAR' },
      { id: 3, studentIdNumber: '2024-0003', fullName: 'Pedro Penduko', programCode: 'BSIS', yearLevel: 3, academicStatus: 'PROBATION' }
    ];
    this.searchedStudents.set(fallback);
  }

  // Actions
  loadInitialData(): void {
    this.searchStudents('');
    if (this.terms().length > 0) return;
    this.isLoading.set(true);
    this.termService.getAll().pipe(
      tap((terms: TermResponse[]) => {
        const formattedTerms = terms.map(t => ({
          ...t,
          termName: t.academicYearCode ? `${t.academicYearCode} - ${this.formatTermType(t.termType)}` : `Term ${t.id}`
        }));
        this.terms.set(formattedTerms);
        if (formattedTerms.length > 0 && !this.selectedTermId()) {
          const activeTerm = formattedTerms.find(t => t.isActive) || formattedTerms[0];
          this.setSelectedTermId(activeTerm.id);
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

  readonly termEnrollments = signal<StudentEnrollmentResponse[]>([]);

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

  loadTermEnrollments(termId: number): void {
    this.isLoading.set(true);
    this.enrollmentApi.getEnrollmentsByTerm(termId).pipe(
      tap(list => this.termEnrollments.set(list)),
      catchError(() => {
        this.termEnrollments.set([]);
        return of([]);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  updateEnrollmentStatus(enrollmentId: number, status: string, isOverloadApproved?: boolean, onSuccess?: () => void, onError?: (msg: string) => void): void {
    this.isEnlisting.set(true);
    this.enrollmentApi.updateEnrollmentStatus(enrollmentId, { status, isOverloadApproved }).pipe(
      tap(updated => {
        this.termEnrollments.update(list => list.map(item => item.enrollmentId === enrollmentId ? updated : item));
        if (this.enrollment()?.enrollmentId === enrollmentId) {
          this.enrollment.set(updated);
        }
        if (onSuccess) onSuccess();
      }),
      catchError(err => {
        const msg = err.error?.detail || 'Failed to update enrollment status.';
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isEnlisting.set(false))
    ).subscribe();
  }
}

