// File: src/app/core/models/financial.model.ts

export interface FeeTemplateDto {
  id: number;
  name: string;
  academicYearId: number;
  campusId?: number | null;
  tuitionPerUnit: number;
  labFeePerUnit: number;
  miscellaneousFlatFee: number;
  athleticFlatFee: number;
  active: boolean;
}

export interface CreateFeeTemplateRequest {
  name: string;
  academicYearId: number;
  campusId?: number | null;
  tuitionPerUnit: number;
  labFeePerUnit: number;
  miscellaneousFlatFee: number;
  athleticFlatFee: number;
}

export interface StudentAssessmentInvoiceDto {
  id: number;
  invoiceNumber: string;
  studentEnrollmentId: number;
  studentProfileId: number;
  studentNumber: string;
  studentName: string;
  termId: number;
  termName: string;
  totalTuitionFee: number;
  totalLabFee: number;
  totalMiscFee: number;
  totalGrossAssessment: number;
  fheSubsidyAmount: number;
  scholarshipDiscountAmount: number;
  netAssessedAmount: number;
  totalPaidAmount: number;
  outstandingBalance: number;
  status: string; // "PENDING" | "PARTIALLY_PAID" | "FULLY_PAID" | "FHE_COVERED"
  fheEligible: boolean;
}

export interface StudentAccountLedgerDto {
  id: number;
  transactionNumber: string;
  studentProfileId: number;
  termId: number;
  assessmentInvoiceId?: number | null;
  transactionType: string; // "GROSS_ASSESSMENT" | "FHE_SUBSIDY_CREDIT" | "SCHOLARSHIP_CREDIT" | "CASHIER_PAYMENT" | "ADJUSTMENT_DEBIT" | "ADJUSTMENT_CREDIT"
  transactionDate: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  referenceNumber?: string | null;
}

export interface ProcessPaymentRequest {
  studentProfileId: number;
  assessmentInvoiceId?: number | null;
  amountTendered: number;
  amountPaid: number;
  paymentMethod: string; // "CASH" | "GCASH" | "MAYA" | "BANK_TRANSFER" | "CHECK"
  referenceNumber?: string | null;
  remarks?: string | null;
}

export interface CashierReceiptDto {
  id: number;
  orNumber: string;
  studentProfileId: number;
  studentNumber: string;
  studentName: string;
  assessmentInvoiceId?: number | null;
  amountTendered: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  remarks?: string | null;
  status: string; // "ISSUED" | "VOIDED"
  cashierUserId: number;
  cashierUsername: string;
  issuedAt: string;
}

export interface UnifastClaimItemDto {
  id: number;
  claimBatchId: number;
  studentProfileId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  enrolledUnits: number;
  tuitionAmount: number;
  miscAmount: number;
  labAmount: number;
  totalClaimedAmount: number;
  verificationStatus: string; // "PENDING" | "VERIFIED" | "DISQUALIFIED"
}

export interface UnifastFheClaimDto {
  id: number;
  claimBatchNumber: string;
  termId: number;
  termName: string;
  campusId: number;
  campusName: string;
  totalBeneficiaries: number;
  totalTuitionClaimed: number;
  totalTosfClaimed: number;
  totalClaimAmount: number;
  status: string; // "DRAFT" | "SUBMITTED" | "APPROVED" | "DISBURSED"
  createdByUsername: string;
  createdAt: string;
  items: UnifastClaimItemDto[];
}

export interface CreateUnifastClaimRequest {
  termId: number;
  campusId: number;
}
