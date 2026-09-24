// File: src/app/features/compliance/ched-reporting/ched-reporting.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { ChedReportingComponent } from './ched-reporting.component';
import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import { CampusService, TermService } from '../../../core/services/institution.service';

describe('ChedReportingComponent', () => {
  let component: ChedReportingComponent;
  let fixture: ComponentFixture<ChedReportingComponent>;

  const mockCampus = {
    id: 1,
    code: 'TALISAY',
    name: 'Talisay Main Campus',
    chedInstitutionalCode: '06014',
    region: 'Region VI',
    isMain: true,
    isActive: true
  };

  const mockTerm = {
    id: 101,
    academicYearId: 1,
    academicYearCode: 'AY 2026-2027',
    termType: '1ST_SEM' as const,
    startDate: '2026-08-01',
    endDate: '2026-12-20',
    isActive: true,
    termName: 'First Semester'
  };

  const mockFormE1 = {
    campusId: 1,
    campusName: 'Talisay Main Campus',
    chedInstitutionalCode: '06014',
    totalPrograms: 18,
    totalEnrolledStudents: 12450,
    totalFaculty: 420
  };

  const mockFormE3 = [
    {
      termId: 101,
      termName: 'First Semester - AY 2026-2027',
      programCode: 'BSIT',
      programName: 'Bachelor of Science in Information Technology',
      maleCount: 140,
      femaleCount: 110,
      totalEnrolled: 250,
      totalUnitsTaken: 5750
    }
  ];

  const mockFormE4 = [
    {
      termId: 101,
      termName: 'First Semester - AY 2026-2027',
      programCode: 'BSIT',
      totalGraduates: 85,
      summaCumLaudeCount: 1,
      magnaCumLaudeCount: 6,
      cumLaudeCount: 14
    }
  ];

  const mockFormE5 = [
    {
      facultyId: 501,
      facultyName: 'Dr. Maria Santos',
      highestDegree: 'Doctor of Information Technology',
      employmentStatus: 'FULL_TIME_PERMANENT',
      teachingLoadContactHours: 18,
      assignedSectionsCount: 4
    }
  ];

  const mockComplianceApi = {
    exportChedE1: vi.fn().mockReturnValue(of(mockFormE1)),
    exportChedE3: vi.fn().mockReturnValue(of(mockFormE3)),
    exportChedE4: vi.fn().mockReturnValue(of(mockFormE4)),
    exportChedE5: vi.fn().mockReturnValue(of(mockFormE5))
  };

  const mockCampusService = {
    getActive: vi.fn().mockReturnValue(of([mockCampus])),
    getAll: vi.fn().mockReturnValue(of([mockCampus]))
  };

  const mockTermService = {
    getAll: vi.fn().mockReturnValue(of([mockTerm])),
    getActive: vi.fn().mockReturnValue(of(mockTerm))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChedReportingComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: ComplianceApiService, useValue: mockComplianceApi },
        { provide: CampusService, useValue: mockCampusService },
        { provide: TermService, useValue: mockTermService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChedReportingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load default campus and Form E-1', () => {
    expect(component).toBeTruthy();
    expect(component.campusId()).toBe(1);
    expect(component.termId()).toBe(101);
    expect(mockComplianceApi.exportChedE1).toHaveBeenCalledWith(1);
    expect(component.formE1()).toEqual(mockFormE1);
  });

  it('should switch tabs and load corresponding form data', () => {
    component.switchTab('E3');
    expect(component.activeTab()).toBe('E3');
    expect(mockComplianceApi.exportChedE3).toHaveBeenCalledWith(101);
    expect(component.formE3().length).toBe(1);

    component.switchTab('E4');
    expect(component.activeTab()).toBe('E4');
    expect(mockComplianceApi.exportChedE4).toHaveBeenCalledWith(101);
    expect(component.formE4().length).toBe(1);

    component.switchTab('E5');
    expect(component.activeTab()).toBe('E5');
    expect(mockComplianceApi.exportChedE5).toHaveBeenCalledWith(101);
    expect(component.formE5().length).toBe(1);
  });

  it('should reload data when term changes for E3, E4, E5', () => {
    component.switchTab('E3');
    component.onTermChange(102);
    expect(component.termId()).toBe(102);
    expect(mockComplianceApi.exportChedE3).toHaveBeenCalledWith(102);
  });

  it('should trigger CSV export for loaded form E1', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    component.exportCsv('E1');
    expect(createElementSpy).toHaveBeenCalledWith('a');
  });
});
