import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { throwError } from 'rxjs';
import { AdmissionApiService } from '../../../core/service/admission/admission-api.service';
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

  it('should identify queue session expiring soon when within 120 seconds', () => {
    component.queueRemainingSeconds.set(119);
    expect(component.isQueueExpiringSoon()).toBe(true);

    component.queueRemainingSeconds.set(121);
    expect(component.isQueueExpiringSoon()).toBe(false);

    component.queueRemainingSeconds.set(0);
    expect(component.isQueueExpiringSoon()).toBe(false);
  });

  it('should format remaining queue session time correctly', () => {
    component.queueRemainingSeconds.set(599);
    expect(component.queueTimeRemainingFormatted()).toBe('09:59');

    component.queueRemainingSeconds.set(65);
    expect(component.queueTimeRemainingFormatted()).toBe('01:05');

    component.queueRemainingSeconds.set(0);
    expect(component.queueTimeRemainingFormatted()).toBe('00:00');
  });

  it('should switch to track tab when switchToTrackTab is invoked', () => {
    component.activeTab.set('apply');
    component.switchToTrackTab();
    expect(component.activeTab()).toBe('track');
  });

  it('should refresh queue token and reset expired flag on refreshQueueToken', () => {
    component.isQueueExpired.set(true);
    let called = false;
    component.initQueueToken = () => { called = true; };
    component.refreshQueueToken();
    expect(component.isQueueExpired()).toBe(false);
    expect(called).toBe(true);
  });

  it('should keep form data intact when submission fails with QUEUE_SESSION_EXPIRED', () => {
    component.admissionForm.patchValue({
      targetProgramId: 1,
      termId: 4,
      firstName: 'Maria',
      lastName: 'Clara',
      birthDate: '2006-05-12',
      gender: 'FEMALE',
      civilStatus: 'SINGLE',
      citizenship: 'FILIPINO',
      mobileNumber: '09187654321',
      email: 'maria@example.com',
      highSchoolName: 'CHMSU High',
      highSchoolType: 'PUBLIC',
      highSchoolGwa: 92.5,
      streetAddress: '123 Rizal St',
      barangay: 'Brgy 1',
      cityMunicipality: 'Talisay City',
      province: 'Negros Occidental',
      emergencyContactName: 'Jose Rizal',
      emergencyContactRelationship: 'Father',
      emergencyContactNumber: '09191234567'
    });

    const admissionApi = TestBed.inject(AdmissionApiService);
    admissionApi.submitApplication = () => throwError(() => ({
      error: { errorCode: 'QUEUE_SESSION_EXPIRED', detail: 'QUEUE_SESSION_EXPIRED' }
    }));

    component.onSubmit();

    expect(component.isQueueExpired()).toBe(true);
    expect(component.admissionForm.get('firstName')?.value).toBe('Maria');
    expect(component.admissionForm.get('email')?.value).toBe('maria@example.com');
  });
});
