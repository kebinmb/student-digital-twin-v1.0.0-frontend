export interface AttendanceSessionResponse {
  sessionId: number;
  sectionScheduleId: number;
  qrSeed: string;
  expiresAt: string;
  latitude?: number;
  longitude?: number;
  allowedRadiusMeters: number;
  qrCodeDataUrl: string;
}

export interface StartAttendanceSessionRequest {
  sectionScheduleId: number;
  latitude?: number;
  longitude?: number;
  allowedRadiusMeters?: number;
}

export interface ScanAttendanceRequest {
  qrSeed: string;
  studentId: number;
  latitude?: number;
  longitude?: number;
  deviceFingerprint?: string;
}

export interface AttendanceRecordResponse {
  recordId: number;
  sessionId: number;
  sectionCode?: string;
  courseCode?: string;
  studentId: number;
  studentNumber: string;
  studentName: string;
  attendanceStatus: string;
  isGeofenceValid: boolean;
  scannedAt: string;
  deviceFingerprint?: string;
}

export interface VerifyCreatorAttendanceRequest {
  qrSeed: string;
  latitude?: number;
  longitude?: number;
  deviceFingerprint?: string;
}

export interface FacultyAttendanceRecordResponse {
  recordId: number;
  sessionId: number;
  sectionCode?: string;
  courseCode?: string;
  facultyUserId: number;
  facultyName: string;
  facultyRole: string;
  attendanceStatus: string;
  isGeofenceValid: boolean;
  verifiedAt: string;
  deviceFingerprint?: string;
}

export interface ActivityAlertDto {
  activityTitle: string;
  categoryName: string;
  scoreEarned: number;
  maxPoints: number;
  percentage: number;
  suggestion: string;
}

export interface DigitalTwinRiskProfileDto {
  studentId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number;
  academicRiskScore: number;
  attendanceRiskScore: number;
  socioeconomicRiskScore: number;
  compositeRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  predictedDropoutProbability: number;
  recommendedInterventions: string[];
  evaluatedAt: string;
  activityAlerts?: ActivityAlertDto[];
}

export interface EarlyWarningRadarItemDto {
  studentId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  dropoutProbability: number;
  primaryRiskFactor: string;
  suggestedAction: string;
}

export interface StudentInterventionDto {
  id: number;
  studentId: number;
  studentNumber: string;
  studentName: string;
  riskScoreId?: number;
  interventionType: 'ACADEMIC_TUTORING' | 'ATTENDANCE_CONFERENCE' | 'FINANCIAL_SUBSIDY_AID' | 'GUIDANCE_COUNSELING' | 'PEER_MENTORING';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
  assignedCounselorId?: number;
  assignedCounselorName?: string;
  triggerFactor: string;
  caseNotes?: string;
  resolutionSummary?: string;
  dispatchedAt: string;
  resolvedAt?: string;
}

export interface DispatchInterventionRequest {
  studentId: number;
  riskScoreId?: number;
  interventionType: string;
  assignedCounselorId?: number;
  triggerFactor?: string;
  notes?: string;
}

export interface UpdateInterventionStatusRequest {
  status: string;
  resolutionSummary?: string;
  additionalNotes?: string;
}

export interface AcknowledgeInterventionRequest {
  response?: string;
}

export interface InterventionAcknowledgeResponse {
  alreadyAcknowledged?: boolean;
  message?: string;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type InterventionStatus = 'PENDING' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FAILED' | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED';

export interface DispatchedIntervention {
  id: number;
  interventionType: string;
  triggerReason: string;
  status: InterventionStatus;
  dispatchedAt: string;
}

export interface StudentTelemetryAdminSummary {
  studentId: number;
  studentNumber: string;
  fullName: string;
  programOrCohort: string;
  sectionCode?: string;
  riskLevel: RiskLevel;
  riskScore: number;
  activeInterventions: DispatchedIntervention[];
  lastTelemetrySync: string;
}

export interface AdminTelemetryQueryParams {
  page?: number;
  size?: number;
  searchQuery?: string;
  riskLevel?: string;
  interventionStatus?: string;
}

export interface FacultyTelemetryQueryParams extends AdminTelemetryQueryParams {
  sectionId?: number;
}

export interface TelemetryKpiSummary {
  totalMonitored: number;
  criticalRiskCount: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  totalActiveInterventions: number;
  averageWellnessIndex: number;
}

export interface MilestoneDto {
  id: number;
  title: string;
  description: string;
  category: string;
  achievedAt: string;
}

export interface StudentSelfTelemetry {
  studentId: number;
  fullName: string;
  riskLevel: RiskLevel;
  wellnessScore: number;
  dimensionScores: { [key: string]: number };
  recommendations: DispatchedIntervention[];
  milestones: MilestoneDto[];
  lastSync: string;
}

export interface FacultySectionOption {
  sectionId: number;
  sectionCode: string;
  courseCode: string;
  courseTitle?: string;
  enrolledCount?: number;
}

export interface StudentTelemetrySummary {
  studentId: number;
  studentNumber: string;
  fullName: string;
  sectionCode: string;
  program: string;
  riskLevel: RiskLevel;
  riskScore: number;
  activeInterventions: DispatchedIntervention[];
  lastTelemetrySync: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}


