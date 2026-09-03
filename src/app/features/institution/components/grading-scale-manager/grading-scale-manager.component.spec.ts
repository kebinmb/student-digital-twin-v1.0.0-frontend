import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';

import { GradingScaleManagerComponent } from './grading-scale-manager.component';
import { GradingScaleService } from '../../../../core/services/institution.service';

describe('GradingScaleManagerComponent', () => {
  let component: GradingScaleManagerComponent;
  let fixture: ComponentFixture<GradingScaleManagerComponent>;

  const mockGradingService = {
    getAll: () => of([
      {
        id: 1,
        code: '1.00',
        percentageMin: 97.5,
        percentageMax: 100.0,
        gradePoint: '1.00',
        description: 'Excellent',
        remarks: 'Excellent',
        isPassing: true,
        isNonNumeric: false
      },
      {
        id: 2,
        code: '5.00',
        percentageMin: 0.0,
        percentageMax: 74.99,
        gradePoint: '5.00',
        description: 'Failed',
        remarks: 'Failed',
        isPassing: false,
        isNonNumeric: false
      }
    ]),
    create: () => of({}),
    update: () => of({}),
    delete: () => of({})
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradingScaleManagerComponent],
      providers: [
        provideHttpClient(),
        MessageService,
        ConfirmationService,
        { provide: GradingScaleService, useValue: mockGradingService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GradingScaleManagerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should load grading scales on init', () => {
    expect(component.gradingScales().length).toBe(2);
  });

  it('should simulate transmutation correctly', () => {
    component.simulatedPercentage = 98.0;
    component.simulateTransmutation();
    expect(component.simulatedScaleResult()?.code).toBe('1.00');
    expect(component.simulatedScaleResult()?.isPassing).toBe(true);

    component.simulatedPercentage = 60.0;
    component.simulateTransmutation();
    expect(component.simulatedScaleResult()?.code).toBe('5.00');
    expect(component.simulatedScaleResult()?.isPassing).toBe(false);
  });
});
