import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FacultyGradebookComponent, EditableRosterRow } from './faculty-gradebook.component';
import { SectionRosterResponse } from '../../core/models/enrollment.model';
import { AuthService } from '../../core/service/authentication/auth-service';

describe('FacultyGradebookComponent', () => {
  let component: FacultyGradebookComponent;
  let fixture: ComponentFixture<FacultyGradebookComponent>;

  const currentUserSignal = signal<{ id?: number; role?: string; username?: string; roles?: string[] }>({
    id: 5,
    role: 'FACULTY',
    username: 'alan.turing',
    roles: ['FACULTY']
  });

  const mockAuthService = {
    currentUser: currentUserSignal,
    accessToken: signal(null),
    isAuthenticated: signal(false)
  };

  const mockRoster: SectionRosterResponse = {
    sectionId: 10,
    sectionCode: 'BSIT-3A',
    courseId: 201,
    courseCode: 'IT 312',
    courseTitle: 'Database Systems Administration',
    creditUnits: 3,
    termId: 1,
    termName: 'AY 2026-2027 1st Sem',
    gradeStatus: 'DRAFT',
    primaryInstructorId: 5,
    primaryInstructorName: 'Prof. Alan Turing',
    enrolledCount: 2,
    maxCapacity: 40,
    students: [
      {
        enrollmentItemId: 101,
        studentId: 1,
        studentNumber: '2026-0001',
        studentName: 'Alice Santos',
        programCode: 'BSIT',
        yearLevel: 3,
        finalNumericalGrade: 1.50,
        completionStatus: 'PASSED'
      },
      {
        enrollmentItemId: 102,
        studentId: 2,
        studentNumber: '2026-0002',
        studentName: 'Bob Reyes',
        programCode: 'BSIT',
        yearLevel: 3,
        finalNumericalGrade: null,
        completionStatus: 'IN_PROGRESS'
      }
    ]
  };

  beforeEach(async () => {
    currentUserSignal.set({
      id: 5,
      role: 'FACULTY',
      username: 'alan.turing',
      roles: ['FACULTY']
    });

    await TestBed.configureTestingModule({
      imports: [FacultyGradebookComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FacultyGradebookComponent);
    component = fixture.componentInstance;
  });

  it('should create the gradebook component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute status severity badges correctly', () => {
    expect(component.getStatusBadgeSeverity('DRAFT')).toBe('warn');
    expect(component.getStatusBadgeSeverity('SUBMITTED')).toBe('info');
    expect(component.getStatusBadgeSeverity('VERIFIED')).toBe('secondary');
    expect(component.getStatusBadgeSeverity('SEALED')).toBe('success');
  });

  it('should compute completion severity correctly', () => {
    expect(component.getCompletionSeverity('PASSED')).toBe('success');
    expect(component.getCompletionSeverity('FAILED')).toBe('danger');
    expect(component.getCompletionSeverity('INCOMPLETE')).toBe('warn');
    expect(component.getCompletionSeverity('IN_PROGRESS')).toBe('info');
  });

  it('should restrict canEditGrades for non-assigned faculty', () => {
    component.roster.set(mockRoster);

    // Assigned instructor (id: 5)
    currentUserSignal.set({ id: 5, role: 'FACULTY', username: 'alan.turing', roles: ['FACULTY'] });
    expect(component.isAssignedInstructor()).toBe(true);
    expect(component.canEditGrades()).toBe(true);

    // Unassigned faculty (id: 99)
    currentUserSignal.set({ id: 99, role: 'FACULTY', username: 'other.faculty', roles: ['FACULTY'] });
    expect(component.isAssignedInstructor()).toBe(false);
    expect(component.canEditGrades()).toBe(false);

    // Admin (id: 1) can edit in DRAFT
    currentUserSignal.set({ id: 1, role: 'ADMIN', username: 'admin.user', roles: ['ADMIN'] });
    expect(component.canEditGrades()).toBe(true);
  });

  it('should block submitToDean when students have incomplete grades or IN_PROGRESS status', () => {
    component.selectedSectionId.set(10);
    component.roster.set(mockRoster);
    component.editableStudents.set([
      {
        enrollmentItemId: 101,
        studentId: 1,
        studentNumber: '2026-0001',
        studentName: 'Alice Santos',
        programCode: 'BSIT',
        yearLevel: 3,
        finalNumericalGrade: 1.50,
        completionStatus: 'PASSED'
      },
      {
        enrollmentItemId: 102,
        studentId: 2,
        studentNumber: '2026-0002',
        studentName: 'Bob Reyes',
        programCode: 'BSIT',
        yearLevel: 3,
        finalNumericalGrade: null,
        completionStatus: 'IN_PROGRESS'
      }
    ]);

    expect(component.hasIncompleteGrades()).toBe(true);

    const confirmationService = TestBed.inject(ConfirmationService);
    const spyConfirm = vi.spyOn(confirmationService, 'confirm');

    component.submitToDean();
    expect(spyConfirm).not.toHaveBeenCalled();
  });

  it('should flag errors on mismatched grade and completion status pairs', () => {
    const row: EditableRosterRow = {
      enrollmentItemId: 1,
      studentId: 10,
      studentNumber: '2026-0010',
      studentName: 'Test Student',
      programCode: 'BSIT',
      yearLevel: 1,
      finalNumericalGrade: 1.50,
      completionStatus: 'FAILED',
      isDirty: false
    };

    // Passing grade 1.50 with FAILED status
    expect(component.validateStudentRow(row)).toContain('Passing grade (1.00-3.00) cannot have FAILED status.');

    // Failing grade 5.00 with PASSED status
    row.finalNumericalGrade = 5.00;
    row.completionStatus = 'PASSED';
    expect(component.validateStudentRow(row)).toContain('Failing grade (5.00) cannot have PASSED status.');

    // Conditional grade 4.00 with PASSED status
    row.finalNumericalGrade = 4.00;
    row.completionStatus = 'PASSED';
    expect(component.validateStudentRow(row)).toContain('Conditional grade (4.00) requires INCOMPLETE status.');

    // Valid pair
    row.finalNumericalGrade = 1.50;
    row.completionStatus = 'PASSED';
    expect(component.validateStudentRow(row)).toBeNull();
  });

  it('should auto-recommend completion status on grade change', () => {
    const row: EditableRosterRow = {
      enrollmentItemId: 1,
      studentId: 10,
      studentNumber: '2026-0010',
      studentName: 'Test Student',
      programCode: 'BSIT',
      yearLevel: 1,
      finalNumericalGrade: null,
      completionStatus: 'IN_PROGRESS',
      isDirty: false
    };

    component.editableStudents.set([row]);
    component.onGradeChange(row, 2.00);

    const updated = component.editableStudents();
    expect(updated[0].finalNumericalGrade).toBe(2.00);
    expect(updated[0].completionStatus).toBe('PASSED');
    expect(updated[0].isDirty).toBe(true);
    expect(updated[0].gradeError).toBeNull();
  });

  it('should update row immutably and preserve enrollmentItemId identity on rapid updates', () => {
    const row: EditableRosterRow = {
      enrollmentItemId: 101,
      studentId: 1,
      studentNumber: '2026-0001',
      studentName: 'Alice Santos',
      programCode: 'BSIT',
      yearLevel: 3,
      finalNumericalGrade: 1.50,
      completionStatus: 'PASSED'
    };
    component.editableStudents.set([row]);

    component.onGradeChange(row, 2.50);

    const list1 = component.editableStudents();
    expect(list1.length).toBe(1);
    expect(list1[0].enrollmentItemId).toBe(101);
    expect(list1[0].finalNumericalGrade).toBe(2.50);

    component.onStatusChange(list1[0], 'PASSED');
    const list2 = component.editableStudents();
    expect(list2[0].enrollmentItemId).toBe(101);
    expect(list2[0].completionStatus).toBe('PASSED');
  });

  it('should accurately calculate gradebook KPI statistics', () => {
    component.editableStudents.set([
      {
        enrollmentItemId: 1,
        studentId: 10,
        studentNumber: '2026-0010',
        studentName: 'Student 1',
        programCode: 'BSIT',
        yearLevel: 1,
        finalNumericalGrade: 1.50,
        completionStatus: 'PASSED'
      },
      {
        enrollmentItemId: 2,
        studentId: 11,
        studentNumber: '2026-0011',
        studentName: 'Student 2',
        programCode: 'BSIT',
        yearLevel: 1,
        finalNumericalGrade: 2.50,
        completionStatus: 'PASSED'
      },
      {
        enrollmentItemId: 3,
        studentId: 12,
        studentNumber: '2026-0012',
        studentName: 'Student 3',
        programCode: 'BSIT',
        yearLevel: 1,
        finalNumericalGrade: 5.00,
        completionStatus: 'FAILED'
      }
    ]);

    expect(component.totalStudents()).toBe(3);
    expect(component.passedCount()).toBe(2);
    expect(component.failedCount()).toBe(1);
    expect(component.averageGrade()).toBeCloseTo(3.00, 2);
  });

  it('should validate Philippine CHED CMO 25 grading scale correctly', () => {
    // Valid CHED grades
    expect(component.validatePhilippineGrade(1.00)).toBeNull();
    expect(component.validatePhilippineGrade(1.25)).toBeNull();
    expect(component.validatePhilippineGrade(1.50)).toBeNull();
    expect(component.validatePhilippineGrade(1.75)).toBeNull();
    expect(component.validatePhilippineGrade(2.00)).toBeNull();
    expect(component.validatePhilippineGrade(2.25)).toBeNull();
    expect(component.validatePhilippineGrade(2.50)).toBeNull();
    expect(component.validatePhilippineGrade(2.75)).toBeNull();
    expect(component.validatePhilippineGrade(3.00)).toBeNull();
    expect(component.validatePhilippineGrade(4.00)).toBeNull();
    expect(component.validatePhilippineGrade(5.00)).toBeNull();
    expect(component.validatePhilippineGrade(null)).toBeNull();
    expect(component.validatePhilippineGrade(undefined)).toBeNull();

    // Invalid non-standard grades
    expect(component.validatePhilippineGrade(1.43)).toContain('Must be valid CHED increment');
    expect(component.validatePhilippineGrade(0.75)).toContain('Must be valid CHED increment');
    expect(component.validatePhilippineGrade(2.10)).toContain('Must be valid CHED increment');
    expect(component.validatePhilippineGrade(3.25)).toContain('Must be valid CHED increment');
    expect(component.validatePhilippineGrade(6.00)).toContain('Must be valid CHED increment');
  });

  it('should flag gradeError on invalid input and update hasGradeErrors', () => {
    const row: EditableRosterRow = {
      enrollmentItemId: 1,
      studentId: 10,
      studentNumber: '2026-0010',
      studentName: 'Test Student',
      programCode: 'BSIT',
      yearLevel: 1,
      finalNumericalGrade: null,
      completionStatus: 'IN_PROGRESS',
      isDirty: false
    };
    component.editableStudents.set([row]);

    // Enter invalid grade
    component.onGradeChange(row, 1.43);
    expect(row.gradeError).toBeTruthy();
    expect(component.hasGradeErrors()).toBe(true);

    // Correct to valid grade
    component.onGradeChange(row, 1.50);
    expect(row.gradeError).toBeNull();
    expect(component.hasGradeErrors()).toBe(false);
  });

  it('should auto-recommend INCOMPLETE for conditional grade 4.00', () => {
    const row: EditableRosterRow = {
      enrollmentItemId: 1,
      studentId: 10,
      studentNumber: '2026-0010',
      studentName: 'Test Student',
      programCode: 'BSIT',
      yearLevel: 1,
      finalNumericalGrade: null,
      completionStatus: 'IN_PROGRESS',
      isDirty: false
    };

    component.editableStudents.set([row]);
    component.onGradeChange(row, 4.00);

    const updated = component.editableStudents();
    expect(updated[0].finalNumericalGrade).toBe(4.00);
    expect(updated[0].completionStatus).toBe('INCOMPLETE');
    expect(updated[0].gradeError).toBeNull();
  });

  it('should provide appropriate phaseInfo metadata across all four tiers', () => {
    // Default / DRAFT
    expect(component.phaseInfo().title).toContain('Tier 1');
    expect(component.phaseInfo().severity).toBe('warn');

    // SUBMITTED
    component.roster.set({ ...mockRoster, gradeStatus: 'SUBMITTED' });
    expect(component.phaseInfo().title).toContain('Tier 2');
    expect(component.phaseInfo().severity).toBe('info');

    // VERIFIED
    component.roster.set({ ...mockRoster, gradeStatus: 'VERIFIED' });
    expect(component.phaseInfo().title).toContain('Tier 3');
    expect(component.phaseInfo().severity).toBe('help');

    // SEALED
    component.roster.set({ ...mockRoster, gradeStatus: 'SEALED' });
    expect(component.phaseInfo().title).toContain('Tier 4');
    expect(component.phaseInfo().severity).toBe('success');
  });
});
