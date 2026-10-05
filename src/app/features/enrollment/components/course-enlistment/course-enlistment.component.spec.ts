import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CourseEnlistmentComponent } from './course-enlistment.component';
import { EnrollmentStore } from '../../state/enrollment.store';
import { EnrollmentItemResponse } from '../../../../core/models/enrollment.model';

describe('CourseEnlistmentComponent', () => {
  let component: CourseEnlistmentComponent;
  let fixture: ComponentFixture<CourseEnlistmentComponent>;
  let confirmationService: ConfirmationService;

  const mockItem: EnrollmentItemResponse = {
    itemId: 1,
    sectionId: 10,
    sectionCode: 'BSIT-2A-S1',
    courseCode: 'IT 211',
    courseTitle: 'Data Structures & Algorithms',
    creditUnits: 3,
    scheduleSummary: 'Mon 08:00 - 10:00 (Room 101)',
    completionStatus: 'ENLISTED'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseEnlistmentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
        EnrollmentStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseEnlistmentComponent);
    component = fixture.componentInstance;
    confirmationService = fixture.debugElement.injector.get(ConfirmationService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map status severity correctly', () => {
    expect(component.getStatusSeverity('ENROLLED')).toBe('success');
    expect(component.getStatusSeverity('ENLISTED')).toBe('info');
    expect(component.getStatusSeverity('ASSESSED')).toBe('warn');
    expect(component.getStatusSeverity('DRAFT')).toBe('secondary');
    expect(component.getStatusSeverity('DROPPED')).toBe('danger');
    expect(component.getStatusSeverity('UNKNOWN')).toBe('info');
  });

  it('should trigger confirmation dialog on drop section', () => {
    let confirmCalled = false;
    confirmationService.confirm = () => {
      confirmCalled = true;
      return confirmationService;
    };
    component.confirmDropSection(mockItem);
    expect(confirmCalled).toBe(true);
  });

  it('should block drop section and show warning when enrollment is closed for student', () => {
    const store = TestBed.inject(EnrollmentStore);
    const messageService = TestBed.inject(MessageService);
    let msgSummary = '';
    messageService.add = (msg: any) => {
      msgSummary = msg.summary;
    };

    store.terms.set([
      {
        id: 1,
        academicYearId: 1,
        termType: 'FIRST_SEM',
        startDate: '2026-08-01',
        endDate: '2026-12-15',
        enrollmentOpen: false,
        termName: 'AY 2026-2027 - 1st Semester'
      }
    ]);
    store.setSelectedTermId(1);

    const authService = (component as any).authService;
    vi.spyOn(authService, 'hasRole').mockImplementation((role: any) => role === 'STUDENT');

    component.confirmDropSection(mockItem);
    expect(msgSummary).toBe('Enrollment Closed');
  });

  it('should block finalize enrollment and show warning when enrollment is closed for student', () => {
    const store = TestBed.inject(EnrollmentStore);
    const messageService = TestBed.inject(MessageService);
    let msgSummary = '';
    messageService.add = (msg: any) => {
      msgSummary = msg.summary;
    };

    store.terms.set([
      {
        id: 1,
        academicYearId: 1,
        termType: 'FIRST_SEM',
        startDate: '2026-08-01',
        endDate: '2026-12-15',
        enrollmentOpen: false,
        termName: 'AY 2026-2027 - 1st Semester'
      }
    ]);
    store.setSelectedTermId(1);

    const authService = (component as any).authService;
    vi.spyOn(authService, 'hasRole').mockImplementation((role: any) => role === 'STUDENT');

    component.confirmFinalizeEnrollment();
    expect(msgSummary).toBe('Enrollment Closed');
  });
});
