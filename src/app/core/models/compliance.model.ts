// File: src/app/core/models/compliance.model.ts

export interface ClearanceSignoffDto {
  id: number;
  clearanceRequestId: number;
  departmentType: string; // "LIBRARY" | "ACCOUNTING" | "LABORATORY" | "STUDENT_AFFAIRS" | "DEAN" | "REGISTRAR"
  signoffStatus: string; // "PENDING" | "APPROVED" | "REJECTED"
  remarks?: string | null;
  signedByUserId?: number | null;
  signedByUsername?: string | null;
  signedAt?: string | null;
}

export interface ClearanceRequestDto {
  id: number;
  studentProfileId: number;
  studentNumber: string;
  studentName: string;
  termId: number;
  termName: string;
  purpose: string; // "GRADUATION" | "TRANSFER" | "LOA" | "GENERAL"
  overallStatus: string; // "PENDING" | "CLEARED" | "REJECTED"
  createdAt: string;
  signoffs: ClearanceSignoffDto[];
}

export interface DepartmentClearanceItem {
  departmentId?: number | null;
  departmentName: string;
  status: string; // "PENDING" | "APPROVED" | "REJECTED"
  remarks?: string | null;
  clearedBy?: string | null;
  clearedAt?: string | null;
}

export interface ClearanceStatusMessage {
  studentId: number;
  termId: number;
  overallStatus: string;
  departments: DepartmentClearanceItem[];
}

export interface ClearanceStudentSuggestionDto {
  studentProfileId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  clearanceStatus: string;
  purpose: string;
}

export interface InitiateClearanceRequest {
  studentProfileId?: number;
  studentNumber?: string;
  termId: number;
  purpose: string;
}

export interface ProcessSignoffRequest {
  signoffStatus: string;
  remarks?: string | null;
}

export interface CourseAuditItemDto {
  courseId: number;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  completed: boolean;
  gradeEarned?: number | null;
  status: string; // "PASSED" | "FAILED" | "PENDING"
}

export interface DegreeAuditResultDto {
  studentProfileId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  curriculumCode: string;
  totalCurriculumUnits: number;
  totalUnitsEarned: number;
  cumulativeGpa: number;
  residencyRequirementMet: boolean;
  qualifiedForGraduation: boolean;
  honorsEligible: string; // "SUMMA_CUM_LAUDE" | "MAGNA_CUM_LAUDE" | "CUM_LAUDE" | "NONE"
  auditedCourses: CourseAuditItemDto[];
}

export interface ApplyForGraduationRequest {
  studentProfileId: number;
  termId: number;
}

export interface GraduationApplicationDto {
  id: number;
  studentProfileId: number;
  studentNumber: string;
  studentName: string;
  curriculumId: number;
  curriculumCode: string;
  termId: number;
  termName: string;
  applicationDate: string;
  degreeAuditStatus: string; // "PENDING" | "QUALIFIED" | "INCOMPLETE"
  totalUnitsCompleted: number;
  cumulativeGpa: number;
  honorsStatus: string;
  specialOrderNumber?: string | null;
  specialOrderIssuedAt?: string | null;
}

export interface IssueSpecialOrderRequest {
  specialOrderNumber: string;
}

export interface ChedFormE1InstitutionalDto {
  campusId: number;
  campusName: string;
  chedInstitutionalCode: string;
  totalPrograms: number;
  totalEnrolledStudents: number;
  totalFaculty: number;
}

export interface ChedFormE3EnrolmentDto {
  termId: number;
  termName: string;
  programCode: string;
  programName: string;
  maleCount: number;
  femaleCount: number;
  totalEnrolled: number;
  totalUnitsTaken: number;
}

export interface ChedFormE4GraduateDto {
  termId: number;
  termName: string;
  programCode: string;
  totalGraduates: number;
  summaCumLaudeCount: number;
  magnaCumLaudeCount: number;
  cumLaudeCount: number;
}

export interface ChedFormE5FacultyDto {
  facultyId: number;
  facultyName: string;
  highestDegree: string;
  employmentStatus: string;
  teachingLoadContactHours: number;
  assignedSectionsCount: number;
}
