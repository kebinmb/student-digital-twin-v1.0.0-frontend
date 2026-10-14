// File: src/app/core/services/teaching-assignment.service.ts

import { inject, Injectable, signal, computed, effect, untracked, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../service/authentication/auth-service';
import { SchedulingApiService } from '../service/scheduling/scheduling-api.service';
import { AcademicPeriodStore } from './academic-period.store';
import { UserContext } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class TeachingAssignmentService {
  private readonly authService = inject(AuthService);
  private readonly schedulingApi = inject(SchedulingApiService);
  private readonly periodStore = inject(AcademicPeriodStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly hasTeachingAssignments = signal<boolean>(false);
  readonly isChecking = signal<boolean>(false);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      const termId = this.periodStore.selectedTermId();
      untracked(() => {
        this.evaluateTeachingAssignments(user, termId);
      });
    });
  }

  evaluateTeachingAssignments(user: UserContext | null, termId: number | null): void {
    if (!user || !user.id) {
      this.hasTeachingAssignments.set(false);
      return;
    }

    const rawRoles = user.roles && user.roles.length > 0 ? user.roles : (user.role ? [user.role] : []);
    const normalizedRoles = rawRoles.map(r => r.replace(/^ROLE_/, '').toUpperCase());

    // Faculty members always have teaching role privileges
    if (normalizedRoles.includes('FACULTY')) {
      this.hasTeachingAssignments.set(true);
      return;
    }

    // Academic leadership roles (DEAN, CHAIRPERSON) can hold teaching loads
    const isAcademicLeader = normalizedRoles.includes('DEAN') || normalizedRoles.includes('CHAIRPERSON');
    if (!isAcademicLeader) {
      this.hasTeachingAssignments.set(false);
      return;
    }

    // Determine target term (selected or active)
    const effectiveTermId = termId || this.periodStore.activeTerm()?.id;
    if (!effectiveTermId) {
      this.schedulingApi.getSchedulingTerms().pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([]))
      ).subscribe(terms => {
        const active = terms.find(t => t.isActive) || terms[0];
        if (active) {
          this.queryTeachingLoad(user.id!, active.id);
        } else {
          this.hasTeachingAssignments.set(false);
        }
      });
      return;
    }

    this.queryTeachingLoad(user.id, effectiveTermId);
  }

  private queryTeachingLoad(userId: number, termId: number): void {
    this.isChecking.set(true);
    this.schedulingApi.getFacultyWorkload(termId, userId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => {
        // Fallback: query sections by term and inspect assigned timetable schedules
        return this.schedulingApi.getSectionsByTerm(termId).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe(result => {
      this.isChecking.set(false);
      if (result && 'assignedSections' in result && Array.isArray(result.assignedSections)) {
        this.hasTeachingAssignments.set(result.assignedSections.length > 0);
      } else if (Array.isArray(result)) {
        const hasAssigned = result.some(sec =>
          sec.schedules && sec.schedules.some(sch => sch.instructorUserId === userId)
        );
        this.hasTeachingAssignments.set(hasAssigned);
      } else {
        this.hasTeachingAssignments.set(false);
      }
    });
  }
}
