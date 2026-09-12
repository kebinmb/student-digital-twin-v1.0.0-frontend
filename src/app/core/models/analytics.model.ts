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
  studentId: number;
  studentNumber: string;
  studentName: string;
  attendanceStatus: string;
  isGeofenceValid: boolean;
  scannedAt: string;
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
