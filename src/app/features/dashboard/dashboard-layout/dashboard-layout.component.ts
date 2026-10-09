import { Component, computed, inject, signal, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Standalone Components & Directives
import { Avatar } from 'primeng/avatar';
import { Badge } from 'primeng/badge';
import { InputText } from 'primeng/inputtext';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { AuthService } from '../../../core/service/authentication/auth-service';
import { StudentProfileService } from '../../../core/services/student-profile.service';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

export interface NavItem {
  label: string;
  icon: string;
  routerLink: string;
  exact?: boolean;
  badge?: string;
  badgeSeverity?: 'info' | 'success' | 'warn' | 'danger';
  roles?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Avatar,
    Badge,
    Menu,
    ButtonModule,
    TooltipModule,
    SelectModule,
    TagModule
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  protected readonly periodStore = inject(AcademicPeriodStore);
  private readonly router = inject(Router);

  // Global Academic Period
  readonly termOptions = computed(() => {
    return this.periodStore.terms().map(t => ({
      label: t.academicYearCode ? `${t.academicYearCode} - ${this.formatTermType(t.termType)}${t.isActive ? ' (Active)' : ''}` : `Term ${t.id}`,
      value: t.id
    }));
  });

  formatTermType(type: string): string {
    if (!type) return '';
    if (type === '1ST_SEM' || type === 'FIRST_SEM') return '1st Sem';
    if (type === '2ND_SEM' || type === 'SECOND_SEM') return '2nd Sem';
    if (type === 'SUMMER') return 'Summer';
    return type.replace(/_/g, ' ');
  }

  onPeriodChange(termId: number | { value: number } | null): void {
    const id = typeof termId === 'object' && termId !== null ? termId.value : Number(termId);
    if (id) {
      this.periodStore.setTerm(id);
    }
  }

  // Responsive and collapse state signals
  readonly isSidebarOpen = signal(false); // Mobile drawer state
  readonly isSidebarCollapsed = signal(false); // Desktop mini-rail state
  readonly isMobile = signal(false);
  readonly searchQuery = signal('');

  private readonly studentProfileService = inject(StudentProfileService, { optional: true });

  // User reactive data
  readonly currentUser = this.authService.currentUser;
  readonly userName = computed(() => {
    const role = this.currentUser().role;
    if (role === 'STUDENT' || !role) {
      const p = this.studentProfileService?.profile();
      if (p?.fullName) return p.fullName;
    }
    return this.currentUser().username || 'Student User';
  });
  readonly userRole = computed(() => this.currentUser().role || 'Student');
  readonly userInitials = computed(() => {
    const name = this.userName().trim();
    if (!name) return 'ST';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  // Base master navigation sections with RBAC role requirements
  readonly allNavSections: NavSection[] = [
    {
      title: 'Overview & Portals',
      items: [
        { label: 'Dashboard Overview', icon: 'pi pi-home', routerLink: '/dashboard', exact: true },
        { label: 'Student Self-Service', icon: 'pi pi-user-edit', routerLink: '/dashboard/portal/student', roles: ['SUPER_ADMIN', 'STUDENT'] },
        { label: 'Student Academic Insights', icon: 'pi pi-sparkles', routerLink: '/dashboard/analytics/digital-twin', roles: ['SUPER_ADMIN', 'ADMIN', 'DEAN', 'CHAIRPERSON', 'FACULTY', 'GUIDANCE', 'STUDENT'] },
        { label: 'QR Attendance Check-In', icon: 'pi pi-qrcode', routerLink: '/dashboard/analytics/qr-attendance', roles: ['SUPER_ADMIN', 'ADMIN', 'FACULTY', 'STUDENT'] }
      ]
    },
    {
      title: 'Academic Operations',
      items: [
        { label: 'Institutional Registry', icon: 'pi pi-building', routerLink: '/dashboard/institution', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON'] },
        { label: 'Admission Management', icon: 'pi pi-id-card', routerLink: '/dashboard/admission-management', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'GUIDANCE'] },
        { label: 'Curriculum Designer', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer', roles: ['SUPER_ADMIN', 'ADMIN', 'DEAN', 'CHAIRPERSON'] },
        { label: 'Section & Scheduling', icon: 'pi pi-calendar-plus', routerLink: '/dashboard/scheduling', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON'] },
        { label: 'Enrollment & Advising', icon: 'pi pi-user-plus', routerLink: '/dashboard/enrollment', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'STUDENT'] },
        { label: 'Faculty Gradebook', icon: 'pi pi-chart-line', routerLink: '/dashboard/grades', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'FACULTY'] }
      ]
    },
    {
      title: 'Financial & Billing',
      items: [
        { label: 'Cashier POS Terminal', icon: 'pi pi-credit-card', routerLink: '/dashboard/finance/cashier', roles: ['SUPER_ADMIN', 'ADMIN', 'CASHIER'] },
        { label: 'Student Account Ledger', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'CASHIER', 'REGISTRAR', 'STUDENT'] },
        { label: 'UniFAST FHE Claims', icon: 'pi pi-file-export', routerLink: '/dashboard/finance/unifast', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'REGISTRAR'] }
      ]
    },
    {
      title: 'Clearance & Compliance',
      items: [
        { label: 'Department Clearance', icon: 'pi pi-verified', routerLink: '/dashboard/compliance/clearance', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'ACCOUNTANT', 'STUDENT'] },
        { label: 'Degree Audit & TOR', icon: 'pi pi-graduation-cap', routerLink: '/dashboard/compliance/audit', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'STUDENT'] },
        { label: 'CHED HEMIS Reports', icon: 'pi pi-file-pdf', routerLink: '/dashboard/compliance/ched', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN'] },
        { label: 'My Equity Profiling', icon: 'pi pi-id-card', routerLink: '/dashboard/compliance/equity-my-profile', roles: ['SUPER_ADMIN', 'STUDENT'] },
        { label: 'Statutory Equity Portal', icon: 'pi pi-chart-bar', routerLink: '/dashboard/compliance/equity-portal', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'GUIDANCE', 'ACCOUNTANT'] }
      ]
    },
    {
      title: 'Administration & Support',
      items: [
        { label: 'Student Support Alerts', icon: 'pi pi-info-circle', routerLink: '/dashboard/analytics/early-warning', badge: 'ALERT', badgeSeverity: 'warn', roles: ['SUPER_ADMIN', 'ADMIN', 'DEAN', 'CHAIRPERSON', 'FACULTY', 'GUIDANCE'] },
        { label: 'User Management', icon: 'pi pi-users', routerLink: '/dashboard/users', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'] },
        { label: 'Faculty Profiles', icon: 'pi pi-briefcase', routerLink: '/dashboard/faculty-accounts', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'] },
        { label: 'LMS & Portal Settings', icon: 'pi pi-desktop', routerLink: '/dashboard/admin/lms-config', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { label: 'Institutional Webhooks', icon: 'pi pi-send', routerLink: '/dashboard/admin/webhooks', roles: ['SUPER_ADMIN', 'ADMIN'] }
      ]
    }
  ];

  // Dynamically filtered navigation sections based on the authenticated user's roles
  readonly filteredNavSections = computed<NavSection[]>(() => {
    const role = (this.userRole() || '').toUpperCase();
    return this.allNavSections
      .map(section => ({
        ...section,
        items: section.items
          .filter(item => {
            if (!item.roles || item.roles.length === 0) return true;
            return this.authService.hasAnyRole(item.roles);
          })
          .map(item => {
            if (item.routerLink === '/dashboard/grades') {
              let label = 'Section Gradebook';
              if (role.includes('REGISTRAR')) {
                label = 'Registrar Grade Records';
              } else if (role.includes('DEAN') || role.includes('CHAIRPERSON')) {
                label = 'Dean Grade Verification';
              } else if (role.includes('ADMIN')) {
                label = 'Gradebook & Records';
              } else if (role.includes('FACULTY')) {
                label = 'Faculty Gradebook';
              }
              return { ...item, label };
            }
            return item;
          })
      }))
      .filter(section => section.items.length > 0);
  });

  // Expose navSections getter for template & backward compatibility
  get navSections(): NavSection[] {
    return this.filteredNavSections();
  }

  // User profile dropdown actions
  readonly profileMenuItems = computed<MenuItem[]>(() => [
  {
    label: `Signed in as ${this.userName()}`,
    icon: 'pi pi-user',
    disabled: true
  },
  {
    separator: true
  },
  {
    label: 'My Academic Profile',
    icon: 'pi pi-id-card',
    command: () => this.router.navigate(['/dashboard'])
  },
  {
    label: 'Security Settings',
    icon: 'pi pi-cog',
    command: () => this.router.navigate(['/dashboard'])
  },
  {
    separator: true
  },
  {
    label: 'Sign Out',
    icon: 'pi pi-sign-out',
    styleClass: 'text-red-600',
    command: () => this.onLogout()
  }
]);

  ngOnInit(): void {
    this.checkViewport();
    if (this.currentUser().role === 'STUDENT') {
      this.studentProfileService?.loadForCurrentStudent();
    }
  }

  ngOnDestroy(): void {}

  @HostListener('window:resize')
  onResize(): void {
    this.checkViewport();
  }

  private checkViewport(): void {
    if (typeof window !== 'undefined') {
      const mobile = window.innerWidth < 992;
      this.isMobile.set(mobile);
      if (!mobile) {
        // Automatically close mobile drawer when transitioning to desktop
        this.isSidebarOpen.set(false);
      }
    }
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.isSidebarOpen.update(v => !v);
    } else {
      this.isSidebarCollapsed.update(v => !v);
    }
  }

  closeMobileSidebar(): void {
    if (this.isMobile()) {
      this.isSidebarOpen.set(false);
    }
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
