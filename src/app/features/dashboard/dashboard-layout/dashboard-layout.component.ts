import { Component, computed, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
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

export interface NavItem {
  label: string;
  icon: string;
  routerLink: string;
  exact?: boolean;
  badge?: string;
  badgeSeverity?: 'info' | 'success' | 'warn' | 'danger';
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
    InputText,
    Menu,
    ButtonModule
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css']
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

  // Navigation menu grouped sections
  readonly navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/dashboard', exact: true },
        { label: 'Academic Twin', icon: 'pi pi-sparkles', routerLink: '/dashboard/twin', badge: 'AI' }
      ]
    },
    {
      title: 'Academics',
      items: [
        { label: 'Institutional Registry', icon: 'pi pi-building', routerLink: '/dashboard/institution' },
        { label: 'Curriculum Designer', icon: 'pi pi-sitemap', routerLink: '/dashboard/curriculum/designer/1' },
        { label: 'Courses & Enrolled', icon: 'pi pi-book', routerLink: '/dashboard/courses' },
        { label: 'Class Schedule', icon: 'pi pi-calendar', routerLink: '/dashboard/schedule' },
        { label: 'Grades & Progress', icon: 'pi pi-chart-line', routerLink: '/dashboard/grades' },
        { label: 'Attendance', icon: 'pi pi-check-circle', routerLink: '/dashboard/attendance' }
      ]
    },
    {
      title: 'Student Services',
      items: [
        { label: 'Clearance & Billing', icon: 'pi pi-receipt', routerLink: '/dashboard/services' },
        { label: 'Digital Student ID', icon: 'pi pi-id-card', routerLink: '/dashboard/student-id' },
        { label: 'ICT Helpdesk', icon: 'pi pi-question-circle', routerLink: '/dashboard/support' }
      ]
    }
  ];

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
