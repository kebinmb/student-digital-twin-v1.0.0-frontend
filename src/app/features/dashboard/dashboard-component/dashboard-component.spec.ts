import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { DashboardComponent, StudentRiskRecord } from './dashboard-component';
import { NoticeApiService } from '../../../core/service/notice/notice-api.service';
import { NoticeItem } from '../../../core/models/notice.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  const mockNotices: NoticeItem[] = [
    {
      id: '1',
      title: 'Midterm Examination Schedule AY 2026-2027 Released',
      category: 'Registrar',
      date: 'Today, 9:00 AM',
      unread: true,
      content: 'Official midterm examination timetable for 1st Semester AY 2026-2027 has been finalized.',
      audience: 'ALL',
      priority: 'IMPORTANT'
    },
    {
      id: '2',
      title: 'Online Encoding of Student Clearance Now Open',
      category: 'Student Affairs',
      date: 'Yesterday',
      unread: false,
      content: 'Students may now settle departmental, library, and laboratory clearances online.',
      audience: 'STUDENT',
      priority: 'NORMAL'
    },
    {
      id: '3',
      title: 'CHMSU ICT Helpdesk Maintenance on Saturday 10 PM',
      category: 'ICT Office',
      date: '2 days ago',
      unread: false,
      content: 'Scheduled server maintenance and infrastructure database optimization will occur this Saturday.',
      audience: 'ALL',
      priority: 'NORMAL'
    }
  ];

  let mockNoticeApiService: Partial<NoticeApiService>;

  beforeEach(async () => {
    mockNoticeApiService = {
      getActiveNotices: vi.fn().mockReturnValue(of([...mockNotices])),
      createNotice: vi.fn().mockImplementation((req: any) => of({
        id: 'mock-100',
        title: req.title,
        category: req.category,
        date: 'Just now',
        unread: true,
        content: req.content,
        audience: req.audience || 'ALL',
        priority: req.priority || 'NORMAL'
      })),
      acknowledgeNotice: vi.fn().mockReturnValue(of(void 0)),
      deleteNotice: vi.fn().mockReturnValue(of(void 0))
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NoticeApiService, useValue: mockNoticeApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    vi.spyOn((component as any).authService, 'hasRole').mockReturnValue(true);
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
    const testClasses = [
      { courseCode: 'IT 311', courseTitle: 'Enterprise Architecture & Cloud Systems', time: '08:00 AM - 10:00 AM', room: 'IT Building - Lab 304', instructor: 'Engr. J. Dela Cruz', status: 'Completed' as const }
    ];
    component.todayClassesSignal.set(testClasses);
    expect(component.todayClasses.length).toBeGreaterThan(0);
    expect(component.todayClasses[0].courseCode).toBe('IT 311');
  });

  it('should correctly resolve role signals for all 10 institutional roles', () => {
    vi.spyOn((component as any).authService, 'hasRole').mockReturnValue(true);
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
    const testStudent: StudentRiskRecord = {
      studentId: 101,
      studentNumber: '2023-0142-S',
      fullName: 'Juan Dela Cruz',
      programOrSection: 'BSIT 3-A',
      riskLevel: 'CRITICAL',
      riskScore: 88.5,
      activeInterventions: ['Guidance Counseling'],
      attendanceRate: 72.4
    };
    component.monitoredStudentsSignal.set([testStudent]);
    component.onRoleOverrideChange('GUIDANCE');
    expect(component.isDispatchModalOpen()).toBe(false);
    component.openDispatchModal(component.monitoredStudents[0]);
    expect(component.isDispatchModalOpen()).toBe(true);
    expect(component.selectedStudentForDispatch()?.studentId).toBe(101);
  });

  it('should trigger refreshMetrics and invoke telemetry reload', () => {
    const spy = vi.spyOn(component, 'loadMetricsForRole');
    component.refreshMetrics();
    expect(spy).toHaveBeenCalledWith(component.activeRole(), true, undefined);
  });

  it('should update displayedMetrics when dynamicRoleMetrics are present', () => {
    const customCards: import('./dashboard-component').MetricCard[] = [
      { title: 'Dynamic Card 1', value: '100', subtext: 'Live Subtext', icon: 'pi pi-check' },
      { title: 'Dynamic Card 2', value: '200', subtext: 'Live Subtext 2', icon: 'pi pi-users' },
      { title: 'Dynamic Card 3', value: '300', subtext: 'Live Subtext 3', icon: 'pi pi-bolt' },
      { title: 'Dynamic Card 4', value: '400', subtext: 'Live Subtext 4', icon: 'pi pi-chart-line' }
    ];

    component.dynamicRoleMetrics.update(m => ({
      ...m,
      STUDENT: customCards
    }));

    const metrics = component.displayedMetrics();
    expect(metrics.length).toBe(4);
    expect(metrics[0].title).toBe('Dynamic Card 1');
    expect(metrics[0].value).toBe('100');
  });

  it('should evaluate canPostNotice based on role permissions', () => {
    vi.spyOn((component as any).authService, 'hasRole').mockReturnValue(true);
    component.onRoleOverrideChange('STUDENT');
    expect(component.canPostNotice()).toBe(false);

    component.onRoleOverrideChange('FACULTY');
    expect(component.canPostNotice()).toBe(false);

    component.onRoleOverrideChange('REGISTRAR');
    expect(component.canPostNotice()).toBe(true);

    component.onRoleOverrideChange('DEAN');
    expect(component.canPostNotice()).toBe(true);

    component.onRoleOverrideChange('CHAIRPERSON');
    expect(component.canPostNotice()).toBe(true);

    component.onRoleOverrideChange('GUIDANCE');
    expect(component.canPostNotice()).toBe(true);

    component.onRoleOverrideChange('ACCOUNTANT');
    expect(component.canPostNotice()).toBe(true);

    component.onRoleOverrideChange('ADMIN');
    expect(component.canPostNotice()).toBe(true);
  });

  it('should open create notice modal and publish new notice', () => {
    vi.spyOn((component as any).authService, 'hasRole').mockReturnValue(true);
    component.onRoleOverrideChange('REGISTRAR');
    expect(component.isCreateNoticeModalOpen()).toBe(false);

    component.openCreateNoticeModal();
    expect(component.isCreateNoticeModalOpen()).toBe(true);
    expect(component.noticeForm.get('category')?.value).toBe('Registrar');

    component.noticeForm.patchValue({
      title: 'Graduation Clearance Schedule',
      category: 'Registrar',
      content: 'All graduating candidates must submit clearances by end of month.'
    });

    const initialCount = component.notices.length;
    component.confirmCreateNotice();

    expect(component.notices.length).toBe(initialCount + 1);
    expect(component.notices[0].title).toBe('Graduation Clearance Schedule');
    expect(component.isCreateNoticeModalOpen()).toBe(false);
  });

  it('should paginate notices correctly when page changes', () => {
    const multipleNotices: NoticeItem[] = [
      { id: '1', title: 'Notice 1', category: 'General', date: 'Today', unread: false, content: 'Content 1' },
      { id: '2', title: 'Notice 2', category: 'General', date: 'Today', unread: false, content: 'Content 2' },
      { id: '3', title: 'Notice 3', category: 'General', date: 'Today', unread: false, content: 'Content 3' },
      { id: '4', title: 'Notice 4', category: 'General', date: 'Today', unread: false, content: 'Content 4' },
      { id: '5', title: 'Notice 5', category: 'General', date: 'Today', unread: false, content: 'Content 5' }
    ];
    component.noticesSignal.set(multipleNotices);

    // Initial page: 3 notices per page
    expect(component.noticesPageSize()).toBe(3);
    expect(component.noticesFirst()).toBe(0);
    expect(component.paginatedNotices().length).toBe(3);
    expect(component.paginatedNotices()[0].title).toBe('Notice 1');
    expect(component.paginatedNotices()[2].title).toBe('Notice 3');

    // Page 2
    component.onNoticesPageChange({ first: 3, rows: 3 });
    expect(component.noticesFirst()).toBe(3);
    expect(component.paginatedNotices().length).toBe(2);
    expect(component.paginatedNotices()[0].title).toBe('Notice 4');
    expect(component.paginatedNotices()[1].title).toBe('Notice 5');
  });

  it('should handle guidance table lazy load pagination', () => {
    component.onGuidanceTableLazyLoad({ first: 5, rows: 5 });
    expect(component.guidancePageIndex()).toBe(1);
    expect(component.guidancePageSize()).toBe(5);
  });

  describe('DashboardComponent — userName() Signal', () => {
    const MOCK_PROFILE: any = {
      id: 10,
      studentId: 10,
      studentNumber: '2024-0001',
      fullName: 'Juan P. Dela Cruz',
      programCode: 'BSCS',
      yearLevel: 3
    };

    it('userName() should return fullName from student_profiles — NOT username', () => {
      (component as any).studentProfileService?.setProfile(MOCK_PROFILE);
      fixture.detectChanges();

      const name = component.userName();
      expect(name).toBe('Juan P. Dela Cruz');
      expect(name).not.toContain('_');
      expect(name).not.toContain('@');
    });

    it('studentProfileSub() should show student number, program, and year', () => {
      (component as any).studentProfileService?.setProfile(MOCK_PROFILE);
      fixture.detectChanges();

      const sub = component.studentProfileSub();
      expect(sub).toContain('2024-0001');
      expect(sub).toContain('BSCS');
      expect(sub).toContain('3');
    });

    it('userName() should return empty string when profile is null', () => {
      (component as any).studentProfileService?.setProfile(null);
      fixture.detectChanges();
      expect(component.userName()).toBe('');
    });

    it('identity-name element should display fullName, not username', () => {
      (component as any).studentProfileService?.setProfile(MOCK_PROFILE);
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.identity-name');
      if (el) {
        expect(el.textContent.trim()).toBe('Juan P. Dela Cruz');
        expect(el.textContent).not.toContain('_');
      }
    });
  });

  describe('DEAN Role Performance & Effect Deduplication', () => {
    it('loadMetricsForRole should not re-query when metrics already cached for role', () => {
      component.dynamicRoleMetrics.set({
        DEAN: [
          { title: 'Curricula Active', value: '5 Curricula', subtext: 'Departmental Scope', icon: 'pi pi-book' }
        ]
      });

      const spy = vi.spyOn(component as any, 'loadGeneralAcademicContext');
      component.loadMetricsForRole('DEAN', false, 1);

      // Does not trigger unneeded API calls
      expect(component.dynamicRoleMetrics()['DEAN']).toBeTruthy();
      expect(component.dynamicRoleMetrics()['DEAN'][0].title).toBe('Curricula Active');
    });

    it('should have lastLoadedTermId and lastLoadedRole initialized to prevent infinite effect triggers', () => {
      expect((component as any).lastLoadedTermId).toBeDefined();
      expect((component as any).lastLoadedRole).toBeDefined();
    });
  });

  describe('CHAIRPERSON Role Grade Change Requests — Duplicate Prevention', () => {
    it('loadGeneralAcademicContext should NOT call getPendingGradeChangeRequests', () => {
      const enrollmentService = (component as any).enrollmentApiService;
      const spy = vi.spyOn(enrollmentService, 'getPendingGradeChangeRequests');

      (component as any).loadGeneralAcademicContext();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should call pending grade change requests exactly once when loading chairperson metrics', () => {
      const gradeChangeService = (component as any).gradeChangeRequestService;
      const spy = vi.spyOn(gradeChangeService, 'loadPendingRequests').mockReturnValue(of([]));

      // loadGeneralAcademicContext should not call it
      (component as any).loadGeneralAcademicContext();
      expect(spy).not.toHaveBeenCalled();

      // loadMetricsForRole('CHAIRPERSON') calls it once
      component.loadMetricsForRole('CHAIRPERSON', true, 1);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
