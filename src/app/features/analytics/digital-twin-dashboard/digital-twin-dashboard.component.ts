import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { KnobModule } from 'primeng/knob';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';
import { 
  DigitalTwinRiskProfileDto, 
  StudentTelemetryAdminSummary, 
  FacultySectionOption,
  StudentSelfTelemetry,
  TelemetryKpiSummary
} from '../../../core/models/analytics.model';
import { StudentProfileResponse } from '../../../core/models/enrollment.model';
import { StudentProfileService } from '../../../core/services/student-profile.service';
import { AuthService } from '../../../core/service/authentication/auth-service';

import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-digital-twin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TagModule,
    ProgressBarModule,
    SkeletonModule,
    ToastModule,
    TooltipModule,
    TableModule,
    DialogModule,
    DrawerModule,
    InputTextModule,
    AvatarModule,
    ChipModule,
    BadgeModule,
    KnobModule,
    MessageModule,
    SelectModule,
    EmptyStateComponent
  ],
  templateUrl: './digital-twin-dashboard.component.html',
  styleUrl: './digital-twin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DigitalTwinAnalyticsDashboardComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly authService = inject(AuthService);
  readonly periodStore = inject(AcademicPeriodStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly studentProfileService = inject(StudentProfileService, { optional: true });

  private lastLoadedTermId: number | null = null;

  constructor() {
    if (this.studentProfileService) {
      effect(() => {
        const p = this.studentProfileService?.profile();
        if (p) {
          untracked(() => this.studentProfile.set(p));
        }
      });
    }
    effect(() => {
      const globalTermId = this.periodStore.selectedTermId();
      if (globalTermId) {
        untracked(() => {
          if (globalTermId !== this.lastLoadedTermId) {
            this.lastLoadedTermId = globalTermId;
            if (this.isAdmin()) {
              this.fetchAdminTelemetry();
              this.fetchAdminTelemetryKpi();
            } else if (this.isFaculty()) {
              this.fetchFacultyAssignedSections();
              this.fetchFacultyTelemetry();
              this.fetchFacultyTelemetryKpi();
            } else if (this.isStudent()) {
              this.loadStudentViewData();
            }
          }
        });
      }
    });
  }

  // PrimeNG Select Option Arrays
  readonly riskLevelOptions = [
    { label: 'All Risk Levels', value: 'ALL' },
    { label: 'Critical Risk Only', value: 'CRITICAL' },
    { label: 'High Risk Only', value: 'HIGH' },
    { label: 'Moderate Risk Only', value: 'MODERATE' },
    { label: 'Low Risk Only', value: 'LOW' }
  ];

  readonly interventionStatusOptions = [
    { label: 'All Intervention Statuses', value: 'ALL' },
    { label: 'Dispatched', value: 'DISPATCHED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
    { label: 'Resolved', value: 'RESOLVED' }
  ];

  readonly interventionTypeOptions = [
    { label: 'Guidance Counseling Session', value: 'GUIDANCE_COUNSELING' },
    { label: 'Academic Peer Tutoring', value: 'ACADEMIC_TUTORING' },
    { label: 'Attendance Conference', value: 'ATTENDANCE_CONFERENCE' },
    { label: 'UniFAST Financial Aid Review', value: 'FINANCIAL_SUBSIDY_AID' },
    { label: 'Peer Mentoring Assignment', value: 'PEER_MENTORING' }
  ];

  readonly facultySectionOptions = computed(() => [
    { label: 'All My Assigned Sections', value: 'ALL' },
    ...this.facultySections().map(sec => ({
      label: `${sec.sectionCode} — ${sec.courseCode} (${sec.enrolledCount || 0} Enrolled)`,
      value: String(sec.sectionId)
    }))
  ]);

  // Reactive Forms
  readonly filterForm = this.fb.group({
    searchQuery: [''],
    riskLevel: ['ALL'],
    interventionStatus: ['ALL'],
    sectionId: ['ALL']
  });

  readonly dispatchForm = this.fb.group({
    interventionType: ['GUIDANCE_COUNSELING', [Validators.required]],
    triggerReason: ['Critical Risk Level Triggered by AI Telemetry', [Validators.required, Validators.minLength(5)]],
    notes: ['']
  });

  // General & Student Signals
  readonly riskProfile = signal<DigitalTwinRiskProfileDto | null>(null);
  readonly studentProfile = signal<StudentProfileResponse | null>(this.studentProfileService?.profile() ?? null);
  readonly isLoading = signal<boolean>(false);
  readonly currentStudentId = signal<number | null>(null);

  // Admin & Faculty Telemetry View Signals
  readonly adminTelemetryList = signal<StudentTelemetryAdminSummary[]>([]);
  readonly adminTotalElements = signal<number>(0);
  readonly adminIsLoading = signal<boolean>(false);
  readonly adminSearchQuery = signal<string>('');
  readonly adminRiskLevelFilter = signal<string>('ALL');
  readonly adminInterventionStatusFilter = signal<string>('ALL');
  readonly adminPageIndex = signal<number>(0);
  readonly adminPageSize = signal<number>(10);

  // Faculty Specific Signals
  readonly facultySections = signal<FacultySectionOption[]>([]);
  readonly selectedFacultySectionId = signal<number | null>(null);

  // Student Portal Telemetry Signal
  readonly studentSelfTelemetry = signal<StudentSelfTelemetry | null>(null);

  // Executive KPI Summary Signal
  readonly kpiSummary = signal<TelemetryKpiSummary | null>(null);
  readonly isKpiLoading = signal<boolean>(false);

  // Action Modal Signals
  readonly isDispatchModalOpen = signal<boolean>(false);
  readonly selectedStudentForDispatch = signal<StudentTelemetryAdminSummary | null>(null);
  readonly isDispatching = signal<boolean>(false);
  readonly acknowledgingInterventionId = signal<number | null>(null);

  // Twin Inspection Drawer Signals
  readonly isInspectModalOpen = signal<boolean>(false);
  readonly selectedStudentForInspect = signal<StudentTelemetryAdminSummary | null>(null);

  // Role Checks
  readonly isAdmin = computed(() => this.authService.hasRole('ADMIN') || this.authService.hasRole('SUPER_ADMIN'));
  readonly isFaculty = computed(() => !this.isAdmin() && (this.authService.hasRole('FACULTY') || this.authService.hasRole('CHAIRPERSON') || this.authService.hasRole('DEAN')));
  readonly isStudent = computed(() => !this.isAdmin() && !this.isFaculty() && this.authService.hasRole('STUDENT'));

  // Admin & Faculty KPI Computations (Total Aggregate Metrics)
  readonly totalMonitoredStudents = computed(() => {
    const kpi = this.kpiSummary();
    if (kpi != null) return kpi.totalMonitored;
    return this.adminTotalElements() || this.adminTelemetryList().length;
  });

  readonly criticalRiskCount = computed(() => {
    const kpi = this.kpiSummary();
    if (kpi != null) return kpi.criticalRiskCount;
    return this.adminTelemetryList().filter(s => s.riskLevel === 'CRITICAL').length;
  });

  readonly highRiskCount = computed(() => {
    const kpi = this.kpiSummary();
    if (kpi != null) return kpi.highRiskCount;
    return this.adminTelemetryList().filter(s => s.riskLevel === 'HIGH').length;
  });

  readonly moderateRiskCount = computed(() => {
    const kpi = this.kpiSummary();
    if (kpi != null) return kpi.moderateRiskCount;
    return this.adminTelemetryList().filter(s => s.riskLevel === 'MODERATE').length;
  });

  readonly lowRiskCount = computed(() => {
    const kpi = this.kpiSummary();
    if (kpi != null) return kpi.lowRiskCount;
    return this.adminTelemetryList().filter(s => s.riskLevel === 'LOW').length;
  });

  readonly totalActiveInterventionsCount = computed(() => {
    const kpi = this.kpiSummary();
    if (kpi != null) return kpi.totalActiveInterventions;
    return this.adminTelemetryList().reduce((acc, s) => acc + (s.activeInterventions ? s.activeInterventions.length : 0), 0);
  });

  readonly averageWellnessIndex = computed(() => {
    const kpi = this.kpiSummary();
    if (kpi != null) return kpi.averageWellnessIndex;
    const list = this.adminTelemetryList();
    if (!list || list.length === 0) return 100.0;
    const totalScore = list.reduce((acc, s) => acc + (100 - (s.riskScore || 0)), 0);
    return Math.round((totalScore / list.length) * 10) / 10;
  });

  navigateToService(routePath: string): void {
    this.router.navigate([routePath]);
  }

  // Student Wellness & Retention Computations
  readonly retentionRate = computed<number>(() => {
    const rp = this.riskProfile();
    if (!rp || rp.predictedDropoutProbability == null) return 100;
    const rate = (1 - Number(rp.predictedDropoutProbability)) * 100;
    return Math.max(0, Math.min(100, Math.round(rate * 10) / 10));
  });

  readonly academicHealthScore = computed<number>(() => {
    const rp = this.riskProfile();
    if (!rp || rp.academicRiskScore == null) return 100;
    const health = 100 - Number(rp.academicRiskScore);
    return Math.max(0, Math.min(100, Math.round(health * 10) / 10));
  });

  readonly attendanceHealthScore = computed<number>(() => {
    const rp = this.riskProfile();
    if (!rp || rp.attendanceRiskScore == null) return 100;
    const health = 100 - Number(rp.attendanceRiskScore);
    return Math.max(0, Math.min(100, Math.round(health * 10) / 10));
  });

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe((values) => {
        if (values.searchQuery !== undefined) this.adminSearchQuery.set(values.searchQuery || '');
        if (values.riskLevel !== undefined) this.adminRiskLevelFilter.set(values.riskLevel || 'ALL');
        if (values.interventionStatus !== undefined) this.adminInterventionStatusFilter.set(values.interventionStatus || 'ALL');
        if (values.sectionId !== undefined) {
          const parsed = values.sectionId && values.sectionId !== 'ALL' ? Number(values.sectionId) : null;
          this.selectedFacultySectionId.set(parsed);
        }
        this.adminPageIndex.set(0);
        if (this.isFaculty()) {
          this.fetchFacultyTelemetry();
        } else if (this.isAdmin()) {
          this.fetchAdminTelemetry();
        }
      });

    const globalTermId = this.periodStore.selectedTermId();
    if (globalTermId && globalTermId !== this.lastLoadedTermId) {
      this.lastLoadedTermId = globalTermId;
      if (this.isAdmin()) {
        this.fetchAdminTelemetry();
        this.fetchAdminTelemetryKpi();
      } else if (this.isFaculty()) {
        this.fetchFacultyAssignedSections();
        this.fetchFacultyTelemetry();
        this.fetchFacultyTelemetryKpi();
      } else if (this.isStudent()) {
        this.loadStudentViewData();
      }
    } else if (!globalTermId && !this.lastLoadedTermId) {
      if (this.isAdmin()) {
        this.fetchAdminTelemetry();
        this.fetchAdminTelemetryKpi();
      } else if (this.isFaculty()) {
        this.fetchFacultyAssignedSections();
        this.fetchFacultyTelemetry();
        this.fetchFacultyTelemetryKpi();
      } else if (this.isStudent()) {
        this.loadStudentViewData();
      }
    }

    const paramId = this.route.snapshot.paramMap.get('studentId') || this.route.snapshot.queryParamMap.get('studentId');
    if (paramId && !isNaN(Number(paramId))) {
      const parsedId = Number(paramId);
      this.currentStudentId.set(parsedId);
      this.loadRiskProfile(parsedId);
    }
  }

  fetchAdminTelemetry(): void {
    this.adminIsLoading.set(true);
    this.analyticsApi.getAdminStudentTelemetry({
      page: this.adminPageIndex(),
      size: this.adminPageSize(),
      searchQuery: this.adminSearchQuery(),
      riskLevel: this.adminRiskLevelFilter(),
      interventionStatus: this.adminInterventionStatusFilter()
    }).subscribe({
      next: (response) => {
        this.adminTelemetryList.set(response.content || []);
        this.adminTotalElements.set(response.totalElements || 0);
        this.adminIsLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load admin student telemetry:', err);
        this.adminIsLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Telemetry Ingress Failed',
          detail: 'Could not load administrative student risk & AI intervention telemetry.'
        });
      }
    });
  }

  fetchAdminTelemetryKpi(): void {
    this.isKpiLoading.set(true);
    this.analyticsApi.getAdminTelemetryKpi().subscribe({
      next: (kpi) => {
        this.kpiSummary.set(kpi);
        this.isKpiLoading.set(false);
      },
      error: (err) => {
        console.warn('Could not load admin telemetry KPI summary:', err);
        this.isKpiLoading.set(false);
      }
    });
  }

  fetchFacultyAssignedSections(): void {
    this.analyticsApi.getFacultyAssignedSections().subscribe({
      next: (sections) => this.facultySections.set(sections || []),
      error: (err) => console.warn('Could not load faculty assigned sections:', err)
    });
  }

  fetchFacultyTelemetry(): void {
    this.adminIsLoading.set(true);
    this.analyticsApi.getFacultyStudentTelemetry({
      page: this.adminPageIndex(),
      size: this.adminPageSize(),
      searchQuery: this.adminSearchQuery(),
      riskLevel: this.adminRiskLevelFilter(),
      interventionStatus: this.adminInterventionStatusFilter(),
      sectionId: this.selectedFacultySectionId() || undefined
    }).subscribe({
      next: (response) => {
        this.adminTelemetryList.set(response.content || []);
        this.adminTotalElements.set(response.totalElements || 0);
        this.adminIsLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load faculty student telemetry:', err);
        this.adminIsLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Section Telemetry Failed',
          detail: 'Could not load section student risk & AI intervention telemetry.'
        });
      }
    });
  }

  fetchFacultyTelemetryKpi(): void {
    this.isKpiLoading.set(true);
    const secId = this.selectedFacultySectionId();
    this.analyticsApi.getFacultyTelemetryKpi(secId ? { sectionId: secId } : undefined).subscribe({
      next: (kpi) => {
        this.kpiSummary.set(kpi);
        this.isKpiLoading.set(false);
      },
      error: (err) => {
        console.warn('Could not load faculty telemetry KPI summary:', err);
        this.isKpiLoading.set(false);
      }
    });
  }

  onFacultySectionChange(sectionIdVal: string): void {
    const parsed = sectionIdVal && sectionIdVal !== 'ALL' ? Number(sectionIdVal) : null;
    this.selectedFacultySectionId.set(parsed);
    this.adminPageIndex.set(0);
    this.fetchFacultyTelemetry();
    this.fetchFacultyTelemetryKpi();
  }

  onAdminTableLazyLoad(event: TableLazyLoadEvent): void {
    const page = event.first != null && event.rows != null ? Math.floor(event.first / event.rows) : 0;
    const size = event.rows || 10;
    this.adminPageIndex.set(page);
    this.adminPageSize.set(size);
    if (this.isFaculty()) {
      this.fetchFacultyTelemetry();
    } else {
      this.fetchAdminTelemetry();
    }
  }

  onSearchQueryChange(query: string): void {
    this.adminSearchQuery.set(query);
    this.adminPageIndex.set(0);
    if (this.isFaculty()) {
      this.fetchFacultyTelemetry();
    } else {
      this.fetchAdminTelemetry();
    }
  }

  onRiskFilterChange(level: string): void {
    this.adminRiskLevelFilter.set(level);
    this.adminPageIndex.set(0);
    if (this.isFaculty()) {
      this.fetchFacultyTelemetry();
    } else {
      this.fetchAdminTelemetry();
    }
  }

  onInterventionStatusFilterChange(status: string): void {
    this.adminInterventionStatusFilter.set(status);
    this.adminPageIndex.set(0);
    if (this.isFaculty()) {
      this.fetchFacultyTelemetry();
    } else {
      this.fetchAdminTelemetry();
    }
  }

  openDispatchModal(student: StudentTelemetryAdminSummary): void {
    this.selectedStudentForDispatch.set(student);
    this.dispatchForm.reset({
      interventionType: 'GUIDANCE_COUNSELING',
      triggerReason: `Risk Level [${student.riskLevel}] — AI Telemetry Trigger`,
      notes: ''
    });
    this.isDispatchModalOpen.set(true);
  }

  confirmDispatchIntervention(): void {
    const student = this.selectedStudentForDispatch();
    if (!student) return;

    if (this.dispatchForm.invalid) {
      this.dispatchForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please complete all required fields with valid input before dispatching.'
      });
      return;
    }

    const formVal = this.dispatchForm.getRawValue();
    this.isDispatching.set(true);

    this.analyticsApi.dispatchIntervention({
      studentId: student.studentId,
      interventionType: formVal.interventionType,
      triggerFactor: formVal.triggerReason,
      notes: formVal.notes
    }).subscribe({
      next: (res) => {
        this.isDispatching.set(false);
        this.isDispatchModalOpen.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'AI Intervention Dispatched',
          detail: `Successfully dispatched ${this.humanizeInterventionType(res.interventionType)} to ${student.fullName} (${student.studentNumber}).`
        });
        if (this.isFaculty()) {
          this.fetchFacultyTelemetry();
          this.fetchFacultyTelemetryKpi();
        } else {
          this.fetchAdminTelemetry();
          this.fetchAdminTelemetryKpi();
        }
      },
      error: () => {
        this.isDispatching.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Dispatch Error',
          detail: 'Failed to dispatch AI intervention. Please try again.'
        });
      }
    });
  }

  inspectStudentTwin(studentId: number): void {
    const numericId = Number(studentId);
    const student = this.adminTelemetryList().find(s => Number(s.studentId) === numericId);
    this.selectedStudentForInspect.set(student || null);
    this.currentStudentId.set(numericId);
    this.isInspectModalOpen.set(true);
    this.loadRiskProfile(numericId);
  }

  openDispatchFromInspect(): void {
    const student = this.selectedStudentForInspect();
    if (student) {
      this.isInspectModalOpen.set(false);
      this.openDispatchModal(student);
    }
  }

  acknowledgeStudentRecommendation(interventionId: number, responseText: string = ''): void {
    if (!interventionId || interventionId <= 0) {
      console.warn('Cannot acknowledge — invalid intervention ID');
      return;
    }

    this.acknowledgingInterventionId.set(interventionId);
    this.analyticsApi.acknowledgeIntervention(interventionId, responseText).subscribe({
      next: () => {
        this.acknowledgingInterventionId.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Recommendation Acknowledged',
          detail: 'Marked support intervention as acknowledged in your digital twin portal.'
        });
        this.loadStudentViewData();
      },
      error: (err) => {
        this.acknowledgingInterventionId.set(null);
        if (err?.status === 409) {
          this.messageService.add({
            severity: 'info',
            summary: 'Already Acknowledged',
            detail: 'This recommendation was already acknowledged.'
          });
          this.loadStudentViewData();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Action Failed',
            detail: 'Failed to acknowledge intervention. Please try again.'
          });
        }
      }
    });
  }

  exportTelemetryCsv(): void {
    const list = this.adminTelemetryList();
    if (!list || list.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Export Empty',
        detail: 'No telemetry records available to export.'
      });
      return;
    }
    const headers = ['Student ID', 'Student Number', 'Full Name', 'Section / Program', 'Risk Level', 'Risk Score (%)', 'Active Interventions'];
    const rows = list.map(s => [
      s.studentId,
      `"${s.studentNumber || ''}"`,
      `"${s.fullName || ''}"`,
      `"${s.sectionCode || s.programOrCohort || ''}"`,
      s.riskLevel || 'LOW',
      s.riskScore != null ? s.riskScore.toFixed(1) : '0.0',
      s.activeInterventions ? s.activeInterventions.length : 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `student_telemetry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.messageService.add({
      severity: 'success',
      summary: 'Export Complete',
      detail: `Exported ${list.length} student telemetry records to CSV.`
    });
  }

  private loadStudentViewData(): void {
    this.isLoading.set(true);
    this.analyticsApi.getStudentSelfTelemetry().subscribe({
      next: (selfData) => {
        this.studentSelfTelemetry.set(selfData);
        if (selfData?.studentId) {
          this.currentStudentId.set(selfData.studentId);
        }
      },
      error: (err) => console.warn('Could not load student self telemetry:', err)
    });

    this.enrollmentApi.getCurrentStudentProfile().subscribe({
      next: (profile) => {
        this.studentProfile.set(profile);
        this.studentProfileService?.setProfile(profile);
        if (profile?.id) {
          this.currentStudentId.set(profile.id);
        }
      },
      error: (err) => console.warn('Could not load student profile metadata:', err)
    });

    this.analyticsApi.getCurrentStudentRiskProfile().subscribe({
      next: (profile) => {
        this.riskProfile.set(profile);
        this.currentStudentId.set(profile.studentId);
        this.isLoading.set(false);
      },
      error: () => {
        const fallbackId = this.authService.getStudentProfileId() || this.studentProfile()?.id || this.authService.getUserId() || 1;
        this.currentStudentId.set(fallbackId);
        this.loadRiskProfile(fallbackId);
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
            detail: 'Your academic digital twin telemetry has been updated with the latest grade and attendance records.'
          });
        },
        error: () => {
          const studentId = this.currentStudentId() || this.studentProfile()?.id || this.authService.getStudentProfileId() || this.authService.getUserId() || 1;
          this.loadRiskProfile(studentId, true);
        }
      });
    } else {
      if (this.isAdmin()) {
        this.fetchAdminTelemetry();
        this.fetchAdminTelemetryKpi();
      } else if (this.isFaculty()) {
        this.fetchFacultyTelemetry();
        this.fetchFacultyTelemetryKpi();
      }
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
        if (!this.selectedStudentForInspect() || this.selectedStudentForInspect()?.studentId !== profile.studentId) {
          this.selectedStudentForInspect.set({
            studentId: profile.studentId,
            studentNumber: profile.studentNumber,
            fullName: profile.studentName,
            sectionCode: '',
            programOrCohort: profile.programCode || '',
            riskLevel: profile.compositeRiskLevel,
            riskScore: profile.predictedDropoutProbability || profile.academicRiskScore || 0,
            activeInterventions: [],
            lastTelemetrySync: profile.evaluatedAt || new Date().toISOString()
          });
        }
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

  getInterventionStatusSeverity(status: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'DISPATCHED': case 'OPEN': return 'warn';
      case 'IN_PROGRESS': case 'ASSIGNED': case 'ACKNOWLEDGED': return 'info';
      case 'RESOLVED': return 'success';
      case 'FAILED': case 'ESCALATED': return 'danger';
      default: return 'secondary';
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

  getInitials(name: string | undefined): string {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  humanizeInterventionType(type: string | undefined): string {
    if (!type) return 'Support Advisory';
    switch (type) {
      case 'GUIDANCE_COUNSELING': return 'Guidance Counseling Session';
      case 'ACADEMIC_TUTORING': return 'Academic Peer Tutoring';
      case 'ATTENDANCE_CONFERENCE': return 'Attendance Conference';
      case 'FINANCIAL_SUBSIDY_AID': return 'UniFAST Financial Aid Review';
      case 'PEER_MENTORING': return 'Peer Mentoring Assignment';
      default: return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
  }
}
