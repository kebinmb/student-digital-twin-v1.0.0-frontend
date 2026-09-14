import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthService } from '../../../core/service/authentication/auth-service';

describe('DashboardLayoutComponent', () => {
  let component: DashboardLayoutComponent;
  let fixture: ComponentFixture<DashboardLayoutComponent>;

  const currentUserSignal = signal<{ id: number | null; username: string; email: string; role: string; roles: string[] }>({
    id: 1,
    username: 'test.user',
    email: 'test@chmsu.edu.ph',
    role: 'STUDENT',
    roles: ['STUDENT']
  });

  const mockAuthService = {
    currentUser: currentUserSignal,
    hasAnyRole: (roles: string[]) => {
      const userRoles = currentUserSignal().roles;
      return roles.some(r => userRoles.includes(r));
    },
    hasRole: (role: string) => {
      return currentUserSignal().roles.includes(role);
    },
    logout: () => of(void 0)
  };

  beforeEach(async () => {
    currentUserSignal.set({
      id: 1,
      username: 'test.user',
      email: 'test@chmsu.edu.ph',
      role: 'STUDENT',
      roles: ['STUDENT']
    });

    await TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create layout component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle sidebar collapse state', () => {
    expect(component.isSidebarCollapsed()).toBe(false);
    component.toggleSidebar();
    expect(component.isSidebarCollapsed()).toBe(true);
    component.toggleSidebar();
    expect(component.isSidebarCollapsed()).toBe(false);
  });

  it('should compute user initials correctly', () => {
    expect(component.userInitials()).toBeTruthy();
    expect(component.userInitials().length).toBeLessThanOrEqual(2);
  });

  it('should compute filtered nav sections reactively for active role', () => {
    const sections = component.filteredNavSections();
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it('should include "My Equity Profiling" only when user has STUDENT role', () => {
    currentUserSignal.set({
      id: 1,
      username: 'student.user',
      email: 'student@chmsu.edu.ph',
      role: 'STUDENT',
      roles: ['STUDENT']
    });

    const allItems = component.filteredNavSections().flatMap(s => s.items);
    const myEquityItem = allItems.find(i => i.routerLink === '/dashboard/compliance/equity-my-profile');
    expect(myEquityItem).toBeDefined();
    expect(myEquityItem?.label).toBe('My Equity Profiling');
  });

  it('should exclude "My Equity Profiling" when user role is not STUDENT', () => {
    currentUserSignal.set({
      id: 2,
      username: 'admin.user',
      email: 'admin@chmsu.edu.ph',
      role: 'ADMIN',
      roles: ['ADMIN']
    });

    const allItems = component.filteredNavSections().flatMap(s => s.items);
    const myEquityItem = allItems.find(i => i.routerLink === '/dashboard/compliance/equity-my-profile');
    expect(myEquityItem).toBeUndefined();

    // But Statutory Equity Portal should be visible for ADMIN
    const portalItem = allItems.find(i => i.routerLink === '/dashboard/compliance/equity-portal');
    expect(portalItem).toBeDefined();
    expect(portalItem?.label).toBe('Statutory Equity Portal');
  });
});
