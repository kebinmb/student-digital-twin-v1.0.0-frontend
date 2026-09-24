import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { CashierTerminalComponent } from './cashier-terminal.component';
import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import { TermService } from '../../../core/services/institution.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { OrBookletDto, EodRcdReportDto } from '../../../core/models/financial.model';
import { Term } from '../../../core/models/institution.model';
import { StudentSearchResultDto } from '../../../core/models/enrollment.model';

describe('CashierTerminalComponent', () => {
  let component: CashierTerminalComponent;
  let fixture: ComponentFixture<CashierTerminalComponent>;
  let mockFinancialApi: any;
  let mockTermService: any;
  let mockEnrollmentApi: any;

  const mockTerm: Term = {
    id: 1,
    academicYearId: 1,
    academicYearCode: 'AY 2026-2027',
    termType: 'FIRST_SEMESTER' as any,
    startDate: '2026-08-01',
    endDate: '2026-12-20',
    isActive: true
  };

  const mockStudent: StudentSearchResultDto = {
    id: 42,
    studentIdNumber: '2026-00042',
    fullName: 'Maria Santos',
    programCode: 'BSIT',
    yearLevel: 2,
    academicStatus: 'REGULAR'
  };

  const mockBooklet: OrBookletDto = {
    id: 1,
    bookletCode: 'BKL-2026-001',
    startOrNumber: 'OR-2026-00001',
    endOrNumber: 'OR-2026-00050',
    currentOrNumber: 'OR-2026-00001',
    assignedCashierId: 10,
    assignedCashierUsername: 'cashier_bob',
    status: 'ACTIVE',
    createdAt: '2026-09-24T00:00:00Z'
  };

  const mockEodReport: EodRcdReportDto = {
    cashierUserId: 10,
    cashierUsername: 'cashier_bob',
    reportDate: '2026-09-24',
    totalCollections: 1500,
    totalReceiptsIssued: 2,
    fundClusterSummaries: [
      { fundClusterCode: 'FUND_164', fundClusterName: 'Special Trust Fund', totalCollected: 1000, receiptCount: 1 },
      { fundClusterCode: 'FUND_101', fundClusterName: 'Regular Agency Fund', totalCollected: 500, receiptCount: 1 }
    ],
    receipts: []
  };

  beforeEach(async () => {
    mockFinancialApi = {
      getActiveBooklet: vi.fn().mockReturnValue(of(mockBooklet)),
      assignOrBooklet: vi.fn().mockReturnValue(of(mockBooklet)),
      voidOfficialReceipt: vi.fn().mockReturnValue(of({})),
      getEodRcdReport: vi.fn().mockReturnValue(of(mockEodReport)),
      processPayment: vi.fn().mockReturnValue(of({})),
      getInvoiceByStudentAndTerm: vi.fn().mockReturnValue(of({ outstandingBalance: 1500, totalGrossAssessment: 1500 })),
      getReceiptsByStudentProfile: vi.fn().mockReturnValue(of([])),
      getReceiptByOrNumber: vi.fn().mockReturnValue(of(null))
    };

    mockTermService = {
      getAll: vi.fn().mockReturnValue(of([mockTerm])),
      getActive: vi.fn().mockReturnValue(of(mockTerm))
    };

    mockEnrollmentApi = {
      searchStudents: vi.fn().mockReturnValue(of([mockStudent]))
    };

    await TestBed.configureTestingModule({
      imports: [CashierTerminalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        { provide: FinancialApiService, useValue: mockFinancialApi },
        { provide: TermService, useValue: mockTermService },
        { provide: EnrollmentApiService, useValue: mockEnrollmentApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CashierTerminalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load active accountable booklet', () => {
    expect(component).toBeTruthy();
    expect(component.activeBooklet()).toEqual(mockBooklet);
    expect(component.fundClusterCode()).toBe('FUND_164');
  });

  it('should calculate change amount correctly', () => {
    component.amountTendered.set(2500);
    component.amountPaid.set(2000);
    expect(component.changeAmount()).toBe(500);
  });

  it('should open assign booklet modal', () => {
    component.openAssignBookletModal();
    expect(component.showAssignBookletModal()).toBe(true);
  });

  it('should open void receipt modal', () => {
    component.openVoidReceiptModal();
    expect(component.showVoidReceiptModal()).toBe(true);
  });

  it('should load active academic term and available terms by default', () => {
    expect(mockTermService.getAll).toHaveBeenCalled();
    expect(mockTermService.getActive).toHaveBeenCalled();
    expect(component.availableTerms().length).toBe(1);
    expect(component.selectedTermId()).toBe(1);
  });

  it('should search students and select student to lookup invoice', () => {
    expect(mockEnrollmentApi.searchStudents).toHaveBeenCalledWith('');
    expect(component.searchedStudents().length).toBe(1);

    component.onStudentSelect(42);
    expect(component.searchStudentId()).toBe(42);
    expect(component.selectedStudent()?.fullName).toBe('Maria Santos');
    expect(mockFinancialApi.getInvoiceByStudentAndTerm).toHaveBeenCalledWith(42, 1);
  });
});
