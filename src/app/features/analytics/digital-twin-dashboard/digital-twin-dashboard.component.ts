import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { DigitalTwinRiskProfileDto } from '../../../core/models/analytics.model';
import { StudentProfileResponse } from '../../../core/models/enrollment.model';
import { AuthService } from '../../../core/service/authentication/auth-service';

@Component({
  selector: 'app-digital-twin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    TagModule,
    ProgressBarModule,
    SkeletonModule,
    ToastModule,
    TooltipModule
  ],
  templateUrl: './digital-twin-dashboard.component.html',
  styleUrl: './digital-twin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DigitalTwinAnalyticsDashboardComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  readonly riskProfile = signal<DigitalTwinRiskProfileDto | null>(null);
  readonly studentProfile = signal<StudentProfileResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly currentStudentId = signal<number | null>(null);

  readonly isStudent = computed(() => this.authService.hasRole('STUDENT'));

  // Computed positive retention likelihood (e.g. 1 - dropout probability)
  readonly retentionRate = computed<number>(() => {
    const rp = this.riskProfile();
    if (!rp || rp.predictedDropoutProbability == null) return 100;
    const rate = (1 - Number(rp.predictedDropoutProbability)) * 100;
    return Math.max(0, Math.min(100, Math.round(rate * 10) / 10));
  });

  // Computed Academic Health Score out of 100
  readonly academicHealthScore = computed<number>(() => {
    const rp = this.riskProfile();
    if (!rp || rp.academicRiskScore == null) return 100;
    const health = 100 - Number(rp.academicRiskScore);
    return Math.max(0, Math.min(100, Math.round(health * 10) / 10));
  });

  // Computed Attendance Health Score out of 100
  readonly attendanceHealthScore = computed<number>(() => {
    const rp = this.riskProfile();
    if (!rp || rp.attendanceRiskScore == null) return 100;
    const health = 100 - Number(rp.attendanceRiskScore);
    return Math.max(0, Math.min(100, Math.round(health * 10) / 10));
  });

  ngOnInit(): void {
    // 1. If explicit studentId passed via route parameter or query string, prioritize it (advising / admin view)
    const paramId = this.route.snapshot.paramMap.get('studentId') || this.route.snapshot.queryParamMap.get('studentId');
    if (paramId && !isNaN(Number(paramId))) {
      const parsedId = Number(paramId);
      this.currentStudentId.set(parsedId);
      this.loadRiskProfile(parsedId);
      return;
    }

    // 2. If logged in as STUDENT, resolve the student's personal view data
    if (this.isStudent()) {
      this.loadStudentViewData();
    } else {
      // 3. For faculty / admin preview without query params, fallback to user ID or 1
      const defaultId = this.authService.getUserId() || 1;
      this.currentStudentId.set(defaultId);
      this.loadRiskProfile(defaultId);
    }
  }

  private loadStudentViewData(): void {
    this.isLoading.set(true);

    // Fetch full student profile metadata for program, classification, GPA, and clearances
    this.enrollmentApi.getCurrentStudentProfile().subscribe({
      next: (profile) => {
        this.studentProfile.set(profile);
        if (profile?.id) {
          this.currentStudentId.set(profile.id);
        }
      },
      error: (err) => console.warn('Could not load student profile metadata:', err)
    });

    // Fetch risk profile telemetry
    this.analyticsApi.getCurrentStudentRiskProfile().subscribe({
      next: (profile) => {
        this.riskProfile.set(profile);
        this.currentStudentId.set(profile.studentId);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback: try resolving student ID and calling numeric endpoint
        this.enrollmentApi.getCurrentStudentProfile().subscribe({
          next: (student) => {
            const id = student?.id || this.authService.getUserId() || 1;
            this.currentStudentId.set(id);
            this.loadRiskProfile(id);
          },
          error: () => {
            const fallbackId = this.authService.getUserId() || 1;
            this.currentStudentId.set(fallbackId);
            this.loadRiskProfile(fallbackId);
          }
        });
      }
    });
  }

  recalculateMLModel(): void {
    if (this.isStudent()) {
      this.isLoading.set(true);
      this.analyticsApi.getCurrentStudentRiskProfile().subscribe({
        next: (profile) => {
          this.riskProfile.set(profile);
          this.currentStudentId.set(profile.studentId);
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Telemetry Refreshed',
            detail: `Your academic digital twin telemetry has been updated with the latest grade and attendance records.`
          });
        },
        error: () => {
          const studentId = this.currentStudentId() || this.studentProfile()?.id || this.authService.getUserId() || 1;
          this.loadRiskProfile(studentId, true);
        }
      });
    } else {
      const studentId = this.currentStudentId() || 1;
      this.loadRiskProfile(studentId, true);
    }
  }

  loadRiskProfile(studentId: number, isRecalculation = false): void {
    this.isLoading.set(true);
    this.analyticsApi.getStudentRiskProfile(studentId).subscribe({
      next: (profile) => {
        this.riskProfile.set(profile);
        this.currentStudentId.set(profile.studentId);
        this.isLoading.set(false);
        if (isRecalculation) {
          this.messageService.add({
            severity: 'success',
            summary: this.isStudent() ? 'Telemetry Refreshed' : 'ML Risk Model Recalculated',
            detail: `Fresh multi-vector telemetry evaluated for ${profile.studentName} (${profile.studentNumber}).`
          });
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Analytics Error',
          detail: 'Failed to evaluate Student Digital Twin ML Risk Profile.'
        });
        this.isLoading.set(false);
      }
    });
  }

  getRiskSeverity(level: string | undefined): 'success' | 'info' | 'warn' | 'danger' {
    switch (level) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warn';
      case 'MODERATE': return 'info';
      default: return 'success';
    }
  }

  getStudentStatusLabel(level: string | undefined): string {
    switch (level) {
      case 'CRITICAL': return 'SUPPORT & INTERVENTION ACTIVE';
      case 'HIGH': return 'ACADEMIC ADVISORY RECOMMENDED';
      case 'MODERATE': return 'GOOD STANDING - ACTIVE';
      default: return 'OPTIMAL PROGRESSION';
    }
  }
}
