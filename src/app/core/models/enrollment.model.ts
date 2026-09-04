export interface PrerequisiteDetailDto {
  prerequisiteCourseId: number;
  prerequisiteCode: string;
  prerequisiteTitle: string;
  minGradeRequired: number;
  isSatisfied: boolean;
  studentGrade?: number | null;
}

export interface AvailableSectionOptionDto {
  sectionId: number;
  sectionCode: string;
  maxCapacity: number;
  enrolledCount: number;
  status: string;
  scheduleSummary: string;
}

export interface CourseEligibilityItemDto {
  courseId: number;
  code: string;
  title: string;
  lectureUnits: number;
  labUnits: number;
  creditUnits: number;
  yearLevel: number;
  semester: string;
  eligibilityStatus: 'ELIGIBLE' | 'LOCKED_PREREQUISITE' | 'ALREADY_PASSED' | 'CURRENTLY_ENROLLED';
  failureReason?: string;
  prerequisites: PrerequisiteDetailDto[];
  availableSections: AvailableSectionOptionDto[];
}

export interface AdvisingEligibilityResponse {
  studentId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  programName: string;
  curriculumCode: string;
  yearLevel: number;
  enrollmentStatus: string;
  isGraduating: boolean;
  totalUnitsEarned: number;
  cumulativeGpa?: number | null;
  maxAllowedUnits: number;
  currentEnrolledUnits: number;
  courses: CourseEligibilityItemDto[];
}

export interface EnlistSectionRequest {
  termId: number;
  sectionId: number;
}

export interface EnrollmentItemResponse {
  itemId: number;
  sectionId: number;
  sectionCode: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  scheduleSummary: string;
  completionStatus: string;
  finalNumericalGrade?: number | null;
}

export interface StudentEnrollmentResponse {
  enrollmentId: number;
  studentId: number;
  studentNumber: string;
  termId: number;
  termName: string;
  enrollmentDate: string;
  status: string; // "DRAFT" | "ENLISTED" | "ASSESSED" | "ENROLLED" | "DROPPED"
  totalCreditUnits: number;
  isOverloadApproved: boolean;
  items: EnrollmentItemResponse[];
}

export interface EnrollmentConfirmationDto {
  enrollmentId: number;
  status: string;
  totalCreditUnits: number;
  message: string;
}
