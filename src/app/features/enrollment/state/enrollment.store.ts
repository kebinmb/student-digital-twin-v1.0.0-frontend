// File: src/app/features/enrollment/state/enrollment.store.ts

import { inject, Injectable, signal, computed, DestroyRef, effect, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { TermService } from '../../../core/services/institution.service';
import {
  AdvisingEligibilityResponse,
  CourseEligibilityItemDto,
  CreateStudentRequest,
  CreditTransfereeCoursesRequest,
  EnrollmentConfirmationDto,
  StudentEnrollmentResponse,
  StudentProfileResponse,
  StudentSearchResultDto,
  TransfereeCreditingSummaryResponse
} from '../../../core/models/enrollment.model';
import { TermResponse } from '../../../core/models/institution.model';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';
import { catchError, finalize, forkJoin, of, tap, Subscription } from 'rxjs';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { WS_TOPICS } from '../../../core/constants/websocket-topics.constants';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentStore {
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly termService = inject(TermService);
  private readonly authService = inject(AuthService);
  private readonly academicPeriodStore = inject(AcademicPeriodStore);
  private readonly wsService = inject(WebSocketService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private wsSubscription?: Subscription;

  private currentStudentId: number | null = null;
  private currentTermId: number | null = null;

  // State Signals
  readonly studentId = signal<number | null>(null);
  readonly searchedStudents = signal<StudentSearchResultDto[]>([]);
  readonly selectedTermId = signal<number | null>(null);
  readonly terms = signal<TermResponse[]>([]);

  readonly advising = signal<AdvisingEligibilityResponse | null>(null);
  readonly enrollment = signal<StudentEnrollmentResponse | null>(null);

  readonly isLoading = signal<boolean>(false);
  readonly isEnlisting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const globalTermId = this.academicPeriodStore.selectedTermId();
      untracked(() => {
        if (globalTermId && globalTermId !== this.selectedTermId()) {
          this.setSelectedTermId(globalTermId);
        }
      });
    });

    if (this.termService?.activeTerm$) {
      this.termService.activeTerm$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(active => {
        if (active && active.id) {
          this.handleTermUpdate(active);
        }
      });
    }

    if (this.termService?.allTerms$) {
      this.termService.allTerms$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(allTerms => {
        if (allTerms && allTerms.length > 0) {
          this.terms.update(current => {
            if (current.length === 0) {
              return allTerms.map(t => ({
                ...t,
                termName: t.academicYearCode ? `${t.academicYearCode} - ${this.formatTermType(t.termType)}` : `Term ${t.id}`
              }));
            }
            return current.map(c => {
              const matching = allTerms.find(t => t.id === c.id);
              return matching ? {
                ...c,
                ...matching,
                termName: matching.academicYearCode ? `${matching.academicYearCode} - ${this.formatTermType(matching.termType)}` : c.termName
              } : c;
            });
          });
        }
      });
    }

    if (this.wsService) {
      this.wsService.watch<TermResponse>(WS_TOPICS.ACTIVE_TERM).pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      ).subscribe(active => {
        if (active && active.id) {
          this.handleTermUpdate(active);
        }
      });

      this.wsService.watch(WS_TOPICS.ADMIN_ENROLLMENTS).pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      ).subscribe((msg) => {
        if (msg) {
          const termId = this.selectedTermId();
          const sId = this.studentId();
          if (termId && termId > 0) {
            this.loadTermEnrollments(termId);
            if (sId && sId > 0) {
              this.loadStudentAdvising(sId, termId);
            }
          }
        }
      });
    }

    this.destroyRef.onDestroy(() => {
      this.wsSubscription?.unsubscribe();
      this.wsSubscription = undefined;
    });
  }

  private handleTermUpdate(active: Partial<TermResponse> & { id: number }): void {
    this.terms.update(currentTerms => {
      const idx = currentTerms.findIndex(t => t.id === active.id);
      const existing = idx !== -1 ? currentTerms[idx] : null;
      const formatted: TermResponse = {
        ...(existing || ({} as TermResponse)),
        ...active,
        termName: active.academicYearCode
          ? `${active.academicYearCode} - ${this.formatTermType(active.termType || (existing?.termType || ''))}`
          : (existing?.termName || `Term ${active.id}`)
      };
      if (idx !== -1) {
        const updated = [...currentTerms];
        updated[idx] = formatted;
        return updated;
      }
      return [...currentTerms, formatted];
    });

    const currentSelected = this.selectedTermId();
    if (currentSelected === active.id) {
      const sid = this.studentId();
      if (sid && sid > 0) {
        this.loadStudentAdvising(sid, active.id);
      }
      this.loadTermEnrollments(active.id);
    }
  }

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
  readonly canUpdateStatus = computed(() => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'REGISTRAR']));

  readonly eligibleCourses = computed(() => {
    return this.advising()?.courses.filter(c => c.eligibilityStatus === 'ELIGIBLE') || [];
  });

  readonly lockedCourses = computed(() => {
    return this.advising()?.courses.filter(c => c.eligibilityStatus === 'LOCKED_PREREQUISITE') || [];
  });

  readonly passedCourses = computed(() => {
    return this.advising()?.courses.filter(c => c.eligibilityStatus === 'ALREADY_PASSED') || [];
  });

  readonly selectedTerm = computed(() => {
    const id = this.selectedTermId();
    if (!id) return null;
    const fromTerms = this.terms().find(t => t.id === id);
    if (fromTerms) return fromTerms;
    const globalTerm = this.academicPeriodStore.selectedTerm();
    if (globalTerm && globalTerm.id === id) {
      return {
        ...globalTerm,
        termName: globalTerm.academicYearCode
          ? `${globalTerm.academicYearCode} - ${this.formatTermType(globalTerm.termType)}`
          : `Term ${globalTerm.id}`
      } as TermResponse;
    }
    return null;
  });

  readonly isEnrollmentClosed = computed(() => {
    const term = this.selectedTerm();
    if (!term) return false;
    return term.enrollmentOpen === false;
  });

  formatTermType(type: string): string {
    if (!type) return '';
    if (type === '1ST_SEM' || type === 'FIRST_SEM') return '1st Semester';
    if (type === '2ND_SEM' || type === 'SECOND_SEM') return '2nd Semester';
    if (type === 'SUMMER') return 'Summer Term';
    return type;
  }

  setSelectedTermId(termId: number | null | undefined): void {
    if (!termId || termId <= 0) {
      this.currentTermId = null;
      this.selectedTermId.set(null);
      this.termEnrollments.set([]);
      this.advising.set(null);
      this.enrollment.set(null);
      return;
    }
    if (this.currentTermId === termId && this.selectedTermId() === termId) {
      return;
    }
    this.currentTermId = termId;
    this.selectedTermId.set(termId);
    this.academicPeriodStore.setTerm(termId);
    const sid = this.studentId();
    if (sid && sid > 0) {
      this.loadStudentAdvising(sid, termId);
    }
    this.loadTermEnrollments(termId);
  }

  setStudentId(studentId: number | null | undefined): void {
    if (!studentId || studentId <= 0) {
      this.currentStudentId = null;
      this.studentId.set(null);
      this.advising.set(null);
      this.enrollment.set(null);
      this.wsSubscription?.unsubscribe();
      return;
    }
    if (this.currentStudentId === studentId && this.studentId() === studentId) {
      return;
    }
    this.currentStudentId = studentId;
    this.studentId.set(studentId);
    this.setupWebSocketSubscription(studentId);
    const termId = this.selectedTermId();
    if (termId && termId > 0) {
      this.loadStudentAdvising(studentId, termId);
      this.loadTermEnrollments(termId);
    } else {
      this.advising.set(null);
      this.enrollment.set(null);
    }
  }

  private setupWebSocketSubscription(studentId: number): void {
    this.wsSubscription?.unsubscribe();
    if (this.wsService && studentId > 0) {
      this.wsSubscription = this.wsService.watch(WS_TOPICS.ENROLLMENT(studentId)).pipe(
        catchError(() => of(null))
      ).subscribe((msg) => {
        if (msg) {
          const termId = this.selectedTermId();
          if (termId && termId > 0) {
            this.loadStudentAdvising(studentId, termId);
            this.loadTermEnrollments(termId);
          }
        }
      });
    }
  }

  searchStudents(query: string = '', onLoaded?: (students: StudentSearchResultDto[]) => void): void {
    this.enrollmentApi.searchStudents(query).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(students => {
        const list = students || [];
        this.searchedStudents.set(list);
        const currentId = this.studentId();
        const hasValidSelection = currentId !== null && currentId > 0 && list.some(s => s.id === currentId);
        if (!hasValidSelection && list.length > 0) {
          const firstValid = list.find(s => s.id > 0);
          if (firstValid) {
            this.setStudentId(firstValid.id);
          }
        }
        if (onLoaded) onLoaded(list);
      }),
      catchError(() => {
        this.searchedStudents.set([]);
        return of([]);
      })
    ).subscribe();
  }

  createStudent(
    request: CreateStudentRequest,
    onSuccess?: (res: StudentProfileResponse) => void,
    onError?: (msg: string) => void
  ): void {
    this.isLoading.set(true);
    this.enrollmentApi.createStudent(request).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(res => {
        this.searchStudents('', () => {
          this.setStudentId(res.id);
        });
        if (onSuccess) onSuccess(res);
      }),
      catchError(err => {
        const msg = err.error?.detail || err.error?.message || 'Failed to register new student.';
        this.errorMessage.set(msg);
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  creditTransfereeCourses(
    studentId: number,
    request: CreditTransfereeCoursesRequest,
    onSuccess?: (res: TransfereeCreditingSummaryResponse) => void,
    onError?: (msg: string) => void
  ): void {
    this.isLoading.set(true);
    this.enrollmentApi.creditTransfereeCourses(studentId, request).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(res => {
        const termId = this.selectedTermId();
        if (termId) {
          this.loadStudentAdvising(studentId, termId);
        }
        if (onSuccess) onSuccess(res);
      }),
      catchError(err => {
        const msg = err.error?.detail || err.error?.message || 'Failed to credit transferee courses.';
        this.errorMessage.set(msg);
        if (onError) onError(msg);
        return of(null);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  loadInitialData(): void {
    const isStudent = this.authService.hasRole('STUDENT');
    if (isStudent) {
      this.isLoading.set(true);
      this.enrollmentApi.getCurrentStudentProfile().pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(profile => {
          if (profile && profile.id && profile.id > 0) {
            this.currentStudentId = profile.id;
            this.studentId.set(profile.id);
            this.setupWebSocketSubscription(profile.id);
            this.searchedStudents.set([{
              id: profile.id,
              studentIdNumber: profile.studentNumber,
              fullName: profile.username || `Student ${profile.studentNumber}`,
              programCode: profile.programCode,
              yearLevel: profile.yearLevel,
              academicStatus: profile.enrollmentStatus || 'REGULAR'
            }]);
            const termId = this.selectedTermId();
            if (termId && termId > 0) {
              this.loadStudentAdvising(profile.id, termId);
            }
          }
          this.loadTerms();
        }),
        catchError(err => {
          this.errorMessage.set(err.error?.detail || 'Failed to load student profile.');
          this.loadTerms();
          return of(null);
        }),
        finalize(() => this.isLoading.set(false))
      ).subscribe();
    } else {
      this.searchStudents('');
      this.loadTerms();
    }
  }

  private loadTerms(): void {
    if (this.terms().length > 0) {
      this.refreshAdvising();
      return;
    }
    this.isLoading.set(true);
    this.termService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((terms: TermResponse[]) => {
        const formattedTerms = terms.map(t => ({
          ...t,
          termName: t.academicYearCode ? `${t.academicYearCode} - ${this.formatTermType(t.termType)}` : `Term ${t.id}`
        }));
        this.terms.set(formattedTerms);
        if (formattedTerms.length > 0 && !this.selectedTermId()) {
          const globalId = this.academicPeriodStore.selectedTermId();
          const activeTerm = (globalId ? formattedTerms.find(t => t.id === globalId) : null)
            || formattedTerms.find(t => t.isActive)
            || formattedTerms.find(t => t.isCurrent)
            || formattedTerms[0];
          if (activeTerm) {
            this.setSelectedTermId(activeTerm.id);
          }
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
    if (!studentId || !termId) {
      this.advising.set(null);
      this.enrollment.set(null);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const enrollment$ = studentId > 0
      ? this.enrollmentApi.getEnrollment(studentId, termId).pipe(
          catchError(() => of(null))
        )
      : of(null);

    forkJoin({
      advising: this.enrollmentApi.getAdvisingEligibility(studentId, termId).pipe(
        catchError(err => {
          this.errorMessage.set(err.error?.detail || 'Failed to load advising checklist.');
          return of(null);
        })
      ),
      enrollment: enrollment$
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(({ advising, enrollment }) => {
        this.advising.set(advising);
        this.enrollment.set(enrollment);

        if (advising?.studentId && advising.studentId > 0 && advising.studentId !== studentId) {
          this.currentStudentId = advising.studentId;
          this.studentId.set(advising.studentId);
          this.setupWebSocketSubscription(advising.studentId);
          this.searchedStudents.update(list => list.map(s => s.id === studentId ? {
            ...s,
            id: advising.studentId,
            studentIdNumber: advising.studentNumber || s.studentIdNumber,
            fullName: advising.studentName || s.fullName,
            academicStatus: advising.enrollmentStatus || 'REGULAR'
          } : s));
        }
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  refreshAdvising(): void {
    const sid = this.studentId();
    const termId = this.selectedTermId();
    if (sid && sid > 0 && termId && termId > 0) {
      this.loadStudentAdvising(sid, termId);
    }
  }

  enlistSection(sectionId: number, onSuccess?: () => void, onError?: (msg: string) => void): void {
    const termId = this.selectedTermId();
    const sid = this.studentId();
    if (!termId || termId <= 0 || !sid || sid <= 0) return;

    if (this.isEnrollmentClosed() && this.authService.hasRole('STUDENT')) {
      const msg = 'Enrollment is closed for the selected term.';
      this.errorMessage.set(msg);
      if (onError) onError(msg);
      return;
    }

    this.isEnlisting.set(true);
    this.errorMessage.set(null);

    this.enrollmentApi.enlistSection(sid, { termId, sectionId }).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(updatedEnrollment => {
        this.enrollment.set(updatedEnrollment);
        this.loadStudentAdvising(sid, termId);
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
    const sid = this.studentId();
    if (!termId || termId <= 0 || !sid || sid <= 0) return;

    if (this.isEnrollmentClosed() && this.authService.hasRole('STUDENT')) {
      const msg = 'Enrollment is closed for the selected term.';
      if (onError) onError(msg);
      return;
    }

    this.isEnlisting.set(true);
    this.enrollmentApi.removeEnlistedSection(sid, termId, sectionId).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(updatedEnrollment => {
        this.enrollment.set(updatedEnrollment);
        this.loadStudentAdvising(sid, termId);
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
    const sid = this.studentId();
    if (!termId || termId <= 0 || !sid || sid <= 0) return;

    if (this.isEnrollmentClosed() && this.authService.hasRole('STUDENT')) {
      const msg = 'Enrollment is closed for the selected term.';
      if (onError) onError(msg);
      return;
    }

    this.isEnlisting.set(true);
    this.enrollmentApi.confirmEnrollment(sid, termId).pipe(
      takeUntilDestroyed(this.destroyRef),
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

  readonly termEnrollments = signal<StudentEnrollmentResponse[]>([]);

  loadTermEnrollments(termId: number): void {
    if (!termId || termId <= 0) {
      this.termEnrollments.set([]);
      return;
    }
    if (!this.authService.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON', 'REGISTRAR'])) {
      this.termEnrollments.set([]);
      return;
    }
    this.isLoading.set(true);
    this.enrollmentApi.getEnrollmentsByTerm(termId).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(list => this.termEnrollments.set(list)),
      catchError(() => {
        this.termEnrollments.set([]);
        return of([]);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  updateEnrollmentStatus(
    enrollmentId: number,
    status: string,
    isOverloadApproved?: boolean,
    onSuccess?: () => void,
    onError?: (msg: string) => void
  ): void {
    this.isEnlisting.set(true);
    this.enrollmentApi.updateEnrollmentStatus(enrollmentId, { status, isOverloadApproved }).pipe(
      takeUntilDestroyed(this.destroyRef),
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