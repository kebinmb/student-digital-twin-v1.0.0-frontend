import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { SectionBuilderComponent } from './components/section-builder/section-builder.component';
import { TimetableGridComponent } from './components/timetable-grid/timetable-grid.component';

import { SchedulingOverridesComponent } from './components/scheduling-overrides/scheduling-overrides.component';

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectButtonModule,
    SkeletonModule,
    SectionBuilderComponent,
    TimetableGridComponent,
    SchedulingOverridesComponent
  ],
  templateUrl: './scheduling.component.html',
  styleUrls: ['./scheduling.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchedulingComponent {
  readonly activeTab = signal<'sections' | 'timetable' | 'overrides'>('sections');

  readonly viewOptions = [
    { label: 'Class Sections', value: 'sections', icon: 'pi pi-list' },
    { label: 'Weekly Timetable Matrix', value: 'timetable', icon: 'pi pi-calendar' },
    { label: 'Override Approvals', value: 'overrides', icon: 'pi pi-check-square' }
  ];

  setTab(tab: 'sections' | 'timetable' | 'overrides'): void {
    this.activeTab.set(tab);
  }
}

