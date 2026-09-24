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
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'FHE_COVERED' | 'CANCELLED' | string;
  fheEligible: boolean;
}

export interface StudentAccountLedgerDto {
  id: number;
  transactionNumber: string;
  studentProfileId: number;
  termId: number;
  assessmentInvoiceId?: number | null;
  transactionType: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT' | 'FHE_SUBSIDY' | 'DISCOUNT' | string;
  transactionDate: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  referenceNumber?: string | null;
  fundClusterCode?: string | null;
}

export interface ProcessPaymentRequest {
  studentProfileId: number;
  assessmentInvoiceId?: number | null;
  amountTendered: number;
  amountPaid: number;
  paymentMethod: 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER' | 'CHECK' | 'LINKBIZ' | string;
  referenceNumber?: string | null;
  remarks?: string | null;
  checkNumber?: string | null;
  draweeBank?: string | null;
  fundClusterCode?: string | null;
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
  status: 'VALID' | 'VOIDED' | string;
  cashierUserId: number;
  cashierUsername: string;
  issuedAt: string;
  checkNumber?: string | null;
  draweeBank?: string | null;
  fundClusterCode?: string | null;
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

export interface OrBookletDto {
  id: number;
  bookletCode: string;
  startOrNumber: string;
  endOrNumber: string;
  currentOrNumber: string;
  assignedCashierId: number;
  assignedCashierUsername: string;
  status: string;
  createdAt: string;
}

export interface CreateOrBookletRequest {
  bookletCode: string;
  startOrNumber: string;
  endOrNumber: string;
  assignedCashierId: number;
}

export interface VoidOfficialReceiptRequest {
  orNumber: string;
  bookletId: number;
  voidReason: string;
}

export interface VoidedOfficialReceiptDto {
  id: number;
  orNumber: string;
  bookletId: number;
  voidedByCashierId: number;
  voidedByCashierUsername: string;
  voidReason: string;
  voidedAt: string;
}

export interface EodRcdFundClusterSummaryDto {
  fundClusterCode: string;
  fundClusterName: string;
  totalCollected: number;
  receiptCount: number;
}

export interface EodRcdReportDto {
  cashierUserId: number;
  cashierUsername: string;
  reportDate: string;
  totalCollections: number;
  totalReceiptsIssued: number;
  fundClusterSummaries: EodRcdFundClusterSummaryDto[];
  receipts: CashierReceiptDto[];
}

export interface DisallowClaimItemRequest {
  reason: string;
}

export interface UnifastForm2BeneficiaryDto {
  seqNo: number;
  studentNumber: string;
  lrn: string;
  lastName: string;
  firstName: string;
  middleName: string;
  extName: string;
  sex: string;
  programCode: string;
  programName: string;
  yearLevel: number;
  academicUnits: number;
  tuitionFee: number;
  athleticFee: number;
  computerFee: number;
  culturalFee: number;
  developmentFee: number;
  admissionEntranceFee: number;
  guidanceFee: number;
  handbookFee: number;
  laboratoryFee: number;
  libraryFee: number;
  medicalDentalFee: number;
  registrationFee: number;
  schoolIdFee: number;
  totalTosf: number;
  totalFheAmount: number;
  remarks: string;
}

