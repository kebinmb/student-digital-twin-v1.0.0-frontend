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
  financialClearance?: string;
  departmentalClearance?: string;
  isClearedForEnrollment?: boolean;
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

export interface UpdateEnrollmentStatusRequest {
  status?: string;
  isOverloadApproved?: boolean;
}


export interface StudentSearchResultDto {
  id: number;
  studentIdNumber: string;
  fullName: string;
  programCode: string;
  yearLevel: number;
  academicStatus: string;
}

export interface CreateStudentRequest {
  studentNumber: string;
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  programId: number;
  curriculumId: number;
  classification: 'FRESHMAN' | 'INCOMING_FIRST_YEAR' | 'TRANSFEREE' | 'RETURNEE' | 'CONTINUING' | 'SECOND_DEGREE';
  yearLevel?: number;
  admissionApplicationId?: number;
}

export interface StudentProfileResponse {
  id: number;
  studentNumber: string;
  userId: number;
  username: string;
  email: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  fullName?: string | null;
  programId: number;
  programCode: string;
  programName: string;
  curriculumId: number;
  curriculumCode: string;
  classification: string;
  yearLevel: number;
  enrollmentStatus: string;
  isGraduating: boolean;
  totalUnitsEarned: number;
  cumulativeGpa?: number | null;
  financialClearance?: string;
  departmentalClearance?: string;
}

export interface CreditCourseItemRequest {
  externalInstitution: string;
  externalCourseCode: string;
  externalCourseTitle: string;
  internalCourseId: number;
  externalNumericalGrade: number;
  creditsGranted: number;
  remarks?: string;
}

export interface CreditTransfereeCoursesRequest {
  items: CreditCourseItemRequest[];
}

export interface CourseEquivalencyDto {
  id: number;
  studentId: number;
  externalInstitution: string;
  externalCourseCode: string;
  externalCourseTitle: string;
  internalCourseId: number;
  internalCourseCode: string;
  internalCourseTitle: string;
  externalNumericalGrade: number;
  creditsGranted: number;
  status: string;
  approvedByUsername?: string | null;
  remarks?: string | null;
}

export interface TransfereeCreditingSummaryResponse {
  studentId: number;
  studentNumber: string;
  creditedCoursesCount: number;
  totalUnitsCredited: number;
  creditedCourses: CourseEquivalencyDto[];
}

export interface RosterStudentDto {
  enrollmentItemId: number;
  studentId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number;
  finalNumericalGrade?: number | null;
  completionStatus: string;
}

export interface SectionRosterResponse {
  sectionId: number;
  sectionCode: string;
  courseId: number;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  termId: number;
  termName: string;
  gradeStatus: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'SEALED';
  primaryInstructorId?: number | null;
  primaryInstructorName?: string | null;
  enrolledCount: number;
  maxCapacity: number;
  students: RosterStudentDto[];
  updatedAtEpochMs?: number | null;
}

export interface GradeEntryDto {
  enrollmentItemId: number;
  finalNumericalGrade?: number | null;
  completionStatus?: string | null;
}

export interface SaveSectionGradesRequest {
  grades: GradeEntryDto[];
  submitForVerification: boolean;
  expectedUpdatedAtEpochMs?: number | null;
}

export interface GradeActionResponse {
  sectionId: number;
  sectionCode: string;
  gradeStatus: string;
  updatedCount: number;
  message: string;
}

export interface ClassRecordItemDto {
  id: number;
  categoryId: number;
  itemTitle: string;
  maxPoints: number;
  sequenceOrder: number;
}

export interface SectionGradingCategoryDto {
  id: number;
  categoryName: string;
  weightPercentage: number;
  termPeriod: 'MIDTERM' | 'FINAL';
  displayOrder: number;
  items: ClassRecordItemDto[];
}

export interface SectionGradingConfigResponse {
  id: number;
  sectionId: number;
  midtermWeight: number;
  finalWeight: number;
  isLocked: boolean;
  categories: SectionGradingCategoryDto[];
}

export interface CategoryWeightRequest {
  id?: number;
  categoryName: string;
  weightPercentage: number;
  termPeriod: string;
  displayOrder: number;
}

export interface UpdateSectionGradingConfigRequest {
  midtermWeight: number;
  finalWeight: number;
  categories: CategoryWeightRequest[];
}

export interface CreateClassRecordItemRequest {
  categoryId: number;
  itemTitle: string;
  maxPoints: number;
  sequenceOrder: number;
}

export interface StudentScoreEntryDto {
  itemId: number;
  studentId: number;
  scoreEarned?: number | null;
  isExcused: boolean;
}

export interface BatchSaveScoresRequest {
  scores: StudentScoreEntryDto[];
}

export interface StudentScoreMatrixRowDto {
  studentId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number;
  scores: StudentScoreEntryDto[];
  midtermRawPercentage?: number | null;
  finalRawPercentage?: number | null;
  totalRawPercentage?: number | null;
  transmutedGrade?: number | null;
  completionStatus: string;
}

export interface ClassRecordMatrixResponse {
  sectionId: number;
  sectionCode: string;
  courseCode: string;
  courseTitle: string;
  config: SectionGradingConfigResponse;
  rows: StudentScoreMatrixRowDto[];
}



