/**
 * WebSocket topic constants matching backend WebSocketTopics.java.
 */
export const WS_TOPICS = {
  // Global Topics
  ACTIVE_TERM: '/topic/terms/active',
  NOTIFICATIONS: '/topic/notifications',

  // Per-Student Topics
  ENROLLMENT: (studentId: number | string) => `/topic/enrollment.${studentId}`,
  GRADES: (studentId: number | string) => `/topic/grades.${studentId}`,
  STUDENT_PROFILE: (studentId: number | string) => `/topic/student.${studentId}`,
  ATTENDANCE: (studentId: number | string) => `/topic/attendance.${studentId}`,
  CLEARANCE: (studentId: number | string) => `/topic/clearance.${studentId}`,
  clearance: (studentId: number | string) => `/topic/clearance.${studentId}`,
  enrollment: (studentId: number | string) => `/topic/enrollment.${studentId}`,
  grades: (studentId: number | string) => `/topic/grades.${studentId}`,
  PERFORMANCE: (studentId: number | string) => `/topic/performance.${studentId}`,
  EQUITY: (studentId: number | string) => `/topic/equity.${studentId}`,

  // Per-Class / Section Topics
  CLASS_SCHEDULE: (classId: number | string) => `/topic/schedule.${classId}`,
  ATTENDANCE_CLASS: (classId: number | string) => `/topic/attendance.class.${classId}`,

  // Per-Faculty Topics
  FACULTY: (facultyId: number | string) => `/topic/faculty.${facultyId}`,
  FACULTY_SCHEDULE: (facultyId: number | string) => `/topic/schedule.faculty.${facultyId}`,

  // Admin Topics
  ADMIN_ENROLLMENTS: '/topic/admin.enrollments',
  ADMIN_GRADES: '/topic/admin.grades',
  ADMIN_CLEARANCE: '/topic/admin.clearance',
  ADMIN_TELEMETRY: '/topic/admin.telemetry',
  ADMIN_STUDENTS: '/topic/admin.students',
  ADMIN_ATTENDANCE: '/topic/admin.attendance'
} as const;
