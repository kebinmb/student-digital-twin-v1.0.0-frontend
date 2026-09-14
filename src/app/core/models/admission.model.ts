export interface AdmissionConfigDto {
  id: number;
  termId: number;
  termName: string;
  isActive: boolean;
  dailySlotLimit: number;
  totalOpenedSlots: number;
  daysOpen: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateAdmissionConfigRequest {
  termId: number;
  isActive: boolean;
  dailySlotLimit: number;
  totalOpenedSlots: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateExamSlotRequest {
  termId: number;
  examDate: string;
  startTime: string;
  endTime: string;
  venueRoom: string;
  maxCapacity: number;
}

export interface EvaluateExamRequest {
  examScore: number;
  examRemarks?: string;
  status: 'EXAM_PASSED' | 'EXAM_FAILED';
}

export interface EvaluateInterviewRequest {
  interviewScore: number;
  interviewRemarks?: string;
  status: 'INTERVIEW_ACCEPTED' | 'REJECTED';
}

export interface EntranceExamSlotResponse {
  id: number;
  termId: number;
  examDate: string;
  startTime: string;
  endTime: string;
  venueRoom: string;
  maxCapacity: number;
  reservedCount: number;
  availableSeats: number;
  status: 'OPEN' | 'FULL' | 'CANCELLED';
}

export interface PublicProgramDto {
  id: number;
  code: string;
  name: string;
}

export interface PublicTermDto {
  id: number;
  academicYearCode: string;
  termType: string;
  isActive: boolean;
}

export interface QueueTokenRequest {
  clientIdentifier?: string;
}

export interface QueueTokenResponse {
  queueToken: string;
  status: 'ACTIVE' | 'QUEUED' | 'EXPIRED' | 'CONSUMED';
  queuePosition: number;
  estimatedWaitSeconds: number;
  allowedToProceed: boolean;
}

export interface SubmitAdmissionRequest {
  queueToken?: string;
  targetProgramId: number;
  termId: number;
  examSlotId?: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  birthDate: string;
  birthPlace?: string;
  gender: string;
  genderIdentity?: string;
  civilStatus: string;
  citizenship: string;
  mobileNumber: string;
  email: string;
  lrnNumber?: string;
  highSchoolName: string;
  depedSchoolId?: string;
  highSchoolType: string;
  shsTrackAndStrand?: string;
  highSchoolGwa?: number;
  shsYearGraduated?: number;
  streetAddress: string;
  barangay: string;
  cityMunicipality: string;
  province: string;
  zipCode?: string;
  permRegion?: string;
  permProvince?: string;
  permCityMunicipality?: string;
  permBarangay?: string;
  permZipCode?: string;
  permStreetAddress?: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactNumber: string;
  emergencyContactEmail?: string;
  is4psBeneficiary?: boolean;
  household4psIdNumber?: string;
  isIndigenousPeople?: boolean;
  ipEthnicGroup?: string;
  ncipCertificateNumber?: string;
  isPersonWithDisability?: boolean;
  disabilityType?: string;
  pwdIdNumber?: string;
  isSoloParent?: boolean;
  isRaisedBySoloParent?: boolean;
  soloParentIdNumber?: string;
  isOrphan?: boolean;
  isGidaResident?: boolean;
  gidaBarangayResidence?: string;
  isFarmerFisherfolk?: boolean;
  rsbsaRegistrationNumber?: string;
  isRebelReturneeFamily?: boolean;
  certificateOfSurrenderNumber?: string;
  isBottom40IncomeBracket?: boolean;
  monthlyHouseholdIncomeBracket?: string;
  isFirstGenerationCollege?: boolean;
  isUnderprivilegedHomeless?: boolean;
  scholarshipGrantType?: string;
}

export interface AdmissionApplicationResponse {
  id: number;
  applicationNumber: string;
  targetProgramId: number;
  targetProgramCode: string;
  targetProgramName: string;
  termId: number;
  termName: string;
  examSlotId?: number;
  examDate?: string;
  examStartTime?: string;
  examEndTime?: string;
  examVenue?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  fullName: string;
  birthDate: string;
  birthPlace?: string;
  gender: string;
  genderIdentity?: string;
  civilStatus: string;
  citizenship: string;
  mobileNumber: string;
  email: string;
  lrnNumber?: string;
  highSchoolName: string;
  depedSchoolId?: string;
  highSchoolType: string;
  shsTrackAndStrand?: string;
  highSchoolGwa?: number;
  shsYearGraduated?: number;
  streetAddress: string;
  barangay: string;
  cityMunicipality: string;
  province: string;
  zipCode?: string;
  permRegion?: string;
  permProvince?: string;
  permCityMunicipality?: string;
  permBarangay?: string;
  permZipCode?: string;
  permStreetAddress?: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactNumber: string;
  emergencyContactEmail?: string;
  is4psBeneficiary: boolean;
  household4psIdNumber?: string;
  isIndigenousPeople: boolean;
  ipEthnicGroup?: string;
  ncipCertificateNumber?: string;
  isPersonWithDisability: boolean;
  disabilityType?: string;
  pwdIdNumber?: string;
  isSoloParent: boolean;
  isRaisedBySoloParent: boolean;
  soloParentIdNumber?: string;
  isOrphan: boolean;
  isGidaResident: boolean;
  gidaBarangayResidence?: string;
  isFarmerFisherfolk: boolean;
  rsbsaRegistrationNumber?: string;
  isRebelReturneeFamily: boolean;
  certificateOfSurrenderNumber?: string;
  isBottom40IncomeBracket: boolean;
  monthlyHouseholdIncomeBracket?: string;
  isFirstGenerationCollege: boolean;
  isUnderprivilegedHomeless?: boolean;
  scholarshipGrantType?: string;
  queueToken?: string;
  applicationStatus: 'SUBMITTED' | 'UNDER_REVIEW' | 'EXAM_PASSED' | 'EXAM_FAILED' | 'INTERVIEW_ACCEPTED' | 'REJECTED' | 'ELIGIBLE_FOR_ENROLLMENT' | 'ENROLLED' | 'APPROVED';
  examScore?: number;
  examRemarks?: string;
  interviewScore?: number;
  interviewRemarks?: string;
  evaluatedByName?: string;
  interviewedByName?: string;
  createdAt?: string;
}

export interface UpdateAdmissionStatusRequest {
  applicationStatus: string;
  remarks?: string;
}
