import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { vi } from 'vitest';

import { FinancialFoundationsComponent } from './financial-foundations.component';
import { FinancialService } from '../../../../core/services/institution.service';
import { FeeCatalog, PaymentTermTemplate, ScholarshipDiscount } from '../../../../core/models/institution.model';

describe('FinancialFoundationsComponent', () => {
  let component: FinancialFoundationsComponent;
  let fixture: ComponentFixture<FinancialFoundationsComponent>;
  let confirmationService: ConfirmationService;

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
    confirmationService = TestBed.inject(ConfirmationService);
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

  describe('Confirmation Dialog Behavior', () => {
    it('should configure confirmDeleteFee with explicit acceptLabel "Yes" and rejectLabel "No"', () => {
      let capturedConfirmation: Confirmation | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        capturedConfirmation = conf;
        return confirmationService;
      });

      const mockFee: FeeCatalog = {
        id: 1,
        categoryId: 1,
        code: 'TUI-01',
        name: 'Tuition Fee',
        defaultAmount: 500,
        isPerUnit: true,
        isChedSanctioned: true,
        isFheBillable: true
      };

      component.confirmDeleteFee(mockFee);

      expect(capturedConfirmation).toBeDefined();
      expect(capturedConfirmation?.acceptLabel).toBe('Yes');
      expect(capturedConfirmation?.rejectLabel).toBe('No');
      expect(capturedConfirmation?.acceptButtonStyleClass).toBe('p-button-danger');
      expect(capturedConfirmation?.rejectButtonStyleClass).toBe('p-button-outlined p-button-secondary');
      expect(capturedConfirmation?.header).toBe('Confirm Deletion');
    });

    it('should configure confirmDeleteTemplate with explicit acceptLabel "Yes" and rejectLabel "No"', () => {
      let capturedConfirmation: Confirmation | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        capturedConfirmation = conf;
        return confirmationService;
      });

      const mockTemplate: PaymentTermTemplate = {
        id: 1,
        name: 'Standard 4-Term',
        downpaymentPercentage: 25,
        prelimPercentage: 25,
        midtermPercentage: 25,
        semiFinalPercentage: 0,
        finalPercentage: 25
      };

      component.confirmDeleteTemplate(mockTemplate);

      expect(capturedConfirmation).toBeDefined();
      expect(capturedConfirmation?.acceptLabel).toBe('Yes');
      expect(capturedConfirmation?.rejectLabel).toBe('No');
      expect(capturedConfirmation?.acceptButtonStyleClass).toBe('p-button-danger');
      expect(capturedConfirmation?.rejectButtonStyleClass).toBe('p-button-outlined p-button-secondary');
      expect(capturedConfirmation?.header).toBe('Confirm Deletion');
    });

    it('should configure confirmDeleteScholarship with explicit acceptLabel "Yes" and rejectLabel "No"', () => {
      let capturedConfirmation: Confirmation | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        capturedConfirmation = conf;
        return confirmationService;
      });

      const mockScholarship: ScholarshipDiscount = {
        id: 1,
        code: 'SCH-01',
        name: 'Academic Full',
        category: 'INSTITUTIONAL',
        discountType: 'PERCENTAGE',
        discountPercentage: 100,
        fixedAmount: 0,
        appliesToTuition: true,
        appliesToMisc: true,
        isActive: true
      };

      component.confirmDeleteScholarship(mockScholarship);

      expect(capturedConfirmation).toBeDefined();
      expect(capturedConfirmation?.acceptLabel).toBe('Yes');
      expect(capturedConfirmation?.rejectLabel).toBe('No');
      expect(capturedConfirmation?.acceptButtonStyleClass).toBe('p-button-danger');
      expect(capturedConfirmation?.rejectButtonStyleClass).toBe('p-button-outlined p-button-secondary');
      expect(capturedConfirmation?.header).toBe('Confirm Deletion');
    });

    it('should preserve "Yes" / "No" on confirmDeleteFee even after confirmDeleteScholarship was called', () => {
      const confirmations: Confirmation[] = [];
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        confirmations.push(conf);
        return confirmationService;
      });

      const mockScholarship: ScholarshipDiscount = {
        id: 1,
        code: 'SCH-01',
        name: 'Academic Full',
        category: 'INSTITUTIONAL',
        discountType: 'PERCENTAGE',
        discountPercentage: 100,
        fixedAmount: 0,
        appliesToTuition: true,
        appliesToMisc: true,
        isActive: true
      };
      const mockFee: FeeCatalog = {
        id: 2,
        categoryId: 1,
        code: 'MISC-01',
        name: 'Miscellaneous Fee',
        defaultAmount: 150,
      };

      component.confirmDeleteScholarship(mockScholarship);
      component.confirmDeleteFee(mockFee);

      expect(confirmations[0].acceptLabel).toBe('Yes');
      expect(confirmations[1].acceptLabel).toBe('Yes');
      expect(confirmations[1].rejectLabel).toBe('No');
    });
  });
});
