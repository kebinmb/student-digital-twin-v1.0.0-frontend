import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, forkJoin, of, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, filter, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TermService } from './institution.service';

@Injectable({
  providedIn: 'root'
})
export class CashierDashboardService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly termService = inject(TermService);

  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl}/v1` : '/api/v1';
  private subs = new Subscription();

  // State Signals
  readonly curricula = signal<any[]>([]);
  readonly campuses = signal<any[]>([]);
  readonly sections = signal<any[]>([]);
  readonly unifastClaims = signal<any[]>([]);
  readonly currentTermId = signal<number | null>(null);

  // Loading States
  readonly loadingReferenceData = signal<boolean>(false);
  readonly loadingTermData = signal<boolean>(false);
  readonly loadingEnrollment = signal<boolean>(false);

  // Error States
  readonly referenceError = signal<string | null>(null);
  readonly termDataError = signal<string | null>(null);
  readonly enrollmentError = signal<string | null>(null);

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /**
   * Initializes the dashboard service:
   * 1. Loads reference data (curricula, campuses) immediately.
   * 2. Coordinates with TermService to load term-dependent data (sections, unifast claims).
   * Note: Student enrollment is demand-driven and NEVER loaded on init.
   */
  initialize(): void {
    this.loadReferenceData();
    this.coordinateTermResolution();
  }

  loadReferenceData(): Observable<{ curricula: any[]; campuses: any[] }> {
    this.loadingReferenceData.set(true);
    this.referenceError.set(null);

    const ref$ = forkJoin({
      curricula: this.http.get<any[]>(`${this.baseUrl}/curricula/lookup`).pipe(
        catchError((err) => {
          console.error('[CashierDashboardService] Failed to load curricula lookup:', err);
          return of([]);
        })
      ),
      campuses: this.http.get<any[]>(`${this.baseUrl}/campuses`).pipe(
        catchError((err) => {
          console.error('[CashierDashboardService] Failed to load campuses:', err);
          return of([]);
        })
      )
    }).pipe(
      tap(({ curricula, campuses }) => {
        this.curricula.set(curricula);
        this.campuses.set(campuses);
        this.loadingReferenceData.set(false);
      }),
      catchError((err) => {
        this.referenceError.set(err.message || 'Failed to load reference data');
        this.loadingReferenceData.set(false);
        return of({ curricula: [], campuses: [] });
      })
    );

    ref$.subscribe();
    return ref$;
  }

  coordinateTermResolution(): void {
    this.subs.unsubscribe();
    this.subs = new Subscription();

    if (!this.termService?.activeTerm$) {
      return;
    }

    const termSub = this.termService.activeTerm$.pipe(
      filter((term): term is any => term != null && term.id != null),
      distinctUntilChanged((prev, curr) => prev?.id === curr?.id)
    ).subscribe((term) => {
      this.currentTermId.set(term.id);
      this.loadTermDependentData(term.id);
    });

    this.subs.add(termSub);
  }

  loadTermDependentData(termId: number): void {
    if (!termId || termId <= 0) {
      return;
    }
    this.loadingTermData.set(true);
    this.termDataError.set(null);

    forkJoin({
      sections: this.loadSectionsByTerm(termId),
      unifastClaims: this.loadUnifastClaims(termId)
    }).subscribe({
      next: () => {
        this.loadingTermData.set(false);
      },
      error: (err) => {
        this.termDataError.set(err.message || 'Failed to load term-dependent data');
        this.loadingTermData.set(false);
      }
    });
  }

  loadSectionsByTerm(termId: number): Observable<any[]> {
    if (!termId || termId <= 0) {
      return of([]);
    }
    return this.http.get<any[]>(`${this.baseUrl}/scheduling/sections/term/${termId}`).pipe(
      tap((sections) => this.sections.set(sections || [])),
      catchError((err) => {
        console.error(`[CashierDashboardService] Failed to load sections for term ${termId}:`, err);
        this.sections.set([]);
        return of([]);
      })
    );
  }

  loadUnifastClaims(termId: number): Observable<any[]> {
    if (!termId || termId <= 0) {
      return of([]);
    }
    return this.http.get<any[]>(`${this.baseUrl}/finance/unifast/claims/term/${termId}`).pipe(
      tap((claims) => this.unifastClaims.set(claims || [])),
      catchError((err) => {
        console.error(`[CashierDashboardService] Failed to load UniFAST claims for term ${termId}:`, err);
        this.unifastClaims.set([]);
        return of([]);
      })
    );
  }

  /**
   * Demand-driven enrollment loader.
   * MUST NOT be called on init.
   * Only called when student is selected with valid studentId and termId.
   */
  loadEnrollmentForStudent(studentId: number, termId: number): Observable<any> {
    if (!studentId || studentId <= 0 || !termId || termId <= 0) {
      const err = new Error('Valid studentId and termId are required to load enrollment');
      this.enrollmentError.set(err.message);
      return throwError(() => err);
    }

    this.loadingEnrollment.set(true);
    this.enrollmentError.set(null);

    return this.http.get<any>(`${this.baseUrl}/enrollment/student/${studentId}/term/${termId}`).pipe(
      tap({
        next: () => this.loadingEnrollment.set(false),
        error: (err) => {
          this.enrollmentError.set(err.message || 'Failed to load student enrollment');
          this.loadingEnrollment.set(false);
        }
      })
    );
  }
}
