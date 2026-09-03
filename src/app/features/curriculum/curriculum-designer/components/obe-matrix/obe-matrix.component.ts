import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { CurriculumDesignerStore } from '../../state/curriculum-designer.store';
import { CourseItemDto } from '../../../../../core/models/curriculum-designer.model';

@Component({
  selector: 'app-obe-matrix',
  standalone: true,
  imports: [CommonModule, ButtonModule, Tag],
  template: `
    <div class="obe-card">
      <div class="obe-header">
        <div>
          <h3 class="obe-title">Outcome-Based Education (OBE) Alignment Matrix</h3>
          <p class="obe-subtitle">
            CHED CMO 2D Mapping: Course Outcomes (CILO) vs. Program Outcomes (PILO). Emphasis:
            <span style="font-weight: 600; color: #1d4ed8;">I (Introduced)</span>,
            <span style="font-weight: 600; color: #b45309;">E (Enabled)</span>,
            <span style="font-weight: 600; color: #116834;">D (Demonstrated)</span>.
          </p>
        </div>
        <div>
          <p-tag severity="info" value="Phase 2 OBE Mapping"></p-tag>
        </div>
      </div>

      <!-- Matrix Table -->
      <div class="obe-table-wrapper">
        <table class="obe-table">
          <thead>
            <tr>
              <th class="sticky-header-col">Course Code & Title</th>
              @for (pilo of programOutcomes(); track pilo.code) {
                <th class="pilo-header-col" [title]="pilo.description">
                  <div>{{ pilo.code }}</div>
                  <span class="pilo-label">{{ pilo.shortLabel }}</span>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (course of allCourses(); track course.curriculumCourseId) {
              <tr class="obe-data-row">
                <td class="sticky-course-col">
                  <div class="course-code-cell">{{ course.code }}</div>
                  <div class="course-title-cell">{{ course.title }}</div>
                </td>
                @for (pilo of programOutcomes(); track pilo.code) {
                  @let val = getCell(course.code, pilo.code);
                  <td
                    class="obe-cell"
                    [ngClass]="{
                      'cell-i': val === 'I',
                      'cell-e': val === 'E',
                      'cell-d': val === 'D',
                      'cell-empty': !val
                    }"
                    (click)="toggleCell(course.code, pilo.code)">
                    {{ val || '-' }}
                  </td>
                }
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="obe-footer-row">
              <td class="sticky-header-col" style="font-weight: 700; color: #334155;">PILO Attainment Coverage (I / E / D)</td>
              @for (pilo of programOutcomes(); track pilo.code) {
                @let counts = getPiloCounts(pilo.code);
                <td style="text-align: center; padding: 0.625rem; font-size: 0.6875rem;">
                  <div style="display: flex; justify-content: center; gap: 0.2rem; font-weight: 700;">
                    <span style="color: #1d4ed8;">{{ counts.i }}</span>/
                    <span style="color: #b45309;">{{ counts.e }}</span>/
                    <span style="color: #116834;">{{ counts.d }}</span>
                  </div>
                  @if (counts.d === 0) {
                    <span style="font-size: 0.625rem; color: #dc2626; font-weight: 600; display: block; margin-top: 0.15rem;">Missing D</span>
                  }
                </td>
              }
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .obe-card {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #ffffff;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .obe-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .obe-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .obe-subtitle {
      font-size: 0.75rem;
      color: #64748b;
      margin: 0.25rem 0 0;
    }

    .obe-table-wrapper {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    .obe-table {
      width: 100%;
      font-size: 0.75rem;
      border-collapse: collapse;
    }

    .sticky-header-col {
      position: sticky;
      left: 0;
      background: #f8fafc;
      z-index: 6;
      min-width: 220px;
      text-align: left;
      padding: 0.75rem 1rem;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
      color: #334155;
    }

    .pilo-header-col {
      padding: 0.75rem 0.5rem;
      text-align: center;
      min-width: 80px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      font-weight: 600;
      color: #334155;
    }

    .pilo-label {
      font-size: 0.625rem;
      font-weight: 400;
      color: #64748b;
      display: block;
      margin-top: 0.1rem;
    }

    .obe-data-row:hover {
      background-color: #f8fafc;
    }

    .sticky-course-col {
      position: sticky;
      left: 0;
      background: #ffffff;
      z-index: 5;
      min-width: 220px;
      padding: 0.625rem 1rem;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #f1f5f9;
    }

    .obe-data-row:hover .sticky-course-col {
      background-color: #f8fafc;
    }

    .course-code-cell {
      font-weight: 700;
      color: #0f172a;
    }

    .course-title-cell {
      font-size: 0.6875rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
      margin-top: 0.1rem;
    }

    .obe-cell {
      text-align: center;
      cursor: pointer;
      user-select: none;
      font-weight: 700;
      font-size: 0.8125rem;
      min-width: 72px;
      padding: 0.5rem;
      border-right: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      transition: background-color 0.12s ease;
    }

    .cell-i {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .cell-i:hover {
      background: #dbeafe;
    }

    .cell-e {
      background: #fefce8;
      color: #b45309;
    }

    .cell-e:hover {
      background: #fef9c3;
    }

    .cell-d {
      background: #ecfdf5;
      color: #116834;
    }

    .cell-d:hover {
      background: #d1fae5;
    }

    .cell-empty {
      color: #cbd5e1;
    }

    .cell-empty:hover {
      background: #f1f5f9;
    }

    .obe-footer-row {
      background: #f8fafc;
      border-top: 2px solid #e2e8f0;
    }
  `]
})
export class ObeMatrixComponent {
  readonly store = inject(CurriculumDesignerStore);

