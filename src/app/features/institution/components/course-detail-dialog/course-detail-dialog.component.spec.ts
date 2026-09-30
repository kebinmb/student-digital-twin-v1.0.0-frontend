import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { vi } from 'vitest';
import { CourseDetailDialogComponent } from './course-detail-dialog.component';
import { Course, CourseOutcome, CoursePrerequisite } from '../../../../core/models/institution.model';

describe('CourseDetailDialogComponent', () => {
  let component: CourseDetailDialogComponent;
  let fixture: ComponentFixture<CourseDetailDialogComponent>;
  let confirmationService: ConfirmationService;

  const mockCourse: Course = {
    id: 101,
    code: 'CS-101',
    title: 'Intro to Computer Science',
    lectureUnits: 3,
    labUnits: 0,
    creditUnits: 3,
    contactHoursLec: 3,
    contactHoursLab: 0,
    category: 'PROFESSIONAL_MAJOR',
    isActive: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseDetailDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseDetailDialogComponent);
    component = fixture.componentInstance;
    confirmationService = TestBed.inject(ConfirmationService);
    fixture.componentRef.setInput('course', mockCourse);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Confirmation Dialog Behavior', () => {
    it('should configure confirmDeleteCilo with explicit acceptLabel "Yes" and rejectLabel "No"', () => {
      let capturedConfirmation: Confirmation | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        capturedConfirmation = conf;
        return confirmationService;
      });

      const mockCilo: CourseOutcome = {
        id: 1,
        courseId: 101,
        code: 'CILO-1',
        description: 'Understand OOP principles',
        bloomsLevel: 'APPLYING'
      };

      component.confirmDeleteCilo(mockCilo);

      expect(capturedConfirmation).toBeDefined();
      expect(capturedConfirmation?.acceptLabel).toBe('Yes');
      expect(capturedConfirmation?.rejectLabel).toBe('No');
      expect(capturedConfirmation?.acceptButtonStyleClass).toBe('p-button-danger');
      expect(capturedConfirmation?.rejectButtonStyleClass).toBe('p-button-outlined p-button-secondary');
      expect(capturedConfirmation?.header).toBe('Delete Course Outcome');
    });

    it('should configure confirmDeletePrereq with explicit acceptLabel "Yes" and rejectLabel "No"', () => {
      let capturedConfirmation: Confirmation | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        capturedConfirmation = conf;
        return confirmationService;
      });

      const mockPrereq: CoursePrerequisite = {
        id: 2,
        courseId: 101,
        prerequisiteCourseId: 99,
        prerequisiteCourseCode: 'CS-100',
        prerequisiteCourseTitle: 'Fundamentals of Computing',
        ruleType: 'PREREQUISITE',
        minGradeRequired: '3.0'
      };

      component.confirmDeletePrereq(mockPrereq);

      expect(capturedConfirmation).toBeDefined();
      expect(capturedConfirmation?.acceptLabel).toBe('Yes');
      expect(capturedConfirmation?.rejectLabel).toBe('No');
      expect(capturedConfirmation?.acceptButtonStyleClass).toBe('p-button-danger');
      expect(capturedConfirmation?.rejectButtonStyleClass).toBe('p-button-outlined p-button-secondary');
      expect(capturedConfirmation?.header).toBe('Remove Prerequisite Rule');
    });
  });
});
