// File: src/app/core/models/student-equity.model.ts

export type DisabilityType =
  | 'VISUAL'
  | 'HEARING'
  | 'MOBILITY'
  | 'NEURODEVELOPMENTAL'
  | 'PSYCHOSOCIAL'
  | 'CHRONIC_ILLNESS'
  | 'OTHER';

export type HouseholdIncomeBracket =
  | 'POOR_BELOW_10K'
  | 'LOW_INCOME_10K_TO_20K'
  | 'LOWER_MIDDLE_20K_TO_40K'
  | 'MIDDLE_40K_TO_70K'
  | 'UPPER_70K_PLUS';

export type EquityVerificationStatus =
  | 'SELF_DECLARED'
  | 'DOCUMENTED'
  | 'VERIFIED'
  | 'REJECTED';

export interface StudentEquityProfileDto {
  id: number;
  studentProfileId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  programName: string;

  // Statutory Indicators
  is4psBeneficiary: boolean;
  household4psIdNumber?: string;
  isListahananNhts: boolean;
  unifastTesAwardee: boolean;
  unifastTesAwardNumber?: string;

  isIndigenousPeople: boolean;
  ipEthnicGroup?: string;
  ncipCertificateNumber?: string;

  isPersonWithDisability: boolean;
  pwdIdNumber?: string;
  disabilityType?: DisabilityType;

  isSoloParentOrDependent: boolean;
  soloParentIdNumber?: string;

  isFirstGenerationCollege: boolean;
  isGidaResident: boolean;
  monthlyHouseholdIncomeBracket: HouseholdIncomeBracket;

  // Governance & Audit
  verificationStatus: EquityVerificationStatus;
  verifiedByUserId?: number;
  verifiedByUsername?: string;
  verifiedAt?: string;
  verificationRemarks?: string;

  createdAt: string;
  updatedAt: string;
}

export interface UpdateStudentEquityProfileRequest {
  is4psBeneficiary: boolean;
  household4psIdNumber?: string;
  isListahananNhts: boolean;
  unifastTesAwardee: boolean;
  unifastTesAwardNumber?: string;

  isIndigenousPeople: boolean;
  ipEthnicGroup?: string;
  ncipCertificateNumber?: string;

  isPersonWithDisability: boolean;
  pwdIdNumber?: string;
  disabilityType?: DisabilityType;

  isSoloParentOrDependent: boolean;
  soloParentIdNumber?: string;

  isFirstGenerationCollege: boolean;
  isGidaResident: boolean;
  monthlyHouseholdIncomeBracket: HouseholdIncomeBracket;
}

export interface VerifyEquityProfileRequest {
  verificationStatus: EquityVerificationStatus;
  verificationRemarks?: string;
}

export interface EquityStatisticsSummaryDto {
  totalProfilesCount: number;
  count4psBeneficiaries: number;
  countListahananNhts: number;
  countUnifastTesAwardees: number;
  countIndigenousPeoples: number;
  countPersonsWithDisabilities: number;
  countSoloParents: number;
  countFirstGenerationCollege: number;
  countGidaResidents: number;

  countSelfDeclared: number;
  countDocumented: number;
  countVerified: number;
  countRejected: number;
}
