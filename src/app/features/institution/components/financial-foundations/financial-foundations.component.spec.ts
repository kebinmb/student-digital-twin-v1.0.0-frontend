import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';

import { FinancialFoundationsComponent } from './financial-foundations.component';
import { FinancialService } from '../../../../core/services/institution.service';

describe('FinancialFoundationsComponent', () => {
  let component: FinancialFoundationsComponent;
  let fixture: ComponentFixture<FinancialFoundationsComponent>;

  const mockFinancialService = {
    getFeeCategories: () => of([{ id: 1, code: 'TUITION', name: 'Tuition Fees' }]),
    getFeeCatalog: () => of([{ id: 1, categoryId: 1, code: 'TUI-01', name: 'Tuition Fee', defaultAmount: 500, isPerUnit: true, isChedSanctioned: true, isFheBillable: true }]),
    getPaymentTermTemplates: () => of([{ id: 1, name: 'Standard 4-Term', downpaymentPercentage: 25, prelimPercentage: 25, midtermPercentage: 25, semiFinalPercentage: 0, finalPercentage: 25 }]),
    getScholarships: () => of([{ id: 1, code: 'SCH-01', name: 'Academic Full', category: 'INSTITUTIONAL', discountType: 'PERCENTAGE', discountPercentage: 100, fixedAmount: 0, appliesToTuition: true, appliesToMisc: true, isActive: true }]),
    createFeeCategory: () => of({}),
    createFeeCatalog: () => of({}),
    createPaymentTermTemplate: () => of({}),
    createScholarship: () => of({}),
    deleteFeeCatalog: () => of({}),
    deletePaymentTermTemplate: () => of({}),
    deleteScholarship: () => of({})
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialFoundationsComponent],
      providers: [
        provideHttpClient(),
        MessageService,
        ConfirmationService,
        { provide: FinancialService, useValue: mockFinancialService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialFoundationsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate template percentage sum', () => {
    component.tplDown = 25;
    component.tplPrelim = 25;
    component.tplMidterm = 25;
    component.tplSemi = 0;
    component.tplFinal = 25;
    expect(component.templateTotalPct).toBe(100);
  });
});
