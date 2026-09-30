import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { vi } from 'vitest';
import { CourseCatalogManagerComponent } from './course-catalog-manager.component';
import { Course } from '../../../../core/models/institution.model';

describe('CourseCatalogManagerComponent', () => {
  let component: CourseCatalogManagerComponent;
  let fixture: ComponentFixture<CourseCatalogManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseCatalogManagerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseCatalogManagerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default category PROFESSIONAL_MAJOR', () => {
    expect(component.form.controls.category.value).toBe('PROFESSIONAL_MAJOR');
  });

  it('should return correct severity for each category', () => {
    expect(component.getCategorySeverity('GEN_ED')).toBe('info');
    expect(component.getCategorySeverity('PROFESSIONAL_MAJOR')).toBe('success');
    expect(component.getCategorySeverity('ELECTIVE')).toBe('warn');
    expect(component.getCategorySeverity('CAPSTONE')).toBe('danger');
    expect(component.getCategorySeverity('PRACTICUM')).toBe('secondary');
    expect(component.getCategorySeverity('MANDATED')).toBe('contrast');
  });

  it('should reset category to PROFESSIONAL_MAJOR on openCreateDialog', () => {
    component.form.controls.category.setValue('GEN_ED');
    component.openCreateDialog();
    expect(component.form.controls.category.value).toBe('PROFESSIONAL_MAJOR');
  });

  it('should populate course category on openEditDialog', () => {
    const mockCourse: any = {
      id: 10,
      code: 'CAP 401',
      title: 'Capstone Project 1',
      lectureUnits: 3,
      labUnits: 0,
      creditUnits: 3,
      contactHoursLec: 3,
      contactHoursLab: 0,
      category: 'CAPSTONE',
      isActive: true
    };
    component.openEditDialog(mockCourse);
    expect(component.editingId()).toBe(10);
    expect(component.form.controls.category.value).toBe('CAPSTONE');
    expect(component.form.controls.code.value).toBe('CAP-401');
  });

  it('should strictly normalize course codes to include hyphens', () => {
    expect(component.normalizeCourseCode('IT 101')).toBe('IT-101');
    expect(component.normalizeCourseCode('it101')).toBe('IT-101');
    expect(component.normalizeCourseCode('gec 102')).toBe('GEC-102');
    expect(component.normalizeCourseCode('GEC102')).toBe('GEC-102');
    expect(component.normalizeCourseCode('pe 1')).toBe('PE-1');
    expect(component.normalizeCourseCode('PE1')).toBe('PE-1');
    expect(component.normalizeCourseCode('  cs - 101 ')).toBe('CS-101');
  });

  it('should auto-normalize course code on blur', () => {
    component.form.controls.code.setValue('it 101');
    component.onCodeBlur();
    expect(component.form.controls.code.value).toBe('IT-101');
  });

  it('should calculate computedTotalUnits from lecture and lab units', () => {
    component.form.controls.lectureUnits.setValue(3);
    component.form.controls.labUnits.setValue(1.5);
    expect(component.computedTotalUnits).toBe(4.5);

    component.form.controls.lectureUnits.setValue(2);
    component.form.controls.labUnits.setValue(0);
    expect(component.computedTotalUnits).toBe(2);
  });

  describe('confirmDelete', () => {
    it('should configure confirmDelete with dedicated key "courseDeleteConfirm", explicit "Yes" acceptLabel and "No" rejectLabel', () => {
      const confirmationService = TestBed.inject(ConfirmationService);
      let capturedConfirmation: Confirmation | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        capturedConfirmation = conf;
        return confirmationService;
      });

      const mockCourse: Course = {
        id: 1,
        code: 'IT-101',
        title: 'Introduction to Computing',
        lectureUnits: 3,
        labUnits: 0,
        creditUnits: 3,
        contactHoursLec: 3,
        contactHoursLab: 0,
        category: 'PROFESSIONAL_MAJOR',
        isActive: true
      };

      component.confirmDelete(mockCourse);

      expect(capturedConfirmation).toBeDefined();
      expect(capturedConfirmation?.key).toBe('courseDeleteConfirm');
      expect(capturedConfirmation?.acceptLabel).toBe('Yes');
      expect(capturedConfirmation?.rejectLabel).toBe('No');
      expect(capturedConfirmation?.acceptButtonStyleClass).toBe('p-button-danger');
      expect(capturedConfirmation?.rejectButtonStyleClass).toBe('p-button-outlined p-button-secondary');
      expect(capturedConfirmation?.header).toBe('Delete Master Course');
    });
  });
});
