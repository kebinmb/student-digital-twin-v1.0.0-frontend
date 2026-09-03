import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/service/authentication/auth-service';
import { CurriculumApiService } from '../../../../core/service/curriculum/curriculum-api.service';
import {
  AvailableCourseDto,
  CourseItemDto,
  CreateCurriculumRequest,
  DesignerViewResponse,
  RelocateCourseRequest,
  TermStats,
  ValidationReportDto
} from '../../../../core/models/curriculum-designer.model';

@Injectable()
export class CurriculumDesignerStore {
  private readonly api = inject(CurriculumApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  // State Signals
  readonly curriculum = signal<DesignerViewResponse | null>(null);
  readonly availableCourses = signal<AvailableCourseDto[]>([]);
  readonly validationReport = signal<ValidationReportDto | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly activeTab = signal<'board' | 'dag' | 'obe'>('board');
  readonly isSaving = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isSearching = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly selectedCourse = signal<CourseItemDto | null>(null);

  // Computed Signals
  readonly isEditableStatus = computed(() => {
    const status = this.curriculum()?.status;
    return status === 'DRAFT' || status === 'UNDER_REVIEW';
  });

  readonly hasEditRole = computed(() => {
    return this.authService.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON', 'REGISTRAR']);
  });

  readonly canEdit = computed(() => {
    return this.isEditableStatus() && this.hasEditRole();
  });

  readonly totalCurriculumUnits = computed(() => {
    const curr = this.curriculum();
    if (!curr) return 0;
    let total = 0;
    for (const y of curr.yearBlocks) {
      for (const s of y.semesters) {
        for (const c of s.courses) {
          total += Number(c.creditUnits) || 0;
        }
      }
    }
    return total;
  });

  readonly termStatistics = computed(() => {
    const curr = this.curriculum();
    const map = new Map<string, TermStats>();
    if (!curr) return map;

    for (const y of curr.yearBlocks) {
      for (const s of y.semesters) {
        const key = `${y.yearLevel}_${s.semester}`;
        let termUnits = 0;
        let termHours = 0;
        let anomalous = false;

        for (const c of s.courses) {
          termUnits += Number(c.creditUnits) || 0;
          const lec = Number(c.contactHoursLec) || 0;
          const lab = Number(c.contactHoursLab) || 0;
          termHours += (lec + lab);

          const expLec = Math.floor(Number(c.lectureUnits) || 0);
          const expLab = Math.floor(Number(c.labUnits) || 0) * 3;
          if (lec !== expLec || lab !== expLab) {
            anomalous = true;
          }
        }

        map.set(key, {
          totalUnits: termUnits,
          totalHours: termHours,
          isOverloadedUnits: termUnits > 24.0,
          isOverloadedHours: termHours > 30,
          hasAnomalousCourses: anomalous
        });
      }
    }
    return map;
  });

  readonly termLoadWarnings = computed(() => {
    const stats = this.termStatistics();
    const warnings: string[] = [];
    stats.forEach((val, key) => {
      const [year, sem] = key.split('_');
      if (val.isOverloadedUnits) {
        warnings.push(`Year ${year} ${sem}: Total units (${val.totalUnits}) exceed maximum recommended limit of 24.0 units.`);
      }
      if (val.isOverloadedHours) {
        warnings.push(`Year ${year} ${sem}: Contact hours (${val.totalHours} hrs/wk) exceed CHED limit of 30 hrs/wk.`);
      }
    });
    return warnings;
  });

  private normalizeCurriculumResponse(res: DesignerViewResponse): DesignerViewResponse {
    if (!res) return res;
    const yearBlocks = res.yearBlocks ? res.yearBlocks.map(yb => ({
      ...yb,
      semesters: yb.semesters ? yb.semesters.map(s => ({
        ...s,
        courses: s.courses ? [...s.courses] : []
      })) : []
    })) : [];

    // Ensure Year Levels 1 through 4 are present with standard 1st and 2nd semesters
    for (let y = 1; y <= 4; y++) {
      let yearBlock = yearBlocks.find(yb => yb.yearLevel === y);
      if (!yearBlock) {
        yearBlock = { yearLevel: y, semesters: [] };
        yearBlocks.push(yearBlock);
      }

      for (const sem of ['1ST_SEM', '2ND_SEM']) {
        let semBlock = yearBlock.semesters.find(s => s.semester === sem);
        if (!semBlock) {
          semBlock = {
            semester: sem,
            totalUnits: 0,
            totalContactHours: 0,
            courses: []
          };
          yearBlock.semesters.push(semBlock);
        }
      }

      // Sort semesters: 1ST_SEM first, then 2ND_SEM, then SUMMER
      yearBlock.semesters.sort((a, b) => {
        const order = ['1ST_SEM', '2ND_SEM', 'SUMMER'];
        const idxA = order.indexOf(a.semester);
        const idxB = order.indexOf(b.semester);
        return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
      });
    }

    yearBlocks.sort((a, b) => a.yearLevel - b.yearLevel);
    return {
      ...res,
      yearBlocks
    };
  }

  // Action Methods
  loadCurriculum(id: number): void {
    this.isLoading.set(true);
    this.api.getDesignerView(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.curriculum.set(this.normalizeCurriculumResponse(res));
          this.isLoading.set(false);
          this.loadAvailableCourses(this.searchQuery(), res.curriculumId);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Load Failed',
            detail: err.error?.detail || 'Failed to load curriculum design.'
          });
        }
      });
  }

  loadAvailableCourses(search?: string, explicitCurriculumId?: number): void {
    const currId = explicitCurriculumId || this.curriculum()?.curriculumId;
    if (!currId) return;
    this.isSearching.set(true);
    this.api.getAvailableCourses(currId, search)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.availableCourses.set(res || []);
          this.isSearching.set(false);
        },
        error: () => {
          this.isSearching.set(false);
        }
      });
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
    this.loadAvailableCourses(this.searchQuery());
  }

  onCourseDropped(event: CdkDragDrop<CourseItemDto[]>): void {
    if (!this.canEdit()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Read Only',
        detail: 'This curriculum is locked or you lack editing permissions.'
      });
      return;
    }

    const curr = this.curriculum();
    if (!curr) return;

    // Target container ID formatted as: "term-{yearLevel}-{semester}"
    const targetContainerId = event.container.id;
    const parts = targetContainerId.split('-');
    if (parts.length < 3) return;

    const targetYear = parseInt(parts[1], 10);
    const targetSem = parts.slice(2).join('-');

    // Snapshot state for rollback
    const rollbackSnapshot: DesignerViewResponse = JSON.parse(JSON.stringify(curr));

    // Perform optimistic local movement
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Trigger local signal reactivity
    this.curriculum.set({ ...curr });

    // Build batch payload for destination container
    const requests: RelocateCourseRequest[] = event.container.data.map((course, idx) => ({
      curriculumCourseId: course.curriculumCourseId,
      targetYearLevel: targetYear,
      targetSemester: targetSem,
      targetSequenceOrder: idx + 1
    }));

    this.isSaving.set(true);
    this.api.updateBatchCoursePositions(curr.curriculumId, requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          // Refresh designer view in background to sync all sequences
          this.api.getDesignerView(curr.curriculumId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(refreshed => this.curriculum.set(this.normalizeCurriculumResponse(refreshed)));
        },
        error: (err) => {
          this.isSaving.set(false);
          // Rollback state
          this.curriculum.set(rollbackSnapshot);
          this.messageService.add({
            severity: 'error',
            summary: 'Reorder Failed',
            detail: err.error?.detail || 'Unable to update course position.'
          });
        }
      });
  }

  addCourse(courseId: number, yearLevel: number, semester: string, category: string = 'PROFESSIONAL_MAJOR'): void {
    const curr = this.curriculum();
    if (!curr || !this.canEdit()) return;

    this.isSaving.set(true);
    this.api.addCourseToCurriculum(curr.curriculumId, {
      courseId,
      yearLevel,
      semester,
      category
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Course Added',
            detail: 'Course successfully assigned to curriculum.'
          });
          this.loadCurriculum(curr.curriculumId);
          this.loadAvailableCourses(this.searchQuery());
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Assignment Failed',
            detail: err.error?.detail || err.error?.message || 'Could not add course.'
          });
        }
      });
  }

  removeCourse(curriculumCourseId: number): void {
    const curr = this.curriculum();
    if (!curr || !this.canEdit()) return;

    this.isSaving.set(true);
    this.api.removeCourseFromCurriculum(curr.curriculumId, curriculumCourseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'info',
            summary: 'Course Removed',
            detail: 'Course removed from curriculum block.'
          });
          this.loadCurriculum(curr.curriculumId);
          this.loadAvailableCourses(this.searchQuery());
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Removal Failed',
            detail: err.error?.detail || 'Could not remove course.'
          });
        }
      });
  }

  addPrerequisite(courseId: number, prereqId: number, ruleType: string = 'HARD', minGrade: string = '3.00'): void {
    const curr = this.curriculum();
    if (!curr || !this.canEdit()) return;

    this.isSaving.set(true);
    this.api.addPrerequisite(curr.curriculumId, {
      courseId,
      prerequisiteCourseId: prereqId,
      ruleType,
      minGradeRequired: minGrade
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Prerequisite Added',
            detail: 'Prerequisite dependency created.'
          });
          this.loadCurriculum(curr.curriculumId);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Prerequisite Rejected',
            detail: err.error?.detail || err.error?.message || 'Prerequisite introduces a circular dependency or invalid rule.'
          });
        }
      });
  }

  removePrerequisite(prereqId: number): void {
    const curr = this.curriculum();
    if (!curr || !this.canEdit()) return;

    this.isSaving.set(true);
    this.api.removePrerequisite(curr.curriculumId, prereqId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'info',
            summary: 'Prerequisite Removed',
            detail: 'Dependency edge removed.'
          });
          this.loadCurriculum(curr.curriculumId);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: err.error?.detail || 'Could not remove prerequisite.'
          });
        }
      });
  }

  runValidation(): void {
    const curr = this.curriculum();
    if (!curr) return;

    this.isLoading.set(true);
    this.api.validateCurriculum(curr.curriculumId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.validationReport.set(report);
          this.isLoading.set(false);
          if (report.valid) {
            this.messageService.add({
              severity: 'success',
              summary: 'Curriculum Valid',
              detail: 'All CHED credit unit totals and prerequisite DAG checks passed!'
            });
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'Validation Diagnostics',
              detail: `Found ${report.errors.length} error(s) and ${report.warnings.length} warning(s).`
            });
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Audit Failed',
            detail: err.error?.detail || 'Unable to run validation audit.'
          });
        }
      });
  }

  transitionState(status: string): void {
    const curr = this.curriculum();
    if (!curr) return;

    this.isSaving.set(true);
    this.api.transitionState(curr.curriculumId, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Status Updated',
            detail: `Curriculum successfully transitioned to ${status}.`
          });
          this.loadCurriculum(curr.curriculumId);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Transition Rejected',
            detail: err.error?.detail || err.error?.message || 'Cannot transition state. Ensure all validation errors are resolved.'
          });
        }
      });
  }

  cloneCurriculum(newCode: string, newName: string, effectiveAy: string): void {
    const curr = this.curriculum();
    if (!curr) return;

    this.isSaving.set(true);
    this.api.cloneCurriculum(curr.curriculumId, {
      newCode,
      newName,
      effectiveAcademicYear: effectiveAy
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Curriculum Cloned',
            detail: `Created new revision ${res.code} (v${res.versionNumber}).`
          });
          this.router.navigate(['/dashboard/curriculum/designer', res.id]);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Clone Failed',
            detail: err.error?.detail || 'Could not clone curriculum.'
          });
        }
      });
  }

  createCurriculum(request: CreateCurriculumRequest, onSuccess?: (newId: number) => void): void {
    this.isSaving.set(true);
    this.api.createCurriculum(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Curriculum Created',
            detail: `Curriculum ${res.code} successfully created in DRAFT status.`
          });
          if (onSuccess) {
            onSuccess(res.id);
          } else {
            this.router.navigate(['/dashboard/curriculum/designer', res.id]);
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Creation Failed',
            detail: err.error?.detail || err.error?.message || 'Could not create new curriculum.'
          });
        }
      });
  }
}
