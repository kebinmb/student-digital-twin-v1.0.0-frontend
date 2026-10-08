// File: src/app/core/services/clearance-requests.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription, EMPTY } from 'rxjs';
import { filter, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { TermService } from './institution.service';
import { WebSocketService } from './websocket.service';
import { WS_TOPICS } from '../constants/websocket-topics.constants';
import { ClearanceRequestDto } from '../models/compliance.model';

export type ClearanceRequestResponse = ClearanceRequestDto | any;

@Injectable({ providedIn: 'root' })
export class ClearanceRequestsService implements OnDestroy {
  private _requests$ = new BehaviorSubject<ClearanceRequestResponse[]>([]);
  public requests$ = this._requests$.asObservable();

  private currentStudentId: number | null = null;
  private subs = new Subscription();

  constructor(
    private http: HttpClient,
    private termService: TermService,
    private wsService: WebSocketService
  ) {}

  initializeForStudent(studentId: number): void {
    // Guard: reject invalid studentId
    if (!studentId || studentId <= 0 || isNaN(studentId)) {
      console.warn('[ClearanceRequestsService] Invalid studentId — skipping');
      return;
    }

    // Skip if already initialized for this student
    if (this.currentStudentId === studentId) return;

    // Clean up previous subscriptions
    this.subs.unsubscribe();
    this.subs = new Subscription();
    this.currentStudentId = studentId;

    // REST — re-fetch when active term changes
    const termSub = this.termService.activeTerm$.pipe(
      filter(term => !!term),
      distinctUntilChanged((a, b) => a!.id === b!.id),
      switchMap(term => {
        const url = `/api/v1/clearance/requests/student/${studentId}/term/${term!.id}`;
        console.log(`[ClearanceRequestsService] Fetching: ${url}`);
        return this.http.get<ClearanceRequestResponse[]>(url).pipe(
          catchError(err => {
            console.error('[ClearanceRequestsService] Fetch failed', err);
            return EMPTY;
          })
        );
      })
    ).subscribe(requests => this._requests$.next(requests));

    // WS — real-time updates
    if (this.wsService?.watch) {
      const wsSub = this.wsService
        .watch<ClearanceRequestResponse[]>(WS_TOPICS.clearance(studentId))
        .pipe(filter(data => !!data))
        .subscribe(requests => this._requests$.next(requests));
      this.subs.add(wsSub);
    }

    this.subs.add(termSub);
  }

  refresh(studentId: number, termId: number): void {
    if (!studentId || !termId) return;
    const url = `/api/v1/clearance/requests/student/${studentId}/term/${termId}`;
    this.http.get<ClearanceRequestResponse[]>(url)
      .pipe(catchError(() => EMPTY))
      .subscribe(requests => this._requests$.next(requests));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
