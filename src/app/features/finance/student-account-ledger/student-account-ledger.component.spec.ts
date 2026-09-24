import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { StudentAccountLedgerComponent } from './student-account-ledger.component';
import { FinancialApiService } from '../../../core/service/financial/financial-api.service';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { TermService } from '../../../core/services/institution.service';
import { Term } from '../../../core/models/institution.model';
import { StudentProfileResponse, StudentSearchResultDto, StudentEnrollmentResponse } from '../../../core/models/enrollment.model';
import { StudentAccountLedgerDto, StudentAssessmentInvoiceDto } from '../../../core/models/financial.model';

describe('StudentAccountLedgerComponent', () => {
  let component: StudentAccountLedgerComponent;
  let fixture: ComponentFixture<StudentAccountLedgerComponent>;
  let mockFinancialApi: any;
  let mockAuthService: any;
  let mockEnrollmentApi: any;
  let mockTermService: any;

  const mockTerm: Term = {
    id: 1,
    academicYearId: 1,
    academicYearCode: 'AY 2026-2027',
    termType: 'FIRST_SEMESTER' as any,
    startDate: '2026-08-01',
    endDate: '2026-12-20',
    isActive: true
  };

  const mockStudentProfile: StudentProfileResponse = {
    id: 10,
    studentNumber: '2026-00010',
    userId: 99,
    username: 'student_maria',
    email: 'maria@chmsu.edu.ph',
    programId: 1,
    programCode: 'BSIT',
    programName: 'BS Information Technology',
    curriculumId: 1,
    curriculumCode: 'BSIT-2026',
    classification: 'REGULAR',
    yearLevel: 2,
    enrollmentStatus: 'REGULAR',
    isGraduating: false,
    totalUnitsEarned: 42,
    financialClearance: 'CLEARED',
    departmentalClearance: 'CLEARED'
  };

  const mockStudentSearch: StudentSearchResultDto = {
    id: 20,
    studentIdNumber: '2026-00020',
    fullName: 'Juan Dela Cruz',
    programCode: 'BSIT',
    yearLevel: 1,
    academicStatus: 'REGULAR'
  };

  const mockLedgerEntries: StudentAccountLedgerDto[] = [
    {
      id: 1,
      transactionNumber: 'TX-001',
      studentProfileId: 10,
      termId: 1,
      transactionType: 'CHARGE',
      transactionDate: '2026-08-15T08:00:00Z',
      description: 'Tuition and TOSF Assessment',
      debitAmount: 5000,
      creditAmount: 0,
      runningBalance: 5000,
      referenceNumber: 'INV-001'
    },
    {
      id: 2,
      transactionNumber: 'TX-002',
      studentProfileId: 10,
      termId: 1,
      transactionType: 'FHE_SUBSIDY',
      transactionDate: '2026-08-15T08:05:00Z',
      description: 'RA 10931 FHE Government Subsidy',
      debitAmount: 0,
      creditAmount: 5000,
      runningBalance: 0,
      referenceNumber: 'SUB-001'
    }
  ];

  const mockInvoice: StudentAssessmentInvoiceDto = {
    id: 1,
    invoiceNumber: 'INV-001',
    studentEnrollmentId: 1,
    studentProfileId: 10,
    studentNumber: '2026-00010',
    studentName: 'Maria Santos',
    termId: 1,
    termName: 'AY 2026-2027 1st Sem',
    totalTuitionFee: 3500,
    totalLabFee: 500,
    totalMiscFee: 1000,
    totalGrossAssessment: 5000,
    fheSubsidyAmount: 5000,
    scholarshipDiscountAmount: 0,
    netAssessedAmount: 0,
    totalPaidAmount: 0,
    outstandingBalance: 0,
    status: 'FHE_COVERED',
    fheEligible: true
  };

  const mockEnrollmentResponse: StudentEnrollmentResponse = {
    enrollmentId: 101,
    studentId: 20,
    studentNumber: '2026-00020',
    termId: 1,
    termName: 'AY 2026-2027 1st Sem',
    enrollmentDate: '2026-08-10',
    status: 'ENLISTED',
    totalCreditUnits: 21,
    isOverloadApproved: false,
    items: []
  };

  const configureTestBed = async (isStudent: boolean) => {
    mockFinancialApi = {
      getStudentLedgerHistory: vi.fn().mockReturnValue(of(mockLedgerEntries)),
      getInvoiceByStudentAndTerm: vi.fn().mockReturnValue(of(mockInvoice)),
      assessEnrollment: vi.fn().mockReturnValue(of(mockInvoice))
    };

    mockAuthService = {
      currentUser: signal({
        id: isStudent ? 99 : 1,
        username: isStudent ? 'student_maria' : 'admin_user',
        roles: isStudent ? ['STUDENT'] : ['ADMIN', 'ACCOUNTANT', 'REGISTRAR']
      }),
      hasRole: vi.fn().mockImplementation((role: string) => isStudent ? role === 'STUDENT' : role !== 'STUDENT'),
      hasAnyRole: vi.fn().mockImplementation((roles: string[]) => isStudent ? roles.includes('STUDENT') : roles.some(r => r !== 'STUDENT')),
      getUserId: vi.fn().mockReturnValue(isStudent ? 99 : 1)
    };

    mockEnrollmentApi = {
      getCurrentStudentProfile: vi.fn().mockReturnValue(of(mockStudentProfile)),
      searchStudents: vi.fn().mockReturnValue(of([mockStudentSearch])),
      getEnrollment: vi.fn().mockReturnValue(of(mockEnrollmentResponse))
    };

    mockTermService = {
      getAll: vi.fn().mockReturnValue(of([mockTerm])),
      getActive: vi.fn().mockReturnValue(of(mockTerm))
    };

    await TestBed.configureTestingModule({
      imports: [StudentAccountLedgerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: FinancialApiService, useValue: mockFinancialApi },
        { provide: AuthService, useValue: mockAuthService },
        { provide: EnrollmentApiService, useValue: mockEnrollmentApi },
        { provide: TermService, useValue: mockTermService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentAccountLedgerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('When authenticated as ROLE_STUDENT', () => {
    beforeEach(async () => {
      await configureTestBed(true);
    });

    it('should identify student role and auto-populate student profile and ledger', () => {
      expect(component.isStudentRole()).toBe(true);
      expect(mockEnrollmentApi.getCurrentStudentProfile).toHaveBeenCalled();
      expect(component.currentStudentProfile()).toEqual(mockStudentProfile);
      expect(component.searchStudentId()).toBe(10);
      expect(mockFinancialApi.getStudentLedgerHistory).toHaveBeenCalledWith(10);
      expect(component.ledgerEntries().length).toBe(2);
      expect(component.currentBalance()).toBe(0);
    });

    it('should strictly lock account and prevent student role from switching profile', () => {
      // Attempt to switch student profile ID
      component.onStudentSelect(999);
      // searchStudentId remains locked to student profile ID 10
      expect(component.searchStudentId()).toBe(10);
      expect(component.selectedStudent()).toBeNull();
    });

    it('should calculate debits, credits, and balance accurately', () => {
      expect(component.totalDebits()).toBe(5000);
      expect(component.totalCredits()).toBe(5000);
      expect(component.currentBalance()).toBe(0);
    });
  });

  describe('When authenticated as Staff (CASHIER / ADMIN / ACCOUNTANT)', () => {
    beforeEach(async () => {
      await configureTestBed(false);
    });

    it('should identify staff role and preload student search list', () => {
      expect(component.isStudentRole()).toBe(false);
      expect(mockEnrollmentApi.searchStudents).toHaveBeenCalledWith('');
      expect(component.searchedStudents().length).toBe(1);
    });

    it('should allow staff to select a student and load ledger and invoice', () => {
      component.onStudentSelect(20);
      expect(component.searchStudentId()).toBe(20);
      expect(component.selectedStudent()?.fullName).toBe('Juan Dela Cruz');
      expect(mockFinancialApi.getStudentLedgerHistory).toHaveBeenCalledWith(20);
      expect(mockFinancialApi.getInvoiceByStudentAndTerm).toHaveBeenCalledWith(20, 1);
    });

    it('should resolve enrollment when a student is selected for tuition assessment', () => {
      component.onAssessStudentSelect(20);
      expect(component.assessStudentId()).toBe(20);
      expect(component.assessSelectedStudent()?.fullName).toBe('Juan Dela Cruz');
      expect(mockEnrollmentApi.getEnrollment).toHaveBeenCalledWith(20, 1);
      expect(component.assessEnrollmentId()).toBe(101);
      expect(component.assessEnrollment()?.status).toBe('ENLISTED');
    });

    it('should assess tuition fee for resolved enrollment and update invoice', () => {
      component.onAssessStudentSelect(20);
      component.assessStudentEnrollment();
      expect(mockFinancialApi.assessEnrollment).toHaveBeenCalledWith(101);
      expect(component.activeInvoice()).toEqual(mockInvoice);
      expect(component.assessEnrollment()?.status).toBe('ASSESSED');
    });

    it('should allow toggling manual enrollment ID entry mode', () => {
      expect(component.manualEnrollmentMode()).toBe(false);
      component.toggleManualEnrollmentMode();
      expect(component.manualEnrollmentMode()).toBe(true);
      component.toggleManualEnrollmentMode();
      expect(component.manualEnrollmentMode()).toBe(false);
    });

    it('should query student API when filter query has 2 or more characters', () => {
      component.onStudentFilter({ filter: 'Cruz' });
      expect(mockEnrollmentApi.searchStudents).toHaveBeenCalledWith('Cruz');
    });
  });
});
