import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { CiloPiloMapping, Course, CourseOutcome, CreateCiloPiloMappingRequest, ProgramOutcome } from '../../../../core/models/institution.model';
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
  template: `
    <div class="institution-sub-card">
      <div class="card-header-row">
        <div>
          <h2 class="card-section-title">Outcome Alignment Matrix (CILO-PILO)</h2>
          <p class="card-section-subtitle">
            Curricular constructive alignment mapping Course Learning Outcomes (CILOs) to Program Educational Outcomes (PILOs).
          </p>
        </div>

        <!-- Legend -->
        <div class="matrix-legend">
          <span class="legend-title">Level:</span>
          <span class="legend-item"><span class="badge-i">I</span> Introduced</span>
          <span class="legend-item"><span class="badge-e">E</span> Emphasized</span>
          <span class="legend-item"><span class="badge-d">D</span> Demonstrated</span>
        </div>
      </div>

      <!-- Selectors for Program and Course -->
      <div class="selector-row">
        <div class="selector-item">
          <label class="selector-label">Degree Program (PILO Source) *</label>
          <p-select
            [options]="programOptions()"
            [(ngModel)]="selectedProgramId"
            (onChange)="onProgramChange()"
            placeholder="Select Degree Program"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full">
          </p-select>
        </div>

        <div class="selector-item">
          <label class="selector-label">Target Course (CILO Source) *</label>
          <p-select
            [options]="courseOptions()"
            [(ngModel)]="selectedCourseId"
            (onChange)="onCourseChange()"
            placeholder="Select Course"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            filterBy="label"
            styleClass="w-full">
          </p-select>
        </div>
      </div>

      <!-- State: No course or program selected -->
      @if (!selectedProgramId || !selectedCourseId) {
        <div class="guidance-banner">
          <i class="pi pi-info-circle guidance-icon"></i>
          <div>
            <h4 class="guidance-title">Select Program and Course</h4>
            <p class="guidance-text">Choose a Degree Program to load its Program Outcomes (PILOs) and a Course to populate its Intended Learning Outcomes (CILOs).</p>
          </div>
        </div>
      } @else if (cilos().length === 0) {
        <div class="guidance-banner warn-state">
          <i class="pi pi-exclamation-triangle guidance-icon"></i>
          <div>
            <h4 class="guidance-title">No CILOs Defined for Selected Course</h4>
            <p class="guidance-text">This course has no registered Course Intended Learning Outcomes. Configure CILOs in the Course Catalog before establishing matrix alignments.</p>
          </div>
        </div>
      } @else if (pilos().length === 0) {
        <div class="guidance-banner warn-state">
          <i class="pi pi-exclamation-triangle guidance-icon"></i>
          <div>
            <h4 class="guidance-title">No PILOs Defined for Selected Program</h4>
            <p class="guidance-text">This degree program has no registered Program Intended Learning Outcomes.</p>
          </div>
        </div>
      } @else {
        <!-- 2D Alignment Matrix -->
        <div class="matrix-wrapper">
          <table class="alignment-table">
            <thead>
              <tr>
                <th class="cilo-header-cell">Course Outcomes (CILOs)</th>
                @for (pilo of pilos(); track pilo.id) {
                  <th class="pilo-header-cell" [title]="pilo.description">
                    <div class="pilo-code">{{ pilo.code }}</div>
                    <div class="pilo-desc-tooltip">{{ pilo.description }}</div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (cilo of cilos(); track cilo.id) {
                <tr>
                  <td class="cilo-row-cell">
                    <div class="cilo-code-title">
                      <span class="code-badge">{{ cilo.code }}</span>
                      <p-tag [value]="cilo.bloomsLevel" severity="secondary" styleClass="text-xs"></p-tag>
                    </div>
                    <div class="cilo-desc-text">{{ cilo.description }}</div>
                  </td>
                  @for (pilo of pilos(); track pilo.id) {
                    <td class="cell-action-square">
                      <button
                        type="button"
                        class="cell-matrix-btn"
                        [class.cell-i]="getMapping(cilo.id, pilo.id) === 'I'"
                        [class.cell-e]="getMapping(cilo.id, pilo.id) === 'E'"
                        [class.cell-d]="getMapping(cilo.id, pilo.id) === 'D'"
                        [disabled]="!canManage() || isUpdatingCell(cilo.id, pilo.id)"
                        (click)="cycleMapping(cilo.id, pilo.id)"
                        [title]="getMappingTooltip(cilo.id, pilo.id)">
                        {{ getMapping(cilo.id, pilo.id) || '—' }}
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .institution-sub-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04);
    }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .card-section-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .card-section-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0.25rem 0 0;
    }
    .matrix-legend {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
    }
    .legend-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
    }
    .legend-item {
      font-size: 0.75rem;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      color: #334155;
    }
    .badge-i {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      border: 1px solid #bae6fd;
    }
    .badge-e {
      background: #fef3c7;
      color: #b45309;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      border: 1px solid #fde68a;
    }
    .badge-d {
      background: #dcfce7;
      color: #15803d;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      border: 1px solid #bbf7d0;
    }
    .selector-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
      background: #f8fafc;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #f1f5f9;
    }
    .selector-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .selector-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
    }
    .guidance-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
    }
    .guidance-banner.warn-state {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .guidance-icon {
      font-size: 1.75rem;
      color: #16a34a;
    }
    .warn-state .guidance-icon {
      color: #d97706;
    }
    .guidance-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .guidance-text {
      font-size: 0.8125rem;
      color: #475569;
      margin: 0.25rem 0 0;
    }
    .matrix-wrapper {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .alignment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
    .alignment-table th, .alignment-table td {
      border: 1px solid #e2e8f0;
      padding: 0.65rem 0.75rem;
    }
    .cilo-header-cell {
      background: #f8fafc;
      color: #1e293b;
      font-weight: 700;
      text-align: left;
      min-width: 260px;
    }
    .pilo-header-cell {
      background: #f8fafc;
      text-align: center;
      min-width: 90px;
      position: relative;
    }
    .pilo-code {
      font-weight: 700;
      font-family: monospace;
      color: #116834;
      font-size: 0.8125rem;
    }
    .pilo-desc-tooltip {
      font-size: 0.6875rem;
      color: #64748b;
      font-weight: normal;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100px;
    }
    .cilo-row-cell {
      vertical-align: top;
      background: #ffffff;
    }
    .cilo-code-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }
    .cilo-desc-text {
      font-size: 0.75rem;
      color: #334155;
      line-height: 1.35;
    }
    .code-badge {
      font-family: monospace;
      font-weight: 700;
      background: #f1f5f9;
      color: #0f172a;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-size: 0.75rem;
    }
    .cell-action-square {
      text-align: center;
      vertical-align: middle;
      background: #fafafa;
      padding: 0.35rem !important;
    }
    .cell-matrix-btn {
      width: 44px;
      height: 40px;
      border: 1px dashed #cbd5e1;
      background: #ffffff;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 700;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }
    .cell-matrix-btn:hover:not(:disabled) {
      border-color: #116834;
      color: #116834;
      background: #f0fdf4;
    }
    .cell-matrix-btn.cell-i {
      background: #e0f2fe;
      border: 1px solid #38bdf8;
      color: #0284c7;
    }
    .cell-matrix-btn.cell-e {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #d97706;
    }
    .cell-matrix-btn.cell-d {
      background: #dcfce7;
      border: 1px solid #22c55e;
      color: #16a34a;
    }
    .cell-matrix-btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    .w-full { width: 100%; }
    .text-xs { font-size: 0.6875rem !important; }
  `]
})
export class CiloPiloMatrixComponent implements OnInit {
  private readonly mappingService = inject(CiloPiloMappingService);
  private readonly courseService = inject(CourseService);
  private readonly outcomeService = inject(CourseOutcomeService);
  private readonly programService = inject(ProgramService);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'CHAIRPERSON']);

  readonly programs = signal<any[]>([]);
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
    if (!this.selectedProgramId || this.cilos().length === 0) return;

    // Load mappings for this program
    this.mappingService.getByProgramOutcome(this.selectedProgramId).subscribe({
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
