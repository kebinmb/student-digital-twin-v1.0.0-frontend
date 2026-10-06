// File: src/app/core/services/academic-period.store.ts

import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { AcademicYearService, TermService } from './institution.service';
import { AcademicYear, Term } from '../models/institution.model';

@Injectable({
  providedIn: 'root'
})
export class AcademicPeriodStore {
  private readonly ayService = inject(AcademicYearService);
  private readonly termService = inject(TermService);
  private readonly destroyRef = inject(DestroyRef);

  // State Signals
  readonly academicYears = signal<AcademicYear[]>([]);
  readonly currentAcademicYear = signal<AcademicYear | null>(null);
  readonly terms = signal<Term[]>([]);
  readonly activeTerm = signal<Term | null>(null);

  readonly selectedAcademicYearId = signal<number | null>(null);
  readonly selectedTermId = signal<number | null>(null);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Computed Derivations
  readonly selectedTerm = computed(() => {
    const id = this.selectedTermId();
    if (!id) return this.activeTerm() || (this.terms().length > 0 ? this.terms()[0] : null);
    return this.terms().find(t => t.id === id) || null;
  });

  readonly selectedAcademicYear = computed(() => {
    const id = this.selectedAcademicYearId();
    if (!id) return this.currentAcademicYear() || (this.academicYears().length > 0 ? this.academicYears()[0] : null);
    return this.academicYears().find(ay => ay.id === id) || null;
  });

  readonly termsForSelectedYear = computed(() => {
    const yearId = this.selectedAcademicYearId();
    if (!yearId) return this.terms();
    return this.terms().filter(t => t.academicYearId === yearId);
  });

  readonly isEnrollmentOpen = computed(() => this.selectedTerm()?.enrollmentOpen ?? false);
  readonly isGradingOpen = computed(() => this.selectedTerm()?.gradingOpen ?? false);
  readonly isAddDropOpen = computed(() => this.selectedTerm()?.addDropOpen ?? false);

  constructor() {
    this.initialize();
  }

  initialize(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      years: this.ayService.getAll().pipe(catchError(() => of([]))),
      currYear: this.ayService.getCurrent().pipe(catchError(() => of(null))),
      terms: this.termService.getAll().pipe(catchError(() => of([]))),
      activeTerm: this.termService.getActive().pipe(catchError(() => of(null)))
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(({ years, currYear, terms, activeTerm }) => {
        this.academicYears.set(years);
        this.currentAcademicYear.set(currYear);
        this.terms.set(terms);
        this.activeTerm.set(activeTerm);

        // Auto-select active term if not already selected
        if (!this.selectedTermId() && activeTerm) {
          this.selectedTermId.set(activeTerm.id);
          this.selectedAcademicYearId.set(activeTerm.academicYearId);
        } else if (!this.selectedAcademicYearId() && currYear) {
          this.selectedAcademicYearId.set(currYear.id);
        }
      }),
      catchError(err => {
        this.errorMessage.set('Failed to initialize global academic period context.');
        return of(null);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe();
  }

  setTerm(termId: number | null): void {
    this.selectedTermId.set(termId);
    if (termId !== null) {
      const found = this.terms().find(t => t.id === termId);
      if (found && found.academicYearId) {
        this.selectedAcademicYearId.set(found.academicYearId);
      }
    }
  }

  setAcademicYear(yearId: number | null): void {
    this.selectedAcademicYearId.set(yearId);
    if (yearId !== null) {
      const yearTerms = this.terms().filter(t => t.academicYearId === yearId);
      if (yearTerms.length > 0) {
        const matchingActive = yearTerms.find(t => t.isActive || t.isCurrent) || yearTerms[0];
        this.selectedTermId.set(matchingActive.id);
      }
    }
  }

  refresh(): void {
    this.ayService.invalidateCache();
    this.termService.invalidateCache();
    this.initialize();
  }
}
