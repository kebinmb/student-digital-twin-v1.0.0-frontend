import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, of, EMPTY } from 'rxjs';
import { catchError, finalize, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface GradeChangeRequestResponse {
  id: number;
  studentId?: number;
  studentNumber?: string;
  studentName?: string;
  programId?: number;
  programCode?: string;
  collegeId?: number;
  courseId?: number;
  courseCode?: string;
  courseTitle?: string;
  termId?: number;
  termName?: string;
  previousGrade?: number;
  newGrade?: number;
  reason?: string;
  status: string;
  requestedByUsername?: string;
  approvedByUsername?: string;
  createdAt?: string;
  facultyName?: string;
}

@Injectable({ providedIn: 'root' })
export class GradeChangeRequestService implements OnDestroy {
  private http = inject(HttpClient);

  private readonly _pending$ = new BehaviorSubject<GradeChangeRequestResponse[]>([]);
  public readonly pending$ = this._pending$.asObservable();

  private initialized = false;
  private currentTermId: number | undefined = undefined;
  private subs = new Subscription();
  private inFlightMap = new Map<string, Observable<GradeChangeRequestResponse[]>>();

  public loading = false;
  public error: string | null = null;

  initialize(termId?: number): void {
    if (this.initialized && this.currentTermId === termId) {
      return; // guard: only initialize once per term
    }
    this.initialized = true;
    this.currentTermId = termId;
    this.loading = true;

    const url = `${environment.apiUrl}/v1/grades/change-requests/pending${termId ? `?termId=${termId}` : ''}`;

    const sub = this.http.get<GradeChangeRequestResponse[]>(url).pipe(
      catchError(err => {
        if (err.status === 403) {
          console.warn('[GradeChangeRequestService] Access denied — role may lack permission');
          this.error = 'You do not have permission to view pending grade change requests.';
        } else {
          console.error('[GradeChangeRequestService] Failed to load pending:', err);
          this.error = 'Failed to load grade change requests.';
        }
        return EMPTY;
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe(data => {
      this._pending$.next(data || []);
      if (!this.error) {
        this.error = null;
      }
    });

    this.subs.add(sub);
  }

  loadPendingRequests(termId?: number): Observable<GradeChangeRequestResponse[]> {
    const key = termId !== undefined ? String(termId) : 'all';
    const existing = this.inFlightMap.get(key);
    if (existing) {
      return existing;
    }

    this.loading = true;
    const url = `${environment.apiUrl}/v1/grades/change-requests/pending${termId ? `?termId=${termId}` : ''}`;
    const req$ = this.http.get<GradeChangeRequestResponse[]>(url).pipe(
      tap(data => {
        this._pending$.next(data || []);
        this.error = null;
      }),
      catchError(err => {
        if (err.status === 403) {
          this.error = 'You do not have permission to view pending grade change requests.';
        } else {
          this.error = 'Failed to load grade change requests.';
        }
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
        this.inFlightMap.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.inFlightMap.set(key, req$);
    return req$;
  }

  reset(): void {
    this.initialized = false;
    this.currentTermId = undefined;
    this._pending$.next([]);
    this.error = null;
    this.loading = false;
    this.inFlightMap.clear();
    this.subs.unsubscribe();
    this.subs = new Subscription();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.inFlightMap.clear();
    this.initialized = false;
  }
}
