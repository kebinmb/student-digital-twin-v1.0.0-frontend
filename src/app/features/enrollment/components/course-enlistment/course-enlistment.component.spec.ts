import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CourseEnlistmentComponent } from './course-enlistment.component';
import { EnrollmentStore } from '../../state/enrollment.store';
import { EnrollmentItemResponse } from '../../../../core/models/enrollment.model';

describe('CourseEnlistmentComponent', () => {
  let component: CourseEnlistmentComponent;
  let fixture: ComponentFixture<CourseEnlistmentComponent>;
  let confirmationService: ConfirmationService;

  const mockItem: EnrollmentItemResponse = {
    itemId: 1,
    sectionId: 10,
    sectionCode: 'BSIT-2A-S1',
    courseCode: 'IT 211',
    courseTitle: 'Data Structures & Algorithms',
    creditUnits: 3,
    scheduleSummary: 'Mon 08:00 - 10:00 (Room 101)',
    completionStatus: 'ENLISTED'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseEnlistmentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
        EnrollmentStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseEnlistmentComponent);
    component = fixture.componentInstance;
    confirmationService = fixture.debugElement.injector.get(ConfirmationService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map status severity correctly', () => {
    expect(component.getStatusSeverity('ENROLLED')).toBe('success');
    expect(component.getStatusSeverity('ENLISTED')).toBe('info');
    expect(component.getStatusSeverity('ASSESSED')).toBe('warn');
    expect(component.getStatusSeverity('DRAFT')).toBe('secondary');
    expect(component.getStatusSeverity('DROPPED')).toBe('danger');
    expect(component.getStatusSeverity('UNKNOWN')).toBe('info');
  });

  it('should trigger confirmation dialog on drop section', () => {
    let confirmCalled = false;
    confirmationService.confirm = () => {
      confirmCalled = true;
      return confirmationService;
    };
    component.confirmDropSection(mockItem);
    expect(confirmCalled).toBe(true);
  });
});
