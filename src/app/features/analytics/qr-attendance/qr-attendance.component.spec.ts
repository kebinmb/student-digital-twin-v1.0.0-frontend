import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { QrAttendanceScannerComponent } from './qr-attendance.component';
import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { SchedulingApiService } from '../../../core/service/scheduling/scheduling-api.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { AttendanceRecordResponse } from '../../../core/models/analytics.model';
import { StudentProfileResponse } from '../../../core/models/enrollment.model';

describe('QrAttendanceScannerComponent', () => {
  let component: QrAttendanceScannerComponent;
  let fixture: ComponentFixture<QrAttendanceScannerComponent>;

  const mockAttendanceRecord: AttendanceRecordResponse = {
    recordId: 501,
    sessionId: 12,
    sectionCode: 'BSIT 3-A',
    courseCode: 'IT311',
    studentId: 10,
    studentNumber: '2026-CS-0001',
    studentName: 'Alice Student',
    attendanceStatus: 'PRESENT',
    isGeofenceValid: true,
    scannedAt: '2026-09-25T08:15:00Z',
    deviceFingerprint: 'Mozilla/5.0 Test'
  };

  const mockStudentProfile: StudentProfileResponse = {
    id: 10,
    studentNumber: '2026-CS-0001',
    userId: 100,
    username: 'alice',
    email: 'alice@example.com',
    programId: 1,
    programCode: 'BSIT',
    programName: 'Bachelor of Science in Information Technology',
    curriculumId: 1,
    curriculumCode: 'BSIT-2024',
    classification: 'REGULAR',
    yearLevel: 3,
    enrollmentStatus: 'ENROLLED',
    isGraduating: false,
    totalUnitsEarned: 72,
    cumulativeGpa: 1.45,
    financialClearance: 'CLEARED',
    departmentalClearance: 'CLEARED'
  };

  let mockAnalyticsApi: any;
  let mockSchedulingApi: any;
  let mockEnrollmentApi: any;
  let mockAuthService: any;
  let messageService: MessageService;

  beforeEach(async () => {
    mockAnalyticsApi = {
      getCurrentStudentAttendanceSlice: vi.fn().mockReturnValue(of({
        content: [mockAttendanceRecord],
        currentPage: 0,
        pageSize: 50,
        totalElements: 1,
        totalPages: 1,
        hasNext: false
      })),
      getStudentAttendanceSlice: vi.fn().mockReturnValue(of({
        content: [mockAttendanceRecord],
        currentPage: 0,
        pageSize: 50,
        totalElements: 1,
        totalPages: 1,
        hasNext: false
      })),
      scanAttendance: vi.fn().mockReturnValue(of(mockAttendanceRecord)),
      getDailyAttendance: vi.fn().mockReturnValue(of([mockAttendanceRecord])),
      verifyCreatorAttendance: vi.fn().mockReturnValue(of({
        recordId: 88,
        sessionId: 12,
        sectionCode: 'BSIT 3-A',
        courseCode: 'IT311',
        facultyUserId: 1,
        facultyName: 'admin',
        facultyRole: 'ADMIN',
        attendanceStatus: 'PRESENT',
        isGeofenceValid: true,
        verifiedAt: '2026-09-25T10:00:00Z',
        deviceFingerprint: 'Admin-Console'
      })),
      getDailyFacultyAttendance: vi.fn().mockReturnValue(of([
        {
          recordId: 88,
          sessionId: 12,
          sectionCode: 'BSIT 3-A',
          courseCode: 'IT311',
          facultyUserId: 1,
          facultyName: 'admin',
          facultyRole: 'ADMIN',
          attendanceStatus: 'PRESENT',
          isGeofenceValid: true,
          verifiedAt: '2026-09-25T10:00:00Z',
          deviceFingerprint: 'Admin-Console'
        }
      ])),
      startAttendanceSession: vi.fn().mockReturnValue(of({
        sessionId: 12,
        sectionScheduleId: 1,
        qrSeed: 'QR-ATT-TEST1234',
        expiresAt: '2026-09-25T09:00:00Z',
        latitude: 10.7202,
        longitude: 122.5621,
        allowedRadiusMeters: 50,
        qrCodeDataUrl: ''
      })),
      subscribeToSessionStream: vi.fn().mockReturnValue(of(mockAttendanceRecord))
    };

    mockSchedulingApi = {
      getSchedulingTerms: vi.fn().mockReturnValue(of([{ id: 1, name: '1st Sem', isActive: true }])),
      getSectionsByTerm: vi.fn().mockReturnValue(of([
        {
          id: 1,
          sectionCode: 'BSIT 3-A',
          courseCode: 'IT311',
          courseTitle: 'Enterprise Arch',
          schedules: [{ id: 10, dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '10:00', roomCode: 'Lab 1' }]
        }
      ]))
    };

    mockEnrollmentApi = {
      getCurrentStudentProfile: vi.fn().mockReturnValue(of(mockStudentProfile))
    };

    mockAuthService = {
      hasRole: vi.fn((role: string) => role === 'STUDENT'),
      getUserId: vi.fn().mockReturnValue(100),
      currentUser: vi.fn().mockReturnValue({ id: 100, username: 'alice', role: 'STUDENT', roles: ['STUDENT'] })
    };

    await TestBed.configureTestingModule({
      imports: [QrAttendanceScannerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: AnalyticsApiService, useValue: mockAnalyticsApi },
        { provide: SchedulingApiService, useValue: mockSchedulingApi },
        { provide: EnrollmentApiService, useValue: mockEnrollmentApi },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    messageService = TestBed.inject(MessageService);
    vi.spyOn(messageService, 'add');

    fixture = TestBed.createComponent(QrAttendanceScannerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize student view and load personal attendance history only for STUDENT role', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.isStudent()).toBe(true);

    // Should load student profile and student attendance history
    expect(mockEnrollmentApi.getCurrentStudentProfile).toHaveBeenCalled();
    expect(mockAnalyticsApi.getCurrentStudentAttendanceSlice).toHaveBeenCalled();

    // Should NOT call instructor management scheduling or daily attendance
    expect(mockSchedulingApi.getSchedulingTerms).not.toHaveBeenCalled();
    expect(mockAnalyticsApi.getDailyAttendance).not.toHaveBeenCalled();

    // Verify personal history metrics
    expect(component.studentHistoryRecords().length).toBe(1);
    expect(component.studentTotalSessions()).toBe(1);
    expect(component.studentPresentCount()).toBe(1);
    expect(component.studentOnTimeRate()).toBe(100);
    expect(component.studentGeofenceRate()).toBe(100);
  });

  it('should verify geofenced attendance scan and prepend to student personal history', () => {
    fixture.detectChanges();

    component.qrSeedInput.set('QR-ATT-TEST1234');

    const newScanRecord: AttendanceRecordResponse = {
      ...mockAttendanceRecord,
      recordId: 502,
      courseCode: 'IT312',
      sectionCode: 'BSIT 3-A',
      scannedAt: '2026-09-25T10:15:00Z'
    };
    mockAnalyticsApi.scanAttendance.mockReturnValue(of(newScanRecord));

    component.scanAttendance();

    expect(mockAnalyticsApi.scanAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        qrSeed: 'QR-ATT-TEST1234',
        studentId: 10
      })
    );

    // Should have updated student history
    expect(component.studentHistoryRecords().length).toBe(2);
    expect(component.studentHistoryRecords()[0].recordId).toBe(502);
    expect(component.scanResult()).toEqual(newScanRecord);
    expect(component.qrSeedInput()).toBe('');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Attendance Verified'
      })
    );
  });

  it('should toggle camera state cleanly', () => {
    expect(component.isCameraActive()).toBe(false);
    component.toggleCameraScanner();
    // In node/vitest environment without real webcam, camera falls back cleanly
    component.stopCameraScanner();
    expect(component.isCameraActive()).toBe(false);
  });

  it('should verify faculty/host presence separately when non-student clicks verify geofenced attendance scan and not add to student records', () => {
    // Switch to non-student (FACULTY/ADMIN) role
    mockAuthService.hasRole.mockImplementation((role: string) => role === 'ADMIN' || role === 'FACULTY');
    fixture = TestBed.createComponent(QrAttendanceScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isStudent()).toBe(false);

    component.qrSeedInput.set('QR-ATT-HOST123');
    component.verifyCreatorAttendance();

    expect(mockAnalyticsApi.verifyCreatorAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        qrSeed: 'QR-ATT-HOST123'
      })
    );

    // Must NOT call student scan attendance
    expect(mockAnalyticsApi.scanAttendance).not.toHaveBeenCalled();

    // Faculty records should be populated
    expect(component.facultyDailyRecords().length).toBeGreaterThan(0);
    expect(component.creatorScanResult()).not.toBeNull();
    expect(component.creatorScanResult()?.facultyName).toBe('admin');

    // Daily student records must NOT include the admin/faculty account
    const adminInStudentList = component.dailyRecords().some(r => r.studentName === 'admin');
    expect(adminInStudentList).toBe(false);

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Conductor Attendance Verified'
      })
    );
  });
});
