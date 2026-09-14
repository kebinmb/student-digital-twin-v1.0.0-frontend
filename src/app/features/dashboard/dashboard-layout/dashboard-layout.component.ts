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
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

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
    TooltipModule
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Responsive and collapse state signals
  readonly isSidebarOpen = signal(false); // Mobile drawer state
  readonly isSidebarCollapsed = signal(false); // Desktop mini-rail state
  readonly isMobile = signal(false);
  readonly searchQuery = signal('');

  // User reactive data
  readonly currentUser = this.authService.currentUser;
  readonly userName = computed(() => this.currentUser().username || 'Student User');
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
        { label: 'Student Self-Service', icon: 'pi pi-user-edit', routerLink: '/dashboard/portal/student', roles: ['ADMIN', 'STUDENT', 'REGISTRAR'] },
        { label: 'Digital Twin Telemetry', icon: 'pi pi-sparkles', routerLink: '/dashboard/analytics/digital-twin', badge: 'AI', roles: ['ADMIN', 'DEAN', 'CHAIRPERSON', 'FACULTY', 'GUIDANCE', 'STUDENT'] },
        { label: 'QR Attendance Check-In', icon: 'pi pi-qrcode', routerLink: '/dashboard/analytics/qr-attendance', roles: ['ADMIN', 'FACULTY', 'STUDENT'] }
      ]
    },
    {
      title: 'Academic Operations',
      items: [
        { label: 'Institutional Registry', icon: 'pi pi-building', routerLink: '/dashboard/institution', roles: ['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON'] },
        { label: 'Admission Management', icon: 'pi pi-id-card', routerLink: '/dashboard/admission-management', roles: ['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'GUIDANCE'] },
        { label: 'Curriculum Designer', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer/1', roles: ['ADMIN', 'DEAN', 'CHAIRPERSON'] },
        { label: 'Section & Scheduling', icon: 'pi pi-calendar-plus', routerLink: '/dashboard/scheduling', roles: ['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON'] },
        { label: 'Enrollment & Advising', icon: 'pi pi-user-plus', routerLink: '/dashboard/enrollment', roles: ['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'STUDENT'] },
        { label: 'Faculty Gradebook', icon: 'pi pi-chart-line', routerLink: '/dashboard/grades', roles: ['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'FACULTY'] }
      ]
    },
    {
      title: 'Financial & Billing',
      items: [
        { label: 'Cashier POS Terminal', icon: 'pi pi-credit-card', routerLink: '/dashboard/finance/cashier', roles: ['ADMIN', 'CASHIER'] },
        { label: 'Student Account Ledger', icon: 'pi pi-history', routerLink: '/dashboard/finance/ledger', roles: ['ADMIN', 'ACCOUNTANT', 'CASHIER', 'REGISTRAR', 'STUDENT'] },
        { label: 'UniFAST FHE Claims', icon: 'pi pi-file-export', routerLink: '/dashboard/finance/unifast', roles: ['ADMIN', 'ACCOUNTANT', 'REGISTRAR'] }
      ]
    },
    {
      title: 'Clearance & Compliance',
      items: [
        { label: 'Department Clearance', icon: 'pi pi-verified', routerLink: '/dashboard/compliance/clearance', roles: ['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'ACCOUNTANT', 'STUDENT'] },
        { label: 'Degree Audit & TOR', icon: 'pi pi-graduation-cap', routerLink: '/dashboard/compliance/audit', roles: ['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'STUDENT'] },
        { label: 'CHED HEMIS Reports', icon: 'pi pi-file-pdf', routerLink: '/dashboard/compliance/ched', roles: ['ADMIN', 'REGISTRAR', 'DEAN'] },
        { label: 'My Equity Profiling', icon: 'pi pi-id-card', routerLink: '/dashboard/compliance/equity-my-profile', roles: ['STUDENT'] },
        { label: 'Statutory Equity Portal', icon: 'pi pi-chart-bar', routerLink: '/dashboard/compliance/equity-portal', roles: ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'GUIDANCE', 'ACCOUNTANT'] }
      ]
    },
    {
      title: 'Administration & Intelligence',
      items: [
        { label: 'Early Warning Radar', icon: 'pi pi-radar', routerLink: '/dashboard/analytics/early-warning', badge: 'ALERT', badgeSeverity: 'warn', roles: ['ADMIN', 'DEAN', 'CHAIRPERSON', 'FACULTY', 'GUIDANCE'] },
        { label: 'User Management', icon: 'pi pi-users', routerLink: '/dashboard/users', roles: ['ADMIN', 'REGISTRAR'] },
        { label: 'Faculty Profiles', icon: 'pi pi-briefcase', routerLink: '/dashboard/faculty-accounts', roles: ['ADMIN', 'REGISTRAR'] },
        { label: 'LMS LTI Integration', icon: 'pi pi-desktop', routerLink: '/dashboard/admin/lms-config', roles: ['ADMIN'] }
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
                label = 'Registrar Grade Sealing';
              } else if (role.includes('DEAN') || role.includes('CHAIRPERSON')) {
                label = 'Dean Grade Verification';
              } else if (role.includes('ADMIN')) {
                label = 'Gradebook & Sealing Engine';
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
