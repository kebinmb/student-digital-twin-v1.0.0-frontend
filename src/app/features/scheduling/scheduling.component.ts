import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SectionBuilderComponent } from './components/section-builder/section-builder.component';
import { TimetableGridComponent } from './components/timetable-grid/timetable-grid.component';

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [CommonModule, ButtonModule, SectionBuilderComponent, TimetableGridComponent],
  templateUrl: './scheduling.component.html',
  styleUrls: ['./scheduling.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchedulingComponent {
  readonly activeTab = signal<'sections' | 'timetable'>('sections');

  setTab(tab: 'sections' | 'timetable'): void {
    this.activeTab.set(tab);
  }
}
