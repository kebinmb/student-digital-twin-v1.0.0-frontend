// File: src/app/core/service/financial/financial-api.service.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SliceResponse } from '../../models/institution.model';
import {
  FeeTemplateDto,
  CreateFeeTemplateRequest,
  StudentAssessmentInvoiceDto,
  StudentAccountLedgerDto,
  ProcessPaymentRequest,
  CashierReceiptDto,
  UnifastFheClaimDto,
  CreateUnifastClaimRequest,
  OrBookletDto,
  CreateOrBookletRequest,
  VoidOfficialReceiptRequest,
  VoidedOfficialReceiptDto,
  EodRcdReportDto,
  DisallowClaimItemRequest,
  UnifastClaimItemDto
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

  adjustAssessmentForAddDrop(enrollmentId: number): Observable<StudentAssessmentInvoiceDto> {
    return this.http.post<StudentAssessmentInvoiceDto>(`${this.baseUrl}/assess/${enrollmentId}/adjust`, {});
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

  getReceiptsByStudentProfileSlice(
    studentProfileId: number,
    page = 0,
    size = 20,
    sortBy?: string,
    sortDir = 'DESC'
  ): Observable<SliceResponse<CashierReceiptDto>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sortDir', sortDir);
    if (sortBy) params = params.set('sortBy', sortBy);
    return this.http.get<SliceResponse<CashierReceiptDto>>(
      `${this.baseUrl}/receipts/student/${studentProfileId}/slice`,
      { params }
    );
  }

  assignOrBooklet(request: CreateOrBookletRequest): Observable<OrBookletDto> {
    return this.http.post<OrBookletDto>(`${this.baseUrl}/or-booklets`, request);
  }

  voidOfficialReceipt(request: VoidOfficialReceiptRequest): Observable<VoidedOfficialReceiptDto> {
    return this.http.post<VoidedOfficialReceiptDto>(`${this.baseUrl}/or-booklets/void`, request);
  }

  getActiveBooklet(): Observable<OrBookletDto> {
    return this.http.get<OrBookletDto>(`${this.baseUrl}/or-booklets/active`);
  }

  getEodRcdReport(date?: string): Observable<EodRcdReportDto> {
    const params: Record<string, string> = {};
    if (date) params['date'] = date;
    return this.http.get<EodRcdReportDto>(`${this.baseUrl}/cashier/eod-rcd`, { params });
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

  disallowClaimItem(itemId: number, request: DisallowClaimItemRequest): Observable<UnifastClaimItemDto> {
    return this.http.put<UnifastClaimItemDto>(`${this.baseUrl}/unifast/claims/items/${itemId}/disallow`, request);
  }

  exportForm2Csv(claimBatchId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/unifast/claims/${claimBatchId}/form2/export`, {
      responseType: 'blob'
    });
  }
}

