import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { CiloPiloMappingService, CourseOutcomeService, CourseService, ProgramService } from '../../../../core/services/institution.service';
import { CiloPiloMapping, Course, CourseOutcome, CreateCiloPiloMappingRequest, Program, ProgramOutcome } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

@Component({
  selector: 'app-cilo-pilo-matrix',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    SelectModule,
    TagModule,
    MessageModule
  ],
  templateUrl: './cilo-pilo-matrix.component.html',
  styleUrl: './cilo-pilo-matrix.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CiloPiloMatrixComponent implements OnInit {
  private readonly mappingService = inject(CiloPiloMappingService);
  private readonly courseService = inject(CourseService);
  private readonly outcomeService = inject(CourseOutcomeService);
  private readonly programService = inject(ProgramService);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON']);

  readonly programs = signal<Program[]>([]);
  readonly courses = signal<Course[]>([]);
  readonly pilos = signal<ProgramOutcome[]>([]);
  readonly cilos = signal<CourseOutcome[]>([]);

  // Local map of "ciloId_piloId" -> { id?: number, mappingType: string }
  readonly matrixData = signal<Map<string, { id?: number; mappingType: string }>>(new Map());
  readonly updatingCells = signal<Set<string>>(new Set());

  selectedProgramId: number | null = null;
  selectedCourseId: number | null = null;

  readonly programOptions = computed(() =>
    this.programs().map((p) => ({ label: `${p.code} - ${p.name}`, value: p.id }))
  );

  readonly courseOptions = computed(() =>
    this.courses().map((c) => ({ label: `${c.code} - ${c.title}`, value: c.id }))
  );

  ngOnInit(): void {
    this.loadPrograms();
    this.loadCourses();
  }

  loadPrograms(): void {
    this.programService.getAll().subscribe({
      next: (list) => {
        this.programs.set(list);
        if (list.length > 0 && !this.selectedProgramId) {
          this.selectedProgramId = list[0].id;
          this.onProgramChange();
        }
      },
      error: () => {}
    });
  }

  loadCourses(): void {
    this.courseService.getAllActive().subscribe({
      next: (list) => {
        this.courses.set(list);
        if (list.length > 0 && !this.selectedCourseId) {
          this.selectedCourseId = list[0].id;
          this.onCourseChange();
        }
      },
      error: () => {}
    });
  }

  onProgramChange(): void {
    this.matrixData.set(new Map());
    if (!this.selectedProgramId) {
      this.pilos.set([]);
      return;
    }

    this.programService.getOutcomes(this.selectedProgramId).subscribe({
      next: (outcomes) => {
        this.pilos.set(outcomes);
        this.refreshMatrixMappings();
      },
      error: () => this.pilos.set([])
    });
  }

  onCourseChange(): void {
    this.matrixData.set(new Map());
    if (!this.selectedCourseId) {
      this.cilos.set([]);
      return;
    }

    this.outcomeService.getByCourse(this.selectedCourseId).subscribe({
      next: (outcomes) => {
        this.cilos.set(outcomes);
        this.refreshMatrixMappings();
      },
      error: () => this.cilos.set([])
    });
  }

  refreshMatrixMappings(): void {
    if (!this.selectedProgramId || !this.selectedCourseId || this.cilos().length === 0 || this.pilos().length === 0) {
      return;
    }

    // Load mappings for this course and program matrix
    this.mappingService.getMatrix(this.selectedCourseId, this.selectedProgramId).subscribe({
      next: (mappings) => {
        const nextMap = new Map<string, { id?: number; mappingType: string }>();
        for (const m of mappings) {
          nextMap.set(`${m.courseOutcomeId}_${m.programOutcomeId}`, { id: m.id, mappingType: m.mappingType });
        }
        this.matrixData.set(nextMap);
      },
      error: () => {}
    });
  }

  getMapping(ciloId: number, piloId: number): string {
    const key = `${ciloId}_${piloId}`;
    return this.matrixData().get(key)?.mappingType || '';
  }

  isUpdatingCell(ciloId: number, piloId: number): boolean {
    return this.updatingCells().has(`${ciloId}_${piloId}`);
  }

  getMappingTooltip(ciloId: number, piloId: number): string {
    const val = this.getMapping(ciloId, piloId);
    if (!val) return 'Click to Introduce (I)';
    if (val === 'I') return 'Introduced -> Click to Emphasize (E)';
    if (val === 'E') return 'Emphasized -> Click to Demonstrate (D)';
    return 'Demonstrated -> Click to Clear';
  }

  cycleMapping(ciloId: number, piloId: number): void {
    const key = `${ciloId}_${piloId}`;
    const current = this.getMapping(ciloId, piloId);
    let next: string | null = null;

    if (!current) next = 'I';
    else if (current === 'I') next = 'E';
    else if (current === 'E') next = 'D';
    else next = null; // Clear

    // Optimistic UI update
    const currentMap = new Map(this.matrixData());
    const existingEntry = currentMap.get(key);

    if (next) {
      currentMap.set(key, { id: existingEntry?.id, mappingType: next });
    } else {
      currentMap.delete(key);
    }
    this.matrixData.set(currentMap);

    // Track cell loading
    const activeUpdating = new Set(this.updatingCells());
    activeUpdating.add(key);
    this.updatingCells.set(activeUpdating);

    if (next) {
      const req: CreateCiloPiloMappingRequest = {
        courseOutcomeId: ciloId,
        programOutcomeId: piloId,
        mappingType: next
      };

      this.mappingService.createOrUpdate(req).subscribe({
        next: (saved) => {
          const map = new Map(this.matrixData());
          map.set(key, { id: saved.id, mappingType: saved.mappingType });
          this.matrixData.set(map);

          const up = new Set(this.updatingCells());
          up.delete(key);
          this.updatingCells.set(up);
        },
        error: (err) => {
          // Revert on error
          const map = new Map(this.matrixData());
          if (existingEntry) map.set(key, existingEntry);
          else map.delete(key);
          this.matrixData.set(map);

          const up = new Set(this.updatingCells());
          up.delete(key);
          this.updatingCells.set(up);

          this.messageService.add({
            severity: 'error',
            summary: 'Alignment Update Failed',
            detail: err.error?.detail || 'Failed to update matrix mapping.'
          });
        }
      });
    } else if (existingEntry?.id) {
      this.mappingService.delete(existingEntry.id).subscribe({
        next: () => {
          const up = new Set(this.updatingCells());
          up.delete(key);
          this.updatingCells.set(up);
        },
        error: (err) => {
          // Revert
          const map = new Map(this.matrixData());
          map.set(key, existingEntry);
          this.matrixData.set(map);

          const up = new Set(this.updatingCells());
          up.delete(key);
          this.updatingCells.set(up);

          this.messageService.add({
            severity: 'error',
            summary: 'Clear Failed',
            detail: err.error?.detail || 'Failed to clear alignment mapping.'
          });
        }
      });
    } else {
      const up = new Set(this.updatingCells());
      up.delete(key);
      this.updatingCells.set(up);
    }
  }
}
