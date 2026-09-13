import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { GuestAdmissionComponent } from './guest-admission.component';

describe('GuestAdmissionComponent', () => {
  let component: GuestAdmissionComponent;
  let fixture: ComponentFixture<GuestAdmissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestAdmissionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GuestAdmissionComponent);
    component = fixture.componentInstance;
    component.admissionConfig.set({
      id: 1,
      termId: 4,
      termName: 'AY 2025-2026 1st Semester',
      isActive: true,
      dailySlotLimit: 1000,
      totalOpenedSlots: 20000,
      daysOpen: 20
    });
  });

  it('should create the GuestAdmissionComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should default to step 1 of the admission wizard', () => {
    expect(component.currentStep()).toBe(1);
    expect(component.currentStepIndex()).toBe(0);
  });

  it('should advance to next step when step 1 form fields are valid', () => {
    component.admissionForm.patchValue({
      targetProgramId: 1,
      termId: 4,
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      birthDate: '2007-01-01',
      gender: 'MALE',
      civilStatus: 'SINGLE',
      citizenship: 'FILIPINO',
      mobileNumber: '09171234567',
      email: 'juan@example.com'
    });

    component.nextStep();
    expect(component.currentStep()).toBe(2);
    expect(component.currentStepIndex()).toBe(1);
  });

  it('should not advance to next step when step 1 form fields are invalid', () => {
    component.admissionForm.reset();
    component.nextStep();
    expect(component.currentStep()).toBe(1);
  });

  it('should regress step when prevStep is called', () => {
    component.admissionForm.patchValue({
      targetProgramId: 1,
      termId: 4,
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      birthDate: '2007-01-01',
      gender: 'MALE',
      civilStatus: 'SINGLE',
      citizenship: 'FILIPINO',
      mobileNumber: '09171234567',
      email: 'juan@example.com'
    });

    component.nextStep(); // step 2
    expect(component.currentStep()).toBe(2);
    component.prevStep(); // back to step 1
    expect(component.currentStep()).toBe(1);
  });

  it('should block navigation when admission period is locked by admin/guidance', () => {
    component.admissionConfig.set({
      id: 1,
      termId: 4,
      termName: 'AY 2025-2026 1st Semester',
      isActive: false,
      dailySlotLimit: 1000,
      totalOpenedSlots: 20000,
      daysOpen: 20
    });

    component.admissionForm.patchValue({
      targetProgramId: 1,
      termId: 4,
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      birthDate: '2007-01-01',
      gender: 'MALE',
      civilStatus: 'SINGLE',
      citizenship: 'FILIPINO',
      mobileNumber: '09171234567',
      email: 'juan@example.com'
    });

    expect(component.isAdmissionLocked()).toBe(true);
    component.nextStep();
    expect(component.currentStep()).toBe(1);
  });
});
