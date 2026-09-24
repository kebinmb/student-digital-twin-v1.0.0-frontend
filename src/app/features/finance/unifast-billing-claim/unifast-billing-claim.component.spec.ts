import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { UnifastBillingClaimComponent } from './unifast-billing-claim.component';
import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import { TermService, CampusService } from '../../../core/services/institution.service';
import { Term, Campus } from '../../../core/models/institution.model';
import { UnifastFheClaimDto, UnifastClaimItemDto } from '../../../core/models/financial.model';

describe('UnifastBillingClaimComponent', () => {
  let component: UnifastBillingClaimComponent;
  let fixture: ComponentFixture<UnifastBillingClaimComponent>;
  let mockFinancialApi: any;
  let mockTermService: any;
  let mockCampusService: any;

  const mockTerm: Term = {
    id: 1,
    academicYearId: 1,
    academicYearCode: 'AY 2026-2027',
    termType: 'FIRST_SEMESTER' as any,
    startDate: '2026-08-01',
    endDate: '2026-12-20',
    isActive: true
  };

  const mockCampus: Campus = {
    id: 1,
    name: 'Talisay Main Campus',
    code: 'MAIN',
    address: 'Talisay City',
    region: 'Region VI',
    isMain: true,
    isActive: true
  };

  const mockClaimItem: UnifastClaimItemDto = {
    id: 101,
    claimBatchId: 1,
    studentProfileId: 50,
    studentNumber: '2024-00123',
    studentName: 'Juan Dela Cruz',
    programCode: 'BSIT',
    enrolledUnits: 21,
    tuitionAmount: 5250,
    miscAmount: 1850,
    labAmount: 600,
    totalClaimedAmount: 7700,
    verificationStatus: 'APPROVED'
  };

  const mockBatch: UnifastFheClaimDto = {
    id: 1,
    claimBatchNumber: 'FHE-2026-T1-0001',
    termId: 1,
    termName: 'AY 2026-2027 1st Sem',
    campusId: 1,
    campusName: 'Main Campus',
    totalBeneficiaries: 1,
    totalTuitionClaimed: 5250,
    totalTosfClaimed: 2450,
    totalClaimAmount: 7700,
    status: 'SUBMITTED',
    createdByUsername: 'unifast_focal',
    createdAt: '2026-09-24T00:00:00Z',
    items: [mockClaimItem]
  };

  beforeEach(async () => {
    mockFinancialApi = {
      getClaimsByTerm: vi.fn().mockReturnValue(of([mockBatch])),
      generateUnifastClaimBatch: vi.fn().mockReturnValue(of(mockBatch)),
      getClaimBatchDetails: vi.fn().mockReturnValue(of(mockBatch)),
      exportForm2Csv: vi.fn().mockReturnValue(of(new Blob(['statutory,csv'], { type: 'text/csv' }))),
      disallowClaimItem: vi.fn().mockReturnValue(of({ ...mockClaimItem, verificationStatus: 'DISQUALIFIED' }))
    };

    mockTermService = {
      getAll: vi.fn().mockReturnValue(of([mockTerm])),
      getActive: vi.fn().mockReturnValue(of(mockTerm))
    };

    mockCampusService = {
      getActive: vi.fn().mockReturnValue(of([mockCampus]))
    };

    await TestBed.configureTestingModule({
      imports: [UnifastBillingClaimComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: FinancialApiService, useValue: mockFinancialApi },
        { provide: TermService, useValue: mockTermService },
        { provide: CampusService, useValue: mockCampusService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnifastBillingClaimComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load claim batches on init', () => {
    expect(component).toBeTruthy();
    expect(mockFinancialApi.getClaimsByTerm).toHaveBeenCalledWith(1);
    expect(component.claimBatches().length).toBe(1);
    expect(component.claimBatches()[0].claimBatchNumber).toBe('FHE-2026-T1-0001');
  });

  it('should view batch details and display detail modal', () => {
    component.viewBatchDetails(1);
    expect(mockFinancialApi.getClaimBatchDetails).toHaveBeenCalledWith(1);
    expect(component.selectedBatch()).toEqual(mockBatch);
    expect(component.showDetailModal()).toBe(true);
  });

  it('should trigger statutory Form 2 export download', () => {
    const mockBlob = new Blob(['sample,form2,data'], { type: 'text/csv' });
    mockFinancialApi.exportForm2Csv.mockReturnValue(of(mockBlob));

    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:http://localhost/test-uuid');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    component.exportStatutoryForm2(1);

    expect(mockFinancialApi.exportForm2Csv).toHaveBeenCalledWith(1);
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/test-uuid');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('should open disallow modal for a claim item', () => {
    component.openDisallowModal(mockClaimItem);
    expect(component.disallowingItem()).toEqual(mockClaimItem);
    expect(component.showDisallowModal()).toBe(true);
    expect(component.disallowReason()).toBe('');
  });

  it('should submit disallowance and trigger updates', () => {
    component.openDisallowModal(mockClaimItem);
    component.disallowReason.set('Exceeded Maximum Residency Rule (MRR) per RA 10931 Sec 6.');
    component.selectedBatch.set(mockBatch);

    component.submitDisallowItem();

    expect(mockFinancialApi.disallowClaimItem).toHaveBeenCalledWith(
      101,
      { reason: 'Exceeded Maximum Residency Rule (MRR) per RA 10931 Sec 6.' }
    );
    expect(component.showDisallowModal()).toBe(false);
    expect(mockFinancialApi.getClaimBatchDetails).toHaveBeenCalledWith(1);
  });

  it('should return correct status severity', () => {
    expect(component.getStatusSeverity('APPROVED')).toBe('success');
    expect(component.getStatusSeverity('DISBURSED')).toBe('success');
    expect(component.getStatusSeverity('VERIFIED')).toBe('success');
    expect(component.getStatusSeverity('SUBMITTED')).toBe('info');
    expect(component.getStatusSeverity('DRAFT')).toBe('warn');
    expect(component.getStatusSeverity('DISQUALIFIED')).toBe('danger');
    expect(component.getStatusSeverity('UNKNOWN')).toBe('secondary');
  });
});
