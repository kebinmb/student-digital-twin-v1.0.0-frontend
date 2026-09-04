import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EnrollmentComponent } from './enrollment.component';
import { EnrollmentStore } from './state/enrollment.store';

describe('EnrollmentComponent', () => {
  let component: EnrollmentComponent;
  let fixture: ComponentFixture<EnrollmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnrollmentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        EnrollmentStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EnrollmentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle between advising and enlistment tabs', () => {
    expect(component.activeTab()).toBe('advising');
    component.setTab('enlistment');
    expect(component.activeTab()).toBe('enlistment');
    component.setTab('advising');
    expect(component.activeTab()).toBe('advising');
  });
});
