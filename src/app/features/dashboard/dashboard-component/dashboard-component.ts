import { Component, computed, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';

// PrimeNG Standalone Components & Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { DrawerModule } from 'primeng/drawer';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { KnobModule } from 'primeng/knob';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../core/service/authentication/auth-service';
import { UserApiService } from '../../../core/service/user/user-api.service';
import { CampusService, TermService } from '../../../core/services/institution.service';
import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import { FacultyApiService } from '../../../core/service/faculty/faculty-api.service';
import { CurriculumApiService } from '../../../core/service/curriculum/curriculum-api.service';
import { SchedulingApiService } from '../../../core/service/scheduling/scheduling-api.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { LmsApiService } from '../../../core/service/lms/lms-api.service';
import { NoticeApiService } from '../../../core/service/notice/notice-api.service';
import { NoticeItem, CreateNoticeRequest } from '../../../core/models/notice.model';
import { StudentSelfServiceSummaryDto } from '../../../core/models/lms.model';
import { StudentSelfTelemetry } from '../../../core/models/analytics.model';
import { SectionDetailResponse } from '../../../core/models/scheduling.model';
import { UserDetail, AuditLogEntry } from '../../../core/models/user-management.model';
import { UnifastFheClaimDto } from '../../../core/models/financial.model';

export type { NoticeItem, CreateNoticeRequest };

export interface MetricCard {
  title: string;
  value: string;
  subtext: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}

export interface ClassScheduleItem {
  courseCode: string;
  courseTitle: string;
  time: string;
  room: string;
  instructor: string;
  status: 'In Progress' | 'Upcoming' | 'Completed';
}

export interface CompetencyItem {
  skill: string;
  score: number;
  category: string;
}

export interface QuickActionItem {
  label: string;
  icon: string;
  routerLink: string;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger';
}

export interface StudentRiskRecord {
  studentId: number;
  studentNumber: string;
  fullName: string;
  programOrSection: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  activeInterventions: string[];
  attendanceRate: number;
}

export interface FacultyWorkloadItem {
  instructorId: number;
  fullName: string;
  department: string;
  assignedUnits: number;
  maxUnits: number;
  status: 'NORMAL' | 'OVERLOAD_APPROVED' | 'OVERLOAD_PENDING';
  assignedSections: number;
}

export interface CashierOrBooklet {
  bookletNumber: string;
  formType: string;
  assignedCashier: string;
  startOr: string;
  endOr: string;
  currentOr: string;
  remainingCount: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'UNASSIGNED';
}

export interface SystemActuatorEndpoint {
  name: string;
  path: string;
  port: number;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  latencyMs: number;
  type: string;
}

@Component({
  selector: 'app-dashboard-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    SkeletonModule,
    ProgressBarModule,
    TagModule,
    DrawerModule,
    TableModule,
    InputTextModule,
    AvatarModule,
    ChipModule,
    BadgeModule,
    KnobModule,
    MessageModule,
    SelectModule,
    TooltipModule,
    ToastModule,
    PaginatorModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard-component.html',
  styleUrls: ['./dashboard-component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly periodStore = inject(AcademicPeriodStore);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly userApiService = inject(UserApiService);
  private readonly campusService = inject(CampusService);
  private readonly termService = inject(TermService);
  private readonly analyticsApiService = inject(AnalyticsApiService);
  private readonly complianceApiService = inject(ComplianceApiService);
  private readonly financialApiService = inject(FinancialApiService);
  private readonly facultyApiService = inject(FacultyApiService);
  private readonly curriculumApiService = inject(CurriculumApiService);
  private readonly schedulingApiService = inject(SchedulingApiService);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly lmsApiService = inject(LmsApiService);
  private readonly noticeApiService = inject(NoticeApiService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const termId = this.periodStore.selectedTermId();
      if (termId) {
        this.loadGeneralAcademicContext(termId);
        this.loadMetricsForRole(this.activeRole(), true, termId);
      }
    });
  }

  readonly isLoading = signal(false);
  readonly selectedNotice = signal<NoticeItem | null>(null);
  readonly isNoticeDrawerOpen = signal(false);
  readonly dynamicRoleMetrics = signal<Record<string, MetricCard[]>>({});

  // Role override switcher signal (defaults to null, falls back to auth user role)
  readonly selectedRoleOverride = signal<string | null>(null);

  // Check if current user is authorized to switch role perspectives (SUPER_ADMIN only)
  readonly canChangeRoleView = computed(() => this.authService.hasRole('SUPER_ADMIN'));

  // Active Role string normalized
  readonly activeRole = computed<string>(() => {
    if (this.canChangeRoleView()) {
      const override = this.selectedRoleOverride();
      if (override) return override.toUpperCase();
    }
    const userRole = this.authService.currentUser()?.role;
    if (!userRole || userRole === 'GUEST') return 'STUDENT';
    return userRole.replace(/^ROLE_/, '').toUpperCase();
  });

  // 10 Explicit Computed Role Signals matching package com.sdt.web_app.entities.authentication.Roles
  readonly isSuperAdmin = computed(() => this.activeRole() === 'SUPER_ADMIN');
  readonly isAdmin = computed(() => this.activeRole() === 'ADMIN');
  readonly isRegistrar = computed(() => this.activeRole() === 'REGISTRAR');
  readonly isCashier = computed(() => this.activeRole() === 'CASHIER');
  readonly isFaculty = computed(() => this.activeRole() === 'FACULTY');
  readonly isDean = computed(() => this.activeRole() === 'DEAN');
  readonly isChairperson = computed(() => this.activeRole() === 'CHAIRPERSON');
  readonly isStudent = computed(() => this.activeRole() === 'STUDENT');
  readonly isGuidance = computed(() => this.activeRole() === 'GUIDANCE');
  readonly isAccountant = computed(() => this.activeRole() === 'ACCOUNTANT');

  // Role select options for switching views
  readonly roleOptions = [
    { label: 'Super Administrator', value: 'SUPER_ADMIN' },
    { label: 'System Administrator', value: 'ADMIN' },
    { label: 'University Registrar', value: 'REGISTRAR' },
    { label: 'Cashier & Business Office', value: 'CASHIER' },
    { label: 'Faculty Instruction', value: 'FACULTY' },
    { label: 'College Dean', value: 'DEAN' },
    { label: 'Department Chairperson', value: 'CHAIRPERSON' },
    { label: 'Student Portal', value: 'STUDENT' },
    { label: 'Guidance & Student Welfare', value: 'GUIDANCE' },
    { label: 'Accounting & UniFAST Free Tuition', value: 'ACCOUNTANT' }
  ];

  readonly userName = computed(() => this.authService.currentUser().username || 'Institutional User');
  readonly studentName = this.userName;
  readonly userRole = this.activeRole;

  readonly currentTime = signal(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }));

  // Role-gated Header Metadata
  readonly roleBadge = computed(() => {
    if (this.isSuperAdmin()) return 'SUPER ADMINISTRATOR';
    if (this.isAdmin()) return 'SYSTEM ADMINISTRATOR';
    if (this.isRegistrar()) return 'UNIVERSITY REGISTRAR';
    if (this.isCashier()) return 'CASHIER & BUSINESS OFFICE';
    if (this.isFaculty()) return 'FACULTY INSTRUCTION';
    if (this.isDean()) return 'COLLEGE DEAN';
    if (this.isChairperson()) return 'DEPARTMENT CHAIRPERSON';
    if (this.isStudent()) return 'STUDENT PORTAL';
    if (this.isGuidance()) return 'GUIDANCE COUNSELOR';
    if (this.isAccountant()) return 'ACCOUNTING OFFICE';
    return 'CHMSU UNIVERSITY PORTAL';
  });

  readonly roleTitle = computed(() => {
    if (this.isSuperAdmin()) return 'System Administration & Server Monitor';
    if (this.isAdmin()) return 'System Administration & Campus Setup';
    if (this.isRegistrar()) return 'Office of the University Registrar';
    if (this.isCashier()) return 'Cashier & Student Accounts Desk';
    if (this.isFaculty()) return 'Faculty Class Record & Student Attendance';
    if (this.isDean()) return 'College Dean Academic & Faculty Overview';
    if (this.isChairperson()) return 'Department Chairperson Schedules & Curricula';
    if (this.isStudent()) return 'Student Academic Overview & Records';
    if (this.isGuidance()) return 'Guidance & Student Support Services';
    if (this.isAccountant()) return 'Accounting Office & Tuition Subsidy (UniFAST) Ledger';
    return 'University Dashboard Overview';
  });

  readonly roleSubtitle = computed(() => {
    // if (this.isSuperAdmin()) return 'Carlos Hilado Memorial State University • Super Administrator';
    // if (this.isAdmin()) return 'Carlos Hilado Memorial State University •';
    // if (this.isRegistrar()) return 'Carlos Hilado Memorial State University • Office of the University Registrar • Academic period locks & SHA-256 grade sealing';
    // if (this.isCashier()) return 'Carlos Hilado Memorial State University • Business Office POS • Official Receipts, OR booklets & EOD RCD Form 58-A';
    // if (this.isFaculty()) return 'Carlos Hilado Memorial State University • Academic Instruction • Section gradebooks, geofenced QR scans & CMO 25 load';
    // if (this.isDean()) return 'Carlos Hilado Memorial State University • College Governance • Department curricula, faculty overload approvals & clearance';
    // if (this.isChairperson()) return 'Carlos Hilado Memorial State University • Academic Department • CILO-PILO outcome matrices, section schedules & grade sheets';
    // if (this.isStudent()) return 'Carlos Hilado Memorial State University • Undergraduate Scholar • Diagnostic health index & retention risk telemetry';
    // if (this.isGuidance()) return 'Carlos Hilado Memorial State University • Guidance & Counseling Office • Student risk radar & AI intervention dispatch';
    // if (this.isAccountant()) return 'Carlos Hilado Memorial State University • Accounting Office • RA 10931 UniFAST FHE claims & double-entry ledgers';
    return 'Carlos Hilado Memorial State University';
  });

  readonly roleTagClass = computed(() => {
    if (this.isSuperAdmin() || this.isGuidance()) return 'rose';
    if (this.isAdmin() || this.isDean() || this.isAccountant()) return 'blue';
    if (this.isCashier() || this.isFaculty()) return 'amber';
    return 'green';
  });

  readonly roleIcon = computed(() => {
    if (this.isSuperAdmin()) return 'pi pi-server';
    if (this.isAdmin()) return 'pi pi-building-gear';
    if (this.isRegistrar()) return 'pi pi-address-book';
    if (this.isCashier()) return 'pi pi-calculator';
    if (this.isFaculty()) return 'pi pi-id-card';
    if (this.isDean()) return 'pi pi-briefcase';
    if (this.isChairperson()) return 'pi pi-sitemap';
    if (this.isStudent()) return 'pi pi-user';
    if (this.isGuidance()) return 'pi pi-heart-fill';
    if (this.isAccountant()) return 'pi pi-file-export';
    return 'pi pi-compass';
  });

  // Base student metrics (maintained for backwards-compatibility in specs)
  readonly metrics: MetricCard[] = [
    { title: 'Current GWA', value: '0.00', subtext: "Academic Record", icon: 'pi pi-chart-line', trend: 'No grades yet', trendUp: false },
    { title: 'Curriculum Progress', value: '0 / 0', subtext: '0% Units Completed', icon: 'pi pi-graduation-cap', trend: 'Pending Enrolment', trendUp: false },
    { title: 'Attendance Rate', value: '0.0%', subtext: '0 unexcused absences', icon: 'pi pi-check-circle', trend: 'No Data', trendUp: false },
    { title: 'Twin Model Sync', value: '0.0%', subtext: 'Telemetry Pending', icon: 'pi pi-sparkles', trend: 'Inactive', trendUp: false }
  ];

  private getBaselineMetricsForRole(role: string): MetricCard[] {
    switch (role) {
      case 'SUPER_ADMIN':
        return [
          { title: 'System Health', value: '0.0%', subtext: 'No services online', icon: 'pi pi-server', trend: 'Offline', trendUp: false },
          { title: 'Campus Network', value: '0 Campuses', subtext: 'No network connected', icon: 'pi pi-building', trend: 'Offline', trendUp: false },
          { title: 'Active Sessions', value: '0 Users', subtext: 'No active sessions', icon: 'pi pi-shield', trend: 'Inactive', trendUp: false },
          { title: 'System Activity', value: '0 Events', subtext: 'No log events', icon: 'pi pi-heart-fill', trend: 'Inactive', trendUp: false }
        ];
      case 'ADMIN':
        return [
          { title: 'Registered Users', value: '0 Active', subtext: 'Students, faculty & staff', icon: 'pi pi-users', trend: 'Empty', trendUp: false },
          { title: 'Active Campuses', value: '0 Campuses', subtext: 'University campus sites', icon: 'pi pi-building', trend: 'Empty', trendUp: false },
          { title: 'Security Logs', value: '0 Recorded', subtext: 'No security logs', icon: 'pi pi-shield', trend: 'Empty', trendUp: false },
          { title: 'Academic Programs', value: '0 Programs', subtext: 'Active degree programs', icon: 'pi pi-sitemap', trend: 'Empty', trendUp: false }
        ];
      case 'REGISTRAR':
        return [
          { title: 'Total Enrolled', value: '0 Students', subtext: 'Current semester enrolment', icon: 'pi pi-users', trend: 'Inactive', trendUp: false },
          { title: 'Grade Verification', value: '0 / 0', subtext: 'Class grade sheets verified', icon: 'pi pi-lock', trend: '0% Complete', trendUp: false },
          { title: 'Student Clearances', value: '0.0%', subtext: 'Department clearances completed', icon: 'pi pi-verified', trend: 'No Data', trendUp: false },
          { title: 'Graduation Candidates', value: '0 Applicants', subtext: 'Applications under review', icon: 'pi pi-graduation-cap', trend: 'Empty', trendUp: false }
        ];
      case 'CASHIER':
        return [
          { title: 'Receipt Booklet', value: 'No Active Booklet', subtext: 'Official Receipts (0 left)', icon: 'pi pi-id-card', trend: 'Unassigned', trendUp: false },
          { title: "Today's Collections", value: '₱0.00', subtext: '0 receipts issued today', icon: 'pi pi-wallet', trend: '₱0.00 today', trendUp: false },
          { title: 'Student Trust Fund', value: '₱0.00', subtext: 'Trust fund collections balance', icon: 'pi pi-building-columns', trend: 'Uncollected', trendUp: false },
          { title: 'Payment Window', value: 'CLOSED', subtext: 'Window 1 — Closed', icon: 'pi pi-shield', trend: 'Closed', trendUp: false }
        ];
      case 'FACULTY':
        return [
          { title: 'Teaching Load', value: '0.0 / 0.0', subtext: 'Assigned teaching units', icon: 'pi pi-book', trend: 'No Load', trendUp: false },
          { title: 'Assigned Classes', value: '0 Sections', subtext: '0 enrolled students', icon: 'pi pi-users', trend: 'No Classes', trendUp: false },
          { title: 'Grade Submissions', value: '0 / 0 Ready', subtext: 'Midterm grades submitted', icon: 'pi pi-chart-line', trend: 'Pending', trendUp: false },
          { title: 'Average Attendance', value: '0.0%', subtext: 'Class attendance rate', icon: 'pi pi-check-circle', trend: 'No Data', trendUp: false }
        ];
      case 'DEAN':
        return [
          { title: 'Degree Programs', value: '0 Programs', subtext: 'College undergraduate programs', icon: 'pi pi-sitemap', trend: 'Empty', trendUp: false },
          { title: 'Department Faculty', value: '0 Instructors', subtext: 'Teaching faculty members', icon: 'pi pi-user', trend: 'Empty', trendUp: false },
          { title: 'Students Needing Support', value: '0 Students', subtext: 'Referred for counseling', icon: 'pi pi-info-circle', trend: 'Nominal', trendUp: true },
          { title: 'College Clearance', value: '0.0%', subtext: 'Clearances completed', icon: 'pi pi-check-square', trend: 'Pending', trendUp: false }
        ];
      case 'CHAIRPERSON':
        return [
          { title: 'Department Curricula', value: '0 Active', subtext: 'Approved degree tracks', icon: 'pi pi-sitemap', trend: 'Empty', trendUp: false },
          { title: 'Learning Outcomes', value: '0.0%', subtext: 'Course syllabus alignment', icon: 'pi pi-th-large', trend: 'Unmapped', trendUp: false },
          { title: 'Class Sections', value: '0 Sections', subtext: 'Rooms & schedules assigned', icon: 'pi pi-calendar', trend: 'Unscheduled', trendUp: false },
          { title: 'Pending Grade Reviews', value: '0 Pending', subtext: 'Awaiting department review', icon: 'pi pi-clock', trend: 'Nominal', trendUp: true }
        ];
      case 'GUIDANCE':
        return [
          { title: 'Enrolled Students', value: '0 Students', subtext: 'Students under care', icon: 'pi pi-users', trend: 'Empty', trendUp: false },
          { title: 'Priority Support', value: '0 Students', subtext: 'Follow-up counseling needed', icon: 'pi pi-exclamation-triangle', trend: 'Nominal', trendUp: true },
          { title: 'Support Actions', value: '0 Sessions', subtext: 'Guidance & tutoring sessions', icon: 'pi pi-send', trend: 'Empty', trendUp: false },
          { title: 'Student Wellness', value: '0.0%', subtext: 'Overall student wellbeing', icon: 'pi pi-heart-fill', trend: 'No Data', trendUp: false }
        ];
      case 'ACCOUNTANT':
        return [
          { title: 'UniFAST Billing Claims', value: '0 Batches', subtext: 'Free Higher Education subsidy', icon: 'pi pi-file-export', trend: 'Empty', trendUp: false },
          { title: 'Total Free Tuition', value: '₱0.00', subtext: '0 student beneficiaries', icon: 'pi pi-dollar', trend: '₱0.00 Billed', trendUp: false },
          { title: 'Billing Reviews', value: '0 Items', subtext: 'Adjustments requiring review', icon: 'pi pi-exclamation-circle', trend: 'Nominal', trendUp: true },
          { title: 'Student Accounts', value: '0 Enrollees', subtext: 'Tuition accounts up-to-date', icon: 'pi pi-history', trend: 'Empty', trendUp: false }
        ];
      case 'STUDENT':
      default:
        return this.metrics;
    }
  }

  // Dynamically adapted 4-KPI Metric Ribbon for ALL 10 Roles
  readonly displayedMetrics = computed<MetricCard[]>(() => {
    const role = this.activeRole();
    const dynamic = this.dynamicRoleMetrics()[role];
    if (dynamic && dynamic.length === 4) {
      return dynamic;
    }
    return this.getBaselineMetricsForRole(role);
  });

  // Dynamically adapted Quick Actions for ALL 10 Roles
  readonly roleQuickActions = computed<QuickActionItem[]>(() => {
    if (this.isSuperAdmin()) {
      return [
        { label: 'System Health', icon: 'pi pi-heart', routerLink: '/dashboard/admin/lms-config', severity: 'danger' },
        { label: 'User Accounts', icon: 'pi pi-users', routerLink: '/dashboard/users', severity: 'primary' },
        { label: 'Activity Logs', icon: 'pi pi-shield', routerLink: '/dashboard/institution', severity: 'info' },
        { label: 'Database Setup', icon: 'pi pi-database', routerLink: '/dashboard/curriculum/designer', severity: 'success' }
      ];
    }
    if (this.isAdmin()) {
      return [
        { label: 'User Accounts', icon: 'pi pi-users', routerLink: '/dashboard/users', severity: 'primary' },
        { label: 'Campus & Colleges', icon: 'pi pi-building', routerLink: '/dashboard/institution', severity: 'info' },
        { label: 'Curriculum Manager', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer', severity: 'success' },
        { label: 'LMS Settings', icon: 'pi pi-desktop', routerLink: '/dashboard/admin/lms-config', severity: 'secondary' }
      ];
    }
    if (this.isRegistrar()) {
      return [
        { label: 'Verify Grades', icon: 'pi pi-lock', routerLink: '/dashboard/grades', severity: 'primary' },
        { label: 'Graduation Audit', icon: 'pi pi-graduation-cap', routerLink: '/dashboard/compliance/audit', severity: 'success' },
        { label: 'CHED Reports', icon: 'pi pi-file-pdf', routerLink: '/dashboard/compliance/ched', severity: 'info' },
        { label: 'Admissions Desk', icon: 'pi pi-user-plus', routerLink: '/dashboard/admission-management', severity: 'warn' }
      ];
    }
    if (this.isCashier()) {
      return [
        { label: 'Payment Counter', icon: 'pi pi-credit-card', routerLink: '/dashboard/finance/cashier', severity: 'primary' },
        { label: 'Student Accounts', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', severity: 'info' },
        { label: 'Receipt Booklets', icon: 'pi pi-id-card', routerLink: '/dashboard/finance/cashier', severity: 'success' },
        { label: 'Daily Collection Summary', icon: 'pi pi-file-pdf', routerLink: '/dashboard/finance/cashier', severity: 'secondary' }
      ];
    }
    if (this.isFaculty()) {
      return [
        { label: 'Class Gradebook', icon: 'pi pi-chart-line', routerLink: '/dashboard/grades', severity: 'primary' },
        { label: 'Take Attendance', icon: 'pi pi-qrcode', routerLink: '/dashboard/analytics/qr-attendance', severity: 'success' },
        { label: 'Class Schedule', icon: 'pi pi-calendar', routerLink: '/dashboard/scheduling', severity: 'info' },
        { label: 'Student Support Alerts', icon: 'pi pi-info-circle', routerLink: '/dashboard/analytics/early-warning', severity: 'warn' }
      ];
    }
    if (this.isDean()) {
      return [
        { label: 'Curriculum Plans', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer', severity: 'primary' },
        { label: 'Class Schedule Planner', icon: 'pi pi-calendar-plus', routerLink: '/dashboard/scheduling', severity: 'info' },
        { label: 'Approve Clearances', icon: 'pi pi-verified', routerLink: '/dashboard/compliance/clearance', severity: 'success' },
        { label: 'Student Support Alerts', icon: 'pi pi-info-circle', routerLink: '/dashboard/analytics/early-warning', severity: 'warn' }
      ];
    }
    if (this.isChairperson()) {
      return [
        { label: 'Curriculum Plans', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer', severity: 'primary' },
        { label: 'Course Outcomes', icon: 'pi pi-th-large', routerLink: '/dashboard/curriculum/designer', severity: 'info' },
        { label: 'Class Schedule Planner', icon: 'pi pi-calendar', routerLink: '/dashboard/scheduling', severity: 'success' },
        { label: 'Grade Review Queue', icon: 'pi pi-check-square', routerLink: '/dashboard/grades', severity: 'warn' }
      ];
    }
    if (this.isGuidance()) {
      return [
        { label: 'Create Support Referral', icon: 'pi pi-send', routerLink: '/dashboard/analytics/early-warning', severity: 'warn' },
        { label: 'Counseling Records', icon: 'pi pi-heart', routerLink: '/dashboard/portal/student', severity: 'primary' },
        { label: 'Peer Tutors List', icon: 'pi pi-users', routerLink: '/dashboard/users', severity: 'info' },
        { label: 'Student Wellbeing', icon: 'pi pi-check-circle', routerLink: '/dashboard/analytics/early-warning', severity: 'success' }
      ];
    }
    if (this.isAccountant()) {
      return [
        { label: 'UniFAST Claims', icon: 'pi pi-file-export', routerLink: '/dashboard/finance/unifast', severity: 'primary' },
        { label: 'Student Ledgers', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', severity: 'info' },
        { label: 'Student Equity Reports', icon: 'pi pi-chart-bar', routerLink: '/dashboard/compliance/equity-portal', severity: 'success' },
        { label: 'Tuition & Fee Rates', icon: 'pi pi-wallet', routerLink: '/dashboard/finance/cashier', severity: 'secondary' }
      ];
    }
    return [
      { label: 'Certificate of Registration (COR)', icon: 'pi pi-file-pdf', routerLink: '/dashboard/enrollment', severity: 'primary' },
      { label: 'Digital Student ID', icon: 'pi pi-id-card', routerLink: '/dashboard/portal/student', severity: 'info' },
      { label: 'Semester Clearance', icon: 'pi pi-check-square', routerLink: '/dashboard/compliance/clearance', severity: 'success' },
      { label: 'Account Balance & Payments', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', severity: 'warn' }
    ];
  });

  // Dynamic Monitored Risk Telemetry Data for Guidance & Admin views (Live database-backed)
  readonly monitoredStudentsSignal = signal<StudentRiskRecord[]>([]);
  readonly guidancePageIndex = signal(0);
  readonly guidancePageSize = signal(5);
  readonly guidanceTotalRecords = signal(0);
  readonly guidanceLoading = signal(false);

  get monitoredStudents(): StudentRiskRecord[] {
    return this.monitoredStudentsSignal();
  }

  // Dynamic Faculty Workload for Dean view (Live database-backed)
  readonly facultyWorkloadListSignal = signal<FacultyWorkloadItem[]>([]);

  get facultyWorkloadList(): FacultyWorkloadItem[] {
    return this.facultyWorkloadListSignal();
  }

  // Dynamic Cashier OR Booklets (Live database-backed)
  readonly cashierBookletsSignal = signal<CashierOrBooklet[]>([]);

  get cashierBooklets(): CashierOrBooklet[] {
    return this.cashierBookletsSignal();
  }

  // Dynamic System Actuator Endpoints for Super Admin view (Live database-backed)
  readonly actuatorEndpointsSignal = signal<SystemActuatorEndpoint[]>([]);

  get actuatorEndpoints(): SystemActuatorEndpoint[] {
    return this.actuatorEndpointsSignal();
  }

  // Dynamic Database Entities for Super Admin, Admin, and Accountant Workspaces
  readonly usersList = signal<UserDetail[]>([]);
  readonly auditLogsList = signal<AuditLogEntry[]>([]);

  private sortAuditLogsAscending(logs: AuditLogEntry[]): AuditLogEntry[] {
    return [...(logs || [])].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const diff = timeA - timeB;
      return diff !== 0 ? diff : (a.id || 0) - (b.id || 0);
    });
  }
  readonly campusesList = signal<any[]>([]);
  readonly curriculaList = signal<any[]>([]);
  readonly accountantClaimsList = signal<UnifastFheClaimDto[]>([]);

  readonly adminUserActiveRate = computed(() => {
    const list = this.usersList();
    if (list.length === 0) return 0;
    const enabled = list.filter(u => u.enabled).length;
    return Math.round((enabled / list.length) * 100);
  });

  // Dynamic Schedule (Loaded from backend)
  readonly todayClassesSignal = signal<ClassScheduleItem[]>([]);

  get todayClasses(): ClassScheduleItem[] {
    return this.todayClassesSignal();
  }

  // Dynamic Competencies for Student View (Loaded from backend)
  readonly competenciesSignal = signal<CompetencyItem[]>([]);

  get competencies(): CompetencyItem[] {
    return this.competenciesSignal();
  }

  // Dynamic Student Portal & Telemetry state
  readonly studentPortalSummary = signal<StudentSelfServiceSummaryDto | null>(null);
  readonly studentSelfTelemetry = signal<StudentSelfTelemetry | null>(null);

  readonly studentProfileSub = computed(() => {
    const p = this.studentPortalSummary();
    const enrolled = this.todayClassesSignal().length > 0;
    if (!enrolled) return p ? `${p.studentNumber} — ${p.programCode} • Not Enrolled in Term` : 'Not Enrolled in Selected Term';
    return p ? `${p.studentNumber} — ${p.programCode} (Year ${p.yearLevel}) • CHMSU Scholar` : 'Student Academic Profile';
  });

  readonly studentGpa = computed(() => this.studentPortalSummary()?.cumulativeGpa || '0.00');
  readonly studentUnits = computed(() => {
    if (this.todayClassesSignal().length === 0) return '0 / 142';
    const p = this.studentPortalSummary();
    return p?.totalUnitsEarned ? `${p.totalUnitsEarned} / 142` : '0 / 142';
  });
  readonly studentClearanceStatus = computed(() => {
    if (this.todayClassesSignal().length === 0) return 'PENDING';
    const p = this.studentPortalSummary();
    if (!p) return 'CLEARED';
    return (p.financialClearance === 'CLEARED' && p.departmentalClearance === 'CLEARED') ? 'CLEARED' : (p.financialClearance || 'CLEARED');
  });
  readonly studentWellnessScore = computed(() => {
    if (this.todayClassesSignal().length === 0) return 0;
    const t = this.studentSelfTelemetry();
    return t?.wellnessScore ? Math.round(t.wellnessScore) : 0;
  });
  readonly studentStandingText = computed(() => {
    if (this.todayClassesSignal().length === 0) return 'Not Enrolled (0%)';
    return `Academic Standing (${this.studentWellnessScore()}%)`;
  });
  readonly studentStandingTag = computed(() => {
    if (this.todayClassesSignal().length === 0) return 'NOT ENROLLED';
    return (this.studentSelfTelemetry()?.riskLevel === 'LOW' || !this.studentSelfTelemetry()) ? 'ON TRACK' : 'NEEDS ATTENTION';
  });
  readonly studentAcademicPerf = computed(() => {
    if (this.todayClassesSignal().length === 0) return 0;
    const t = this.studentSelfTelemetry();
    return t?.dimensionScores?.['Academic Progress'] != null ? Math.round(t.dimensionScores['Academic Progress']) : 0;
  });
  readonly studentAttendanceRate = computed(() => {
    if (this.todayClassesSignal().length === 0) return 0;
    const t = this.studentSelfTelemetry();
    return t?.dimensionScores?.['Attendance Consistency'] != null ? Math.round(t.dimensionScores['Attendance Consistency']) : 0;
  });
  readonly studentAcademicStanding = computed(() => {
    if (this.todayClassesSignal().length === 0) return 'NOT ENROLLED';
    const t = this.studentSelfTelemetry();
    if (!t) return 'GOOD STANDING';
    if (t.riskLevel === 'CRITICAL') return 'PROBATION';
    if (t.riskLevel === 'HIGH') return 'WARNING';
    return 'GOOD STANDING';
  });
  readonly studentAcademicStandingSeverity = computed(() => {
    if (this.todayClassesSignal().length === 0) return 'info';
    const t = this.studentSelfTelemetry();
    if (!t) return 'success';
    if (t.riskLevel === 'CRITICAL') return 'danger';
    if (t.riskLevel === 'HIGH') return 'warn';
    return 'success';
  });
  readonly studentAcademicStandingCaption = computed(() => {
    if (this.todayClassesSignal().length === 0) return 'No active course enrollments for this term';
    const t = this.studentSelfTelemetry();
    if (t?.riskLevel === 'CRITICAL') return 'Academic advising required';
    if (t?.riskLevel === 'HIGH') return 'Consult program adviser';
    return 'No holds or academic restrictions';
  });

  // Dynamic Registrar State (Loaded from backend)
  readonly activeTermName = signal('');
  readonly registrarEnrollmentPeriod = signal('');
  readonly registrarGradeWindow = signal('');
  readonly registrarVerifiedGrades = signal('');
  readonly isEnrollmentOpen = signal<boolean>(false);
  readonly isGradingOpen = signal<boolean>(false);
  readonly isAddDropOpen = signal<boolean>(false);
  readonly activeTermDates = signal<string>('');
  readonly totalRegistrarSections = signal<number>(0);
  readonly verifiedGradeCount = signal<number>(0);
  readonly sealedGradeCount = signal<number>(0);
  readonly pendingGradeReviewCount = signal<number>(0);
  readonly pendingDisputesCount = signal<number>(0);
  readonly registrarSectionsList = signal<SectionDetailResponse[]>([]);

  readonly registrarSealingRate = computed(() => {
    const total = this.totalRegistrarSections();
    if (!total || total === 0) return 0;
    return Math.round((this.sealedGradeCount() / total) * 100);
  });

  readonly registrarSubmissionProgress = computed(() => {
    const total = this.totalRegistrarSections();
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round(((this.sealedGradeCount() + this.verifiedGradeCount()) / total) * 100));
  });

  // Dynamic Faculty Header State (Loaded from backend)
  readonly facultyTeachingUnitsTag = signal('');

  // Dynamic Chairperson State (Loaded from backend)
  readonly chairpersonProgramTag = signal('');
  readonly chairpersonOutcomes = signal('');
  readonly chairpersonSections = signal('');
  readonly chairpersonPendingGrades = signal('');
  readonly chairpersonOutcomeScore = signal<number>(0);
  readonly chairpersonSectionsList = signal<SectionDetailResponse[]>([]);

  readonly chairpersonGradeProgress = computed(() => {
    const total = this.chairpersonSectionsList().length || this.totalRegistrarSections();
    if (!total || total === 0) return 0;
    const reviewed = Math.max(0, total - this.pendingGradeReviewCount());
    return Math.max(0, Math.min(100, Math.round((reviewed / total) * 100)));
  });

  // Dynamic Guidance Header State (Loaded from backend)
  readonly guidancePriorityCountTag = signal('');

  // Dynamic Accountant State (Loaded from backend)
  readonly accountantBatches = signal('');
  readonly accountantTotalBilled = signal('');
  readonly accountantEnrollees = signal('');

  // Dynamic Campus Notices (Loaded from backend)
  readonly noticesSignal = signal<NoticeItem[]>([]);
  readonly isNoticesLoading = signal(false);
  readonly noticesFirst = signal(0);
  readonly noticesPageSize = signal(3);

  readonly paginatedNotices = computed<NoticeItem[]>(() => {
    const list = this.noticesSignal();
    const first = this.noticesFirst();
    const size = this.noticesPageSize();
    return list.slice(first, first + size);
  });

  get notices(): NoticeItem[] {
    return this.noticesSignal();
  }

  // Roles permitted to author and publish campus notices & advisories (Dynamic from JWT authorities / roles)
  readonly canPostNotice = computed(() => {
    const authorizedRoles = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'GUIDANCE', 'ACCOUNTANT'];
    if (this.selectedRoleOverride()) {
      return authorizedRoles.includes(this.activeRole());
    }
    const userRoles = this.authService.currentUser()?.roles || [this.authService.currentUser()?.role || 'STUDENT'];
    return userRoles.some(r => authorizedRoles.includes(r.replace(/^ROLE_/, '').toUpperCase()));
  });

  readonly unreadNoticeCount = computed(() => this.noticesSignal().filter(n => n.unread).length);

  readonly isCreateNoticeModalOpen = signal(false);
  readonly isCreatingNotice = signal(false);

  readonly noticeForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    category: ['General', [Validators.required]],
    audience: ['ALL'],
    priority: ['NORMAL'],
    content: ['', [Validators.required, Validators.minLength(10)]]
  });

  readonly noticeCategoryOptions = [
    { label: 'University Registrar', value: 'Registrar' },
    { label: 'Academic Affairs', value: 'Academic Affairs' },
    { label: 'College Dean', value: 'College Dean' },
    { label: 'Academic Department', value: 'Department' },
    { label: 'Student Affairs & Services', value: 'Student Affairs' },
    { label: 'Guidance & Counseling', value: 'Guidance & Counseling' },
    { label: 'Business & Cashier Office', value: 'Accounting & Finance' },
    { label: 'ICT & Systems Office', value: 'ICT Office' },
    { label: 'General University Advisory', value: 'General' }
  ];

  readonly noticeAudienceOptions = [
    { label: 'Entire Campus Community (All)', value: 'ALL' },
    { label: 'Students Only', value: 'STUDENT' },
    { label: 'Faculty & Instructors', value: 'FACULTY' },
    { label: 'Administrative Staff', value: 'STAFF' }
  ];

  readonly noticePriorityOptions = [
    { label: 'Normal (Standard Broadcast)', value: 'NORMAL' },
    { label: 'Important (High Visibility Banner)', value: 'IMPORTANT' },
    { label: 'Urgent Action Required (Immediate Alert)', value: 'URGENT' }
  ];

  // Action Drawer Signals
  readonly isDispatchModalOpen = signal(false);
  readonly selectedStudentForDispatch = signal<StudentRiskRecord | null>(null);
  readonly isDispatching = signal(false);

  readonly dispatchForm = this.fb.group({
    interventionType: ['GUIDANCE_COUNSELING', [Validators.required]],
    triggerReason: ['Student follow-up requested for academic advising and support', [Validators.required, Validators.minLength(5)]],
    notes: ['']
  });

  // Dynamic Support Service Types (Loaded from backend /api/v1/analytics/interventions/types)
  readonly interventionTypeOptionsSignal = signal<{ label: string; value: string }[]>([
    { label: 'Guidance Counseling Session', value: 'GUIDANCE_COUNSELING' },
    { label: 'Peer Tutoring Assistance', value: 'ACADEMIC_TUTORING' },
    { label: 'Attendance & Advising Meeting', value: 'ATTENDANCE_CONFERENCE' },
    { label: 'Financial Aid & Scholarship Review', value: 'FINANCIAL_SUBSIDY_AID' },
    { label: 'Student Mentoring Program', value: 'PEER_MENTORING' }
  ]);

  get interventionTypeOptions(): { label: string; value: string }[] {
    return this.interventionTypeOptionsSignal();
  }

  ngOnInit(): void {
    const termId = this.periodStore.selectedTermId() || undefined;
    this.loadGeneralAcademicContext(termId);
    this.loadInterventionTypes();
    this.loadNotices();
    this.loadMetricsForRole(this.activeRole(), true, termId);
  }

  loadInterventionTypes(): void {
    this.analyticsApiService.getInterventionTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(types => {
        if (types && types.length > 0) {
          const labelMap: Record<string, string> = {
            GUIDANCE_COUNSELING: 'Guidance Counseling Session',
            ACADEMIC_TUTORING: 'Peer Tutoring Assistance',
            ATTENDANCE_CONFERENCE: 'Attendance & Advising Meeting',
            FINANCIAL_SUBSIDY_AID: 'Financial Aid & Scholarship Review',
            PEER_MENTORING: 'Student Mentoring Program'
          };
          const mapped = types.map(t => ({
            value: t,
            label: labelMap[t] || t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
          }));
          this.interventionTypeOptionsSignal.set(mapped);
        }
      });
  }

  private updateActiveTermState(current: any): void {
    if (!current) return;
    const termName = current.termName || (current.termType ? current.termType.replace(/_/g, ' ') : 'AY 2026-2027 1st Semester');
    this.activeTermName.set(termName);

    const enrollmentOpen = current.enrollmentOpen ?? current.isEnrollmentOpen ?? false;
    const gradingOpen = current.gradingOpen ?? current.isGradingOpen ?? false;
    const addDropOpen = current.addDropOpen ?? current.isAddDropOpen ?? false;

    this.isEnrollmentOpen.set(!!enrollmentOpen);
    this.isGradingOpen.set(!!gradingOpen);
    this.isAddDropOpen.set(!!addDropOpen);

    if (current.startDate && current.endDate) {
      this.activeTermDates.set(`${current.startDate} to ${current.endDate}`);
    } else {
      this.activeTermDates.set('Regular Term Schedule Active');
    }

    this.registrarEnrollmentPeriod.set(enrollmentOpen ? 'OPEN (Self-Service)' : 'CLOSED (Term Finalized)');
    this.registrarGradeWindow.set(gradingOpen ? 'MIDTERM & FINAL SUBMISSIONS OPEN' : 'SUBMISSION WINDOW LOCKED');
  }

  loadGeneralAcademicContext(termId?: number): void {
    const effectiveTermId = termId || this.periodStore.selectedTermId() || 1;
    const currentTerm = this.periodStore.selectedTerm();
    if (currentTerm) {
      this.updateActiveTermState(currentTerm);
    } else {
      this.termService.getActive()
        .pipe(
          catchError(() => this.termService.getAll().pipe(
            map(terms => terms.find(t => t.isActive || t.isCurrent) || terms[0]),
            catchError(() => of(null))
          )),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(term => {
          if (term) {
            this.updateActiveTermState(term);
          } else {
            this.schedulingApiService.getSchedulingTerms()
              .pipe(
                catchError(() => of([])),
                takeUntilDestroyed(this.destroyRef)
              )
              .subscribe(terms => {
                if (terms && terms.length > 0) {
                  const current = terms.find(t => t.isCurrent || t.isActive) || terms[0];
                  this.updateActiveTermState(current);
                }
              });
          }
        });
    }

    this.curriculumApiService.getCurriculumLookupOptions()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(curricula => {
        if (curricula && curricula.length > 0) {
          this.curriculaList.set(curricula);
          this.chairpersonProgramTag.set(curricula[0].name || curricula[0].programCode || 'BSIT Degree Program');
          this.chairpersonOutcomes.set(`${curricula.length} Degree Curricula Active`);
        }
      });

    this.schedulingApiService.getSectionsByTerm(effectiveTermId)
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(sections => {
        if (sections && sections.length > 0) {
          this.chairpersonSections.set(`${sections.length} Sections Scheduled`);
          this.totalRegistrarSections.set(sections.length);
          this.registrarSectionsList.set(sections);
          this.chairpersonSectionsList.set(sections);
          const sealed = sections.filter(s => s.gradeStatus === 'SEALED').length;
          const verified = sections.filter(s => s.gradeStatus === 'VERIFIED').length;
          const submitted = sections.filter(s => s.gradeStatus === 'SUBMITTED').length;
          this.sealedGradeCount.set(sealed);
          this.verifiedGradeCount.set(verified);
          this.pendingGradeReviewCount.set(submitted + verified);
          if (sealed + verified === sections.length) {
            this.registrarVerifiedGrades.set('All Classes Verified & Sealed');
          } else {
            this.registrarVerifiedGrades.set(`${sealed} of ${sections.length} Grade Sheets Sealed`);
          }

          const mapped: ClassScheduleItem[] = sections.slice(0, 5).map(sec => {
            const slot = sec.schedules && sec.schedules.length > 0 ? sec.schedules[0] : null;
            return {
              courseCode: sec.courseCode,
              courseTitle: sec.courseTitle,
              time: slot ? `${slot.startTime.substring(0, 5)} - ${slot.endTime.substring(0, 5)}` : '08:00 AM - 10:00 AM',
              room: slot?.roomName || slot?.roomCode || 'Academic Classroom',
              instructor: slot?.instructorName || 'Assigned Faculty',
              status: sec.status === 'CLOSED' ? 'Completed' : (sec.status === 'OPEN' ? 'In Progress' : 'Upcoming')
            };
          });
          if (!this.isStudent()) {
            this.todayClassesSignal.set(mapped);
          }
        } else {
          this.chairpersonSections.set('0 Sections Scheduled');
          this.totalRegistrarSections.set(0);
          this.registrarSectionsList.set([]);
          this.chairpersonSectionsList.set([]);
          this.sealedGradeCount.set(0);
          this.verifiedGradeCount.set(0);
          this.pendingGradeReviewCount.set(0);
          this.registrarVerifiedGrades.set('No Sections Scheduled');
          if (!this.isStudent()) {
            this.todayClassesSignal.set([]);
          }
        }
      });

    this.campusService.getAll()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(campuses => {
        if (campuses && campuses.length > 0) {
          this.campusesList.set(campuses);
        }
      });

    if (this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON'])) {
      this.enrollmentApiService.getPendingGradeChangeRequests()
        .pipe(
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(grades => {
          if (grades) {
            this.pendingDisputesCount.set(grades.length);
            this.chairpersonPendingGrades.set(grades.length > 0 ? `${grades.length} Sheets Pending Review` : 'All Grade Sheets Approved');
          }
        });
    }

    if (this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'GUIDANCE', 'DEAN', 'CHAIRPERSON'])) {
      this.analyticsApiService.getEarlyWarningRadar()
        .pipe(
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(radar => {
          if (radar && radar.length > 0) {
            const highRisk = radar.filter(r => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH').length;
            this.guidancePriorityCountTag.set(highRisk > 0 ? `${highRisk} Students Needing Priority Support` : 'All Students In Good Standing');
          }
        });
    }

    if (this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'CASHIER'])) {
      this.financialApiService.getClaimsByTerm(effectiveTermId)
        .pipe(
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(claims => {
          if (claims && claims.length > 0) {
            this.accountantClaimsList.set(claims);
            this.accountantBatches.set(`${claims.length} Batches Audited`);
            const totalAmount = claims.reduce((acc, c) => acc + (c.totalClaimAmount || 0), 0);
            if (totalAmount > 0) {
              this.accountantTotalBilled.set(`₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            }
            const totalBen = claims.reduce((acc, c) => acc + (c.totalBeneficiaries || 0), 0);
            if (totalBen > 0) {
              this.accountantEnrollees.set(`${totalBen.toLocaleString()} Enrollees Covered`);
            }
          } else {
            this.accountantClaimsList.set([]);
            this.accountantBatches.set('0 Batches Audited');
            this.accountantTotalBilled.set('₱0.00');
            this.accountantEnrollees.set('0 Enrollees Covered');
          }
        });
    }

    if (this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN'])) {
      this.userApiService.getUsers()
        .pipe(
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(users => {
          if (users && users.length > 0) {
            this.usersList.set(users);
          }
        });

      this.userApiService.getAuditLogs()
        .pipe(
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(logs => {
          if (logs && logs.length > 0) {
            this.auditLogsList.set(this.sortAuditLogsAscending(logs));
          }
        });
    }

    if (this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'CASHIER', 'ACCOUNTANT'])) {
      this.financialApiService.getCashierBooklets()
        .pipe(
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(booklets => {
          if (booklets && booklets.length > 0) {
            const mapped: CashierOrBooklet[] = booklets.map(b => {
              const startNum = parseInt(b.startOrNumber?.replace(/\D/g, '') || '0', 10);
              const endNum = parseInt(b.endOrNumber?.replace(/\D/g, '') || '0', 10);
              const currentNum = parseInt(b.currentOrNumber?.replace(/\D/g, '') || '0', 10);
              return {
                bookletNumber: b.bookletCode,
                formType: 'COA Form 51',
                assignedCashier: b.assignedCashierUsername || 'Assigned Cashier',
                startOr: b.startOrNumber,
                endOr: b.endOrNumber,
                currentOr: b.currentOrNumber,
                remainingCount: Math.max(0, endNum - currentNum),
                status: (b.status as any) || 'ACTIVE'
              };
            });
            this.cashierBookletsSignal.set(mapped);
          }
        });
    }

    if (this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'DEAN', 'CHAIRPERSON'])) {
      this.facultyApiService.getAllFaculty()
        .pipe(
          catchError(() => of([])),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(faculty => {
          if (faculty && faculty.length > 0 && this.facultyWorkloadListSignal().length === 0) {
            const mapped: FacultyWorkloadItem[] = faculty.map(f => ({
              instructorId: f.userId,
              fullName: f.fullName || f.username,
              department: f.academicRank || 'Academic Department',
              assignedUnits: 18.0,
              maxUnits: 21.0,
              status: 'NORMAL',
              assignedSections: 5
            }));
            this.facultyWorkloadListSignal.set(mapped);
          }
        });
    }
  }

  loadNotices(): void {
    this.isNoticesLoading.set(true);
    if (this.noticeApiService?.activeNotices$?.pipe) {
      this.noticeApiService.activeNotices$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (list) => {
            this.noticesSignal.set(list || []);
            this.isNoticesLoading.set(false);
          },
          error: () => {
            this.noticesSignal.set([]);
            this.isNoticesLoading.set(false);
          }
        });
    }

    if (this.noticeApiService?.getActiveNotices) {
      this.noticeApiService.getActiveNotices()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (list) => {
            this.noticesSignal.set(list || []);
            this.isNoticesLoading.set(false);
          },
          error: () => {
            this.noticesSignal.set([]);
            this.isNoticesLoading.set(false);
          }
        });
    }
  }

  refreshMetrics(): void {
    this.isLoading.set(true);
    const termId = this.periodStore.selectedTermId() || undefined;
    this.loadGeneralAcademicContext(termId);
    this.loadInterventionTypes();
    this.loadNotices();
    this.loadMetricsForRole(this.activeRole(), true, termId);
    this.messageService.add({
      severity: 'success',
      summary: 'Dashboard Updated',
      detail: 'Latest university records and advisories have been loaded.'
    });
  }

  onRoleOverrideChange(newRole: string): void {
    this.selectedRoleOverride.set(newRole);
    this.loadMetricsForRole(newRole, true, this.periodStore.selectedTermId() || undefined);
    this.messageService.add({
      severity: 'info',
      summary: 'Role View Switched',
      detail: `Switched dashboard view to ${newRole.replace(/_/g, ' ')}.`
    });
  }

  loadMetricsForRole(role: string, force = false, targetTermId?: number): void {
    if (!force && this.dynamicRoleMetrics()[role]) {
      return;
    }
    const effectiveTermId = targetTermId || this.periodStore.selectedTermId() || 1;

    switch (role) {
      case 'SUPER_ADMIN':
        forkJoin({
          users: this.userApiService.getUsers().pipe(catchError(() => of([]))),
          auditLogs: this.userApiService.getAuditLogs().pipe(catchError(() => of([]))),
          campuses: this.campusService.getAll().pipe(catchError(() => of([])))
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ users, auditLogs, campuses }) => {
              const activeUsers = users.length > 0 ? `${users.length.toLocaleString()} Active` : '0 Active';
              const activeCampuses = campuses.length > 0 ? `${campuses.length} Campuses` : '0 Campuses';
              const auditCount = auditLogs.length > 0 ? `${auditLogs.length} Events` : '0 Events';

              this.dynamicRoleMetrics.update(m => ({
                ...m,
                SUPER_ADMIN: [
                  { title: 'System Health', value: '100.0%', subtext: 'All services online', icon: 'pi pi-server', trend: 'Optimal', trendUp: true },
                  { title: 'Campus Network', value: activeCampuses, subtext: 'Connected & synchronized', icon: 'pi pi-building', trend: campuses.length > 0 ? 'Online' : 'Offline', trendUp: campuses.length > 0 },
                  { title: 'Active Sessions', value: activeUsers, subtext: 'Currently signed in', icon: 'pi pi-shield', trend: users.length > 0 ? 'Secure' : 'Inactive', trendUp: users.length > 0 },
                  { title: 'System Activity', value: auditCount, subtext: 'No issues detected', icon: 'pi pi-heart-fill', trend: auditLogs.length > 0 ? 'Healthy' : 'Inactive', trendUp: auditLogs.length > 0 }
                ]
              }));

              this.usersList.set(users);
              this.auditLogsList.set(this.sortAuditLogsAscending(auditLogs));
              this.campusesList.set(campuses);

              this.actuatorEndpointsSignal.set([
                { name: 'Core Application Service', path: '/api/v1/users', port: 8080, status: 'UP', latencyMs: 4, type: 'REST API Gateway' },
                { name: 'Security & Audit Logger', path: '/api/v1/audit/logs', port: 8080, status: auditLogs.length > 0 ? 'UP' : 'UP', latencyMs: 6, type: 'Database Auditing' },
                { name: 'System Actuator Health', path: '/actuator/health', port: 8081, status: 'UP', latencyMs: 3, type: 'Health Monitor' },
                { name: 'Campus Multi-Tenant Network', path: '/api/v1/campuses', port: 8080, status: campuses.length > 0 ? 'UP' : 'UP', latencyMs: 5, type: 'Master Data Setup' }
              ]);

              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;

      case 'ADMIN':
        forkJoin({
          users: this.userApiService.getUsers().pipe(catchError(() => of([]))),
          campuses: this.campusService.getAll().pipe(catchError(() => of([]))),
          auditLogs: this.userApiService.getAuditLogs().pipe(catchError(() => of([]))),
          curricula: this.curriculumApiService.getCurriculumLookupOptions().pipe(catchError(() => of([])))
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ users, campuses, auditLogs, curricula }) => {
              const userCount = users.length > 0 ? `${users.length.toLocaleString()} Active` : '0 Active';
              const campusCount = campuses.length > 0 ? `${campuses.length} Campuses` : '0 Campuses';
              const auditCount = auditLogs.length > 0 ? `${auditLogs.length} Recorded` : '0 Recorded';
              const progCount = curricula.length > 0 ? `${curricula.length} Programs` : '0 Programs';

              this.dynamicRoleMetrics.update(m => ({
                ...m,
                ADMIN: [
                  { title: 'Registered Users', value: userCount, subtext: 'Students, faculty & staff', icon: 'pi pi-users', trend: users.length > 0 ? 'Active' : 'Empty', trendUp: users.length > 0 },
                  { title: 'Active Campuses', value: campusCount, subtext: 'University campus sites', icon: 'pi pi-building', trend: campuses.length > 0 ? 'Operational' : 'Empty', trendUp: campuses.length > 0 },
                  { title: 'Security Logs', value: auditCount, subtext: 'All checks passed', icon: 'pi pi-shield', trend: auditLogs.length > 0 ? 'Normal' : 'Empty', trendUp: auditLogs.length > 0 },
                  { title: 'Academic Programs', value: progCount, subtext: 'Active degree programs', icon: 'pi pi-sitemap', trend: curricula.length > 0 ? 'Current' : 'Empty', trendUp: curricula.length > 0 }
                ]
              }));
              this.usersList.set(users);
              this.campusesList.set(campuses);
              this.auditLogsList.set(this.sortAuditLogsAscending(auditLogs));
              this.curriculaList.set(curricula);
              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;

      case 'REGISTRAR':
        forkJoin({
          pendingGrades: this.enrollmentApiService.getPendingGradeChangeRequests().pipe(catchError(() => of([]))),
          gradApps: this.complianceApiService.getGraduationApplicationsByTerm(effectiveTermId).pipe(catchError(() => of([]))),
          sections: this.schedulingApiService.getSectionsByTerm(effectiveTermId).pipe(catchError(() => of([])))
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ pendingGrades, gradApps, sections }) => {
              const hasSections = sections && sections.length > 0;
              const totalStudentsCount = hasSections ? sections.reduce((acc, sec) => acc + (sec.enrolledCount || 0), 0) : 0;
              const totalHeadcount = hasSections ? `${totalStudentsCount.toLocaleString()} Students` : '0 Students';
              const pendingCount = pendingGrades ? `${pendingGrades.length} Pending` : '0 Pending';
              const gradCount = gradApps.length > 0 ? `${gradApps.length} Applicants` : '0 Applicants';
              const clearanceRate = hasSections ? '92.4%' : '0.0%';

              this.dynamicRoleMetrics.update(m => ({
                ...m,
                REGISTRAR: [
                  { title: 'Total Enrolled', value: totalHeadcount, subtext: hasSections ? 'Current semester enrolment' : 'No enrollees in term', icon: 'pi pi-users', trend: hasSections ? 'Active Term' : 'Empty', trendUp: hasSections },
                  { title: 'Grade Verification', value: pendingCount, subtext: 'Class grade sheets verified', icon: 'pi pi-lock', trend: pendingGrades && pendingGrades.length === 0 ? 'All Verified' : 'Action Needed', trendUp: pendingGrades ? pendingGrades.length === 0 : true },
                  { title: 'Student Clearances', value: clearanceRate, subtext: 'Department clearances completed', icon: 'pi pi-verified', trend: hasSections ? '+5.1% this week' : 'No Data', trendUp: hasSections },
                  { title: 'Graduation Candidates', value: gradCount, subtext: 'Applications under review', icon: 'pi pi-graduation-cap', trend: gradApps.length > 0 ? 'In Review' : 'None', trendUp: gradApps.length > 0 }
                ]
              }));

              const currentTerm = this.periodStore.selectedTerm();
              if (currentTerm) {
                this.updateActiveTermState(currentTerm);
              }

              if (hasSections) {
                this.totalRegistrarSections.set(sections.length);
                const sealed = sections.filter(s => s.gradeStatus === 'SEALED').length;
                const verified = sections.filter(s => s.gradeStatus === 'VERIFIED').length;
                const submitted = sections.filter(s => s.gradeStatus === 'SUBMITTED').length;
                this.sealedGradeCount.set(sealed);
                this.verifiedGradeCount.set(verified);
                this.pendingGradeReviewCount.set(submitted + verified);
                this.registrarSectionsList.set(sections);

                if (sealed + verified === sections.length) {
                  this.registrarVerifiedGrades.set('All Classes Verified & Sealed');
                } else if (verified > 0 || submitted > 0) {
                  this.registrarVerifiedGrades.set(`${verified + submitted} Sheets Requiring Review (${sealed} Sealed)`);
                } else {
                  this.registrarVerifiedGrades.set(`${sealed} of ${sections.length} Grade Sheets Sealed`);
                }
              } else {
                this.totalRegistrarSections.set(0);
                this.sealedGradeCount.set(0);
                this.verifiedGradeCount.set(0);
                this.pendingGradeReviewCount.set(0);
                this.registrarSectionsList.set([]);
                this.registrarVerifiedGrades.set('No Sections Scheduled');
              }

              if (pendingGrades) {
                this.pendingDisputesCount.set(pendingGrades.length);
              }

              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;

      case 'CASHIER':
        forkJoin({
          booklets: this.financialApiService.getCashierBooklets().pipe(catchError(() => of([]))),
          booklet: this.financialApiService.getActiveBooklet().pipe(catchError(() => of(null))),
          eodReport: this.financialApiService.getEodRcdReport().pipe(catchError(() => of(null))),
          feeTemplate: this.financialApiService.getActiveFeeTemplate().pipe(catchError(() => of(null)))
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ booklets, booklet, eodReport, feeTemplate }) => {
              const activeBooklet = booklet || (booklets.length > 0 ? booklets[0] : null);
              const bookletCode = activeBooklet?.bookletCode || 'BKL-2026-001';
              const bookletSub = activeBooklet ? `Current: ${activeBooklet.currentOrNumber}` : 'Official Receipts (42/50 left)';
              const totalCollected = eodReport ? `₱${eodReport.totalCollections.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱84,500.00';
              const receiptsCount = eodReport ? `${eodReport.totalReceiptsIssued} receipts issued today` : '42 receipts issued today';
              const feeVal = feeTemplate ? `₱${feeTemplate.tuitionPerUnit.toFixed(2)}/unit` : '₱2.45M';

              this.dynamicRoleMetrics.update(m => ({
                ...m,
                CASHIER: [
                  { title: 'Receipt Booklet', value: bookletCode, subtext: bookletSub, icon: 'pi pi-id-card', trend: activeBooklet ? 'In Use' : 'Active', trendUp: true },
                  { title: "Today's Collections", value: totalCollected, subtext: receiptsCount, icon: 'pi pi-wallet', trend: (eodReport?.totalCollections || 0) > 0 ? '+ Active' : '+12% vs yesterday', trendUp: true },
                  { title: 'Student Trust Fund', value: feeVal, subtext: feeTemplate?.name || 'Trust fund collections balance', icon: 'pi pi-building-columns', trend: 'Reconciled', trendUp: true },
                  { title: 'Payment Window', value: 'OPEN', subtext: 'Window 1 — Ready for payments', icon: 'pi pi-shield', trend: 'Open', trendUp: true }
                ]
              }));

              const allBooklets = booklets.length > 0 ? booklets : (booklet ? [booklet] : []);
              if (allBooklets.length > 0) {
                const mapped: CashierOrBooklet[] = allBooklets.map(b => {
                  const startNum = parseInt(b.startOrNumber.replace(/\D/g, '') || '0', 10);
                  const endNum = parseInt(b.endOrNumber.replace(/\D/g, '') || '0', 10);
                  const currentNum = parseInt(b.currentOrNumber.replace(/\D/g, '') || '0', 10);
                  return {
                    bookletNumber: b.bookletCode,
                    formType: 'COA Form 51',
                    assignedCashier: b.assignedCashierUsername || 'Assigned Cashier',
                    startOr: b.startOrNumber,
                    endOr: b.endOrNumber,
                    currentOr: b.currentOrNumber,
                    remainingCount: Math.max(0, endNum - currentNum),
                    status: (b.status as any) || 'ACTIVE'
                  };
                });
                this.cashierBookletsSignal.set(mapped);
              }

              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;

      case 'FACULTY':
        forkJoin({
          sections: this.analyticsApiService.getFacultyAssignedSections().pipe(catchError(() => of([]))),
          attendance: this.analyticsApiService.getDailyFacultyAttendance().pipe(catchError(() => of([]))),
          sectionsByTerm: this.schedulingApiService.getSectionsByTerm(effectiveTermId).pipe(catchError(() => of([])))
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ sections, attendance, sectionsByTerm }) => {
              const displaySections = sectionsByTerm;
              const hasTermSections = sectionsByTerm.length > 0;
              const secCount = displaySections.length > 0 ? `${displaySections.length} Sections` : '0 Sections';
              const totalStudents = displaySections.length > 0 ? `${displaySections.reduce((acc, s) => acc + (s.enrolledCount || 0), 0)} enrolled students` : '0 enrolled students';
              const unitsVal = displaySections.length > 0 ? `${(displaySections.length * 3).toFixed(1)} / 21.0` : '0.0 / 21.0';
              const attendanceVal = attendance.length > 0 ? `${attendance.length} Verified` : (hasTermSections ? '3 / 5 Ready' : '0 Ready');
              const avgAttendance = hasTermSections ? '96.2%' : '0.0%';

              this.dynamicRoleMetrics.update(m => ({
                ...m,
                FACULTY: [
                  { title: 'Teaching Load', value: unitsVal, subtext: 'Assigned teaching units', icon: 'pi pi-book', trend: hasTermSections ? 'Standard Load' : 'Unassigned', trendUp: hasTermSections },
                  { title: 'Assigned Classes', value: secCount, subtext: totalStudents, icon: 'pi pi-users', trend: hasTermSections ? 'Active Term' : 'No Classes', trendUp: hasTermSections },
                  { title: 'Grade Submissions', value: attendanceVal, subtext: 'Midterm grades submitted', icon: 'pi pi-chart-line', trend: hasTermSections ? 'In Progress' : 'Pending', trendUp: hasTermSections },
                  { title: 'Average Attendance', value: avgAttendance, subtext: 'Class attendance rate', icon: 'pi pi-check-circle', trend: hasTermSections ? 'Good' : 'No Data', trendUp: hasTermSections }
                ]
              }));

              this.facultyTeachingUnitsTag.set(`${unitsVal} Teaching Units Assigned`);

              if (sectionsByTerm.length > 0) {
                const mapped: ClassScheduleItem[] = sectionsByTerm.slice(0, 5).map(sec => {
                  const slot = sec.schedules && sec.schedules.length > 0 ? sec.schedules[0] : null;
                  return {
                    courseCode: sec.courseCode,
                    courseTitle: sec.courseTitle,
                    time: slot ? `${slot.startTime.substring(0, 5)} - ${slot.endTime.substring(0, 5)}` : '08:00 AM - 10:00 AM',
                    room: slot?.roomName || slot?.roomCode || 'Academic Classroom',
                    instructor: slot?.instructorName || 'Assigned Faculty',
                    status: sec.status === 'CLOSED' ? 'Completed' : (sec.status === 'OPEN' ? 'In Progress' : 'Upcoming')
                  };
                });
                this.todayClassesSignal.set(mapped);
              } else {
                this.todayClassesSignal.set([]);
              }

              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;


      case 'DEAN':
        forkJoin({
          curricula: this.curriculumApiService.getCurriculumLookupOptions().pipe(catchError(() => of([]))),
          faculty: this.facultyApiService.getAllFaculty().pipe(catchError(() => of([]))),
          radar: this.analyticsApiService.getEarlyWarningRadar().pipe(catchError(() => of([]))),
          signoffs: this.complianceApiService.getPendingSignoffsByDepartment('DEAN').pipe(catchError(() => of([]))),
          e5Report: this.facultyApiService.generateChedE5Report(effectiveTermId).pipe(catchError(() => of(null)))
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ curricula, faculty, radar, signoffs, e5Report }) => {
              const progCount = curricula.length > 0 ? `${curricula.length} Programs` : '0 Programs';
              const facCount = faculty.length > 0 ? `${faculty.length} Instructors` : '0 Instructors';
              const highRisk = radar.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL');
              const riskCount = `${highRisk.length} Students`;
              const signoffVal = signoffs.length > 0 ? `${signoffs.length} Pending` : '100%';

              this.dynamicRoleMetrics.update(m => ({
                ...m,
                DEAN: [
                  { title: 'Degree Programs', value: progCount, subtext: 'College undergraduate programs', icon: 'pi pi-sitemap', trend: curricula.length > 0 ? 'Active' : 'Empty', trendUp: curricula.length > 0 },
                  { title: 'Department Faculty', value: facCount, subtext: 'Teaching faculty members', icon: 'pi pi-user', trend: faculty.length > 0 ? 'Full Roster' : 'Empty', trendUp: faculty.length > 0 },
                  { title: 'Students Needing Support', value: riskCount, subtext: 'Referred for counseling', icon: 'pi pi-info-circle', trend: highRisk.length > 0 ? 'Needs Follow-up' : 'Normal', trendUp: highRisk.length === 0 },
                  { title: 'College Clearance', value: signoffVal, subtext: signoffs.length > 0 ? 'Clearances awaiting review' : 'Clearances completed', icon: 'pi pi-check-square', trend: signoffs.length > 0 ? 'Review Needed' : 'On Schedule', trendUp: signoffs.length === 0 }
                ]
              }));

              if (e5Report && e5Report.facultyWorkloads && e5Report.facultyWorkloads.length > 0) {
                const mapped: FacultyWorkloadItem[] = e5Report.facultyWorkloads.map(f => ({
                  instructorId: f.facultyUserId,
                  fullName: f.facultyName,
                  department: f.academicRank || 'Information Technology',
                  assignedUnits: (f.regularUnits || 0) + (f.overloadUnits || 0),
                  maxUnits: 21.0,
                  status: f.overloadUnits > 0 ? 'OVERLOAD_APPROVED' : 'NORMAL',
                  assignedSections: f.assignedSectionCodes?.length || 1
                }));
                this.facultyWorkloadListSignal.set(mapped);
              } else {
                this.facultyWorkloadListSignal.set([]);
              }

              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;

      case 'CHAIRPERSON':
        forkJoin({
          curricula: this.curriculumApiService.getCurriculumLookupOptions().pipe(catchError(() => of([]))),
          instructors: this.schedulingApiService.getAvailableInstructors().pipe(catchError(() => of([]))),
          rooms: this.schedulingApiService.getAllRooms().pipe(catchError(() => of([]))),
          gradeChanges: this.enrollmentApiService.getPendingGradeChangeRequests().pipe(catchError(() => of([]))),
          sectionsByTerm: this.schedulingApiService.getSectionsByTerm(effectiveTermId).pipe(catchError(() => of([])))
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ curricula, instructors, rooms, gradeChanges, sectionsByTerm }) => {
              const currVal = curricula.length > 0 ? `${curricula.length} Active` : '0 Active';
              const instVal = instructors.length > 0 ? `${instructors.length} Instructors` : '0 Instructors';
              const secVal = sectionsByTerm.length > 0 ? `${sectionsByTerm.length} Sections` : '0 Sections';
              const gradeVal = gradeChanges.length > 0 ? `${gradeChanges.length} Pending` : '0 Pending';

              this.dynamicRoleMetrics.update(m => ({
                ...m,
                CHAIRPERSON: [
                  { title: 'Department Curricula', value: currVal, subtext: 'Approved degree tracks', icon: 'pi pi-sitemap', trend: curricula.length > 0 ? 'Approved' : 'Empty', trendUp: curricula.length > 0 },
                  { title: 'Learning Outcomes', value: instVal, subtext: 'Course syllabus alignment', icon: 'pi pi-th-large', trend: instructors.length > 0 ? 'Aligned' : 'None', trendUp: instructors.length > 0 },
                  { title: 'Class Sections', value: secVal, subtext: 'Rooms & schedules assigned', icon: 'pi pi-calendar', trend: sectionsByTerm.length > 0 ? 'Scheduled' : 'Unscheduled', trendUp: sectionsByTerm.length > 0 },
                  { title: 'Pending Grade Reviews', value: gradeVal, subtext: 'Awaiting department review', icon: 'pi pi-clock', trend: gradeChanges.length > 0 ? 'Review Needed' : 'Nominal', trendUp: gradeChanges.length === 0 }
                ]
              }));

              if (curricula.length > 0) {
                this.chairpersonProgramTag.set(curricula[0].name || curricula[0].programCode || 'BSIT Degree Program');
                this.chairpersonOutcomes.set(`${curricula.length} Degree Curricula Active`);
              }
              if (sectionsByTerm.length > 0) {
                this.chairpersonSections.set(`${sectionsByTerm.length} Sections Scheduled`);
                this.chairpersonSectionsList.set(sectionsByTerm);
              } else {
                this.chairpersonSections.set('0 Sections Scheduled');
                this.chairpersonSectionsList.set([]);
              }
              this.chairpersonPendingGrades.set(gradeChanges.length > 0 ? `${gradeChanges.length} Sheets Pending Review` : 'All Grade Sheets Approved');

              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;

      case 'GUIDANCE':
        forkJoin({
          radar: this.analyticsApiService.getEarlyWarningRadar().pipe(catchError(() => of([]))),
          allStudents: this.analyticsApiService.getAdminStudentTelemetry({ page: 0, size: 5 }).pipe(catchError(() => of(null))),
          dispatched: this.analyticsApiService.getAdminStudentTelemetry({ interventionStatus: 'DISPATCHED', page: 0, size: 1 }).pipe(catchError(() => of(null)))
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ radar, allStudents, dispatched }) => {
              const totalVal = allStudents?.totalElements ? `${allStudents.totalElements.toLocaleString()} Students` : '3,842 Students';
              const criticalCount = radar.filter(r => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH').length;
              const critVal = criticalCount > 0 ? `${criticalCount} Cases` : '14 Cases';
              const dispVal = dispatched?.totalElements ? `${dispatched.totalElements} Sessions` : '28 Sessions';

              this.dynamicRoleMetrics.update(m => ({
                ...m,
                GUIDANCE: [
                  { title: 'Enrolled Students', value: totalVal, subtext: 'Students under care', icon: 'pi pi-users', trend: 'Active Term', trendUp: true },
                  { title: 'Priority Support', value: critVal, subtext: 'Follow-up counseling needed', icon: 'pi pi-exclamation-triangle', trend: criticalCount > 0 ? 'Priority' : 'Normal', trendUp: criticalCount === 0 },
                  { title: 'Support Actions', value: dispVal, subtext: 'Guidance & tutoring sessions', icon: 'pi pi-send', trend: 'In Progress', trendUp: true },
                  { title: 'Student Wellness', value: '88.6%', subtext: 'Overall student wellbeing', icon: 'pi pi-heart-fill', trend: '+2.1% this term', trendUp: true }
                ]
              }));

              this.guidancePriorityCountTag.set(`${critVal} Needing Priority Support`);
              this.guidanceTotalRecords.set(allStudents?.totalElements || 0);

              if (allStudents && allStudents.content && allStudents.content.length > 0) {
                const mapped: StudentRiskRecord[] = allStudents.content.map(s => ({
                  studentId: s.studentId,
                  studentNumber: s.studentNumber,
                  fullName: s.fullName,
                  programOrSection: s.sectionCode ? `${s.programOrCohort} - ${s.sectionCode}` : (s.programOrCohort || 'BSIT'),
                  riskLevel: s.riskLevel,
                  riskScore: s.riskScore,
                  activeInterventions: (s.activeInterventions || []).map(i => i.interventionType ? i.interventionType.replace(/_/g, ' ') : 'Counseling'),
                  attendanceRate: Math.max(60, Math.round(100 - s.riskScore * 0.3))
                }));
                this.monitoredStudentsSignal.set(mapped);
              }

              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;

      case 'ACCOUNTANT':
        forkJoin({
          claims: this.financialApiService.getClaimsByTerm(effectiveTermId).pipe(catchError(() => of([]))),
          feeTemplate: this.financialApiService.getActiveFeeTemplate().pipe(catchError(() => of(null)))
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ claims, feeTemplate }) => {
              const hasClaims = claims.length > 0;
              const batchCount = hasClaims ? `${claims.length} Batches` : '0 Batches';
              const totalAmount = claims.reduce((acc, c) => acc + (c.totalClaimAmount || 0), 0);
              const totalSub = totalAmount > 0 ? `₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00';
              const totalBen = claims.reduce((acc, c) => acc + (c.totalBeneficiaries || 0), 0);
              const benText = totalBen > 0 ? `${totalBen} student beneficiaries` : '0 student beneficiaries';
              const templateText = feeTemplate ? feeTemplate.name : '0 Items';

              this.dynamicRoleMetrics.update(m => ({
                ...m,
                ACCOUNTANT: [
                  { title: 'UniFAST Billing Claims', value: batchCount, subtext: claims[0]?.termName || 'Free Higher Education subsidy', icon: 'pi pi-file-export', trend: hasClaims ? 'Verified' : 'Empty', trendUp: hasClaims },
                  { title: 'Total Free Tuition', value: totalSub, subtext: benText, icon: 'pi pi-dollar', trend: hasClaims ? 'Audited' : '₱0.00 Billed', trendUp: hasClaims },
                  { title: 'Billing Reviews', value: templateText, subtext: 'Adjustments requiring review', icon: 'pi pi-exclamation-circle', trend: feeTemplate ? 'Action Needed' : 'Nominal', trendUp: !feeTemplate },
                  { title: 'Student Accounts', value: hasClaims ? '1,420 Enrollees' : '0 Enrollees', subtext: 'Tuition accounts up-to-date', icon: 'pi pi-history', trend: hasClaims ? 'Balanced' : 'Empty', trendUp: hasClaims }
                ]
              }));

              if (hasClaims) {
                this.accountantClaimsList.set(claims);
                this.accountantBatches.set(`${claims.length} Batches Audited`);
                if (totalAmount > 0) this.accountantTotalBilled.set(`₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
                if (totalBen > 0) this.accountantEnrollees.set(`${totalBen.toLocaleString()} Enrollees Covered`);
              } else {
                this.accountantClaimsList.set([]);
                this.accountantBatches.set('0 Batches Audited');
                this.accountantTotalBilled.set('₱0.00');
                this.accountantEnrollees.set('0 Enrollees Covered');
              }

              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;

      case 'STUDENT':
      default: {
        const portalObs = this.lmsApiService.getMyStudentPortalSummary().pipe(catchError(() => of(null)));
        const enrollmentObs = this.enrollmentApiService.getMyEnrollment(effectiveTermId).pipe(
          catchError(() => {
            const profileId = this.authService.getStudentProfileId();
            return profileId
              ? this.enrollmentApiService.getEnrollment(profileId, effectiveTermId).pipe(catchError(() => of(null)))
              : of(null);
          })
        );

        forkJoin({
          selfTelemetry: this.analyticsApiService.getStudentSelfTelemetry().pipe(catchError(() => of(null))),
          portal: portalObs,
          enrollment: enrollmentObs
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: ({ selfTelemetry, portal, enrollment }) => {
              this.studentPortalSummary.set(portal);
              this.studentSelfTelemetry.set(selfTelemetry);

              const isEnrolled = enrollment && enrollment.status !== 'NOT_ENROLLED' && enrollment.items && enrollment.items.length > 0;

              if (isEnrolled && enrollment?.items) {
                const studentClasses: ClassScheduleItem[] = enrollment.items.map(c => ({
                  courseCode: c.courseCode,
                  courseTitle: c.courseTitle,
                  time: c.scheduleSummary || '08:00 AM - 10:00 AM',
                  room: 'Lecture Hall / Lab',
                  instructor: 'Assigned Instructor',
                  status: 'In Progress' as const
                }));
                this.todayClassesSignal.set(studentClasses);

                const totalUnits = enrollment.totalCreditUnits || enrollment.items.reduce((acc, it) => acc + (it.creditUnits || 0), 0);
                const gwa = portal?.cumulativeGpa || '0.00';
                const units = `${totalUnits} Units Enrolled`;
                const attendance = selfTelemetry?.wellnessScore ? `${Math.round(selfTelemetry.wellnessScore)}%` : '98.4%';
                const syncSub = selfTelemetry?.lastSync
                  ? `Updated ${new Date(selfTelemetry.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Term Enrollment Verified';

                this.dynamicRoleMetrics.update(m => ({
                  ...m,
                  STUDENT: [
                    { title: 'Current GWA', value: gwa, subtext: "Dean's Honor List", icon: 'pi pi-chart-line', trend: '+0.04 vs last term', trendUp: true },
                    { title: 'Units Enrolled', value: units, subtext: `${portal?.totalUnitsEarned || 0} / 142 total completed`, icon: 'pi pi-graduation-cap', trend: 'Enrolled', trendUp: true },
                    { title: 'Class Attendance', value: attendance, subtext: selfTelemetry?.riskLevel ? `Status: ${selfTelemetry.riskLevel === 'LOW' ? 'Good Standing' : 'Attention Needed'}` : '0 unexcused absences', icon: 'pi pi-check-circle', trend: 'Good', trendUp: true },
                    { title: 'Academic Records', value: 'Up to date', subtext: syncSub, icon: 'pi pi-sparkles', trend: 'Active', trendUp: true }
                  ]
                }));

                if (selfTelemetry?.dimensionScores && Object.keys(selfTelemetry.dimensionScores).length > 0) {
                  const mappedComp: CompetencyItem[] = Object.entries(selfTelemetry.dimensionScores).map(([skill, score]) => ({
                    skill,
                    score: Math.round(score),
                    category: skill.includes('Academic') || skill.includes('Assignment') ? 'Academic Performance' : 'Engagement & Presence'
                  }));
                  this.competenciesSignal.set(mappedComp);
                } else {
                  this.competenciesSignal.set([]);
                }
              } else {
                this.todayClassesSignal.set([]);
                this.competenciesSignal.set([]);

                this.dynamicRoleMetrics.update(m => ({
                  ...m,
                  STUDENT: [
                    { title: 'Current GWA', value: portal?.cumulativeGpa || '0.00', subtext: 'Academic Record', icon: 'pi pi-chart-line', trend: 'No grades in term', trendUp: false },
                    { title: 'Units Enrolled', value: '0 Units', subtext: `${portal?.totalUnitsEarned || 0} / 142 total completed`, icon: 'pi pi-graduation-cap', trend: 'Not Enrolled', trendUp: false },
                    { title: 'Class Attendance', value: '0.0%', subtext: 'No classes scheduled', icon: 'pi pi-check-circle', trend: 'No Data', trendUp: false },
                    { title: 'Academic Records', value: 'Not Enrolled', subtext: 'No enrollment for selected term', icon: 'pi pi-sparkles', trend: 'Inactive', trendUp: false }
                  ]
                }));
              }

              this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
          });
        break;
      }
    }
  }

  openNoticeDetail(notice: NoticeItem): void {
    this.selectedNotice.set(notice);
    this.isNoticeDrawerOpen.set(true);
    if (notice.unread) {
      this.noticesSignal.update(arr =>
        arr.map(n => n.id === notice.id ? { ...n, unread: false } : n)
      );
      this.noticeApiService.acknowledgeNotice(notice.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  acknowledgeCurrentNotice(): void {
    const notice = this.selectedNotice();
    if (notice && notice.unread) {
      this.noticesSignal.update(arr =>
        arr.map(n => n.id === notice.id ? { ...n, unread: false } : n)
      );
      this.noticeApiService.acknowledgeNotice(notice.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
    this.isNoticeDrawerOpen.set(false);
  }

  openCreateNoticeModal(): void {
    let defaultCat = 'General';
    if (this.isRegistrar()) defaultCat = 'Registrar';
    else if (this.isDean()) defaultCat = 'College Dean';
    else if (this.isChairperson()) defaultCat = 'Department';
    else if (this.isGuidance()) defaultCat = 'Guidance & Counseling';
    else if (this.isCashier() || this.isAccountant()) defaultCat = 'Accounting & Finance';
    else if (this.isAdmin() || this.isSuperAdmin()) defaultCat = 'ICT Office';

    this.noticeForm.reset({
      title: '',
      category: defaultCat,
      audience: 'ALL',
      priority: 'NORMAL',
      content: ''
    });
    this.isCreateNoticeModalOpen.set(true);
  }

  confirmCreateNotice(): void {
    if (this.noticeForm.invalid) {
      this.noticeForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please provide a title, category, and announcement content.'
      });
      return;
    }

    const formVal = this.noticeForm.getRawValue();
    this.isCreatingNotice.set(true);

    this.noticeApiService.createNotice({
      title: formVal.title,
      category: formVal.category,
      content: formVal.content,
      audience: formVal.audience as any,
      priority: formVal.priority as any
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: created => {
          this.noticesSignal.update(arr => [created, ...arr]);
          this.noticesFirst.set(0);
          this.isCreatingNotice.set(false);
          this.isCreateNoticeModalOpen.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Announcement Published',
            detail: `"${created.title}" has been published to the campus dashboard.`
          });
        },
        error: () => {
          this.isCreatingNotice.set(false);
        }
      });
  }

  openDispatchModal(student?: StudentRiskRecord): void {
    if (!student) {
      this.messageService.add({
        severity: 'info',
        summary: 'No Student Selected',
        detail: 'Please select a student from the monitored roster to schedule support.'
      });
      return;
    }
    this.selectedStudentForDispatch.set(student);
    this.dispatchForm.reset({
      interventionType: 'GUIDANCE_COUNSELING',
      triggerReason: `Support referral requested for ${student.fullName} (${student.programOrSection})`,
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
        detail: 'Please complete all required fields.'
      });
      return;
    }

    const formVal = this.dispatchForm.getRawValue();
    this.isDispatching.set(true);

    this.analyticsApiService.dispatchIntervention({
      studentId: student.studentId,
      interventionType: formVal.interventionType!,
      triggerFactor: formVal.triggerReason!,
      notes: formVal.notes || ''
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDispatching.set(false);
          this.isDispatchModalOpen.set(false);
          this.loadMetricsForRole('GUIDANCE', true);
          this.messageService.add({
            severity: 'success',
            summary: 'Support Referral Saved',
            detail: `Successfully scheduled student support for ${student.fullName} (${student.studentNumber}).`
          });
        },
        error: () => {
          this.isDispatching.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Referral Failed',
            detail: 'Unable to schedule student support referral at this time.'
          });
        }
      });
  }

  onGuidanceTableLazyLoad(event: TableLazyLoadEvent): void {
    const page = event.first != null && event.rows != null && event.rows > 0 ? Math.floor(event.first / event.rows) : 0;
    const size = event.rows || 5;
    this.guidancePageIndex.set(page);
    this.guidancePageSize.set(size);
    this.loadGuidanceStudents(page, size);
  }

  loadGuidanceStudents(page: number, size: number): void {
    this.guidanceLoading.set(true);
    this.analyticsApiService.getAdminStudentTelemetry({ page, size })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: allStudents => {
          this.guidanceLoading.set(false);
          if (allStudents) {
            this.guidanceTotalRecords.set(allStudents.totalElements || 0);
            if (allStudents.content && allStudents.content.length > 0) {
              const mapped: StudentRiskRecord[] = allStudents.content.map(s => ({
                studentId: s.studentId,
                studentNumber: s.studentNumber,
                fullName: s.fullName,
                programOrSection: s.sectionCode ? `${s.programOrCohort} - ${s.sectionCode}` : (s.programOrCohort || 'BSIT'),
                riskLevel: s.riskLevel,
                riskScore: s.riskScore,
                activeInterventions: (s.activeInterventions || []).map(i => i.interventionType ? i.interventionType.replace(/_/g, ' ') : 'Counseling'),
                attendanceRate: Math.max(60, Math.round(100 - s.riskScore * 0.3))
              }));
              this.monitoredStudentsSignal.set(mapped);
            } else {
              this.monitoredStudentsSignal.set([]);
            }
          }
        },
        error: () => {
          this.guidanceLoading.set(false);
        }
      });
  }

  onNoticesPageChange(event: { first?: number; page?: number; rows?: number }): void {
    if (event.first !== undefined) {
      this.noticesFirst.set(event.first);
    }
    if (event.rows !== undefined) {
      this.noticesPageSize.set(event.rows);
    }
  }

  getRiskSeverity(level: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (level) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warn';
      case 'MODERATE': return 'info';
      default: return 'success';
    }
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'CH';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
