// 1. Academic Periods
export interface AcademicYear {
  id: number;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface CreateAcademicYearRequest {
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface UpdateAcademicYearRequest {
  startDate: string;
  endDate: string;
}

export type TermType = '1ST_SEM' | '2ND_SEM' | 'SUMMER';

export interface Term {
  id: number;
  academicYearId: number;
  academicYearCode?: string;
  termType: TermType;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  isActive?: boolean;
  enrollmentOpen?: boolean;
  gradingOpen?: boolean;
  addDropOpen?: boolean;
}

export interface CreateTermRequest {
  academicYearId: number;
  termType: TermType;
  startDate: string;
  endDate: string;
}

export interface UpdateTermScheduleRequest {
  startDate: string;
  endDate: string;
}

// 2. Hierarchy
export interface Campus {
  id: number;
  code: string;
  name: string;
  chedInstitutionalCode?: string;
  address?: string;
  region: string;
  contactNumber?: string;
  email?: string;
  isMain: boolean;
  isActive: boolean;
}

export interface CreateCampusRequest {
  code: string;
  name: string;
  chedInstitutionalCode?: string;
  address?: string;
  region?: string;
  contactNumber?: string;
  email?: string;
  isMain: boolean;
}

export interface UpdateCampusRequest {
  name: string;
  chedInstitutionalCode?: string;
  address?: string;
  contactNumber?: string;
  email?: string;
}

export type DepartmentType = 'COLLEGE' | 'DEPARTMENT' | 'ADMINISTRATIVE';

export interface Department {
  id: number;
  campusId: number;
  campusCode?: string;
  campusName?: string;
  code: string;
  name: string;
  type: DepartmentType;
  parentDepartmentId?: number;
  parentDepartmentCode?: string;
  deanUserId?: number;
  isActive: boolean;
}

export interface CreateDepartmentRequest {
  campusId: number;
  code: string;
  name: string;
  type: DepartmentType;
  parentDepartmentId?: number | null;
  deanUserId?: number | null;
}

export interface UpdateDepartmentRequest {
  name: string;
  type: DepartmentType;
  parentDepartmentId?: number | null;
  deanUserId?: number | null;
}

export interface Program {
  id: number;
  departmentId: number;
  departmentCode?: string;
  code: string;
  name: string;
  degreeLevel: string;
  major?: string;
  totalUnitsRequired?: number;
  isActive: boolean;
}

export interface CreateProgramRequest {
  departmentId: number;
  code: string;
  name: string;
  degreeLevel: string;
  major?: string;
  totalUnitsRequired: number;
}

export interface UpdateProgramRequest {
  name: string;
  major?: string;
  degreeLevel?: string;
  totalUnitsRequired?: number;
}

// 3. Curriculum & Course Structure
export interface Course {
  id: number;
  code: string;
  title: string;
  lectureUnits: number;
  labUnits: number;
  creditUnits: number;
  contactHoursLec: number;
  contactHoursLab: number;
  description?: string;
  isActive: boolean;
}

export interface CreateCourseRequest {
  code: string;
  title: string;
  lectureUnits: number;
  labUnits: number;
  contactHoursLec: number;
  contactHoursLab: number;
  description?: string;
}

export interface UpdateCourseRequest {
  title: string;
  lectureUnits: number;
  labUnits: number;
  contactHoursLec: number;
  contactHoursLab: number;
  description?: string;
}

export interface CourseOutcome {
  id: number;
  courseId: number;
  courseCode?: string;
  code: string;
  description: string;
  bloomsLevel: string;
}

export interface CreateCourseOutcomeRequest {
  code: string;
  description: string;
  bloomsLevel: string;
}

export interface UpdateCourseOutcomeRequest {
  description: string;
  bloomsLevel: string;
}

export interface ProgramOutcome {
  id: number;
  programId: number;
  code: string;
  description: string;
}

export interface CreateProgramOutcomeRequest {
  code: string;
  description: string;
}

export interface CoursePrerequisite {
  id: number;
  courseId: number;
  courseCode?: string;
  prerequisiteCourseId: number;
  prerequisiteCourseCode?: string;
  prerequisiteCourseTitle?: string;
  prerequisiteCode?: string;
  prerequisiteTitle?: string;
  ruleType: 'HARD' | 'CO_REQUISITE' | 'STANDING' | string;
  minGradeRequired: string;
}

export interface CreateCoursePrerequisiteRequest {
  courseId: number;
  prerequisiteCourseId: number;
  ruleType?: string;
  minGradeRequired?: string;
}

export interface CiloPiloMapping {
  id?: number;
  courseOutcomeId: number;
  courseOutcomeCode?: string;
  programOutcomeId: number;
  programOutcomeCode?: string;
  mappingType: 'I' | 'E' | 'D' | string;
}

export interface CreateCiloPiloMappingRequest {
  courseOutcomeId: number;
  programOutcomeId: number;
  mappingType: string;
}

export interface UpdateCiloPiloMappingRequest {
  mappingType: string;
}

// 4. Grading
export interface GradingScale {
  id: number;
  code: string;
  percentageMin: number;
  percentageMax: number;
  gradePoint: string;
  description: string;
  numericGrade?: number;
  transmutedGrade?: string;
  remarks?: string;
  isPassing?: boolean;
  isNonNumeric?: boolean;
}

export interface CreateGradingScaleRequest {
  code: string;
  percentageMin: number;
  percentageMax: number;
  gradePoint: string;
  description: string;
  numericGrade?: number;
  transmutedGrade?: string;
  remarks?: string;
  isPassing: boolean;
  isNonNumeric: boolean;
}

export interface UpdateGradingScaleRequest {
  percentageMin: number;
  percentageMax: number;
  gradePoint: string;
  description: string;
  remarks?: string;
  isPassing: boolean;
}

// 5. Financial Foundations
export interface FeeCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface CreateFeeCategoryRequest {
  code: string;
  name: string;
  description?: string;
}

export interface FeeCatalog {
  id: number;
  categoryId: number;
  categoryCode?: string;
  categoryName?: string;
  code: string;
  name: string;
  defaultAmount: number;
  isOptional?: boolean;
  isPerUnit?: boolean;
  isChedSanctioned?: boolean;
  isFheBillable?: boolean;
}

export interface CreateFeeCatalogRequest {
  categoryId: number;
  code: string;
  name: string;
  defaultAmount: number;
  isOptional?: boolean;
  isPerUnit?: boolean;
  isChedSanctioned?: boolean;
  isFheBillable?: boolean;
}

export interface PaymentTermTemplate {
  id: number;
  name: string;
  downpaymentPercentage: number;
  prelimPercentage: number;
  midtermPercentage: number;
  semiFinalPercentage: number;
  finalPercentage: number;
}

export interface CreatePaymentTermTemplateRequest {
  name: string;
  downpaymentPercentage: number;
  prelimPercentage: number;
  midtermPercentage: number;
  semiFinalPercentage: number;
  finalPercentage: number;
}

export interface ScholarshipDiscount {
  id: number;
  code: string;
  name: string;
  category: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | string;
  discountPercentage?: number;
  fixedAmount?: number;
  fundingSource?: string;
  appliesToTuition?: boolean;
  appliesToMisc?: boolean;
  isActive: boolean;
}

export interface CreateScholarshipDiscountRequest {
  code: string;
  name: string;
  category: string;
  discountType: string;
  discountPercentage?: number;
  fixedAmount?: number;
  fundingSource?: string;
  appliesToTuition: boolean;
  appliesToMisc: boolean;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
