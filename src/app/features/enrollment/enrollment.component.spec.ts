import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EnrollmentComponent } from './enrollment.component';
import { EnrollmentStore } from './state/enrollment.store';

describe('EnrollmentComponent', () => {
  let component: EnrollmentComponent;
  let fixture: ComponentFixture<EnrollmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnrollmentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        EnrollmentStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EnrollmentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle between advising and enlistment tabs', () => {
    expect(component.activeTab()).toBe('advising');
    component.setTab('enlistment');
    expect(component.activeTab()).toBe('enlistment');
    component.setTab('advising');
    expect(component.activeTab()).toBe('advising');
  });

  it('should detect when enrollment is closed for the selected term', () => {
    const store = TestBed.inject(EnrollmentStore);
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

    expect(store.isEnrollmentClosed()).toBe(true);
  });

  it('should detect when enrollment is open for the selected term', () => {
    const store = TestBed.inject(EnrollmentStore);
    store.terms.set([
      {
        id: 2,
        academicYearId: 1,
        termType: 'SECOND_SEM',
        startDate: '2027-01-10',
        endDate: '2027-05-30',
        enrollmentOpen: true,
        termName: 'AY 2026-2027 - 2nd Semester'
      }
    ]);
    store.setSelectedTermId(2);

    expect(store.isEnrollmentClosed()).toBe(false);
  });

  it('should hide other view options for student when enrollment is closed', () => {
    const store = TestBed.inject(EnrollmentStore);
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

    vi.spyOn(component.auth, 'hasRole').mockImplementation((r: any) => r === 'STUDENT');

    // For a student when enrollment is closed, viewOptions should only contain advising
    const opts = component.viewOptions();
    expect(opts.length).toBe(1);
    expect(opts[0].value).toBe('advising');
  });

  it('should show both advising and enlistment options for student when enrollment is open', () => {
    const store = TestBed.inject(EnrollmentStore);
    store.terms.set([
      {
        id: 2,
        academicYearId: 1,
        termType: 'SECOND_SEM',
        startDate: '2027-01-10',
        endDate: '2027-05-30',
        enrollmentOpen: true,
        termName: 'AY 2026-2027 - 2nd Semester'
      }
    ]);
    store.setSelectedTermId(2);

    vi.spyOn(component.auth, 'hasRole').mockImplementation((r: any) => r === 'STUDENT');
    vi.spyOn(component.auth, 'hasAnyRole').mockImplementation(() => false);

    const opts = component.viewOptions();
    expect(opts.length).toBe(2);
    expect(opts.map(o => o.value)).toContain('advising');
    expect(opts.map(o => o.value)).toContain('enlistment');
  });

  it('should dynamically update viewOptions and switch tab when enrollment window state flips', () => {
    const store = TestBed.inject(EnrollmentStore);
    store.terms.set([
      {
        id: 3,
        academicYearId: 1,
        termType: 'FIRST_SEM',
        startDate: '2026-08-01',
        endDate: '2026-12-15',
        enrollmentOpen: true,
        termName: 'AY 2026-2027 - 1st Semester'
      }
    ]);
    store.setSelectedTermId(3);

    vi.spyOn(component.auth, 'hasRole').mockImplementation((r: any) => r === 'STUDENT');
    vi.spyOn(component.auth, 'hasAnyRole').mockImplementation(() => false);

    // Initially open
    expect(component.viewOptions().length).toBe(2);
    component.setTab('enlistment');
    expect(component.activeTab()).toBe('enlistment');

    // Admin closes enrollment window
    store.terms.set([
      {
        id: 3,
        academicYearId: 1,
        termType: 'FIRST_SEM',
        startDate: '2026-08-01',
        endDate: '2026-12-15',
        enrollmentOpen: false,
        termName: 'AY 2026-2027 - 1st Semester'
      }
    ]);
    fixture.detectChanges();

    // Dynamically restricted to advising
    expect(component.viewOptions().length).toBe(1);
    expect(component.activeTab()).toBe('advising');
  });
});
