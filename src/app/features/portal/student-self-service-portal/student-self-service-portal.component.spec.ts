import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { StudentSelfServicePortalComponent } from './student-self-service-portal.component';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { ClearanceService } from '../../../core/services/clearance.service';

describe('StudentSelfServicePortalComponent', () => {
  let component: StudentSelfServicePortalComponent;
  let fixture: ComponentFixture<StudentSelfServicePortalComponent>;
  let authService: AuthService;
  let clearanceService: ClearanceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentSelfServicePortalComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentSelfServicePortalComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    clearanceService = TestBed.inject(ClearanceService);
    await fixture.whenStable();
  });

  it('should create student self-service portal component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle course expansion row', () => {
    expect(component.expandedSectionId()).toBeNull();
    component.toggleCourseExpand(101);
    expect(component.expandedSectionId()).toBe(101);
    component.toggleCourseExpand(101);
    expect(component.expandedSectionId()).toBeNull();
  });

  it('should clear search query', () => {
    component.searchQuery.set('BSIT');
    expect(component.searchQuery()).toBe('BSIT');
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
  });

  it('should update clearance cards reactively when ClearanceService emits update', () => {
    component.portalData.set({
      studentId: 7,
      studentNumber: '2026-0007',
      studentName: 'Test Student',
      programCode: 'BSIT',
      yearLevel: 3,
      cumulativeGpa: '1.50',
      totalUnitsEarned: '60.00',
      financialClearance: 'PENDING',
      departmentalClearance: 'PENDING',
      currentCourses: []
    });

    expect(component.overallClearanceLabel()).toBe('CLEARANCE PENDING');
    expect(component.getDepartmentStatus('LIBRARY')).toBe('PENDING');

    // Simulate reactive clearance update from ClearanceService
    clearanceService.currentClearance.set({
      studentId: 7,
      termId: 1,
      overallStatus: 'CLEARED',
      departments: [
        { departmentId: 1, departmentName: 'LIBRARY', status: 'APPROVED', remarks: 'No books due' },
        { departmentId: 2, departmentName: 'ACCOUNTING', status: 'APPROVED', remarks: 'Paid' },
        { departmentId: 3, departmentName: 'LABORATORY', status: 'APPROVED', remarks: 'Cleared' },
        { departmentId: 4, departmentName: 'STUDENT_AFFAIRS', status: 'APPROVED', remarks: 'Good moral' },
        { departmentId: 5, departmentName: 'DEAN', status: 'APPROVED', remarks: 'Academic clearance' }
      ]
    });

    expect(component.getDepartmentStatus('LIBRARY')).toBe('CLEARED');
    expect(component.getDepartmentStatus('ACCOUNTING')).toBe('CLEARED');
    expect(component.getDepartmentStatus('DEAN')).toBe('CLEARED');
    expect(component.isFullyCleared()).toBe(true);
    expect(component.overallClearanceLabel()).toBe('CLEARED FOR ENROLMENT');
    expect(component.overallClearanceSeverity()).toBe('success');
  });

  it('should reflect HOLD or REJECTED status in department clearance', () => {
    clearanceService.currentClearance.set({
      studentId: 7,
      termId: 1,
      overallStatus: 'REJECTED',
      departments: [
        { departmentId: 1, departmentName: 'LIBRARY', status: 'REJECTED', remarks: 'Missing book' },
        { departmentId: 2, departmentName: 'ACCOUNTING', status: 'APPROVED', remarks: 'Paid' }
      ]
    });

    expect(component.getDepartmentStatus('LIBRARY')).toBe('REJECTED');
    expect(component.getDepartmentStatus('ACCOUNTING')).toBe('CLEARED');
    expect(component.isFullyCleared()).toBe(false);
    expect(component.overallClearanceLabel()).toBe('CLEARANCE PENDING');
    expect(component.overallClearanceSeverity()).toBe('warn');
  });
});
