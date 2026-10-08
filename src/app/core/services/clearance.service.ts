// File: src/app/core/services/clearance.service.ts

import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, Subscription } from 'rxjs';
import { ComplianceApiService } from '../service/compliance/compliance-api.service';
import { WebSocketService } from './websocket.service';
import { AcademicPeriodStore } from './academic-period.store';
import { WS_TOPICS } from '../constants/websocket-topics.constants';
import {
  ClearanceRequestDto,
  ClearanceStatusMessage,
  DepartmentClearanceItem
} from '../models/compliance.model';

@Injectable({
  providedIn: 'root'
})
export class ClearanceService implements OnDestroy {
  private readonly complianceApi = inject(ComplianceApiService);
  private readonly wsService = inject(WebSocketService, { optional: true });
  private readonly periodStore = inject(AcademicPeriodStore);

  private readonly _clearance$ = new BehaviorSubject<ClearanceStatusMessage | null>(null);
  public readonly clearance$ = this._clearance$.asObservable();

  private readonly _clearanceRequest$ = new BehaviorSubject<ClearanceRequestDto | null>(null);
  public readonly clearanceRequest$ = this._clearanceRequest$.asObservable();

  private readonly _currentStudentId = new BehaviorSubject<number | null>(null);
  public readonly currentStudentId$ = this._currentStudentId.asObservable();

  private wsStudentSubscription?: Subscription;
  private wsAdminSubscription?: Subscription;

  // Signal representations for modern Angular components
  readonly currentClearance = signal<ClearanceStatusMessage | null>(null);
  readonly currentClearanceRequest = signal<ClearanceRequestDto | null>(null);
  readonly isLoading = signal<boolean>(false);

  // Derived Observables
  public readonly deptStatusMap$: Observable<Record<string, DepartmentClearanceItem>> = this._clearance$.pipe(
    map((msg) => {
      if (!msg || !msg.departments) return {};
      const mapObj: Record<string, DepartmentClearanceItem> = {};
      for (const item of msg.departments) {
        if (item.departmentName) {
          mapObj[item.departmentName.toUpperCase()] = item;
        }
      }
      return mapObj;
    })
  );

  constructor() {
    this._clearance$.subscribe((val) => {
      this.currentClearance.set(val);
    });

    this._clearanceRequest$.subscribe((val) => {
      this.currentClearanceRequest.set(val);
    });

    effect(() => {
      const termId = this.periodStore.selectedTermId() || this.periodStore.activeTerm()?.id;
      const studentId = this._currentStudentId.value;
      if (termId && studentId && studentId > 0) {
        this.fetchClearanceSnapshot(studentId, termId);
      }
    });
  }

  /**
   * Initializes real-time clearance tracking for a student.
   * Discards invalid IDs (<= 0 or falsy).
   */
  initializeForStudent(studentId: number | null | undefined): void {
    if (!studentId || studentId <= 0) {
      this.cleanup();
      this._currentStudentId.next(null);
      this._clearance$.next(null);
      this._clearanceRequest$.next(null);
      return;
    }

    if (this._currentStudentId.value === studentId && this.wsStudentSubscription && !this.wsStudentSubscription.closed) {
      return;
    }

    this.cleanup();
    this._currentStudentId.next(studentId);

    // Initial load for current or active term
    const termId = this.periodStore.selectedTermId() || this.periodStore.activeTerm()?.id;
    if (termId) {
      this.fetchClearanceSnapshot(studentId, termId);
    }

    this.setupWsSubscriptions(studentId);
  }

  private setupWsSubscriptions(studentId: number): void {
    if (!this.wsService) return;

    // 1. Subscribe to per-student clearance topic
    this.wsStudentSubscription = this.wsService
      .watch<ClearanceStatusMessage>(WS_TOPICS.CLEARANCE(studentId))
      .pipe(
        catchError((err) => {
          console.error(`[ClearanceService] Error on topic ${WS_TOPICS.CLEARANCE(studentId)}:`, err);
          return of(null);
        })
      )
      .subscribe((msg) => {
        if (msg && msg.studentId === studentId) {
          this.handleIncomingClearanceMessage(msg);
        }
      });

    // 2. Subscribe to admin clearance topic for real-time administrative updates
    this.wsAdminSubscription = this.wsService
      .watch<ClearanceStatusMessage>(WS_TOPICS.ADMIN_CLEARANCE)
      .pipe(
        catchError((err) => {
          console.error(`[ClearanceService] Error on topic ${WS_TOPICS.ADMIN_CLEARANCE}:`, err);
          return of(null);
        })
      )
      .subscribe((msg) => {
        if (msg && msg.studentId === this._currentStudentId.value) {
          this.handleIncomingClearanceMessage(msg);
        }
      });
  }

