// File: src/app/features/portal/student-self-service-portal/student-self-service-portal.component.ts

import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
import { DialogModule } from 'primeng/dialog';
import { AvatarModule } from 'primeng/avatar';
import { MessageService } from 'primeng/api';

import { LmsApiService } from '../../../core/service/lms/lms-api.service';
import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { OfflineStudentCardService } from '../../../core/services/offline-student-card.service';
import { TermService } from '../../../core/services/institution.service';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';
import { CertificateVerification } from '../../../core/models/institution.model';
import { StudentSelfServiceSummaryDto, EnrolledCourseSummaryDto } from '../../../core/models/lms.model';
import { StudentSelfTelemetry, DispatchedIntervention, MilestoneDto } from '../../../core/models/analytics.model';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { WebPushService, PushPreferences } from '../../../core/services/web-push.service';
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
    DialogModule,
    AvatarModule,
    EmptyStateComponent
  ],
  templateUrl: './student-self-service-portal.component.html',
  styleUrl: './student-self-service-portal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentSelfServicePortalComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  protected readonly periodStore = inject(AcademicPeriodStore);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly lmsApi = inject(LmsApiService);
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly termService = inject(TermService);
  readonly offlineService = inject(OfflineStudentCardService);
  readonly webPushService = inject(WebPushService);

  constructor() {
    effect(() => {
      const globalTermId = this.periodStore.selectedTermId();
      if (globalTermId) {
        this.loadTermPortalData(globalTermId);
      }
    });
  }

  private studentEventsSub?: Subscription;

  readonly portalData = signal<StudentSelfServiceSummaryDto | null>(null);
  readonly telemetryData = signal<StudentSelfTelemetry | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingTelemetry = signal<boolean>(false);
  readonly acknowledgingId = signal<number | null>(null);
  readonly searchQuery = signal<string>('');
  readonly expandedSectionId = signal<number | null>(null);
  readonly isOfflinePassOpen = signal<boolean>(false);
  readonly isCertificateDialogOpen = signal<boolean>(false);
  readonly selectedCertificate = signal<CertificateVerification | null>(null);
  readonly isLoadingCertificate = signal<boolean>(false);
  readonly isPreferencesDialogOpen = signal<boolean>(false);
  readonly isSavingPreferences = signal<boolean>(false);
  readonly pushPrefs = signal<PushPreferences>({ notifyGrades: true, notifyClearance: true, notifyHonors: true, notifyAttendance: true });

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

  ngOnInit(): void {
    this.loadPortalSummary();
    this.loadSelfTelemetry();
    this.subscribeToRealtimeEvents();
  }

  ngOnDestroy(): void {
    this.studentEventsSub?.unsubscribe();
  }

  private subscribeToRealtimeEvents(): void {
    const studentProfileId = this.authService.getStudentProfileId();
    this.studentEventsSub = this.lmsApi.subscribeToStudentEvents(studentProfileId || undefined).subscribe({
      next: (event) => {
        if (event.eventType === 'GRADE_RELEASED') {
          this.messageService.add({
            severity: 'success',
            summary: 'Grade Released',
            detail: `${event.courseCode}: Grade ${event.grade != null ? event.grade.toFixed(2) : 'Submitted'} (${event.status})`
          });
          this.loadPortalSummary();
        } else if (event.eventType === 'CLEARANCE_UPDATED') {
          this.messageService.add({
            severity: event.signoffStatus === 'APPROVED' ? 'success' : 'warn',
            summary: 'Clearance Update',
            detail: `${event.departmentType}: ${event.signoffStatus} (Overall: ${event.overallStatus})`
          });
          this.loadPortalSummary();
        } else if (event.eventType === 'STANDING_UPDATED') {
          this.messageService.add({
            severity: 'info',
            summary: 'Academic Standing Updated',
            detail: `GPA: ${event.gpa != null ? event.gpa.toFixed(2) : 'N/A'}, Units Earned: ${event.totalUnitsEarned != null ? event.totalUnitsEarned : '0.00'}`
          });
          this.loadPortalSummary();
        } else if (event.eventType === 'ATTENDANCE_VERIFIED') {
          this.messageService.add({
            severity: 'success',
            summary: 'Attendance Verified',
            detail: `${event.courseCode || 'Class'}: Marked ${event.status || 'PRESENT'} for session #${event.sessionId}`
          });
          this.loadSelfTelemetry();
        } else if (event.eventType === 'INTERVENTION_DISPATCHED') {
          this.messageService.add({
            severity: event.riskLevel === 'CRITICAL' ? 'error' : 'warn',
            summary: 'Advisory Alert Dispatched',
            detail: `${event.interventionType}: ${event.triggerFactor || 'New academic advisory action required'}`
          });
          this.loadSelfTelemetry();
        }
      },
      error: (err) => {
        console.warn('Real-time student stream disconnected:', err);
      }
    });
  }

  navigateToEnrolment(): void {
    this.router.navigate(['/dashboard/enrollment']);
  }

  loadPortalSummary(): void {
    const termId = this.periodStore.selectedTermId() || 1;
    this.loadTermPortalData(termId);
  }

  loadTermPortalData(termId: number): void {
    this.isLoading.set(true);

    forkJoin({
      summary: this.lmsApi.getMyStudentPortalSummary().pipe(catchError(() => of(null))),
      enrollment: this.enrollmentApi.getMyEnrollment(termId).pipe(
        catchError(() => {
          const profileId = this.authService.getStudentProfileId();
          return profileId
            ? this.enrollmentApi.getEnrollment(profileId, termId).pipe(catchError(() => of(null)))
            : of(null);
        })
      )
    }).subscribe({
      next: ({ summary, enrollment }) => {
        const isEnrolled = enrollment && enrollment.status !== 'NOT_ENROLLED' && enrollment.items && enrollment.items.length > 0;

        let activeCourses: EnrolledCourseSummaryDto[] = [];
        if (isEnrolled && enrollment?.items) {
          activeCourses = enrollment.items.map(it => ({
            sectionId: it.sectionId,
            sectionCode: it.sectionCode,
            courseCode: it.courseCode,
            courseTitle: it.courseTitle,
            creditUnits: it.creditUnits != null ? it.creditUnits.toString() : '3.0',
            scheduleText: it.scheduleSummary || 'Class Schedule TBA',
            gradeStatus: it.completionStatus || 'ENROLLED',
            currentGrade: it.finalNumericalGrade != null ? it.finalNumericalGrade.toFixed(2) : ''
          }));
        }

        const profileId = summary?.studentId || this.authService.getStudentProfileId() || 1;
        if (summary) {
          this.portalData.set({
            ...summary,
            currentCourses: activeCourses
          });
          this.offlineService.savePass({ ...summary, currentCourses: activeCourses }, this.academicStanding().label);
        } else {
          this.portalData.set({
            studentId: profileId,
            studentNumber: enrollment?.studentNumber || this.authService.getStudentNumber() || '',
            studentName: this.authService.currentUser()?.username || 'Student User',
            programCode: 'BSIT',
            yearLevel: 3,
            cumulativeGpa: '0.00',
            totalUnitsEarned: '0.00',
            financialClearance: isEnrolled ? 'CLEARED' : 'PENDING',
            departmentalClearance: isEnrolled ? 'CLEARED' : 'PENDING',
            currentCourses: activeCourses
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        const cached = this.offlineService.cachedPass();
        if (cached) {
          this.portalData.set({
            studentId: cached.studentId,
            studentNumber: cached.studentNumber,
            studentName: cached.studentName,
            programCode: cached.programCode,
            yearLevel: cached.yearLevel,
            cumulativeGpa: cached.cumulativeGpa,
            totalUnitsEarned: cached.totalUnitsEarned || '0.00',
            financialClearance: cached.financialClearance,
            departmentalClearance: cached.departmentalClearance,
            currentCourses: cached.courses
          });
          this.messageService.add({
            severity: 'info',
            summary: 'Offline Cache Active',
            detail: 'Network unavailable. Displaying cached digital campus pass and schedule.'
          });
        } else {
          this.portalData.set(null);
          this.messageService.add({
            severity: 'error',
            summary: 'Portal Summary Error',
            detail: 'Failed to retrieve student self-service portal data.'
          });
        }
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

  getBarcodeSvg(): string {
    const studentNo = this.portalData()?.studentNumber || this.offlineService.cachedPass()?.studentNumber || '2026-0000';
    return this.offlineService.generateBarcodeSvg(studentNo);
  }

  openOfflinePass(): void {
    this.isOfflinePassOpen.set(true);
  }

  openHonorCertificate(): void {
    const student = this.portalData();
    if (!student || !student.studentId) return;

    this.isLoadingCertificate.set(true);
    this.isCertificateDialogOpen.set(true);

    this.termService.getActive().subscribe({
      next: (activeTerm) => {
        if (!activeTerm) {
          this.isLoadingCertificate.set(false);
          this.messageService.add({
            severity: 'warn',
            summary: 'No Active Term',
            detail: 'Active term could not be determined.'
          });
          return;
        }

        this.termService.getHonorCertificate(activeTerm.id, student.studentId).subscribe({
          next: (cert) => {
            this.selectedCertificate.set(cert);
            this.isLoadingCertificate.set(false);
          },
          error: (err) => {
            this.isLoadingCertificate.set(false);
            this.messageService.add({
              severity: 'info',
              summary: 'Certificate Notice',
              detail: err.error?.detail || 'Honor certificate not yet issued for the active term.'
            });
          }
        });
      },
      error: () => {
        this.isLoadingCertificate.set(false);
      }
    });
  }

  printCertificate(): void {
    window.print();
  }

  async toggleWebPush(): Promise<void> {
    if (this.webPushService.isSubscribed()) {
      try {
        await this.webPushService.unsubscribe();
        this.messageService.add({
          severity: 'info',
          summary: 'Push Notifications Paused',
          detail: 'This browser device will no longer receive background push alerts.'
        });
      } catch (e: any) {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to Unsubscribe',
          detail: e?.message || 'Could not disable notifications.'
        });
      }
    } else {
      try {
        await this.webPushService.subscribe();
        this.messageService.add({
          severity: 'success',
          summary: 'Web Push Notifications Enabled!',
          detail: 'You will receive real-time alerts for grade releases, clearance approvals, and honors awards.'
        });
      } catch (e: any) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Notification Permission',
          detail: e?.message || 'Push notification permission was not granted or failed to setup.'
        });
      }
    }
  }

  sendTestPushNotification(): void {
    this.webPushService.sendTestNotification().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Test Push Dispatched',
          detail: 'A background push test alert was queued for your device.'
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Test Push Failed',
          detail: err?.error?.message || 'Could not send test push notification.'
        });
      }
    });
  }

  openPushPreferences(): void {
    this.webPushService.getPreferences().subscribe({
      next: (prefs) => {
        if (prefs) this.pushPrefs.set(prefs);
        this.isPreferencesDialogOpen.set(true);
      },
      error: () => {
        this.isPreferencesDialogOpen.set(true);
      }
    });
  }

  togglePref(key: keyof PushPreferences): void {
    this.pushPrefs.update(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  savePushPreferences(): void {
    this.isSavingPreferences.set(true);
    this.webPushService.updatePreferences(this.pushPrefs()).subscribe({
      next: (saved) => {
        this.pushPrefs.set(saved);
        this.isSavingPreferences.set(false);
        this.isPreferencesDialogOpen.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Preferences Updated',
          detail: 'Push notification alert categories saved.'
        });
      },
      error: (err) => {
        this.isSavingPreferences.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: err?.error?.message || 'Could not save notification preferences.'
        });
      }
    });
  }
}
