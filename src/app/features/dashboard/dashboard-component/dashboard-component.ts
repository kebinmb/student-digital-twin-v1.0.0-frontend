import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// PrimeNG Standalone Components
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Skeleton } from 'primeng/skeleton';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';
import { Drawer } from 'primeng/drawer';

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

@Component({
  selector: 'app-dashboard-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    Button,
    Card,
    Skeleton,
    ProgressBar,
    Tag,
    Drawer
  ],
  templateUrl: './dashboard-component.html',
  styleUrls: ['./dashboard-component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  protected readonly authService = inject(AuthService);

  readonly isLoading = signal(false);
  readonly selectedNotice = signal<NoticeItem | null>(null);
  readonly isNoticeDrawerOpen = signal(false);

  readonly userName = computed(() => this.authService.currentUser().username || 'Institutional User');
  readonly studentName = this.userName;
  readonly userRole = computed(() => (this.authService.currentUser().role || 'STUDENT').toUpperCase());

  readonly isStudent = computed(() => this.authService.hasRole('STUDENT'));
  readonly isFaculty = computed(() => this.authService.hasRole('FACULTY'));
  readonly isCashier = computed(() => this.authService.hasRole('CASHIER'));
  readonly isAccountant = computed(() => this.authService.hasRole('ACCOUNTANT'));
  readonly isDean = computed(() => this.authService.hasAnyRole(['DEAN', 'CHAIRPERSON']));
  readonly isRegistrar = computed(() => this.authService.hasRole('REGISTRAR'));
  readonly isAdmin = computed(() => this.authService.hasAnyRole(['ADMIN', 'SUPER_ADMIN']));

  readonly currentTime = signal(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }));

  readonly roleBadge = computed(() => {
    if (this.isStudent()) return 'CHMSU Student Digital Twin • Real-time Academic Telemetry';
    if (this.isFaculty()) return 'Faculty Instruction Portal • Class Records & Attendance';
    if (this.isCashier()) return 'Cashiering & POS Terminal • COA Form 51 Collections';
    if (this.isAccountant()) return 'Accounting Office • UniFAST FHE & Fund Ledgers';
    if (this.isRegistrar()) return 'University Registrar • Enrolment & Degree Audit';
    if (this.isDean()) return 'College Executive Console • Curricular & Clearance Oversight';
    return 'SDT Enterprise Administration • System Health & Identity Telemetry';
  });

  readonly roleSubtitle = computed(() => {
    if (this.isStudent()) return 'Carlos Hilado Memorial State University • Undergraduate • Enrolled • AY 2026-2027';
    if (this.isFaculty()) return 'Carlos Hilado Memorial State University • College Faculty Member • Academic Instruction';
    if (this.isCashier()) return 'Carlos Hilado Memorial State University • Cashier & Business Office • Point of Sale';
    if (this.isAccountant()) return 'Carlos Hilado Memorial State University • Accounting Office • UniFAST FHE & Fund Accounting';
    if (this.isRegistrar()) return 'Carlos Hilado Memorial State University • Office of the University Registrar • Academic Records';
    if (this.isDean()) return 'Carlos Hilado Memorial State University • Academic Governance • College & Program Leadership';
    return 'Carlos Hilado Memorial State University • Enterprise Systems Administration & Security';
  });

  // Base student metrics (maintained for backwards-compatibility in specs)
  readonly metrics: MetricCard[] = [
    {
      title: 'Current GWA',
      value: '1.38',
      subtext: "Dean's Honor List",
      icon: 'pi pi-chart-line',
      trend: '+0.04 vs last term',
      trendUp: true
    },
    {
      title: 'Curriculum Progress',
      value: '84 / 142',
      subtext: '59% Units Completed',
      icon: 'pi pi-graduation-cap',
      trend: 'On Track',
      trendUp: true
    },
    {
      title: 'Attendance Rate',
      value: '98.4%',
      subtext: '0 unexcused absences',
      icon: 'pi pi-check-circle',
      trend: 'Exemplary',
      trendUp: true
    },
    {
      title: 'Twin Model Sync',
      value: '99.8%',
      subtext: 'Telemetry Up-to-date',
      icon: 'pi pi-sparkles',
      trend: 'Active',
      trendUp: true
    }
  ];

  // Role-adapted KPI metric cards
  readonly displayedMetrics = computed<MetricCard[]>(() => {
    if (this.isFaculty()) {
      return [
        { title: 'Teaching Workload', value: '18.0 / 21.0', subtext: 'Contact Units Assigned', icon: 'pi pi-book', trend: 'CMO 25 Compliant', trendUp: true },
        { title: 'Active Teaching Sections', value: '5 Sections', subtext: '182 Enrolled Students', icon: 'pi pi-users', trend: 'Active Term', trendUp: true },
        { title: 'Gradebook Submission', value: '3 / 5 Ready', subtext: 'Midterm Grading Encoded', icon: 'pi pi-chart-line', trend: 'In Progress', trendUp: true },
        { title: 'Class Attendance Average', value: '96.2%', subtext: 'QR Telemetry Active', icon: 'pi pi-check-circle', trend: 'Good Attendance', trendUp: true }
      ];
    }
    if (this.isCashier()) {
      return [
        { title: 'Active O.R. Booklet', value: 'BKL-2026-001', subtext: 'Form 51 (42/50 Remaining)', icon: 'pi pi-id-card', trend: 'Assigned', trendUp: true },
        { title: "Today's Collections", value: '₱84,500.00', subtext: '42 Official Receipts', icon: 'pi pi-wallet', trend: '+12% vs yesterday', trendUp: true },
        { title: 'Fund 164 STF Balance', value: '₱2.45M', subtext: 'Special Trust Fund', icon: 'pi pi-building-columns', trend: 'Reconciled', trendUp: true },
        { title: 'Shift Status', value: 'OPEN', subtext: 'Terminal 01 - Cashier Desk', icon: 'pi pi-shield', trend: 'Active Shift', trendUp: true }
      ];
    }
    if (this.isAccountant()) {
      return [
        { title: 'UniFAST FHE Claims', value: '4 Batches', subtext: 'AY 2026-2027 1st Sem', icon: 'pi pi-file-export', trend: 'Audited', trendUp: true },
        { title: 'Total FHE Subsidy', value: '₱1,280,450.00', subtext: '318 Beneficiaries', icon: 'pi pi-dollar', trend: 'Form 2 Verified', trendUp: true },
        { title: 'Pending Disallowances', value: '2 Items', subtext: 'MRR Overstay Triggers', icon: 'pi pi-exclamation-circle', trend: 'Action Needed', trendUp: false },
        { title: 'Active Student Ledgers', value: '1,420 Enrollees', subtext: 'Double-entry synchronized', icon: 'pi pi-history', trend: 'Balanced', trendUp: true }
      ];
    }
    if (this.isRegistrar()) {
      return [
        { title: 'Total Enrolment', value: '3,842 Headcount', subtext: 'Undergraduate & Transferees', icon: 'pi pi-users', trend: 'Active Intake', trendUp: true },
        { title: 'Clearance Completion', value: '92.4%', subtext: 'Gate 3 Validated', icon: 'pi pi-verified', trend: '+5.1% this week', trendUp: true },
        { title: 'Grade Sealing Progress', value: '148 / 180', subtext: 'Registrar SHA-256 Ledger', icon: 'pi pi-lock', trend: '82% Sealed', trendUp: true },
        { title: 'Graduation Candidates', value: '412 Applicants', subtext: 'CHED SO Applications', icon: 'pi pi-graduation-cap', trend: 'Audited', trendUp: true }
      ];
    }
    if (this.isDean()) {
      return [
        { title: 'Active Curricula', value: '8 Programs', subtext: 'CHED CMO 25 Compliant', icon: 'pi pi-sitemap', trend: 'Immutably Versioned', trendUp: true },
        { title: 'Department Faculty', value: '24 Instructors', subtext: 'Workload Caps Verified', icon: 'pi pi-user', trend: '0 Overload Violations', trendUp: true },
        { title: 'Early Warning Radar', value: '12 Students', subtext: 'Telemetry Dropout Risk', icon: 'pi pi-radar', trend: 'Guidance Referred', trendUp: false },
        { title: 'Clearance Approvals', value: '94.1%', subtext: 'Department Signoffs', icon: 'pi pi-check-square', trend: 'On Schedule', trendUp: true }
      ];
    }
    if (this.isAdmin()) {
      return [
        { title: 'System Users', value: '1,480 Active', subtext: 'Dual-Token Protected', icon: 'pi pi-users', trend: 'Online', trendUp: true },
        { title: 'Security Audit Logs', value: '284 Recorded', subtext: 'AOP Method Intercepted', icon: 'pi pi-shield', trend: '0 Tampering', trendUp: true },
        { title: 'Microservice Gateway', value: '100% Uptime', subtext: 'Loom Virtual Threads', icon: 'pi pi-server', trend: 'Healthy', trendUp: true },
        { title: 'Flyway Migration', value: 'V100 Applied', subtext: 'MySQL 8 Production Sync', icon: 'pi pi-database', trend: 'Up to Date', trendUp: true }
      ];
    }
    return this.metrics;
  });

  // Role-adapted quick actions
  readonly roleQuickActions = computed<QuickActionItem[]>(() => {
    if (this.isFaculty()) {
      return [
        { label: 'Section Gradebook', icon: 'pi pi-chart-line', routerLink: '/dashboard/grades', severity: 'primary' },
        { label: 'QR Attendance Check-In', icon: 'pi pi-qrcode', routerLink: '/dashboard/analytics/qr-attendance', severity: 'success' },
        { label: 'Class Scheduling', icon: 'pi pi-calendar', routerLink: '/dashboard/scheduling', severity: 'info' },
        { label: 'Early Warning Radar', icon: 'pi pi-radar', routerLink: '/dashboard/analytics/early-warning', severity: 'warn' }
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
    if (this.isAccountant()) {
      return [
        { label: 'UniFAST FHE Claims', icon: 'pi pi-file-export', routerLink: '/dashboard/finance/unifast', severity: 'primary' },
        { label: 'Student Account Ledger', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', severity: 'info' },
        { label: 'Statutory Equity Portal', icon: 'pi pi-chart-bar', routerLink: '/dashboard/compliance/equity-portal', severity: 'success' },
        { label: 'Collections Audit', icon: 'pi pi-wallet', routerLink: '/dashboard/finance/cashier', severity: 'secondary' }
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
    if (this.isDean()) {
      return [
        { label: 'Curriculum Designer', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer/1', severity: 'primary' },
        { label: 'Section Builder', icon: 'pi pi-calendar-plus', routerLink: '/dashboard/scheduling', severity: 'info' },
        { label: 'Department Clearance', icon: 'pi pi-verified', routerLink: '/dashboard/compliance/clearance', severity: 'success' },
        { label: 'Early Warning Radar', icon: 'pi pi-radar', routerLink: '/dashboard/analytics/early-warning', severity: 'warn' }
      ];
    }
    if (this.isAdmin()) {
      return [
        { label: 'User Management', icon: 'pi pi-users', routerLink: '/dashboard/users', severity: 'primary' },
        { label: 'Institutional Registry', icon: 'pi pi-building', routerLink: '/dashboard/institution', severity: 'info' },
        { label: 'Curriculum Designer', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer/1', severity: 'success' },
        { label: 'LTI Integration', icon: 'pi pi-desktop', routerLink: '/dashboard/admin/lms-config', severity: 'secondary' }
      ];
    }
    return [
      { label: 'Download COR', icon: 'pi pi-file-pdf', routerLink: '/dashboard/enrollment', severity: 'primary' },
      { label: 'Digital Student ID', icon: 'pi pi-id-card', routerLink: '/dashboard/portal/student', severity: 'info' },
      { label: 'Clearance Status', icon: 'pi pi-check-square', routerLink: '/dashboard/compliance/clearance', severity: 'success' },
      { label: 'Student Ledger', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', severity: 'warn' }
    ];
  });

  // Today's schedule
  readonly todayClasses: ClassScheduleItem[] = [
    {
      courseCode: 'IT 311',
      courseTitle: 'Enterprise Architecture & Cloud Systems',
      time: '08:00 AM - 10:00 AM',
      room: 'IT Building - Lab 304',
      instructor: 'Engr. J. Dela Cruz',
      status: 'Completed'
    },
    {
      courseCode: 'CS 320',
      courseTitle: 'Modern Software Engineering & DevOps',
      time: '10:30 AM - 12:30 PM',
      room: 'Main Tech Center - Rm 201',
      instructor: 'Prof. M. Santos',
      status: 'In Progress'
    },
    {
      courseCode: 'IT 314',
      courseTitle: 'Data Communications & IoT Networks',
      time: '02:00 PM - 04:00 PM',
      room: 'Networking Lab - Rm 102',
      instructor: 'Dr. R. Alcantara',
      status: 'Upcoming'
    }
  ];

  // Digital Twin Competency Profiling
  readonly competencies: CompetencyItem[] = [
    { skill: 'Full-Stack Web Architecture', score: 94, category: 'Software Development' },
    { skill: 'Distributed Database Systems', score: 88, category: 'Data & Systems' },
    { skill: 'Information Security Protocols', score: 91, category: 'Cybersecurity' },
    { skill: 'Algorithmic Problem Solving', score: 86, category: 'Core Computing' }
  ];

  // Academic announcements
  readonly notices: NoticeItem[] = [
    {
      id: '1',
      title: 'Midterm Examination Schedule AY 2026-2027 Released',
      category: 'Registrar',
      date: 'Today, 9:00 AM',
      unread: true
    },
    {
      id: '2',
      title: 'Online Encoding of Student Clearance Now Open',
      category: 'Student Affairs',
      date: 'Yesterday',
      unread: false
    },
    {
      id: '3',
      title: 'CHMSU ICT Helpdesk Maintenance on Saturday 10 PM',
      category: 'ICT Office',
      date: '2 days ago',
      unread: false
    }
  ];

  openNoticeDetail(notice: NoticeItem): void {
    this.selectedNotice.set(notice);
    this.isNoticeDrawerOpen.set(true);
  }
}
