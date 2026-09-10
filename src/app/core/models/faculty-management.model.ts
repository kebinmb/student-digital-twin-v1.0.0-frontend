export interface FacultyProfile {
  id: number;
  userId: number;
  username: string;
  email: string;
  facultyIdNumber: string;
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
  highestDegree: string;
  academicRank: string;
  prcLicenseNo?: string;
  employmentStatus: string;
  isTenured: boolean;
  collegeId?: number | null;
  programId?: number | null;
}
