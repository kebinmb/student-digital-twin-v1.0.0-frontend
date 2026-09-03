export interface CourseItemDto {
  curriculumCourseId: number;
  courseId: number;
  code: string;
  title: string;
  lectureUnits: number;
  labUnits: number;
  creditUnits: number;
  contactHoursLec: number;
  contactHoursLab: number;
  category: 'GEN_ED' | 'PROFESSIONAL_MAJOR' | 'ELECTIVE' | 'MANDATED' | string;
  sequenceOrder: number;
  prerequisites: string[];
}

export interface SemesterBlockDto {
  semester: '1ST_SEM' | '2ND_SEM' | 'SUMMER' | string;
  totalUnits: number;
  totalContactHours: number;
  courses: CourseItemDto[];
}

export interface YearBlockDto {
  yearLevel: number;
  semesters: SemesterBlockDto[];
}

export interface DesignerViewResponse {
  curriculumId: number;
  code: string;
  name: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'ARCHIVED';
  totalUnits: number;
  totalContactHours: number;
  yearBlocks: YearBlockDto[];
}

export interface RelocateCourseRequest {
  curriculumCourseId: number;
  targetYearLevel: number;
  targetSemester: string;
  targetSequenceOrder: number;
}

export interface AddCourseToCurriculumRequest {
  courseId: number;
  yearLevel: number;
  semester: string;
  category: string;
  sequenceOrder?: number;
}

export interface AddPrerequisiteRequest {
  courseId: number;
  prerequisiteCourseId: number;
  ruleType: 'HARD' | 'CO_REQUISITE' | 'STANDING' | string;
  minGradeRequired?: string;
}

export interface CreateCurriculumRequest {
  programId: number;
  code: string;
  name: string;
  effectiveAcademicYear: string;
}

export interface CloneCurriculumRequest {
  newCode: string;
  newName: string;
  effectiveAcademicYear: string;
}

export interface CurriculumSummaryResponse {
  id: number;
  code: string;
  name: string;
  programCode: string;
  effectiveAcademicYear: string;
  status: string;
  versionNumber: number;
}

export interface AvailableCourseDto {
  courseId: number;
  code: string;
  title: string;
  lectureUnits: number;
  labUnits: number;
  creditUnits: number;
  contactHoursLec: number;
  contactHoursLab: number;
}

export interface DiagnosticMessage {
  code: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  targetCourseCode?: string;
  yearLevel?: number;
  semester?: string;
}

export interface ValidationSummary {
  totalUnits: number;
  requiredUnits: number;
  unitDeficit: number;
}

export interface ValidationReportDto {
  valid: boolean;
  summary: ValidationSummary;
  errors: DiagnosticMessage[];
  warnings: DiagnosticMessage[];
}

export interface TermStats {
  totalUnits: number;
  totalHours: number;
  isOverloadedUnits: boolean;
  isOverloadedHours: boolean;
  hasAnomalousCourses: boolean;
}
