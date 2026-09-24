import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { SectionBuilderComponent } from './components/section-builder/section-builder.component';
import { TimetableGridComponent } from './components/timetable-grid/timetable-grid.component';

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
    TimetableGridComponent
  ],
  templateUrl: './scheduling.component.html',
  styleUrls: ['./scheduling.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchedulingComponent {
  readonly activeTab = signal<'sections' | 'timetable'>('sections');

  readonly viewOptions = [
    { label: 'Class Sections', value: 'sections', icon: 'pi pi-list' },
    { label: 'Weekly Timetable Matrix', value: 'timetable', icon: 'pi pi-calendar' }
  ];

  setTab(tab: 'sections' | 'timetable'): void {
    this.activeTab.set(tab);
  }
}

