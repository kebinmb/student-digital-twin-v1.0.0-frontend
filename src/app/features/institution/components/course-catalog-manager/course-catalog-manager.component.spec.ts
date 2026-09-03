import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CourseCatalogManagerComponent } from './course-catalog-manager.component';

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
  });
});
