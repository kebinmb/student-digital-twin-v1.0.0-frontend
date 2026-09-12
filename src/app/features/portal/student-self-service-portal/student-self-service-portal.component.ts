// File: src/app/features/portal/student-self-service-portal/student-self-service-portal.component.ts

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { LmsApiService } from '../../../core/service/lms/lms-api.service';
import { StudentSelfServiceSummaryDto, EnrolledCourseSummaryDto } from '../../../core/models/lms.model';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

export interface StandingInfo {
  label: string;
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
  icon: string;
}

@Component({
  selector: 'app-student-self-service-portal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    CardModule,
    SkeletonModule,
    MessageModule,
    ToastModule,
    InputTextModule,
    BadgeModule,
    TooltipModule,
    EmptyStateComponent
  ],
  templateUrl: './student-self-service-portal.component.html',
  styleUrl: './student-self-service-portal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentSelfServicePortalComponent implements OnInit {
  private readonly lmsApi = inject(LmsApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly portalData = signal<StudentSelfServiceSummaryDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly expandedSectionId = signal<number | null>(null);

  // Computed filtered course list based on search query
  readonly filteredCourses = computed<EnrolledCourseSummaryDto[]>(() => {
    const data = this.portalData();
    if (!data || !data.currentCourses) return [];
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return data.currentCourses;

    return data.currentCourses.filter(c =>
      c.courseCode.toLowerCase().includes(query) ||
      c.courseTitle.toLowerCase().includes(query) ||
      c.scheduleText.toLowerCase().includes(query) ||
      c.sectionCode.toLowerCase().includes(query)
    );
  });

  // Computed total active enrolled credit units
  readonly totalActiveUnits = computed<number>(() => {
    const courses = this.portalData()?.currentCourses || [];
    return courses.reduce((acc, c) => {
      const units = parseFloat(c.creditUnits) || 0;
      return acc + units;
    }, 0);
  });

  // Computed Academic Standing based on Philippine grading system (1.00 - 3.00 is passing)
  readonly academicStanding = computed<StandingInfo>(() => {
    const gpaStr = this.portalData()?.cumulativeGpa;
    if (!gpaStr) return { label: 'Good Standing', severity: 'info', icon: 'pi-check-circle' };
    const gpa = parseFloat(gpaStr);
    if (isNaN(gpa)) return { label: 'Good Standing', severity: 'info', icon: 'pi-check-circle' };

    if (gpa <= 1.25) {
      return { label: "President's List Candidate", severity: 'success', icon: 'pi-star-fill' };
    } else if (gpa <= 1.75) {
      return { label: "Dean's List Candidate", severity: 'success', icon: 'pi-award' };
    } else if (gpa <= 3.00) {
      return { label: 'Good Academic Standing', severity: 'info', icon: 'pi-check-circle' };
    } else {
      return { label: 'Academic Warning', severity: 'warn', icon: 'pi-exclamation-triangle' };
    }
  });

  ngOnInit(): void {
    this.loadPortalSummary();
  }

  loadPortalSummary(): void {
    this.isLoading.set(true);
    const sid = this.authService.getUserId() || 1;
    this.lmsApi.getStudentPortalSummary(sid).subscribe({
      next: (data) => {
        this.portalData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Portal Summary Error',
          detail: 'Failed to retrieve student self-service portal data.'
        });
        this.isLoading.set(false);
      }
    });
  }

  toggleCourseExpand(sectionId: number): void {
    if (this.expandedSectionId() === sectionId) {
      this.expandedSectionId.set(null);
    } else {
      this.expandedSectionId.set(sectionId);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  getGradeSeverity(grade: string | null | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (!grade || grade === 'N/A' || grade === '—' || grade === 'INC') return 'secondary';
    const numericGrade = parseFloat(grade);
    if (isNaN(numericGrade)) {
      if (grade.toUpperCase() === 'PASSED' || grade.toUpperCase() === 'CLEARED') return 'success';
      if (grade.toUpperCase() === 'FAILED' || grade.toUpperCase() === 'DRP') return 'danger';
      return 'secondary';
    }
    if (numericGrade <= 1.75) return 'success';
    if (numericGrade <= 3.00) return 'info';
    return 'danger';
  }

  getClearanceSeverity(status: string | null | undefined): 'success' | 'warn' | 'danger' | 'info' {
    if (!status) return 'info';
    const upper = status.toUpperCase();
    if (upper === 'CLEARED') return 'success';
    if (upper === 'HOLD' || upper === 'PENDING') return 'warn';
    if (upper === 'BLOCKED') return 'danger';
    return 'info';
  }
}
