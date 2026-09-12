// File: src/app/core/service/financial/financial-api.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  FeeTemplateDto,
  CreateFeeTemplateRequest,
  StudentAssessmentInvoiceDto,
  StudentAccountLedgerDto,
  ProcessPaymentRequest,
  CashierReceiptDto,
  UnifastFheClaimDto,
  CreateUnifastClaimRequest
} from '../../models/financial.model';

@Injectable({
  providedIn: 'root'
})
export class FinancialApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/finance`;

  createFeeTemplate(request: CreateFeeTemplateRequest): Observable<FeeTemplateDto> {
    return this.http.post<FeeTemplateDto>(`${this.baseUrl}/fee-templates`, request);
  }

  getActiveFeeTemplate(academicYearId?: number): Observable<FeeTemplateDto> {
    const params: Record<string, string> = {};
    if (academicYearId) {
      params['academicYearId'] = String(academicYearId);
    }
    return this.http.get<FeeTemplateDto>(`${this.baseUrl}/fee-templates/active`, { params });
  }

  assessEnrollment(enrollmentId: number): Observable<StudentAssessmentInvoiceDto> {
    return this.http.post<StudentAssessmentInvoiceDto>(`${this.baseUrl}/assess/${enrollmentId}`, {});
  }

  getInvoiceByEnrollmentId(enrollmentId: number): Observable<StudentAssessmentInvoiceDto> {
    return this.http.get<StudentAssessmentInvoiceDto>(`${this.baseUrl}/invoices/enrollment/${enrollmentId}`);
  }

  getInvoiceByStudentAndTerm(studentProfileId: number, termId: number): Observable<StudentAssessmentInvoiceDto> {
    return this.http.get<StudentAssessmentInvoiceDto>(`${this.baseUrl}/invoices/student/${studentProfileId}/term/${termId}`);
  }

  getStudentLedgerHistory(studentProfileId: number): Observable<StudentAccountLedgerDto[]> {
    return this.http.get<StudentAccountLedgerDto[]>(`${this.baseUrl}/ledgers/student/${studentProfileId}`);
  }

  processPayment(request: ProcessPaymentRequest): Observable<CashierReceiptDto> {
    return this.http.post<CashierReceiptDto>(`${this.baseUrl}/payments`, request);
  }

  getReceiptByOrNumber(orNumber: string): Observable<CashierReceiptDto> {
    return this.http.get<CashierReceiptDto>(`${this.baseUrl}/receipts/${orNumber}`);
  }

  getReceiptsByStudentProfile(studentProfileId: number): Observable<CashierReceiptDto[]> {
    return this.http.get<CashierReceiptDto[]>(`${this.baseUrl}/receipts/student/${studentProfileId}`);
  }

  generateUnifastClaimBatch(request: CreateUnifastClaimRequest): Observable<UnifastFheClaimDto> {
    return this.http.post<UnifastFheClaimDto>(`${this.baseUrl}/unifast/claims`, request);
  }

  getClaimsByTerm(termId: number): Observable<UnifastFheClaimDto[]> {
    return this.http.get<UnifastFheClaimDto[]>(`${this.baseUrl}/unifast/claims/term/${termId}`);
  }

  getClaimBatchDetails(claimBatchId: number): Observable<UnifastFheClaimDto> {
    return this.http.get<UnifastFheClaimDto>(`${this.baseUrl}/unifast/claims/${claimBatchId}`);
  }
}
