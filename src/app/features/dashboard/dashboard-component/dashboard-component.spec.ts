import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardComponent } from './dashboard-component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create dashboard overview component', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial KPI metrics', () => {
    expect(component.metrics.length).toBe(4);
    expect(component.metrics[0].title).toBe('Current GWA');
  });

  it('should list today classes', () => {
    expect(component.todayClasses.length).toBeGreaterThan(0);
    expect(component.todayClasses[0].courseCode).toBe('IT 311');
  });

  it('should correctly resolve role signals for all 10 institutional roles', () => {
    const roles = [
      'SUPER_ADMIN',
      'ADMIN',
      'REGISTRAR',
      'CASHIER',
      'FACULTY',
      'DEAN',
      'CHAIRPERSON',
      'STUDENT',
      'GUIDANCE',
      'ACCOUNTANT'
    ];

    roles.forEach(role => {
      component.onRoleOverrideChange(role);
      expect(component.activeRole()).toBe(role);

      if (role === 'SUPER_ADMIN') expect(component.isSuperAdmin()).toBe(true);
      if (role === 'ADMIN') expect(component.isAdmin()).toBe(true);
      if (role === 'REGISTRAR') expect(component.isRegistrar()).toBe(true);
      if (role === 'CASHIER') expect(component.isCashier()).toBe(true);
      if (role === 'FACULTY') expect(component.isFaculty()).toBe(true);
      if (role === 'DEAN') expect(component.isDean()).toBe(true);
      if (role === 'CHAIRPERSON') expect(component.isChairperson()).toBe(true);
      if (role === 'STUDENT') expect(component.isStudent()).toBe(true);
      if (role === 'GUIDANCE') expect(component.isGuidance()).toBe(true);
      if (role === 'ACCOUNTANT') expect(component.isAccountant()).toBe(true);

      expect(component.displayedMetrics().length).toBe(4);
      expect(component.roleQuickActions().length).toBe(4);
    });
  });

  it('should open and close notice detail drawer', () => {
    expect(component.isNoticeDrawerOpen()).toBe(false);
    component.openNoticeDetail(component.notices[0]);
    expect(component.isNoticeDrawerOpen()).toBe(true);
    expect(component.selectedNotice()?.id).toBe('1');
  });

  it('should open dispatch intervention modal for Guidance role', () => {
    component.onRoleOverrideChange('GUIDANCE');
    expect(component.isDispatchModalOpen()).toBe(false);
    component.openDispatchModal(component.monitoredStudents[0]);
    expect(component.isDispatchModalOpen()).toBe(true);
    expect(component.selectedStudentForDispatch()?.studentId).toBe(101);
  });
});
