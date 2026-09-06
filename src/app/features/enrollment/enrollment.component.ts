import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { StudentAdvisingComponent } from './components/student-advising/student-advising.component';
import { CourseEnlistmentComponent } from './components/course-enlistment/course-enlistment.component';
import { EnrollmentAuditComponent } from './components/enrollment-audit/enrollment-audit.component';
import { EnrollmentStore } from './state/enrollment.store';
import { AuthService } from '../../core/service/authentication/auth-service';

import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-enrollment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectButtonModule,
    SelectModule,
    StudentAdvisingComponent,
    CourseEnlistmentComponent,
    EnrollmentAuditComponent
  ],
  templateUrl: './enrollment.component.html',
  styleUrls: ['./enrollment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentComponent implements OnInit {
  readonly store = inject(EnrollmentStore);
  readonly auth = inject(AuthService);

  readonly isStaff = computed(() => this.auth.hasAnyRole(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON']));

  readonly activeTab = signal<'advising' | 'enlistment' | 'audit'>('advising');

  readonly viewOptions = computed(() => {
    const opts = [
      { label: 'Student Advising & Checklist', value: 'advising', icon: 'pi pi-compass' },
      { label: 'Enlisted Courses & Timetable', value: 'enlistment', icon: 'pi pi-check-square' }
    ];
    if (this.isStaff()) {
      opts.push({ label: 'Registrar Oversight & Audit', value: 'audit', icon: 'pi pi-shield' });
    }
    return opts;
  });

  ngOnInit(): void {
    this.store.loadInitialData();
  }

  setTab(tab: 'advising' | 'enlistment' | 'audit'): void {
    this.activeTab.set(tab);
  }
}

