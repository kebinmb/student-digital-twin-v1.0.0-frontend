import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { StudentAdvisingComponent } from './student-advising.component';
import { EnrollmentStore } from '../../state/enrollment.store';
import { CourseEligibilityItemDto } from '../../../../core/models/enrollment.model';

describe('StudentAdvisingComponent', () => {
  let component: StudentAdvisingComponent;
  let fixture: ComponentFixture<StudentAdvisingComponent>;
  let store: EnrollmentStore;

  const mockCourse: CourseEligibilityItemDto = {
    courseId: 101,
    code: 'IT 211',
    title: 'Data Structures & Algorithms',
    lectureUnits: 2,
    labUnits: 3,
    creditUnits: 3,
    yearLevel: 2,
    semester: 'FIRST_SEM',
    eligibilityStatus: 'ELIGIBLE',
    prerequisites: [],
    availableSections: [
      {
        sectionId: 501,
        sectionCode: 'BSIT-2A-S1',
        maxCapacity: 40,
        enrolledCount: 25,
        status: 'OPEN',
        scheduleSummary: 'Mon 08:00 - 10:00 (Room 101)'
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentAdvisingComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        EnrollmentStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentAdvisingComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(EnrollmentStore);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map status severity correctly', () => {
    expect(component.getStatusSeverity('ELIGIBLE')).toBe('success');
    expect(component.getStatusSeverity('CURRENTLY_ENROLLED')).toBe('info');
    expect(component.getStatusSeverity('LOCKED_PREREQUISITE')).toBe('danger');
    expect(component.getStatusSeverity('ALREADY_PASSED')).toBe('secondary');
    expect(component.getStatusSeverity('UNKNOWN')).toBe('info');
  });

  it('should open and close section chooser modal', () => {
    expect(component.isSectionModalVisible()).toBe(false);
    expect(component.selectedCourse()).toBeNull();

    component.openSectionChooser(mockCourse);
    expect(component.isSectionModalVisible()).toBe(true);
    expect(component.selectedCourse()?.courseId).toBe(101);

    component.closeSectionChooser();
    expect(component.isSectionModalVisible()).toBe(false);
    expect(component.selectedCourse()).toBeNull();
  });

  it('should toggle admissions intake dialog and initialize default fields', () => {
    expect(component.isAdmissionsDialogVisible()).toBe(false);
    component.openAdmissionsDialog();
    expect(component.isAdmissionsDialogVisible()).toBe(true);
    expect(component.admitStudentNumber()).toBeTruthy();
    expect(component.admitClassification()).toBe('INCOMING_FIRST_YEAR');
    expect(component.admitYearLevel()).toBe(1);

    component.closeAdmissionsDialog();
    expect(component.isAdmissionsDialogVisible()).toBe(false);
  });

  it('should toggle transferee crediting dialog and initialize defaults', () => {
    store.studentId.set(10);
    expect(component.isCreditingDialogVisible()).toBe(false);
    component.openCreditingDialog();
    expect(component.isCreditingDialogVisible()).toBe(true);
    expect(component.creditingExternalSchool()).toBe('Polytechnic State College');
    expect(component.creditingGrade()).toBe(1.50);
    expect(component.creditingUnits()).toBe(3.00);

    component.closeCreditingDialog();
    expect(component.isCreditingDialogVisible()).toBe(false);
  });

  it('should parse schedule slots with semicolon, comma, and TBA values', () => {
    // TBA / No schedule
    expect(component.formatScheduleSlots('No schedule')).toEqual([{ day: 'Schedule', timeRoom: 'To Be Announced (TBA)' }]);
    expect(component.formatScheduleSlots('Schedule TBA')).toEqual([{ day: 'Schedule', timeRoom: 'To Be Announced (TBA)' }]);

    // Semicolon separated
    const semiSlots = component.formatScheduleSlots('MON 08:00 - 10:00 (Room 101); WED 08:00 - 10:00 (Room 101)');
    expect(semiSlots).toHaveLength(2);
    expect(semiSlots[0].day).toBe('MON');
    expect(semiSlots[1].day).toBe('WED');

    // Comma separated
    const commaSlots = component.formatScheduleSlots('MON 08:00:00-10:00:00 (CL1), WED 08:00:00-10:00:00 (CL1)');
    expect(commaSlots).toHaveLength(2);
    expect(commaSlots[0].day).toBe('MON');
    expect(commaSlots[1].day).toBe('WED');
  });
});
