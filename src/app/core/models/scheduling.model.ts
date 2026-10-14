export interface RoomResponse {
  id: number;
  campusId: number;
  campusName: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  roomType: string;
  isActive: boolean;
}

export interface CreateRoomRequest {
  campusId: number;
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  roomType: string;
}

export interface SchedulingTermDto {
  id: number;
  academicYearId: number;
  academicYearCode: string;
  termType: string;
  termName: string;
  isCurrent: boolean;
  isActive: boolean;
  isEnrollmentOpen: boolean;
  isGradingOpen?: boolean;
  isAddDropOpen?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  maxHoursPerClass?: number;
}

export interface InstructorOptionDto {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  programId?: number | null;
  programCode?: string | null;
  collegeId?: number | null;
  collegeCode?: string | null;
}

export interface OverrideValidationResponse {
  isMismatch: boolean;
  overrideType: 'NONE' | 'CROSS_PROGRAM' | 'CROSS_COLLEGE';
  facultyUserId: number;
  facultyName: string;
  facultyEmail: string;
  homeProgramId?: number | null;
  homeProgramName?: string | null;
  homeCollegeId?: number | null;
  homeCollegeName?: string | null;
  targetProgramId: number;
  targetProgramName: string;
  targetCollegeId: number;
  targetCollegeName: string;
  assignedChairpersonId?: number | null;
  assignedChairpersonName?: string | null;
  assignedDeanId?: number | null;
  assignedDeanName?: string | null;
  hasMissingAuthorities: boolean;
  missingAuthorityMessages: string[];
  requiredApprovalSteps: string[];
}

export interface CreateOverrideRequest {
  sectionId: number;
  scheduleId?: number | null;
  facultyUserId: number;
  justification: string;
}

export interface ApprovalDecisionRequest {
  remarks: string;
}

export interface ApprovalStepResponse {
  id: number;
  approvalType: 'CHAIRPERSON_APPROVAL' | 'DEAN_APPROVAL' | 'FACULTY_ACCEPTANCE';
  stepOrder: number;
  requiredRole: string;
  assignedApproverUserId?: number | null;
  assignedApproverName?: string | null;
  decisionByUserId?: number | null;
  decisionByName?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'SKIPPED';
  decisionAt?: string | null;
  remarks?: string | null;
}

export interface SchedulingOverrideResponse {
  id: number;
  sectionId: number;
  sectionCode: string;
  courseId: number;
  courseCode: string;
  courseTitle: string;
  termId: number;
  termName: string;
  scheduleId?: number | null;
  scheduleSummary?: string | null;
  facultyUserId: number;
  facultyName: string;
  facultyEmail: string;
  requestedByUserId: number;
  requestedByName: string;
  overrideType: 'CROSS_PROGRAM' | 'CROSS_COLLEGE';
  homeProgramId?: number | null;
  homeProgramName?: string | null;
  homeCollegeId?: number | null;
  homeCollegeName?: string | null;
  targetProgramId: number;
  targetProgramName: string;
  targetCollegeId: number;
  targetCollegeName: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CONFIGURATION_REQUIRED' | 'SUPERSEDED';
  justification: string;
  resolutionNotes?: string | null;
  createdAt: string;
  completedAt?: string | null;
  approvals: ApprovalStepResponse[];
  isLocked: boolean;
}

export interface PendingOverrideCountResponse {
  pendingCount: number;
}

export interface ScheduleSlotDto {
  roomId: number;
  instructorUserId?: number | null;
  dayOfWeek?: string;
  daysOfWeek?: string[];
  startTime: string; // "08:00:00"
  endTime: string;   // "10:00:00"
  scheduleType: string; // "LECTURE" | "LABORATORY"
}

export interface CreateSectionRequest {
  termId: number;
  curriculumId: number;
  courseId: number;
  sectionCode: string;
  maxCapacity: number;
  scheduleSlots: ScheduleSlotDto[];
}

export interface UpdateSectionRequest {
  sectionCode: string;
  maxCapacity: number;
  scheduleSlots: ScheduleSlotDto[];
}

export interface ScheduleSlotResponse {
  id: number;
  roomId: number;
  roomCode: string;
  roomName: string;
  instructorUserId?: number | null;
  instructorName?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  scheduleType: string;
  isLocked?: boolean;
  lockReason?: string;
}

export interface SectionDetailResponse {
  id: number;
  termId: number;
  termName: string;
  curriculumId: number;
  curriculumCode: string;
  curriculumName: string;
  courseId: number;
  courseCode: string;
  courseTitle: string;
  lectureUnits: number;
  labUnits: number;
  creditUnits: number;
  sectionCode: string;
  maxCapacity: number;
  enrolledCount: number;
  status: string; // "PLANNED" | "OPEN" | "CLOSED" | "CANCELLED"
  gradeStatus?: string; // "DRAFT" | "SUBMITTED" | "VERIFIED" | "SEALED"
  schedules: ScheduleSlotResponse[];
}

export interface AssignedSectionDto {
  sectionId: number;
  sectionCode: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  contactHours: number;
  scheduleSummary: string;
}

export interface FacultyLoadSummaryResponse {
  facultyUserId: number;
  facultyName: string;
  facultyEmail: string;
  termId: number;
  termName: string;
  regularUnits: number;
  overloadUnits: number;
  totalContactHours: number;
  isOverloadApproved: boolean;
  approvedByName?: string | null;
  numberOfPreparations?: number;
  customMaxLoadUnits?: number | null;
  effectiveMaxUnits?: number;
  overrideReason?: string | null;
  overriddenByName?: string | null;
  assignedSections: AssignedSectionDto[];
}

export interface CreateScheduleSlotRequest {
  sectionId?: number;
  courseId?: number;
  facultyUserId?: number | null;
  roomId: number;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  isLaboratory: boolean;
}

export interface UpdateFacultyLoadLimitRequest {
  termId: number;
  customMaxUnits: number;
  reason: string;
}

export interface UpdateTermClassHourLimitRequest {
  maxHoursPerClass: number;
}
