import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal, inject, computed, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageService } from 'primeng/api';
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
  private readonly messageService = inject(MessageService);

  readonly isStaff = computed(() => this.auth.hasAnyRole(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'FACULTY']));
  readonly isStudent = computed(() => this.auth.hasRole('STUDENT'));
  readonly canViewAudit = computed(() => this.auth.hasAnyRole(['ADMIN', 'REGISTRAR', 'DEAN']));

  readonly activeTab = signal<'advising' | 'enlistment' | 'audit'>('advising');
  private lastNotifiedTermId: number | null = null;

  constructor() {
    effect(() => {
      const isClosed = this.store.isEnrollmentClosed();
      const isStudentUser = this.isStudent();
      const term = this.store.selectedTerm();

      if (isClosed && isStudentUser && term) {
        if (this.activeTab() !== 'advising') {
          this.activeTab.set('advising');
        }
        if (this.lastNotifiedTermId !== term.id) {
          this.lastNotifiedTermId = term.id;
          this.messageService.add({
            severity: 'warn',
            summary: 'Enrollment Closed',
            detail: `The enrollment period for ${term.termName || 'the selected term'} is currently closed. Course enlistment and schedule changes are disabled.`,
            life: 8000
          });
        }
      } else if (!isClosed) {
        this.lastNotifiedTermId = null;
      }
    });
  }

  readonly viewOptions = computed(() => {
    // In STUDENT role, hide the other options (e.g. Enlisted Courses & Timetable) if enrollment is closed
    if (this.store.isEnrollmentClosed() && this.isStudent()) {
      return [
        { label: 'Student Advising & Checklist', value: 'advising', icon: 'pi pi-compass' }
      ];
    }

    const opts = [
      { label: 'Student Advising & Checklist', value: 'advising', icon: 'pi pi-compass' },
      { label: 'Enlisted Courses & Timetable', value: 'enlistment', icon: 'pi pi-check-square' }
    ];
    if (this.canViewAudit()) {
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