  handleIncomingClearanceMessage(msg: ClearanceStatusMessage): void {
    if (!msg) return;
    this._clearance$.next(msg);

    const currentDto = this._clearanceRequest$.value;
    if (currentDto && currentDto.studentProfileId === msg.studentId && (currentDto.termId === msg.termId || !msg.termId)) {
      const updatedSignoffs = (currentDto.signoffs || []).map((s) => {
        const item = msg.departments?.find((d) =>
          (d.departmentId && d.departmentId === s.id) ||
          (d.departmentName && s.departmentType && d.departmentName.toUpperCase() === s.departmentType.toUpperCase())
        );
        if (item) {
          return {
            ...s,
            signoffStatus: item.status,
            remarks: item.remarks !== undefined ? item.remarks : s.remarks,
            signedByUsername: item.clearedBy !== undefined ? item.clearedBy : s.signedByUsername,
            signedAt: item.clearedAt !== undefined ? item.clearedAt : s.signedAt
          };
        }
        return s;
      });

      const updatedDto: ClearanceRequestDto = {
        ...currentDto,
        overallStatus: msg.overallStatus || currentDto.overallStatus,
        signoffs: updatedSignoffs
      };
      this._clearanceRequest$.next(updatedDto);
    } else {
      const targetTermId = msg.termId || this.periodStore.selectedTermId() || this.periodStore.activeTerm()?.id;
      if (targetTermId && msg.studentId) {
        this.fetchClearanceSnapshot(msg.studentId, targetTermId);
      }
    }
  }

  fetchClearanceSnapshot(studentIdentifier: number | string, termId: number): void {
    if (!studentIdentifier || !termId) return;
    this.isLoading.set(true);
    this.complianceApi
      .getClearanceByStudentAndTerm(studentIdentifier, termId)
      .pipe(
        catchError((err) => {
          console.warn('[ClearanceService] Failed to fetch clearance snapshot:', err);
          return of(null);
        })
      )
      .subscribe({
        next: (dto) => {
          this.isLoading.set(false);
          this._clearanceRequest$.next(dto);
          if (dto) {
            const message = this.mapDtoToMessage(dto);
            this._clearance$.next(message);

            if (dto.studentProfileId && this._currentStudentId.value !== dto.studentProfileId) {
              this._currentStudentId.next(dto.studentProfileId);
              if (!this.wsStudentSubscription || this.wsStudentSubscription.closed) {
                this.setupWsSubscriptions(dto.studentProfileId);
              }
            }
          } else {
            this._clearance$.next(null);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this._clearanceRequest$.next(null);
          this._clearance$.next(null);
        }
      });
  }

  /**
   * Requests latest snapshot from server over STOMP or re-fetches via REST.
   */
  requestLatest(): void {
    const studentId = this._currentStudentId.value;
    const termId = this.periodStore.selectedTermId() || this.periodStore.activeTerm()?.id;
    if (!studentId || studentId <= 0 || !termId) return;

    if (this.wsService && this.wsService.isConnected) {
      this.wsService.publish(`/app/clearance/${studentId}/${termId}`, {});
    } else {
      this.fetchClearanceSnapshot(studentId, termId);
    }
  }

  refresh(): void {
    const studentId = this._currentStudentId.value;
    const termId = this.periodStore.selectedTermId() || this.periodStore.activeTerm()?.id;
    if (studentId && studentId > 0 && termId) {
      this.fetchClearanceSnapshot(studentId, termId);
    }
  }

  /**
   * Gets reactive department status for a specific department (e.g. 'LIBRARY', 'ACCOUNTING').
   */
  getDeptStatus$(deptName: string): Observable<DepartmentClearanceItem | null> {
    const normalized = deptName.toUpperCase();
    return this.deptStatusMap$.pipe(
      map((mapObj) => mapObj[normalized] || null)
    );
  }

  mapDtoToMessage(dto: ClearanceRequestDto): ClearanceStatusMessage {
    const departments: DepartmentClearanceItem[] = (dto.signoffs || []).map((s) => ({
      departmentId: s.id,
      departmentName: s.departmentType,
      status: s.signoffStatus,
      remarks: s.remarks,
      clearedBy: s.signedByUsername,
      clearedAt: s.signedAt
    }));

    return {
      studentId: dto.studentProfileId,
      termId: dto.termId,
      overallStatus: dto.overallStatus,
      departments
    };
  }

  private cleanup(): void {
    this.wsStudentSubscription?.unsubscribe();
    this.wsStudentSubscription = undefined;
    this.wsAdminSubscription?.unsubscribe();
    this.wsAdminSubscription = undefined;
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
