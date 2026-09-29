export interface FacultyProfile {
  id: number;
  userId: number;
  username: string;
  email: string;
  facultyIdNumber: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  fullName?: string | null;
  highestDegree: string;
  academicRank: string;
  prcLicenseNo: string | null;
  employmentStatus: string;
  isTenured: boolean;
  collegeId?: number | null;
  collegeCode?: string | null;
  collegeName?: string | null;
  programId?: number | null;
  programCode?: string | null;
  programName?: string | null;
}

export interface CreateFacultyAccountRequest {
  username: string;
  email: string;
  password?: string;
  facultyIdNumber: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  highestDegree: string;
  academicRank: string;
  prcLicenseNo?: string;
  employmentStatus: string;
  isTenured: boolean;
  collegeId?: number | null;
  programId?: number | null;
}

export interface UpdateFacultyProfileRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  highestDegree: string;
  academicRank: string;
  prcLicenseNo?: string;
  employmentStatus: string;
  isTenured: boolean;
  collegeId?: number | null;
  programId?: number | null;
}

export interface ChedE5WorkloadSummaryDto {
  facultyUserId: number;
  facultyIdNumber: string;
  facultyName: string;
  email: string;
  highestDegree: string;
  academicRank: string;
  prcLicenseNo: string | null;
  employmentStatus: string;
  isTenured: boolean;
  regularUnits: number;
  overloadUnits: number;
  totalContactHours: number;
  numberOfPreparations: number;
  assignedSectionCodes: string[];
}

export interface ChedE5ReportResponse {
  termId: number;
  termName: string;
  totalFacultyCount: number;
  totalRegularUnits: number;
  totalOverloadUnits: number;
  totalContactHours: number;
  facultyWorkloads: ChedE5WorkloadSummaryDto[];
}
