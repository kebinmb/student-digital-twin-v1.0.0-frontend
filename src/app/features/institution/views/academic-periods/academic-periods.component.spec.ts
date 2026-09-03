import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AcademicPeriodsComponent } from './academic-periods.component';

describe('AcademicPeriodsComponent', () => {
  let component: AcademicPeriodsComponent;
  let fixture: ComponentFixture<AcademicPeriodsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicPeriodsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AcademicPeriodsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
