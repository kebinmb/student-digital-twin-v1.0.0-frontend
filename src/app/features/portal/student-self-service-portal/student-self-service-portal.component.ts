// File: src/app/features/portal/student-self-service-portal/student-self-service-portal.component.ts

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { KnobModule } from 'primeng/knob';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';

import { LmsApiService } from '../../../core/service/lms/lms-api.service';
import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { StudentSelfServiceSummaryDto, EnrolledCourseSummaryDto } from '../../../core/models/lms.model';
import { StudentSelfTelemetry, DispatchedIntervention, MilestoneDto } from '../../../core/models/analytics.model';
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
    RouterLink,
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
    KnobModule,
    ProgressBarModule,
    EmptyStateComponent
  ],
  templateUrl: './student-self-service-portal.component.html',
  styleUrl: './student-self-service-portal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentSelfServicePortalComponent implements OnInit {
  private readonly lmsApi = inject(LmsApiService);
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly portalData = signal<StudentSelfServiceSummaryDto | null>(null);
  readonly telemetryData = signal<StudentSelfTelemetry | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingTelemetry = signal<boolean>(false);
  readonly acknowledgingId = signal<number | null>(null);
  readonly searchQuery = signal<string>('');
  readonly expandedSectionId = signal<number | null>(null);

  // Computed filtered course list based on search query
  readonly filteredCourses = computed<EnrolledCourseSummaryDto[]>(() => {
    const data = this.portalData();
    if (!data || !data.currentCourses) return [];
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return data.currentCourses;

    return data.currentCourses.filter((c: EnrolledCourseSummaryDto) =>
      c.courseCode.toLowerCase().includes(query) ||
      c.courseTitle.toLowerCase().includes(query) ||
      c.scheduleText.toLowerCase().includes(query) ||
      c.sectionCode.toLowerCase().includes(query)
    );
  });

  // Computed total active enrolled credit units
  readonly totalActiveUnits = computed<number>(() => {
    const courses = this.portalData()?.currentCourses || [];
    return courses.reduce((acc: number, c: EnrolledCourseSummaryDto) => {
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

  // Dimensions list for template iteration
  readonly dimensionEntries = computed<{ name: string; score: number }[]>(() => {
    const telemetry = this.telemetryData();
    if (!telemetry || !telemetry.dimensionScores) return [];
    return Object.entries(telemetry.dimensionScores).map(([name, score]) => ({
      name,
      score: Math.round(score)
    }));
  });

  ngOnInit(): void {
    this.loadPortalSummary();
    this.loadSelfTelemetry();
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

  loadSelfTelemetry(): void {
    this.isLoadingTelemetry.set(true);
    this.analyticsApi.getStudentSelfTelemetry().subscribe({
      next: (data) => {
        this.telemetryData.set(data);
        this.isLoadingTelemetry.set(false);
      },
      error: () => {
        // Fallback gracefully without blocking the whole page
        this.isLoadingTelemetry.set(false);
      }
    });
  }

  acknowledgeIntervention(intervention: DispatchedIntervention): void {
    if (intervention.status === 'ACKNOWLEDGED' || intervention.status === 'RESOLVED') {
      return;
    }
    this.acknowledgingId.set(intervention.id);
    this.analyticsApi.acknowledgeStudentIntervention(intervention.id).subscribe({
      next: () => {
        this.acknowledgingId.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Intervention Acknowledged',
          detail: 'Your acknowledgment has been recorded.'
        });
        // Update local status
        const current = this.telemetryData();
        if (current) {
          const updatedRecs = current.recommendations.map(r =>
            r.id === intervention.id ? { ...r, status: 'ACKNOWLEDGED' as const } : r
          );
          this.telemetryData.set({ ...current, recommendations: updatedRecs });
        }
      },
      error: () => {
        this.acknowledgingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Action Failed',
          detail: 'Could not record acknowledgment. Please try again.'
        });
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

  getRiskSeverity(level: string | undefined): 'success' | 'warn' | 'danger' | 'info' {
    if (!level) return 'info';
    switch (level.toUpperCase()) {
      case 'LOW': return 'success';
      case 'MODERATE': return 'info';
      case 'HIGH': return 'warn';
      case 'CRITICAL': return 'danger';
      default: return 'info';
    }
  }

  getWellnessColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }
}
