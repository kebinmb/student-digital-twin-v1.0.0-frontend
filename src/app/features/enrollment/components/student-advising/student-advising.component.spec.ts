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
});
