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
  templateUrl: './obe-matrix.component.html',
  styleUrl: './obe-matrix.component.css'
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
