import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { InstitutionManagementComponent } from './institution-management.component';
import { AcademicYearService, CampusService, DepartmentService, CourseService, ProgramService } from '../../core/services/institution.service';

describe('InstitutionManagementComponent', () => {
  let component: InstitutionManagementComponent;
  let fixture: ComponentFixture<InstitutionManagementComponent>;

  const mockAyService = {
    getAll: () => of([]),
    getCurrent: () => of({ id: 1, code: 'AY 2026-2027', startDate: '2026-08-01', endDate: '2027-06-30', isCurrent: true })
  };

  const mockCampusService = {
    getAll: () => of([]),
    getActive: () => of([])
  };

  const mockDeptService = {
    getAll: () => of([])
  };

  const mockCourseService = {
    getAllActive: () => of([]),
    search: () => of({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 })
  };

  const mockProgramService = {
    getAll: () => of([])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionManagementComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        MessageService,
        ConfirmationService,
        { provide: AcademicYearService, useValue: mockAyService },
        { provide: CampusService, useValue: mockCampusService },
        { provide: DepartmentService, useValue: mockDeptService },
        { provide: CourseService, useValue: mockCourseService },
        { provide: ProgramService, useValue: mockProgramService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstitutionManagementComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the institution management dashboard', () => {
    expect(component).toBeTruthy();
  });

  it('should have 6 tabs configured', () => {
    expect(component.tabs.length).toBe(6);
    expect(component.tabs.map(t => t.value)).toEqual([
      'academic-periods',
      'hierarchy',
      'courses',
      'cilo-pilo-matrix',
      'grading-scales',
      'financials'
    ]);
  });

  it('should load current academic year on init', () => {
    expect(component.currentAcademicYear()?.code).toBe('AY 2026-2027');
  });
});
