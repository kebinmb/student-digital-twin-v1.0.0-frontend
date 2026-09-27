import { Component, computed, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';

// PrimeNG Standalone Components & Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { DrawerModule } from 'primeng/drawer';
import { TableModule } from 'primeng/table';
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

export interface NoticeItem {
  id: string;
  title: string;
  category: string;
  date: string;
  unread: boolean;
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
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard-component.html',
  styleUrls: ['./dashboard-component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly isLoading = signal(false);
  readonly selectedNotice = signal<NoticeItem | null>(null);
  readonly isNoticeDrawerOpen = signal(false);

  // Role override switcher signal (defaults to null, falls back to auth user role)
  readonly selectedRoleOverride = signal<string | null>(null);

  // Active Role string normalized
  readonly activeRole = computed<string>(() => {
    const override = this.selectedRoleOverride();
    if (override) return override.toUpperCase();
    const userRole = this.authService.currentUser()?.role || 'STUDENT';
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
    { label: 'Student Digital Twin', value: 'STUDENT' },
    { label: 'Guidance & Student Welfare', value: 'GUIDANCE' },
    { label: 'Accounting & UniFAST FHE', value: 'ACCOUNTANT' }
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
    if (this.isSuperAdmin()) return 'SUPER ADMINISTRATOR • INFRASTRUCTURE & VIRTUAL THREADS';
    if (this.isAdmin()) return 'SYSTEM ADMINISTRATOR • INSTITUTIONAL GOVERNANCE';
    if (this.isRegistrar()) return 'UNIVERSITY REGISTRAR • ACADEMIC RECORDS & ENROLMENT';
    if (this.isCashier()) return 'CASHIERING TERMINAL • COA FORM 51 POS';
    if (this.isFaculty()) return 'FACULTY INSTRUCTION • CLASS RECORDS & TELEMETRY';
    if (this.isDean()) return 'COLLEGE DEAN • ACADEMIC GOVERNANCE & FACULTY';
    if (this.isChairperson()) return 'DEPARTMENT CHAIRPERSON • CURRICULUM & TIMETABLE';
    if (this.isStudent()) return 'STUDENT DIGITAL TWIN • PERSONAL ACADEMIC TELEMETRY';
    if (this.isGuidance()) return 'GUIDANCE COUNSELOR • STUDENT WELFARE & RISK RADAR';
    if (this.isAccountant()) return 'ACCOUNTING OFFICE • UNIFAST FHE & FUND LEDGERS';
    return 'SDT ENTERPRISE MANAGEMENT';
  });

  readonly roleTitle = computed(() => {
    if (this.isSuperAdmin()) return 'Super Administrator System Command & Telemetry Console';
    if (this.isAdmin()) return 'System Administrator Master Governance Cockpit';
    if (this.isRegistrar()) return 'University Registrar Enrolment & Grade Sealing Cockpit';
    if (this.isCashier()) return 'Cashiering POS & COA Form 51 Collections Terminal';
    if (this.isFaculty()) return 'Faculty Instructional Class Record & Attendance Telemetry Radar';
    if (this.isDean()) return 'College Executive Leadership & Academic Governance Console';
    if (this.isChairperson()) return 'Department Chairperson Curriculum & Timetable Console';
    if (this.isStudent()) return 'Personal Academic Digital Twin Telemetry Portal';
    if (this.isGuidance()) return 'Guidance Counselor Risk Radar & AI Intervention Cockpit';
    if (this.isAccountant()) return 'Accounting Office & UniFAST FHE Billing Claim Ledger';
    return 'Enterprise Dashboard Overview';
  });

  readonly roleSubtitle = computed(() => {
    if (this.isSuperAdmin()) return 'Carlos Hilado Memorial State University • JVM Loom Virtual Threads, Actuator Port 8081 & Flyway V100 Topology';
    if (this.isAdmin()) return 'Carlos Hilado Memorial State University • Institutional account provisioning, RBAC matrix & campus hierarchy';
    if (this.isRegistrar()) return 'Carlos Hilado Memorial State University • Office of the University Registrar • Academic period locks & SHA-256 grade sealing';
    if (this.isCashier()) return 'Carlos Hilado Memorial State University • Business Office POS • Official Receipts, OR booklets & EOD RCD Form 58-A';
    if (this.isFaculty()) return 'Carlos Hilado Memorial State University • Academic Instruction • Section gradebooks, geofenced QR scans & CMO 25 load';
    if (this.isDean()) return 'Carlos Hilado Memorial State University • College Governance • Department curricula, faculty overload approvals & clearance';
    if (this.isChairperson()) return 'Carlos Hilado Memorial State University • Academic Department • CILO-PILO outcome matrices, section schedules & grade sheets';
    if (this.isStudent()) return 'Carlos Hilado Memorial State University • Undergraduate Scholar • Diagnostic health index & retention risk telemetry';
    if (this.isGuidance()) return 'Carlos Hilado Memorial State University • Guidance & Counseling Office • Student risk radar & AI intervention dispatch';
    if (this.isAccountant()) return 'Carlos Hilado Memorial State University • Accounting Office • RA 10931 UniFAST FHE claims & double-entry ledgers';
    return 'Carlos Hilado Memorial State University Enterprise Portal';
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
    { title: 'Current GWA', value: '1.38', subtext: "Dean's Honor List", icon: 'pi pi-chart-line', trend: '+0.04 vs last term', trendUp: true },
    { title: 'Curriculum Progress', value: '84 / 142', subtext: '59% Units Completed', icon: 'pi pi-graduation-cap', trend: 'On Track', trendUp: true },
    { title: 'Attendance Rate', value: '98.4%', subtext: '0 unexcused absences', icon: 'pi pi-check-circle', trend: 'Exemplary', trendUp: true },
    { title: 'Twin Model Sync', value: '99.8%', subtext: 'Telemetry Up-to-date', icon: 'pi pi-sparkles', trend: 'Active', trendUp: true }
  ];

  // Dynamically adapted 4-KPI Metric Ribbon for ALL 10 Roles
  readonly displayedMetrics = computed<MetricCard[]>(() => {
    if (this.isSuperAdmin()) {
      return [
        { title: 'System Uptime', value: '100.0%', subtext: 'Loom Virtual Threads Enabled', icon: 'pi pi-server', trend: 'Optimal', trendUp: true },
        { title: 'Database Topology', value: 'MySQL 8.0', subtext: '17 Flyway Migrations (V100)', icon: 'pi pi-database', trend: 'Synchronized', trendUp: true },
        { title: 'Security Sessions', value: '1,480 Tokens', subtext: 'Dual-Token JWT & Denylist', icon: 'pi pi-shield', trend: 'Protected', trendUp: true },
        { title: 'Actuator Telemetry', value: '200 OK', subtext: 'Management Port 8081', icon: 'pi pi-heart-fill', trend: 'Healthy', trendUp: true }
      ];
    }
    if (this.isAdmin()) {
      return [
        { title: 'Total System Users', value: '1,480 Active', subtext: 'Multi-Tenant Provisioned', icon: 'pi pi-users', trend: 'Online', trendUp: true },
        { title: 'Active Campuses', value: '4 Campuses', subtext: 'Institutional Master Setup', icon: 'pi pi-building', trend: 'Active', trendUp: true },
        { title: 'Security Audit Logs', value: '284 Recorded', subtext: 'AOP Method Intercepted', icon: 'pi pi-shield', trend: '0 Tampering', trendUp: true },
        { title: 'API Gateway Health', value: '100% Uptime', subtext: 'Spring Boot 4.1 Tomcat 11', icon: 'pi pi-server', trend: 'Healthy', trendUp: true }
      ];
    }
    if (this.isRegistrar()) {
      return [
        { title: 'Total Enrolment', value: '3,842 Headcount', subtext: 'Undergraduate & Transferees', icon: 'pi pi-users', trend: 'Active Intake', trendUp: true },
        { title: 'Grade Sealing Engine', value: '148 / 180', subtext: 'SHA-256 Ledger Locked', icon: 'pi pi-lock', trend: '82% Sealed', trendUp: true },
        { title: 'Clearance Completion', value: '92.4%', subtext: 'Multi-Dept Gate 3 Validated', icon: 'pi pi-verified', trend: '+5.1% this week', trendUp: true },
        { title: 'Graduation Candidates', value: '412 Applicants', subtext: 'CHED SO Applications Audited', icon: 'pi pi-graduation-cap', trend: 'Audited', trendUp: true }
      ];
    }
    if (this.isCashier()) {
      return [
        { title: 'Active O.R. Booklet', value: 'BKL-2026-001', subtext: 'COA Form 51 (42/50 Left)', icon: 'pi pi-id-card', trend: 'Assigned', trendUp: true },
        { title: "Today's Collections", value: '₱84,500.00', subtext: '42 Official Receipts Issued', icon: 'pi pi-wallet', trend: '+12% vs yesterday', trendUp: true },
        { title: 'Fund 164 STF Balance', value: '₱2.45M', subtext: 'Special Trust Fund Ledger', icon: 'pi pi-building-columns', trend: 'Reconciled', trendUp: true },
        { title: 'POS Shift Status', value: 'OPEN', subtext: 'Terminal 01 - Cashier Desk', icon: 'pi pi-shield', trend: 'Active Shift', trendUp: true }
      ];
    }
    if (this.isFaculty()) {
      return [
        { title: 'Teaching Workload', value: '18.0 / 21.0', subtext: 'Contact Units Assigned', icon: 'pi pi-book', trend: 'CMO 25 Compliant', trendUp: true },
        { title: 'Active Teaching Load', value: '5 Sections', subtext: '182 Enrolled Students', icon: 'pi pi-users', trend: 'Active Term', trendUp: true },
        { title: 'Gradebook Encoding', value: '3 / 5 Ready', subtext: 'Midterm Grading Encoded', icon: 'pi pi-chart-line', trend: 'In Progress', trendUp: true },
        { title: 'Class Attendance Avg', value: '96.2%', subtext: 'Geofenced QR Scan Rate', icon: 'pi pi-qrcode', trend: 'Exemplary', trendUp: true }
      ];
    }
    if (this.isDean()) {
      return [
        { title: 'College Curricula', value: '8 Programs', subtext: 'CHED CMO 25 Compliant', icon: 'pi pi-sitemap', trend: 'Versioned', trendUp: true },
        { title: 'Department Faculty', value: '24 Instructors', subtext: 'Workload Caps Verified', icon: 'pi pi-user', trend: '0 Overload Alert', trendUp: true },
        { title: 'Dropout Risk Radar', value: '12 Students', subtext: 'Guidance Intervention Referral', icon: 'pi pi-radar', trend: 'Action Needed', trendUp: false },
        { title: 'College Clearance Rate', value: '94.1%', subtext: 'Department Signoffs Complete', icon: 'pi pi-check-square', trend: 'On Schedule', trendUp: true }
      ];
    }
    if (this.isChairperson()) {
      return [
        { title: 'Program Curricula', value: '3 Active', subtext: 'CHED Degree Revision 2026', icon: 'pi pi-sitemap', trend: 'Approved', trendUp: true },
        { title: 'CILO-PILO Matrix', value: '96.4%', subtext: 'OBE Outcome Alignment', icon: 'pi pi-th-large', trend: 'CHED Audited', trendUp: true },
        { title: 'Section Timetables', value: '28 Sections', subtext: 'Room Allocation Complete', icon: 'pi pi-calendar', trend: 'Scheduled', trendUp: true },
        { title: 'Submitted Grade Sheets', value: '4 Pending', subtext: 'Instructor Sheet Verification', icon: 'pi pi-clock', trend: 'Review Needed', trendUp: false }
      ];
    }
    if (this.isGuidance()) {
      return [
        { title: 'Monitored Student Body', value: '3,842 Students', subtext: 'Digital Twin Risk Engine', icon: 'pi pi-users', trend: 'Live Telemetry', trendUp: true },
        { title: 'Critical & High Risk', value: '14 Cases', subtext: 'Immediate Counseling Needed', icon: 'pi pi-exclamation-triangle', trend: 'High Priority', trendUp: false },
        { title: 'Dispatched AI Actions', value: '28 Interventions', subtext: 'Active Guidance & Tutoring', icon: 'pi pi-send', trend: 'In Progress', trendUp: true },
        { title: 'Cohort Wellness Index', value: '88.6%', subtext: 'Aggregate Behavioral Score', icon: 'pi pi-heart-fill', trend: '+2.1% this term', trendUp: true }
      ];
    }
    if (this.isAccountant()) {
      return [
        { title: 'UniFAST FHE Claims', value: '4 Batches', subtext: 'AY 2026-2027 1st Sem', icon: 'pi pi-file-export', trend: 'Form 2 Verified', trendUp: true },
        { title: 'Total FHE Subsidy', value: '₱1,280,450.00', subtext: '318 Beneficiaries Accounted', icon: 'pi pi-dollar', trend: 'Audited', trendUp: true },
        { title: 'Pending Disallowances', value: '2 Items', subtext: 'MRR Overstay Triggers', icon: 'pi pi-exclamation-circle', trend: 'Action Needed', trendUp: false },
        { title: 'Active Student Ledgers', value: '1,420 Enrollees', subtext: 'Double-Entry Synchronized', icon: 'pi pi-history', trend: 'Balanced', trendUp: true }
      ];
    }
    return this.metrics;
  });

  // Dynamically adapted Quick Actions for ALL 10 Roles
  readonly roleQuickActions = computed<QuickActionItem[]>(() => {
    if (this.isSuperAdmin()) {
      return [
        { label: 'Actuator Telemetry', icon: 'pi pi-heart', routerLink: '/dashboard/admin/lms-config', severity: 'danger' },
        { label: 'User Provisioning', icon: 'pi pi-users', routerLink: '/dashboard/users', severity: 'primary' },
        { label: 'Security Audit Logs', icon: 'pi pi-shield', routerLink: '/dashboard/institution', severity: 'info' },
        { label: 'Flyway DB Status', icon: 'pi pi-database', routerLink: '/dashboard/curriculum/designer/1', severity: 'success' }
      ];
    }
    if (this.isAdmin()) {
      return [
        { label: 'User Management', icon: 'pi pi-users', routerLink: '/dashboard/users', severity: 'primary' },
        { label: 'Institutional Registry', icon: 'pi pi-building', routerLink: '/dashboard/institution', severity: 'info' },
        { label: 'Curriculum Designer', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer/1', severity: 'success' },
        { label: 'LTI LMS Config', icon: 'pi pi-desktop', routerLink: '/dashboard/admin/lms-config', severity: 'secondary' }
      ];
    }
    if (this.isRegistrar()) {
      return [
        { label: 'Grade Sealing Engine', icon: 'pi pi-lock', routerLink: '/dashboard/grades', severity: 'primary' },
        { label: 'Degree Audit & TOR', icon: 'pi pi-graduation-cap', routerLink: '/dashboard/compliance/audit', severity: 'success' },
        { label: 'CHED HEMIS Reports', icon: 'pi pi-file-pdf', routerLink: '/dashboard/compliance/ched', severity: 'info' },
        { label: 'Admissions Intake', icon: 'pi pi-user-plus', routerLink: '/dashboard/admission-management', severity: 'warn' }
      ];
    }
    if (this.isCashier()) {
      return [
        { label: 'Cashier POS Terminal', icon: 'pi pi-credit-card', routerLink: '/dashboard/finance/cashier', severity: 'primary' },
        { label: 'Student Account Ledger', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', severity: 'info' },
        { label: 'Assign O.R. Booklet', icon: 'pi pi-id-card', routerLink: '/dashboard/finance/cashier', severity: 'success' },
        { label: 'EOD RCD Report', icon: 'pi pi-file-pdf', routerLink: '/dashboard/finance/cashier', severity: 'secondary' }
      ];
    }
    if (this.isFaculty()) {
      return [
        { label: 'Section Gradebook', icon: 'pi pi-chart-line', routerLink: '/dashboard/grades', severity: 'primary' },
        { label: 'QR Attendance Check-In', icon: 'pi pi-qrcode', routerLink: '/dashboard/analytics/qr-attendance', severity: 'success' },
        { label: 'Class Scheduling', icon: 'pi pi-calendar', routerLink: '/dashboard/scheduling', severity: 'info' },
        { label: 'Early Warning Radar', icon: 'pi pi-radar', routerLink: '/dashboard/analytics/early-warning', severity: 'warn' }
      ];
    }
    if (this.isDean()) {
      return [
        { label: 'Curriculum Designer', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer/1', severity: 'primary' },
        { label: 'Section Builder', icon: 'pi pi-calendar-plus', routerLink: '/dashboard/scheduling', severity: 'info' },
        { label: 'Department Clearance', icon: 'pi pi-verified', routerLink: '/dashboard/compliance/clearance', severity: 'success' },
        { label: 'Early Warning Radar', icon: 'pi pi-radar', routerLink: '/dashboard/analytics/early-warning', severity: 'warn' }
      ];
    }
    if (this.isChairperson()) {
      return [
        { label: 'Curriculum Designer', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer/1', severity: 'primary' },
        { label: 'CILO-PILO Matrix', icon: 'pi pi-th-large', routerLink: '/dashboard/curriculum/designer/1', severity: 'info' },
        { label: 'Section Timetables', icon: 'pi pi-calendar', routerLink: '/dashboard/scheduling', severity: 'success' },
        { label: 'Grade Verification', icon: 'pi pi-check-square', routerLink: '/dashboard/grades', severity: 'warn' }
      ];
    }
    if (this.isGuidance()) {
      return [
        { label: 'Dispatch AI Intervention', icon: 'pi pi-send', routerLink: '/dashboard/analytics/early-warning', severity: 'warn' },
        { label: 'Counseling Log', icon: 'pi pi-heart', routerLink: '/dashboard/portal/student', severity: 'primary' },
        { label: 'Peer Tutoring Roster', icon: 'pi pi-users', routerLink: '/dashboard/users', severity: 'info' },
        { label: 'Wellness Radar', icon: 'pi pi-radar', routerLink: '/dashboard/analytics/early-warning', severity: 'success' }
      ];
    }
    if (this.isAccountant()) {
      return [
        { label: 'UniFAST FHE Claims', icon: 'pi pi-file-export', routerLink: '/dashboard/finance/unifast', severity: 'primary' },
        { label: 'Student Account Ledger', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', severity: 'info' },
        { label: 'Statutory Equity Portal', icon: 'pi pi-chart-bar', routerLink: '/dashboard/compliance/equity-portal', severity: 'success' },
        { label: 'Fee Catalog Manager', icon: 'pi pi-wallet', routerLink: '/dashboard/finance/cashier', severity: 'secondary' }
      ];
    }
    return [
      { label: 'Download COR', icon: 'pi pi-file-pdf', routerLink: '/dashboard/enrollment', severity: 'primary' },
      { label: 'Digital Student ID', icon: 'pi pi-id-card', routerLink: '/dashboard/portal/student', severity: 'info' },
      { label: 'Clearance Status', icon: 'pi pi-check-square', routerLink: '/dashboard/compliance/clearance', severity: 'success' },
      { label: 'Student Ledger', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', severity: 'warn' }
    ];
  });

  // Sample Monitored Risk Telemetry Data for Guidance & Admin views
  readonly monitoredStudents: StudentRiskRecord[] = [
    { studentId: 101, studentNumber: '2023-0142-S', fullName: 'Juan Dela Cruz', programOrSection: 'BSIT 3-A', riskLevel: 'CRITICAL', riskScore: 88.5, activeInterventions: ['Guidance Counseling'], attendanceRate: 72.4 },
    { studentId: 102, studentNumber: '2023-0891-S', fullName: 'Maria Clara Santos', programOrSection: 'BSCS 2-B', riskLevel: 'HIGH', riskScore: 74.2, activeInterventions: ['Academic Tutoring'], attendanceRate: 81.0 },
    { studentId: 103, studentNumber: '2024-0012-S', fullName: 'Jose Rizal Mercado', programOrSection: 'BSED 1-A', riskLevel: 'MODERATE', riskScore: 48.0, activeInterventions: ['Attendance Conference'], attendanceRate: 89.5 },
    { studentId: 104, studentNumber: '2023-0554-S', fullName: 'Andres Bonifacio', programOrSection: 'BSIT 3-B', riskLevel: 'LOW', riskScore: 12.0, activeInterventions: [], attendanceRate: 98.2 },
    { studentId: 105, studentNumber: '2022-0912-S', fullName: 'Melchora Aquino', programOrSection: 'BSIS 4-A', riskLevel: 'CRITICAL', riskScore: 91.0, activeInterventions: ['UniFAST Aid Review', 'Guidance Counseling'], attendanceRate: 68.0 }
  ];

  // Sample Faculty Workload for Dean view
  readonly facultyWorkloadList: FacultyWorkloadItem[] = [
    { instructorId: 201, fullName: 'Engr. J. Dela Cruz', department: 'Information Technology', assignedUnits: 18.0, maxUnits: 21.0, status: 'NORMAL', assignedSections: 5 },
    { instructorId: 202, fullName: 'Prof. M. Santos', department: 'Computer Science', assignedUnits: 24.0, maxUnits: 21.0, status: 'OVERLOAD_PENDING', assignedSections: 7 },
    { instructorId: 203, fullName: 'Dr. R. Alcantara', department: 'Information Systems', assignedUnits: 21.0, maxUnits: 21.0, status: 'NORMAL', assignedSections: 6 },
    { instructorId: 204, fullName: 'Engr. A. Mabini', department: 'Information Technology', assignedUnits: 27.0, maxUnits: 21.0, status: 'OVERLOAD_APPROVED', assignedSections: 8 }
  ];

  // Sample Cashier OR Booklets
  readonly cashierBooklets: CashierOrBooklet[] = [
    { bookletNumber: 'BKL-2026-001', formType: 'COA Form 51', assignedCashier: 'Ana Maria Cashier', startOr: 'OR-890001', endOr: 'OR-890050', currentOr: 'OR-890042', remainingCount: 8, status: 'ACTIVE' },
    { bookletNumber: 'BKL-2026-002', formType: 'COA Form 51', assignedCashier: 'Ana Maria Cashier', startOr: 'OR-890051', endOr: 'OR-890100', currentOr: 'OR-890051', remainingCount: 50, status: 'UNASSIGNED' }
  ];

  // Sample Actuator Endpoints for Super Admin view
  readonly actuatorEndpoints: SystemActuatorEndpoint[] = [
    { name: 'System Health Indicator', path: '/actuator/health', port: 8081, status: 'UP', latencyMs: 4, type: 'Spring Actuator' },
    { name: 'Prometheus Metrics Ingress', path: '/actuator/prometheus', port: 8081, status: 'UP', latencyMs: 12, type: 'Micrometer Metrics' },
    { name: 'Loom Virtual Threads Pool', path: '/actuator/metrics/jvm.threads.live', port: 8081, status: 'UP', latencyMs: 2, type: 'JVM Executor' },
    { name: 'Flyway Migration Engine', path: '/actuator/flyway', port: 8081, status: 'UP', latencyMs: 8, type: 'Database Migration' }
  ];

  // Today's schedule
  readonly todayClasses: ClassScheduleItem[] = [
    { courseCode: 'IT 311', courseTitle: 'Enterprise Architecture & Cloud Systems', time: '08:00 AM - 10:00 AM', room: 'IT Building - Lab 304', instructor: 'Engr. J. Dela Cruz', status: 'Completed' },
    { courseCode: 'CS 320', courseTitle: 'Modern Software Engineering & DevOps', time: '10:30 AM - 12:30 PM', room: 'Main Tech Center - Rm 201', instructor: 'Prof. M. Santos', status: 'In Progress' },
    { courseCode: 'IT 314', courseTitle: 'Data Communications & IoT Networks', time: '02:00 PM - 04:00 PM', room: 'Networking Lab - Rm 102', instructor: 'Dr. R. Alcantara', status: 'Upcoming' }
  ];

  // Competency Profiling for Student View
  readonly competencies: CompetencyItem[] = [
    { skill: 'Full-Stack Web Architecture', score: 94, category: 'Software Development' },
    { skill: 'Distributed Database Systems', score: 88, category: 'Data & Systems' },
    { skill: 'Information Security Protocols', score: 91, category: 'Cybersecurity' },
    { skill: 'Algorithmic Problem Solving', score: 86, category: 'Core Computing' }
  ];

  // Academic notices
  readonly notices: NoticeItem[] = [
    { id: '1', title: 'Midterm Examination Schedule AY 2026-2027 Released', category: 'Registrar', date: 'Today, 9:00 AM', unread: true },
    { id: '2', title: 'Online Encoding of Student Clearance Now Open', category: 'Student Affairs', date: 'Yesterday', unread: false },
    { id: '3', title: 'CHMSU ICT Helpdesk Maintenance on Saturday 10 PM', category: 'ICT Office', date: '2 days ago', unread: false }
  ];

  // Action Drawer Signals
  readonly isDispatchModalOpen = signal(false);
  readonly selectedStudentForDispatch = signal<StudentRiskRecord | null>(null);
  readonly isDispatching = signal(false);

  readonly dispatchForm = this.fb.group({
    interventionType: ['GUIDANCE_COUNSELING', [Validators.required]],
    triggerReason: ['Critical Risk Flag Triggered by AI Telemetry Engine', [Validators.required, Validators.minLength(5)]],
    notes: ['']
  });

  readonly interventionTypeOptions = [
    { label: 'Guidance Counseling Session', value: 'GUIDANCE_COUNSELING' },
    { label: 'Academic Peer Tutoring', value: 'ACADEMIC_TUTORING' },
    { label: 'Attendance Conference', value: 'ATTENDANCE_CONFERENCE' },
    { label: 'UniFAST Financial Aid Review', value: 'FINANCIAL_SUBSIDY_AID' },
    { label: 'Peer Mentoring Assignment', value: 'PEER_MENTORING' }
  ];

  ngOnInit(): void {
    // Initialization logic if needed
  }

  onRoleOverrideChange(newRole: string): void {
    this.selectedRoleOverride.set(newRole);
    this.messageService.add({
      severity: 'info',
      summary: 'Role View Switched',
      detail: `Switched dashboard perspective to ${newRole.replace(/_/g, ' ')}.`
    });
  }

  openNoticeDetail(notice: NoticeItem): void {
    this.selectedNotice.set(notice);
    this.isNoticeDrawerOpen.set(true);
  }

  openDispatchModal(student: StudentRiskRecord): void {
    this.selectedStudentForDispatch.set(student);
    this.dispatchForm.reset({
      interventionType: 'GUIDANCE_COUNSELING',
      triggerReason: `Risk Level [${student.riskLevel}] — AI Telemetry Trigger for ${student.fullName}`,
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

    this.isDispatching.set(true);
    setTimeout(() => {
      this.isDispatching.set(false);
      this.isDispatchModalOpen.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'AI Intervention Dispatched',
        detail: `Dispatched support action to ${student.fullName} (${student.studentNumber}).`
      });
    }, 600);
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
