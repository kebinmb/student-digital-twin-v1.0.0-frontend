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
    expect(component.isCameraStarting()).toBe(false);
    component.toggleCameraScanner();
    component.stopCameraScanner();
    expect(component.isCameraActive()).toBe(false);
    expect(component.isCameraStarting()).toBe(false);
  });

  it('should warn when accessed in an insecure context (HTTP)', async () => {
    const originalSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });

    await component.startCameraScanner();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Secure Connection Required (HTTPS)'
      })
    );
    expect(component.isCameraActive()).toBe(false);
    expect(component.isCameraStarting()).toBe(false);

    Object.defineProperty(window, 'isSecureContext', { value: originalSecureContext, configurable: true });
  });

  it('should report camera permission denied when getUserMedia rejects with NotAllowedError', async () => {
    const originalSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    const mockGetUserMedia = vi.fn().mockRejectedValue({ name: 'NotAllowedError', message: 'Permission denied' });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true
    });

    await component.startCameraScanner();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Camera Permission Denied'
      })
    );
    expect(component.isCameraActive()).toBe(false);
    expect(component.isCameraStarting()).toBe(false);

    Object.defineProperty(window, 'isSecureContext', { value: originalSecureContext, configurable: true });
  });

  it('should report no camera detected when getUserMedia rejects with NotFoundError', async () => {
    const originalSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    const mockGetUserMedia = vi.fn().mockRejectedValue({ name: 'NotFoundError', message: 'Requested device not found' });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true
    });

    await component.startCameraScanner();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        summary: 'No Camera Detected'
      })
    );
    expect(component.isCameraActive()).toBe(false);
    expect(component.isCameraStarting()).toBe(false);

    Object.defineProperty(window, 'isSecureContext', { value: originalSecureContext, configurable: true });
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

  describe('GPS Telemetry & Geofence Diagnostics Suite', () => {
    let originalSecureContext: boolean;
    let originalGeolocation: any;

    beforeEach(() => {
      originalSecureContext = window.isSecureContext;
      originalGeolocation = navigator.geolocation;
      Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(window, 'isSecureContext', { value: originalSecureContext, configurable: true });
      Object.defineProperty(navigator, 'geolocation', { value: originalGeolocation, configurable: true });
    });

    it('should successfully acquire high-accuracy GPS coordinates and update telemetry signals', () => {
      const mockPosition = {
        coords: {
          latitude: 10.7428,
          longitude: 122.9694,
          accuracy: 12.5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      const mockGetCurrentPosition = vi.fn().mockImplementation((success) => success(mockPosition));
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        configurable: true
      });

      component.refreshGpsTelemetry();

      expect(component.gpsStatus()).toBe('ACQUIRED');
      expect(component.gpsCoordinates()).toEqual({ latitude: 10.7428, longitude: 122.9694 });
      expect(component.gpsAccuracy()).toBe(12.5);
      expect(component.gpsErrorMessage()).toBeNull();
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: 'GPS Telemetry Acquired'
        })
      );
    });

    it('should fallback to Tier 2 network positioning when Tier 1 high-accuracy times out', () => {
      const fallbackPosition = {
        coords: {
          latitude: 10.7425,
          longitude: 122.9690,
          accuracy: 45.0,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      let callCount = 0;
      const mockGetCurrentPosition = vi.fn().mockImplementation((success, error, options) => {
        callCount++;
        if (callCount === 1) {
          expect(options?.enableHighAccuracy).toBe(true);
          error({ code: 3, message: 'Timeout expired' });
        } else if (callCount === 2) {
          expect(options?.enableHighAccuracy).toBe(false);
          success(fallbackPosition);
        }
      });

      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        configurable: true
      });

      const cb = vi.fn();
      component.obtainGeolocation(cb);

      expect(callCount).toBe(2);
      expect(component.gpsStatus()).toBe('ACQUIRED');
      expect(component.gpsCoordinates()).toEqual({ latitude: 10.7425, longitude: 122.9690 });
      expect(component.gpsAccuracy()).toBe(45.0);
      expect(cb).toHaveBeenCalledWith(10.7425, 122.9690, 45.0);
    });

    it('should handle PERMISSION_DENIED immediately without retrying and pass null coordinates (never 0, 0)', () => {
      const mockGetCurrentPosition = vi.fn().mockImplementation((success, error) => {
        error({ code: 1, message: 'User denied Geolocation' });
      });

      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        configurable: true
      });

      const cb = vi.fn();
      component.obtainGeolocation(cb);

      // Must not retry
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
      expect(component.gpsStatus()).toBe('ERROR');
      expect(component.gpsPermissionState()).toBe('denied');
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          summary: 'GPS Telemetry Unavailable'
        })
      );
      // Crucial: Must be null, NOT (0, 0)
      expect(cb).toHaveBeenCalledWith(null, null, null);
    });

    it('should warn and pass null coordinates when origin is not a secure context', () => {
      Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });

      const cb = vi.fn();
      component.obtainGeolocation(cb);

      expect(component.gpsStatus()).toBe('ERROR');
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          summary: 'HTTPS Required for GPS'
        })
      );
      expect(cb).toHaveBeenCalledWith(null, null, null);
    });

    it('should open GPS diagnostics dialog and query permission state', () => {
      expect(component.showGpsDiagnosticsDialog()).toBe(false);
      component.openGpsDiagnostics();
      expect(component.showGpsDiagnosticsDialog()).toBe(true);
    });
  });

  describe('Academic Leadership (DEAN & CHAIRPERSON) QR Attendance Authorization', () => {
    it('should allow presentation mode for DEAN when assigned teaching schedules exist', () => {
      mockAuthService.currentUser.mockReturnValue({
        id: 25,
        username: 'dean.moraca',
        role: 'DEAN',
        roles: ['DEAN']
      });

      component.scheduleOptions.set([
        { label: '[BSIT 3-A] IT311: Web Systems (Mon 08:00-11:00 - CL1)', value: 101 }
      ]);

      expect(component.isPresentationAllowed()).toBe(true);
    });

    it('should allow presentation mode for CHAIRPERSON when assigned teaching schedules exist', () => {
      mockAuthService.currentUser.mockReturnValue({
        id: 35,
        username: 'chair.moraca',
        role: 'CHAIRPERSON',
        roles: ['CHAIRPERSON']
      });

      component.scheduleOptions.set([
        { label: '[BSIS 2-B] IS201: Systems Analysis (Wed 13:00-16:00 - CL2)', value: 202 }
      ]);

      expect(component.isPresentationAllowed()).toBe(true);
    });

    it('should disallow presentation mode for DEAN when no teaching schedules exist', () => {
      mockAuthService.currentUser.mockReturnValue({
        id: 25,
        username: 'dean.moraca',
        role: 'DEAN',
        roles: ['DEAN']
      });

      component.scheduleOptions.set([]);
      expect(component.isPresentationAllowed()).toBe(false);
    });

    it('should disallow presentation mode for non-teaching administrative roles even if schedules exist', () => {
      const disallowedRoles = ['ADMIN', 'REGISTRAR', 'CASHIER', 'GUIDANCE', 'ACCOUNTANT'];
      for (const role of disallowedRoles) {
        mockAuthService.currentUser.mockReturnValue({
          id: 99,
          username: `user.${role.toLowerCase()}`,
          role: role,
          roles: [role]
        });

        component.scheduleOptions.set([
          { label: '[BSIT 1-A] CS111: Intro to Computing', value: 999 }
        ]);

        expect(component.isPresentationAllowed()).toBe(false);
      }
    });

    it('should filter sections to only schedules assigned to the Dean/Chairperson user ID', () => {
      mockAuthService.currentUser.mockReturnValue({
        id: 25,
        username: 'dean.moraca',
        role: 'DEAN',
        roles: ['DEAN']
      });
      mockAuthService.getUserId.mockReturnValue(25);

      mockSchedulingApi.getSectionsByTerm.mockReturnValue(of([
        {
          id: 1,
          sectionCode: 'BSIT 3-A',
          courseCode: 'IT311',
          courseTitle: 'Web Systems',
          schedules: [
            { id: 101, instructorUserId: 25, dayOfWeek: 'MONDAY', startTime: '08:00:00', endTime: '11:00:00', roomCode: 'CL1' },
            { id: 102, instructorUserId: 88, dayOfWeek: 'WEDNESDAY', startTime: '08:00:00', endTime: '11:00:00', roomCode: 'CL1' } // Other faculty
          ]
        },
        {
          id: 2,
          sectionCode: 'BSIT 3-B',
          courseCode: 'IT312',
          courseTitle: 'Database Admin',
          schedules: [
            { id: 103, instructorUserId: 99, dayOfWeek: 'FRIDAY', startTime: '13:00:00', endTime: '16:00:00', roomCode: 'CL2' } // Other faculty
          ]
        }
      ]));

      // Trigger fetchSectionsForTerm
      (component as any).fetchSectionsForTerm(10);

      // Should only contain slot 101 assigned to userId 25
      const opts = component.scheduleOptions();
      expect(opts.length).toBe(1);
      expect(opts[0].value).toBe(101);
      expect(opts[0].label).toContain('BSIT 3-A');
    });
  });
});
