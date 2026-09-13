import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AdmissionManagementComponent } from './admission-management.component';

describe('AdmissionManagementComponent', () => {
  let component: AdmissionManagementComponent;
  let fixture: ComponentFixture<AdmissionManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmissionManagementComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdmissionManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create AdmissionManagementComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should dynamically calculate daysOpenCalculated based on configForm values', () => {
    // Initial values: 20000 / 1000 = 20
    expect(component.daysOpenCalculated()).toBe(20);

    // Dynamically patch dailySlotLimit to 500
    component.configForm.patchValue({ dailySlotLimit: 500 });
    fixture.detectChanges();
    expect(component.daysOpenCalculated()).toBe(40); // 20000 / 500 = 40

    // Dynamically patch totalOpenedSlots to 15000 and dailySlotLimit to 1000
    component.configForm.patchValue({ totalOpenedSlots: 15000, dailySlotLimit: 1000 });
    fixture.detectChanges();
    expect(component.daysOpenCalculated()).toBe(15); // 15000 / 1000 = 15
  });

  it('should toggle isCreateSlotModalVisible state when opening and closing create slot modal', () => {
    expect(component.isCreateSlotModalVisible()).toBe(false);
    component.openCreateSlotModal();
    expect(component.isCreateSlotModalVisible()).toBe(true);
    component.closeCreateSlotModal();
    expect(component.isCreateSlotModalVisible()).toBe(false);
  });
});
