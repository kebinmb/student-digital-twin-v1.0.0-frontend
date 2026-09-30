import { Component, DestroyRef, OnInit, computed, effect, inject, input, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputText, InputTextModule } from 'primeng/inputtext';
import { Tooltip, TooltipModule } from 'primeng/tooltip';
import { SelectButton } from 'primeng/selectbutton';
import { Select } from 'primeng/select';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';

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
    ConfirmDialogModule,
    InputText,
    InputTextModule,
    Tooltip,
    TooltipModule,
    SelectButton,
    Select,
    Message,
    Skeleton,
    CoursePaletteDrawerComponent,
    PrerequisiteDagComponent,
    ObeMatrixComponent,
    CreateCurriculumDialogComponent
  ],
  templateUrl: './curriculum-designer.component.html',
  styleUrl: './curriculum-designer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CurriculumDesignerComponent implements OnInit {
  // Optional route-bound input for :id parameter (requires withComponentInputBinding())
  readonly id = input<string | number>();

  protected readonly store = inject(CurriculumDesignerStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly isValidationModalOpen = signal<boolean>(false);
  readonly isStateTransitionModalOpen = signal<boolean>(false);
  readonly isCloneModalOpen = signal<boolean>(false);
  readonly isCreateModalOpen = signal<boolean>(false);

  readonly selectedCurriculumId = signal<number | null>(null);
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

  readonly activeCurriculumOption = computed(() => {
    const id = this.store.curriculum()?.curriculumId ?? this.selectedCurriculumId();
    if (!id) return null;
    return this.store.curriculumOptions().find(c => c.id === id) || null;
  });

  constructor() {
    // React to route input binding changes
    effect(() => {
      const rawId = this.id();
      if (rawId !== undefined && rawId !== null && rawId !== '') {
        const curriculumId = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);
        if (!isNaN(curriculumId) && curriculumId > 0) {
          if (this.selectedCurriculumId() !== curriculumId || this.store.curriculum()?.curriculumId !== curriculumId) {
            untracked(() => {
              this.selectedCurriculumId.set(curriculumId);
              this.store.loadCurriculum(curriculumId);
            });
          }
        }
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
  this.store.loadCurriculumOptions();
  this.selectedCurriculumId.set(null);
  this.store.curriculum.set(null);
}

  onCurriculumChange(newId: number | null): void {
    if (!newId) return;
    this.selectedCurriculumId.set(newId);
    if (newId !== this.store.curriculum()?.curriculumId) {
      // Immediately trigger store rehydration without waiting for async router resolution
      this.store.loadCurriculum(newId);
      this.router.navigate(['/dashboard/curriculum/designer', newId]);
    }
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

  confirmDeleteCurriculum(): void {
    const curr = this.store.curriculum();
    if (!curr) return;

    if (curr.status === 'ACTIVE' || curr.status === 'APPROVED') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Action Prohibited',
        detail: 'Active or approved curricula cannot be deleted. Archive or revise instead.'
      });
      return;
    }

    this.confirmationService.confirm({
      key: 'curriculumDesignerConfirm',
      message: `Are you sure you want to permanently delete "${curr.name}" (${curr.code})? All associated term course assignments will be removed. This action cannot be undone.`,
      header: 'Confirm Curriculum Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete Permanently',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.store.deleteCurriculum(curr.curriculumId);
      }
    });
  }

  reloadCurriculum(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const selectedId = this.selectedCurriculumId();
    const curriculumId = idParam ? parseInt(idParam, 10) : (selectedId ?? NaN);
    if (!isNaN(curriculumId) && curriculumId > 0) {
      this.store.loadCurriculum(curriculumId);
    }
    // No fallback: if no valid curriculum is selected, do nothing.
    // Prevents a spurious GET /curricula/1/designer on initial load.
  }
}