  readonly programOutcomes = signal([
    { code: 'PO-01', shortLabel: 'Computing Foundations', description: 'Apply computing fundamentals and mathematical theories' },
    { code: 'PO-02', shortLabel: 'System Analysis', description: 'Analyze complex computing problems' },
    { code: 'PO-03', shortLabel: 'System Design', description: 'Design, implement, and evaluate computing solutions' },
    { code: 'PO-04', shortLabel: 'Software Eng', description: 'Apply software engineering practices and toolsets' },
    { code: 'PO-05', shortLabel: 'Ethics & Privacy', description: 'Adhere to ethical, legal, and security standards' },
    { code: 'PO-06', shortLabel: 'Communication', description: 'Communicate effectively in multidisciplinary environments' }
  ]);

  // Local interactive mapping state (key: courseCode_piloCode -> level)
  private readonly matrixState = signal<Map<string, 'I' | 'E' | 'D' | ''>>(new Map());

  readonly allCourses = computed<CourseItemDto[]>(() => {
    const curr = this.store.curriculum();
    if (!curr) return [];
    const res: CourseItemDto[] = [];
    for (const y of curr.yearBlocks) {
      for (const s of y.semesters) {
        res.push(...s.courses);
      }
    }
    return res;
  });

  getCell(courseCode: string, piloCode: string): 'I' | 'E' | 'D' | '' {
    const key = `${courseCode}_${piloCode}`;
    return this.matrixState().get(key) || '';
  }

  toggleCell(courseCode: string, piloCode: string): void {
    if (!this.store.canEdit()) return;

    const key = `${courseCode}_${piloCode}`;
    const current = this.getCell(courseCode, piloCode);
    const order: Array<'I' | 'E' | 'D' | ''> = ['', 'I', 'E', 'D'];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const nextVal = order[nextIdx];

    const updated = new Map(this.matrixState());
    if (nextVal === '') {
      updated.delete(key);
    } else {
      updated.set(key, nextVal);
    }
    this.matrixState.set(updated);
  }

  getPiloCounts(piloCode: string): { i: number; e: number; d: number } {
    let i = 0, e = 0, d = 0;
    this.matrixState().forEach((val, key) => {
      if (key.endsWith(`_${piloCode}`)) {
        if (val === 'I') i++;
        if (val === 'E') e++;
        if (val === 'D') d++;
      }
    });
    return { i, e, d };
  }
}
