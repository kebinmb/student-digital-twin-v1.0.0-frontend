import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subscription, forkJoin, of, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, filter, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TermService } from './institution.service';

export interface EquityProfileAccountingView {
  studentId: number;
  studentNumber: string;
  studentName: string;
  equityCategory: string;
  verificationStatus: string;
  programCode: string;
  termId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AccountantDashboardService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly termService = inject(TermService);

  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl}/v1` : '/api/v1';
  private subs = new Subscription();

  // State Signals
  readonly curricula = signal<any[]>([]);
  readonly campuses = signal<any[]>([]);
  readonly activeCampuses = signal<any[]>([]);
  readonly sections = signal<any[]>([]);
  readonly equityProfiles = signal<EquityProfileAccountingView[]>([]);
  readonly currentTermId = signal<number | null>(null);

  // Loading States
  readonly loadingReferenceData = signal<boolean>(false);
  readonly loadingTermData = signal<boolean>(false);
  readonly loadingEquitySearch = signal<boolean>(false);
  readonly loadingEnrollment = signal<boolean>(false);

  // Error States
  readonly referenceError = signal<string | null>(null);
  readonly termDataError = signal<string | null>(null);
  readonly equitySearchError = signal<string | null>(null);
  readonly enrollmentError = signal<string | null>(null);

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /**
   * Initializes the dashboard service:
   * 1. Loads reference data (curricula, campuses, active campuses) immediately.
   * 2. Coordinates with TermService to load term-dependent data (sections).
   * Note: Student enrollment and equity profile searches are demand-driven and NEVER loaded on init.
   */
  initialize(): void {
    this.loadReferenceData();
    this.coordinateTermResolution();
  }

  loadReferenceData(): Observable<{ curricula: any[]; campuses: any[]; activeCampuses: any[] }> {
    this.loadingReferenceData.set(true);
    this.referenceError.set(null);

    const ref$ = forkJoin({
      curricula: this.http.get<any[]>(`${this.baseUrl}/curricula/lookup`).pipe(
        catchError((err) => {
          console.error('[AccountantDashboardService] Failed to load curricula lookup:', err);
          return of([]);
        })
      ),
      campuses: this.http.get<any[]>(`${this.baseUrl}/campuses`).pipe(
        catchError((err) => {
          console.error('[AccountantDashboardService] Failed to load campuses:', err);
          return of([]);
        })
      ),
      activeCampuses: this.http.get<any[]>(`${this.baseUrl}/campuses/active`).pipe(
        catchError((err) => {
          console.error('[AccountantDashboardService] Failed to load active campuses:', err);
          return of([]);
        })
      )
    }).pipe(
      tap(({ curricula, campuses, activeCampuses }) => {
        this.curricula.set(curricula);
        this.campuses.set(campuses);
        this.activeCampuses.set(activeCampuses);
        this.loadingReferenceData.set(false);
      }),
      catchError((err) => {
        this.referenceError.set(err.message || 'Failed to load reference data');
        this.loadingReferenceData.set(false);
        return of({ curricula: [], campuses: [], activeCampuses: [] });
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

    this.loadSectionsByTerm(termId).subscribe({
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
        console.error(`[AccountantDashboardService] Failed to load sections for term ${termId}:`, err);
        this.sections.set([]);
        return of([]);
      })
    );
  }

  /**
   * Demand-driven equity profile search.
   * MUST NOT be called on init.
   */
  searchEquityProfiles(query?: string, category?: string, page: number = 0, size: number = 10): Observable<any> {
    this.loadingEquitySearch.set(true);
    this.equitySearchError.set(null);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (query && query.trim()) {
      params = params.set('query', query.trim());
    }
    if (category && category.trim()) {
      params = params.set('category', category.trim());
    }

    return this.http.get<any>(`${this.baseUrl}/equity-profiles/search`, { params }).pipe(
      tap({
        next: (response) => {
          const content = response?.content || response || [];
          this.equityProfiles.set(content);
          this.loadingEquitySearch.set(false);
        },
        error: (err) => {
          this.equitySearchError.set(err.message || 'Failed to search equity profiles');
          this.loadingEquitySearch.set(false);
        }
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
