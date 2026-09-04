import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StudentAdvisingComponent } from './components/student-advising/student-advising.component';
import { CourseEnlistmentComponent } from './components/course-enlistment/course-enlistment.component';
import { EnrollmentStore } from './state/enrollment.store';

@Component({
  selector: 'app-enrollment',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    StudentAdvisingComponent,
    CourseEnlistmentComponent
  ],
  templateUrl: './enrollment.component.html',
  styleUrls: ['./enrollment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentComponent {
  readonly store = inject(EnrollmentStore);
  readonly activeTab = signal<'advising' | 'enlistment'>('advising');

  setTab(tab: 'advising' | 'enlistment'): void {
    this.activeTab.set(tab);
  }
}
