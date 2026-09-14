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
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED';

export interface StudentEquityProfileDto {
  id: number;
  studentProfileId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  programName: string;

  // 1. Person with Disability (PWD RA 7277 / RA 9442 / RA 10754)
  isPersonWithDisability: boolean;
  pwdIdNumber?: string;
  disabilityType?: DisabilityType;

  // 2. Solo Parent Status (RA 8972 / RA 11861 - Explicit Separation)
  isSoloParent: boolean;
  isRaisedBySoloParent: boolean;
  soloParentIdNumber?: string;

  // 3. 4Ps Beneficiary (RA 11310) & UniFAST TES
  is4psBeneficiary: boolean;
  household4psIdNumber?: string;
  isListahananNhts: boolean;
  unifastTesAwardee: boolean;
  unifastTesAwardNumber?: string;

  // 4. Indigenous Peoples (RA 8371 IPRA)
  isIndigenousPeople: boolean;
  ipEthnicGroup?: string;
  ncipCertificateNumber?: string;

  // 5. Orphan Status (DSWD Case Study / Cert)
  isOrphan: boolean;

  // 6. Geographically Isolated and Disadvantaged Area (DOH AO 2020-0023)
  isGidaResident: boolean;
  gidaBarangayResidence?: string;

  // 7. Subsistence Farmer or Fisherfolk Family (RA 8435 / RA 11321)
  isFarmerFisherfolk: boolean;
  rsbsaRegistrationNumber?: string;

  // 8. Rebel Returnees / E-CLIP (EO 70 s. 2018)
  isRebelReturneeFamily: boolean;
  certificateOfSurrenderNumber?: string;

  // 9. Bottom 40% Household Income Bracket (RA 10931 Sec 7/9)
  isBottom40IncomeBracket: boolean;
  monthlyHouseholdIncomeBracket: HouseholdIncomeBracket;

  // 10. First Generation College Student
  isFirstGenerationCollege: boolean;

  // 11. Verification & Audit Metadata
  verificationStatus: EquityVerificationStatus;
  verifiedByUserId?: number;
  verifiedByUsername?: string;
  verifiedAt?: string;
  verificationRemarks?: string;

  createdAt: string;
  updatedAt: string;
}

export interface UpdateStudentEquityProfileRequest {
  // 1. Person with Disability
  isPersonWithDisability: boolean;
  pwdIdNumber?: string;
  disabilityType?: DisabilityType;

  // 2. Solo Parent Status
  isSoloParent: boolean;
  isRaisedBySoloParent: boolean;
  soloParentIdNumber?: string;

  // 3. 4Ps Beneficiary & UniFAST TES
  is4psBeneficiary: boolean;
  household4psIdNumber?: string;
  isListahananNhts: boolean;
  unifastTesAwardee: boolean;
  unifastTesAwardNumber?: string;

  // 4. Indigenous Peoples
  isIndigenousPeople: boolean;
  ipEthnicGroup?: string;
  ncipCertificateNumber?: string;

  // 5. Orphan Status
  isOrphan: boolean;

  // 6. GIDA Resident
  isGidaResident: boolean;
  gidaBarangayResidence?: string;

  // 7. Subsistence Farmer or Fisherfolk Family
  isFarmerFisherfolk: boolean;
  rsbsaRegistrationNumber?: string;

  // 8. Rebel Returnees / E-CLIP
  isRebelReturneeFamily: boolean;
  certificateOfSurrenderNumber?: string;

  // 9. Bottom 40% Household Income Bracket
  isBottom40IncomeBracket: boolean;
  monthlyHouseholdIncomeBracket: HouseholdIncomeBracket;

  // 10. First Generation College Student
  isFirstGenerationCollege: boolean;
}

export interface VerifyEquityProfileRequest {
  verificationStatus: EquityVerificationStatus;
  verificationRemarks?: string;
}

export interface EquityStatisticsSummaryDto {
  totalProfilesCount: number;
  countPersonsWithDisabilities: number;
  countSoloParents: number;
  countRaisedBySoloParents: number;
  count4psBeneficiaries: number;
  countListahananNhts: number;
  countUnifastTesAwardees: number;
  countIndigenousPeoples: number;
  countOrphans: number;
  countGidaResidents: number;
  countFarmerFisherfolk: number;
  countRebelReturneeFamilies: number;
  countBottom40IncomeBracket: number;
  countFirstGenerationCollege: number;

  countSelfDeclared: number;
  countPendingVerification: number;
  countVerified: number;
  countRejected: number;
}
