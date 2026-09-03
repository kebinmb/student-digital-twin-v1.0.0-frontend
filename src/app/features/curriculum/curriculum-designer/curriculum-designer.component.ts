import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  CdkDropListGroup,
  DragDropModule
} from '@angular/cdk/drag-drop';

// PrimeNG UI Components
import { Button, ButtonModule } from 'primeng/button';
import { Tag, TagModule } from 'primeng/tag';
import { Dialog, DialogModule } from 'primeng/dialog';
import { Toast, ToastModule } from 'primeng/toast';
import { InputText, InputTextModule } from 'primeng/inputtext';
import { Tooltip, TooltipModule } from 'primeng/tooltip';
import { SelectButton } from 'primeng/selectbutton';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';

import { CurriculumDesignerStore } from './state/curriculum-designer.store';
import { CoursePaletteDrawerComponent } from './components/course-palette-drawer/course-palette-drawer.component';
import { PrerequisiteDagComponent } from './components/prerequisite-dag/prerequisite-dag.component';
import { ObeMatrixComponent } from './components/obe-matrix/obe-matrix.component';
import { CreateCurriculumDialogComponent } from './components/create-curriculum-dialog/create-curriculum-dialog.component';
import { CourseItemDto, TermStats } from '../../../core/models/curriculum-designer.model';

@Component({
  selector: 'app-curriculum-designer',
  standalone: true,
  providers: [CurriculumDesignerStore],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DragDropModule,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    Button,
    ButtonModule,
    Tag,
    TagModule,
    Dialog,
    DialogModule,
    Toast,
    ToastModule,
    InputText,
    InputTextModule,
    Tooltip,
    TooltipModule,
    SelectButton,
    Message,
    Skeleton,
    CoursePaletteDrawerComponent,
    PrerequisiteDagComponent,
    ObeMatrixComponent,
    CreateCurriculumDialogComponent
  ],
  templateUrl: './curriculum-designer.component.html',
  styleUrl: './curriculum-designer.component.css'
})
export class CurriculumDesignerComponent implements OnInit {
  protected readonly store = inject(CurriculumDesignerStore);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly isValidationModalOpen = signal<boolean>(false);
  readonly isStateTransitionModalOpen = signal<boolean>(false);
  readonly isCloneModalOpen = signal<boolean>(false);
  readonly isCreateModalOpen = signal<boolean>(false);

  readonly cloneCode = signal<string>('');
  readonly cloneName = signal<string>('');
  readonly cloneAy = signal<string>('');

  // PrimeNG SelectButton Tab Navigation Options
  readonly viewOptions = [
    { label: 'Year / Semester Board', value: 'board', icon: 'pi pi-table' },
    { label: 'Prerequisite DAG Visualizer', value: 'dag', icon: 'pi pi-sitemap' },
    { label: 'OBE Alignment Matrix', value: 'obe', icon: 'pi pi-th-large' }
  ];

  readonly totalCoursesCount = computed(() => {
    const curr = this.store.curriculum();
    if (!curr) return 0;
    let count = 0;
    for (const y of curr.yearBlocks) {
      for (const s of y.semesters) {
        count += s.courses.length;
      }
    }
    return count;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const idParam = params.get('id');
        const curriculumId = idParam ? parseInt(idParam, 10) : NaN;
        if (!isNaN(curriculumId) && curriculumId > 0) {
          this.store.loadCurriculum(curriculumId);
          this.store.loadAvailableCourses(undefined, curriculumId);
        } else {
          this.store.curriculum.set(null);
        }
      });
  }

  openCreateModal(): void {
    this.isCreateModalOpen.set(true);
  }

  onDrop(event: CdkDragDrop<CourseItemDto[]>): void {
    this.store.onCourseDropped(event);
  }

  getTermStats(yearLevel: number, semester: string): TermStats | undefined {
    const key = `${yearLevel}_${semester}`;
    return this.store.termStatistics().get(key);
  }

  getYearTotalUnits(yearLevel: number): number {
    const curr = this.store.curriculum();
    if (!curr) return 0;
    const block = curr.yearBlocks.find(y => y.yearLevel === yearLevel);
    if (!block) return 0;
    return block.semesters.reduce((acc, sem) => {
      return acc + sem.courses.reduce((cAcc, c) => cAcc + (Number(c.creditUnits) || 0), 0);
    }, 0);
  }

  getStatusSeverity(status?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
        return 'success';
      case 'UNDER_REVIEW':
        return 'info';
      case 'DRAFT':
        return 'warn';
      case 'ARCHIVED':
        return 'secondary';
      default:
        return 'info';
    }
  }

  openValidation(): void {
    this.store.runValidation();
    this.isValidationModalOpen.set(true);
  }

  openTransitionModal(): void {
    this.isStateTransitionModalOpen.set(true);
  }

  confirmTransition(status: string): void {
    this.isStateTransitionModalOpen.set(false);
    this.store.transitionState(status);
  }

  openCloneModal(): void {
    const curr = this.store.curriculum();
    if (curr) {
      this.cloneCode.set(`${curr.code}-REV`);
      this.cloneName.set(`${curr.name} (Revision)`);
      this.cloneAy.set('2027-2028');
    }
    this.isCloneModalOpen.set(true);
  }

  confirmClone(): void {
    if (!this.cloneCode() || !this.cloneName()) return;
    this.isCloneModalOpen.set(false);
    this.store.cloneCurriculum(this.cloneCode(), this.cloneName(), this.cloneAy());
  }

  reloadCurriculum(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const curriculumId = idParam ? parseInt(idParam, 10) : NaN;
    if (!isNaN(curriculumId) && curriculumId > 0) {
      this.store.loadCurriculum(curriculumId);
      this.store.loadAvailableCourses();
    } else {
      this.store.loadCurriculum(1);
      this.store.loadAvailableCourses();
    }
  }
}
