export interface LtiDeploymentResponse {
  id: number;
  platformName: string;
  clientId: string;
  deploymentId: string;
  oidcAuthUrl: string;
  accessTokenUrl: string;
  jwksUrl: string;
  active: boolean;
  createdAt: string;
}

export interface LtiDeploymentRequest {
  platformName: string;
  clientId: string;
  deploymentId: string;
  oidcAuthUrl: string;
  accessTokenUrl: string;
  jwksUrl: string;
  active?: boolean;
}

export interface LtiLaunchRequest {
  clientId: string;
  deploymentId: string;
  subClaim: string;
  idToken: string;
}

export interface LtiLaunchResponse {
  redirectUrl: string;
  token: string;
  username: string;
  role: string;
}

export interface LmsRosterSyncResponse {
  sectionId: number;
  sectionCode: string;
  syncedStudentsCount: number;
  status: string;
  message: string;
}

export interface EnrolledCourseSummaryDto {
  sectionId: number;
  sectionCode: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: string;
  scheduleText: string;
  gradeStatus: string;
  currentGrade: string;
}

export interface StudentSelfServiceSummaryDto {
  studentId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number;
  cumulativeGpa: string;
  totalUnitsEarned: string;
  financialClearance: string;
  departmentalClearance: string;
  currentCourses: EnrolledCourseSummaryDto[];
}
