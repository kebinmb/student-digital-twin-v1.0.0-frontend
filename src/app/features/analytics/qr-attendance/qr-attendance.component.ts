import { Component, inject, signal, computed, effect, OnInit, OnDestroy, ChangeDetectionStrategy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { KnobModule } from 'primeng/knob';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';

import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { SchedulingApiService } from '../../../core/service/scheduling/scheduling-api.service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';
import { AttendanceRecordResponse, AttendanceSessionResponse, FacultyAttendanceRecordResponse } from '../../../core/models/analytics.model';
import { StudentProfileResponse } from '../../../core/models/enrollment.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import jsQR from 'jsqr';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { OfflineAttendanceSyncService } from '../../../core/services/offline-attendance-sync.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { WS_TOPICS } from '../../../core/constants/websocket-topics.constants';

export interface ScheduleOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-qr-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
    TableModule,
    SelectModule,
    TooltipModule,
    KnobModule,
    ProgressBarModule,
    DialogModule,
    EmptyStateComponent
  ],
  templateUrl: './qr-attendance.component.html',
  styleUrl: './qr-attendance.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrAttendanceScannerComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  protected readonly offlineSyncService = inject(OfflineAttendanceSyncService);
  protected readonly periodStore = inject(AcademicPeriodStore);
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly schedulingApi = inject(SchedulingApiService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly messageService = inject(MessageService);
  private readonly wsService = inject(WebSocketService, { optional: true });

  private attendanceWsSub?: Subscription;
  private adminAttendanceWsSub?: Subscription;

  constructor() {
    effect(() => {
      const globalTermId = this.periodStore.selectedTermId();
      if (globalTermId) {
        if (this.isStudent()) {
          this.loadStudentProfileAndHistory();
        } else {
          this.fetchSectionsForTerm(globalTermId);
          this.loadDailyAttendance();
        }
      }
    });
  }

  @ViewChild('scannerVideo') scannerVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('presentationBox') presentationBoxRef?: ElementRef<HTMLElement>;

  readonly isStudent = computed(() => this.authService.hasRole('STUDENT'));
  readonly studentProfile = signal<StudentProfileResponse | null>(null);

  readonly activeSession = signal<AttendanceSessionResponse | null>(null);
  readonly scanResult = signal<AttendanceRecordResponse | null>(null);
  readonly creatorScanResult = signal<FacultyAttendanceRecordResponse | null>(null);
  readonly facultyDailyRecords = signal<FacultyAttendanceRecordResponse[]>([]);
  readonly isLoadingFaculty = signal<boolean>(false);
  readonly isVerifyingCreator = signal<boolean>(false);
  readonly qrSeedInput = signal<string>('');

  // Classroom QR Presentation Mode Signals
  readonly showPresentationDialog = signal<boolean>(false);
  readonly isFullscreenMode = signal<boolean>(false);
  readonly currentTimestamp = signal<number>(Date.now());
  private presentationTimer: ReturnType<typeof setInterval> | null = null;

  readonly isGenerating = signal<boolean>(false);
  readonly isScanning = signal<boolean>(false);
  readonly isCameraActive = signal<boolean>(false);
  readonly isCameraStarting = signal<boolean>(false);
  private cameraStream: MediaStream | null = null;
  private cameraScanTimer: ReturnType<typeof setInterval> | null = null;
  private barcodeDetectorInstance: any = null;

  // GPS Geolocation & Telemetry Signals
  readonly gpsStatus = signal<'IDLE' | 'ACQUIRING' | 'ACQUIRED' | 'ERROR'>('IDLE');
  readonly gpsAccuracy = signal<number | null>(null);
  readonly gpsCoordinates = signal<{ latitude: number; longitude: number } | null>(null);
  readonly gpsErrorMessage = signal<string | null>(null);
  readonly gpsPermissionState = signal<string>('unknown');
  readonly showGpsDiagnosticsDialog = signal<boolean>(false);
  readonly isSecureOrigin = computed(() => {
    if (typeof window === 'undefined') return true;
    return window.isSecureContext === true;
  });

  // Student Personal Attendance History
  readonly studentHistoryRecords = signal<AttendanceRecordResponse[]>([]);
  readonly isLoadingHistory = signal<boolean>(false);

  // Student Attendance Summary KPIs
  readonly studentTotalSessions = computed(() => this.studentHistoryRecords().length);
  readonly studentPresentCount = computed(() => this.studentHistoryRecords().filter(r => r.attendanceStatus === 'PRESENT').length);
  readonly studentLateCount = computed(() => this.studentHistoryRecords().filter(r => r.attendanceStatus === 'LATE').length);
  readonly studentOnTimeRate = computed(() => {
    const total = this.studentTotalSessions();
    if (total === 0) return 0;
    return Math.round((this.studentPresentCount() / total) * 100);
  });
  readonly studentGeofenceRate = computed(() => {
    const total = this.studentTotalSessions();
    if (total === 0) return 0;
    const valid = this.studentHistoryRecords().filter(r => r.isGeofenceValid).length;
    return Math.round((valid / total) * 100);
  });

  // Instructor section schedules (dynamically loaded from active terms & database)
  readonly scheduleOptions = signal<ScheduleOption[]>([]);
  readonly selectedScheduleId = signal<number | null>(null);

  // Instructor Daily Attendance Filters & Data
  readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly selectedFilterSectionId = signal<number | null>(null);
  readonly filterSectionOptions = signal<{ label: string; value: number | null }[]>([
    { label: 'All Assigned Sections', value: null }
  ]);
  readonly dailyRecords = signal<AttendanceRecordResponse[]>([]);
  readonly isLoadingDaily = signal<boolean>(false);

  // Instructor Daily Metrics
  readonly totalRecords = computed(() => this.dailyRecords().length);
  readonly presentCount = computed(() => this.dailyRecords().filter(r => r.attendanceStatus === 'PRESENT').length);
  readonly lateCount = computed(() => this.dailyRecords().filter(r => r.attendanceStatus === 'LATE').length);
  readonly absentCount = computed(() => this.dailyRecords().filter(r => r.attendanceStatus === 'ABSENT').length);
  readonly geofenceValidRate = computed(() => {
    const total = this.totalRecords();
    if (total === 0) return 100;
    const valid = this.dailyRecords().filter(r => r.isGeofenceValid).length;
    return Math.round((valid / total) * 100);
  });

  // Presentation Mode Authorization & Computeds
  readonly isPresentationAllowed = computed<boolean>(() => {
    const user = this.authService.currentUser();
    // Normalize user roles directly without relying on hasRole/hasAnyRole wildcard behaviors
    const rawRoles = user?.roles && user.roles.length > 0
      ? user.roles
      : (user?.role ? [user.role] : []);
    const normalizedRoles = rawRoles.map(r => r.replace(/^ROLE_/, '').toUpperCase());

    const allowedRoles = ['FACULTY', 'CHAIRPERSON', 'DEAN'];
    const disallowedRoles = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'CASHIER', 'STUDENT', 'GUIDANCE', 'ACCOUNTANT'];

    // 1. Must contain at least one of the allowed faculty academic leadership roles
    const hasAllowedRole = normalizedRoles.some(r => allowedRoles.includes(r));
    if (!hasAllowedRole) {
      return false;
    }

    // 2. Must NOT contain any explicitly disallowed administrative or non-academic roles
    const hasDisallowedRole = normalizedRoles.some(r => disallowedRoles.includes(r));
    if (hasDisallowedRole) {
      return false;
    }

    // 3. Authoritative schedule requirement - user must have at least one assigned class section schedule
    if (this.scheduleOptions().length === 0) {
      return false;
    }

    return true;
  });

  readonly canUsePresentationMode = computed<boolean>(() => {
    return this.isPresentationAllowed() && this.activeSession() !== null;
  });

  readonly presentationStatus = computed<'ACTIVE' | 'EXPIRING SOON' | 'EXPIRED'>(() => {
    const sess = this.activeSession();
    if (!sess?.expiresAt) return 'EXPIRED';
    const remainingMs = new Date(sess.expiresAt).getTime() - this.currentTimestamp();
    if (remainingMs <= 0) return 'EXPIRED';
    if (remainingMs <= 5 * 60 * 1000) return 'EXPIRING SOON';
    return 'ACTIVE';
  });

  readonly presentationCountdown = computed<string>(() => {
    const sess = this.activeSession();
    if (!sess?.expiresAt) return '00m 00s';
    const remainingMs = new Date(sess.expiresAt).getTime() - this.currentTimestamp();
    if (remainingMs <= 0) return 'EXPIRED (00m 00s)';
    const totalSecs = Math.floor(remainingMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  });

  readonly activeScheduleLabel = computed<string | null>(() => {
    const sess = this.activeSession();
    const targetId = sess?.sectionScheduleId || this.selectedScheduleId();
    if (!targetId) return null;
    const match = this.scheduleOptions().find(o => o.value === targetId);
    return match?.label || null;
  });

  readonly activeCourseCode = computed<string>(() => {
    const label = this.activeScheduleLabel();
    if (!label) return 'Classroom Session';
    const match = label.match(/\]\s*([^:]+):/);
    if (match) return match[1].trim();
    return label;
  });

  readonly activeSectionCode = computed<string>(() => {
    const label = this.activeScheduleLabel();
    if (!label) return 'Assigned Section';
    const match = label.match(/\[([^\]]+)\]/);
    if (match) return match[1].trim();
    return 'Assigned Section';
  });

  openPresentationMode(fullscreen: boolean = false): void {
    if (!this.canUsePresentationMode()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Access Restricted',
        detail: 'Presentation mode is available exclusively for faculty, chairpersons, and deans with active sessions and assigned schedules.'
      });
      return;
    }
    this.showPresentationDialog.set(true);
    this.startPresentationCountdown();
    if (fullscreen) {
      setTimeout(() => this.enterFullscreen(), 150);
    }
  }

  closePresentationMode(): void {
    this.showPresentationDialog.set(false);
    this.stopPresentationCountdown();
    if (this.isFullscreenMode()) {
      this.exitFullscreen();
    }
  }

  onPresentationDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closePresentationMode();
    } else {
      this.openPresentationMode(false);
    }
  }

  enterFullscreen(): void {
    const elem = this.presentationBoxRef?.nativeElement || document.documentElement;
    if (!elem) return;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => console.warn('Fullscreen request error:', err));
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    }
  }

  exitFullscreen(): void {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn('Exit fullscreen error:', err));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  }

  toggleFullscreen(): void {
    if (this.isFullscreenMode()) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  startPresentationCountdown(): void {
    this.stopPresentationCountdown();
    this.currentTimestamp.set(Date.now());
    this.presentationTimer = setInterval(() => {
      this.currentTimestamp.set(Date.now());
    }, 1000);
  }

  stopPresentationCountdown(): void {
    if (this.presentationTimer) {
      clearInterval(this.presentationTimer);
      this.presentationTimer = null;
    }
  }

  private readonly onFullscreenChange = (): void => {
    if (typeof document !== 'undefined') {
      this.isFullscreenMode.set(!!document.fullscreenElement);
    }
  };

  getSimpleCode(qrSeed?: string | null): string {
    if (!qrSeed) return '';
    return qrSeed.replace('ATT-', '').replace('QR-ATT-', '');
  }

  getInitials(name?: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private sseSub?: Subscription;
  private livePollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', this.onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
    }

    this.checkGpsPermissions();

    if (this.isStudent()) {
      // Resolve student profile and personal attendance history only
      this.loadStudentProfileAndHistory();
    } else {
      // Load instructor management schedules and daily section attendance
      this.loadAssignedSchedules();
      this.loadDailyAttendance();

      if (this.wsService) {
        this.adminAttendanceWsSub = this.wsService.watch<any>(WS_TOPICS.ADMIN_ATTENDANCE).subscribe({
          next: (msg) => {
            if (msg) {
              this.loadDailyAttendance();
            }
          }
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPresentationCountdown();
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', this.onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
    }

    if (this.sseSub) {
      this.sseSub.unsubscribe();
    }
    if (this.livePollTimer) {
      clearInterval(this.livePollTimer);
      this.livePollTimer = null;
    }
    if (this.attendanceWsSub) {
      this.attendanceWsSub.unsubscribe();
      this.attendanceWsSub = undefined;
    }
    if (this.adminAttendanceWsSub) {
      this.adminAttendanceWsSub.unsubscribe();
      this.adminAttendanceWsSub = undefined;
    }
    this.stopCameraScanner();
  }

  // =========================================================================
  // STUDENT SPECIFIC METHODS
  // =========================================================================
  loadStudentProfileAndHistory(): void {
    this.isLoadingHistory.set(true);

    this.enrollmentApi.getCurrentStudentProfile().subscribe({
      next: (profile) => {
        this.studentProfile.set(profile);
        this.loadStudentAttendanceHistory(profile.id);
      },
      error: () => {
        const studentId = this.authService.getStudentProfileId() || this.authService.getUserId();
        if (studentId) {
          this.loadStudentAttendanceHistory(studentId);
        } else {
          this.isLoadingHistory.set(false);
          this.studentHistoryRecords.set([]);
        }
      }
    });
  }

  loadStudentAttendanceHistory(studentId?: number): void {
    this.isLoadingHistory.set(true);

    const targetId = studentId || this.studentProfile()?.id || this.authService.getStudentProfileId() || this.authService.getUserId();
    if (this.wsService && targetId && targetId > 0 && !this.attendanceWsSub) {
      this.attendanceWsSub = this.wsService.watch<any>(WS_TOPICS.ATTENDANCE(targetId)).subscribe({
        next: (msg) => {
          if (msg) {
            this.analyticsApi.getCurrentStudentAttendanceSlice(0, 50).subscribe({
              next: (slice) => this.studentHistoryRecords.set(slice?.content || [])
            });
          }
        }
      });
    }

    // Prefer dedicated /student/me/slice endpoint
    this.analyticsApi.getCurrentStudentAttendanceSlice(0, 50).subscribe({
      next: (slice) => {
        this.studentHistoryRecords.set(slice?.content || []);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        // Fallback to numeric endpoint
        const fallbackId = targetId || 1;
        this.analyticsApi.getStudentAttendanceSlice(fallbackId, 0, 50).subscribe({
          next: (slice) => {
            this.studentHistoryRecords.set(slice?.content || []);
            this.isLoadingHistory.set(false);
          },
          error: () => {
            this.studentHistoryRecords.set([]);
            this.isLoadingHistory.set(false);
          }
        });
      }
    });
  }

  toggleCameraScanner(): void {
    if (this.isCameraStarting()) {
      return;
    }
    if (this.isCameraActive()) {
      this.stopCameraScanner();
    } else {
      this.startCameraScanner();
    }
  }

  async startCameraScanner(): Promise<void> {
    if (this.isCameraStarting() || this.isCameraActive()) {
      return;
    }

    this.isCameraStarting.set(true);

    try {
      const isAvailable = await this.checkCameraAvailability();
      if (!isAvailable) {
        return;
      }

      const constraintsList: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        { video: { facingMode: 'environment' } },
        { video: true }
      ];

      let stream: MediaStream | null = null;
      let lastError: any = null;

      for (let i = 0; i < constraintsList.length; i++) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraintsList[i]);
          if (stream) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errorName = err?.name || '';
          // If the user explicitly denied permission or security policy blocked access, stop retrying immediately
          if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorName === 'SecurityError') {
            break;
          }
          console.warn(`[QR Scanner] Camera constraint index ${i} failed (${errorName}):`, err);
        }
      }

      if (!stream) {
        this.handleCameraError(lastError);
        return;
      }

      this.cameraStream = stream;
      this.isCameraActive.set(true);

      // Robustly wait for #scannerVideo to be mounted in the DOM
      const video = await this.waitForScannerVideo();
      if (!video) {
        console.error('[QR Scanner] Scanner video element ref was not mounted within expected timeframe.');
        this.messageService.add({
          severity: 'error',
          summary: 'Video Viewport Error',
          detail: 'Failed to initialize the camera video viewport. Please try again or enter the code manually.',
          life: 6000
        });
        this.stopCameraScanner();
        return;
      }

      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.muted = true;
      video.srcObject = stream;

      try {
        await video.play();
      } catch (playErr) {
        console.warn('[QR Scanner] Video autoplay thwarted or interrupted:', playErr);
      }

      this.startQrDetection(video);
    } catch (unexpectedErr) {
      console.error('[QR Scanner] Unexpected camera error:', unexpectedErr);
      this.handleCameraError(unexpectedErr);
      this.stopCameraScanner();
    } finally {
      this.isCameraStarting.set(false);
    }
  }

  stopCameraScanner(): void {
    if (this.cameraScanTimer) {
      clearInterval(this.cameraScanTimer);
      this.cameraScanTimer = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('[QR Scanner] Error stopping media track:', e);
        }
      });
      this.cameraStream = null;
    }
    if (this.scannerVideoRef?.nativeElement) {
      try {
        this.scannerVideoRef.nativeElement.srcObject = null;
      } catch {
        // Ignore detachment errors
      }
    }
    this.barcodeDetectorInstance = null;
    this.isCameraActive.set(false);
    this.isCameraStarting.set(false);
  }

  private async checkCameraAvailability(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    // 1. Insecure Context Check (HTTP vs HTTPS / localhost)
    if (!window.isSecureContext) {
      this.messageService.add({
        severity: 'error',
        summary: 'Secure Connection Required (HTTPS)',
        detail: 'Camera access is disabled by browser security policies on unencrypted HTTP connections. Access the system over HTTPS or localhost, or enter the QR seed manually.',
        life: 8000
      });
      return false;
    }

    // 2. MediaDevices API support check
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Camera API Unavailable',
        detail: 'Camera media streaming APIs are not supported or are restricted in your browser. Please enter the QR code manually.',
        life: 7000
      });
      return false;
    }

    // 3. Permissions API Query (if supported by browser)
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permissionStatus.state === 'denied') {
          this.messageService.add({
            severity: 'error',
            summary: 'Camera Permission Denied',
            detail: 'Camera access is currently blocked for this site. Please enable camera permissions in your browser address bar or site settings.',
            life: 8000
          });
          return false;
        }
      } catch {
        // Permissions API for camera is unsupported in some browsers (e.g. Safari); ignore safely
      }
    }

    return true;
  }

  private async waitForScannerVideo(maxRetries = 20, delayMs = 50): Promise<HTMLVideoElement | null> {
    for (let i = 0; i < maxRetries; i++) {
      if (this.scannerVideoRef && this.scannerVideoRef.nativeElement) {
        return this.scannerVideoRef.nativeElement;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return null;
  }

  private handleCameraError(err: any): void {
    const errorName = err?.name || '';
    console.error('[QR Scanner] Camera error handled:', err);

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      this.messageService.add({
        severity: 'error',
        summary: 'Camera Permission Denied',
        detail: 'Camera permission was rejected. Please enable camera access in your browser or device permissions.',
        life: 7000
      });
    } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Camera Detected',
        detail: 'No camera hardware found on your device. Please use manual QR code entry.',
        life: 6000
      });
    } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      this.messageService.add({
        severity: 'error',
        summary: 'Camera Hardware In Use',
        detail: 'Could not access camera video stream. The camera may be locked or in use by another application or browser tab.',
        life: 7000
      });
    } else if (errorName === 'OverconstrainedError') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Camera Settings Unsupported',
        detail: 'The requested camera resolution or facing mode is not supported by your hardware. Please enter the QR code manually.',
        life: 6000
      });
    } else if (errorName === 'SecurityError') {
      this.messageService.add({
        severity: 'error',
        summary: 'Camera Access Restricted',
        detail: 'Camera access was blocked due to security policies, iframe restrictions, or an insecure origin.',
        life: 7000
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Camera Unavailable',
        detail: err?.message
          ? `Could not access camera: ${err.message}. Please enter the code manually.`
          : 'Could not access camera stream. Please enter or paste the QR attendance code manually.',
        life: 6000
      });
    }
  }

  private startQrDetection(video: HTMLVideoElement): void {
    if (this.cameraScanTimer) {
      clearInterval(this.cameraScanTimer);
      this.cameraScanTimer = null;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    // Initialize single reusable BarcodeDetector instance if supported
    if ('BarcodeDetector' in window) {
      try {
        this.barcodeDetectorInstance = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        console.warn('[QR Scanner] Native BarcodeDetector instantiation failed, using jsQR fallback:', e);
        this.barcodeDetectorInstance = null;
      }
    } else {
      this.barcodeDetectorInstance = null;
    }

    this.cameraScanTimer = setInterval(async () => {
      if (!this.isCameraActive() || !video || video.readyState < video.HAVE_ENOUGH_DATA) {
        return;
      }

      let scannedText: string | null = null;

      // 1. Try BarcodeDetector if natively supported by browser engine
      if (this.barcodeDetectorInstance) {
        try {
          const barcodes = await this.barcodeDetectorInstance.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            scannedText = barcodes[0].rawValue;
          }
        } catch {
          // Fallback to jsQR below
        }
      }

      // 2. Fallback to jsQR canvas processing (Works on ALL mobile devices / iOS Safari / Android)
      if (!scannedText && context && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data) {
            scannedText = code.data;
          }
        } catch {
          // Ignore frame extraction error
        }
      }

      if (scannedText) {
        this.qrSeedInput.set(scannedText);
        this.stopCameraScanner();
        this.scanAttendance();
      }
    }, 350);
  }

  scanAttendance(): void {
    if (!this.isStudent()) {
      this.verifyCreatorAttendance();
      return;
    }

    const seed = this.qrSeedInput().trim();
    if (!seed) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please enter or scan a valid QR attendance seed.' });
      return;
    }

    const currentProfile = this.studentProfile();
    if (!currentProfile) {
      this.isScanning.set(true);
      this.enrollmentApi.getCurrentStudentProfile().subscribe({
        next: (profile) => {
          this.studentProfile.set(profile);
          this.performScanRequest(seed, profile.id);
        },
        error: () => {
          const studentId = this.authService.getStudentProfileId() || this.authService.getUserId();
          if (studentId) {
            this.performScanRequest(seed, studentId);
          } else {
            this.isScanning.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Required',
              detail: 'Unable to identify current student profile for attendance scan.'
            });
          }
        }
      });
      return;
    }

    this.performScanRequest(seed, currentProfile.id);
  }

  verifyCreatorAttendance(): void {
    const seed = this.qrSeedInput().trim();
    if (!seed) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please enter or scan a valid QR attendance seed.' });
      return;
    }

    const fingerprint = (typeof navigator !== 'undefined' ? navigator.userAgent : null) || 'Conductor-Console';
    this.isScanning.set(true);
    this.isVerifyingCreator.set(true);

    this.obtainGeolocation((lat, lon) => {
      const validLat = (lat !== null && lat !== 0) ? lat : undefined;
      const validLon = (lon !== null && lon !== 0) ? lon : undefined;

      this.analyticsApi.verifyCreatorAttendance({
        qrSeed: seed,
        latitude: validLat,
        longitude: validLon,
        deviceFingerprint: fingerprint
      }).subscribe({
        next: (res) => {
          this.creatorScanResult.set(res);
          this.isScanning.set(false);
          this.isVerifyingCreator.set(false);
          this.qrSeedInput.set('');

          // Update faculty records idempotently
          this.facultyDailyRecords.update(prev => {
            const filtered = prev.filter(r => r.recordId !== res.recordId);
            return [res, ...filtered];
          });

          const geofenceNotice = res.isGeofenceValid ? 'with GPS Geofencing' : 'with Session Override (Geofence Out of Bounds / Bypassed)';
          this.messageService.add({
            severity: res.isGeofenceValid ? 'success' : 'warn',
            summary: 'Conductor Attendance Verified',
            detail: `Verified attendance for ${res.facultyName} (${res.facultyRole}) in ${res.courseCode || 'Section'} (${res.sectionCode || 'Session'}) ${geofenceNotice}!`
          });
        },
        error: (err) => {
          this.isScanning.set(false);
          this.isVerifyingCreator.set(false);
          const errorMsg = err?.error?.detail || err?.error?.message || 'Geofence verification failed or QR code expired.';
          this.messageService.add({
            severity: 'error',
            summary: 'Verification Failed',
            detail: errorMsg
          });
        }
      });
    });
  }

  private performScanRequest(seed: string, studentId: number): void {
    const fingerprint = (typeof navigator !== 'undefined' ? navigator.userAgent : null) || 'Browser-Client';

    this.isScanning.set(true);
    this.obtainGeolocation((lat, lon) => {
      const validLat = (lat !== null && lat !== 0) ? lat : null;
      const validLon = (lon !== null && lon !== 0) ? lon : null;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.offlineSyncService.enqueueScan(seed, studentId, validLat, validLon, fingerprint);
        this.isScanning.set(false);
        this.qrSeedInput.set('');
        this.messageService.add({
          severity: 'warn',
          summary: 'Offline Check-In Queued',
          detail: 'Offline network detected. Your check-in was saved locally and will auto-upload when back online.'
        });
        return;
      }

      this.analyticsApi.scanAttendance({
        qrSeed: seed,
        studentId: studentId,
        latitude: validLat ?? undefined,
        longitude: validLon ?? undefined,
        deviceFingerprint: fingerprint
      }).subscribe({
        next: (res) => {
          this.scanResult.set(res);
          this.isScanning.set(false);
          this.qrSeedInput.set('');

          // Prepend verified record to student's personal attendance history & daily student log
          this.studentHistoryRecords.update(prev => [res, ...prev.filter(r => r.recordId !== res.recordId)]);
          this.dailyRecords.update(prev => [res, ...prev.filter(r => r.recordId !== res.recordId)]);

          const geofenceNotice = res.isGeofenceValid ? 'with GPS Geofence Verification!' : '(Geofence Out of Bounds / Bypassed)';
          this.messageService.add({
            severity: res.isGeofenceValid ? 'success' : 'warn',
            summary: 'Attendance Verified',
            detail: `Checked in for ${res.courseCode} (${res.sectionCode}) ${geofenceNotice}`
          });
        },
        error: (err) => {
          this.isScanning.set(false);
          if (err?.status === 0 || (typeof navigator !== 'undefined' && !navigator.onLine)) {
            this.offlineSyncService.enqueueScan(seed, studentId, validLat, validLon, fingerprint);
            this.qrSeedInput.set('');
            this.messageService.add({
              severity: 'warn',
              summary: 'Offline Check-In Queued',
              detail: 'Connection interrupted. Check-in saved locally and will sync when network is restored.'
            });
            return;
          }

          const errorMsg = err?.error?.detail || err?.error?.message || 'Geofence verification failed or QR code expired.';
          this.messageService.add({
            severity: 'error',
            summary: 'Check-In Failed',
            detail: errorMsg
          });
        }
      });
    });
  }

  async triggerSyncQueue(): Promise<void> {
    const res = await this.offlineSyncService.syncQueue();
    if (res.synced > 0) {
      for (const rec of res.records) {
        this.studentHistoryRecords.update(prev => [rec, ...prev.filter(r => r.recordId !== rec.recordId)]);
        this.dailyRecords.update(prev => [rec, ...prev.filter(r => r.recordId !== rec.recordId)]);
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Offline Scans Synced',
        detail: `Successfully uploaded ${res.synced} offline attendance record(s).`
      });
    } else if (res.failed > 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sync Attention Needed',
        detail: `${res.failed} offline scan(s) failed validation.`
      });
    }
  }

  readonly showOfflineQueueDialog = signal<boolean>(false);

  openOfflineQueueModal(): void {
    this.showOfflineQueueDialog.set(true);
  }

  dismissOfflineItem(id: string): void {
    this.offlineSyncService.dismissItem(id);
    this.messageService.add({
      severity: 'info',
      summary: 'Scan Dismissed',
      detail: 'Offline scan removed from local resolution queue.'
    });
  }

  retryOfflineItem(id: string): void {
    this.offlineSyncService.retryItem(id);
  }

  clearAllOfflineScans(): void {
    this.offlineSyncService.clearQueue();
    this.showOfflineQueueDialog.set(false);
    this.messageService.add({
      severity: 'info',
      summary: 'Queue Cleared',
      detail: 'All offline attendance scans have been cleared.'
    });
  }

  // =========================================================================
  // INSTRUCTOR / FACULTY SPECIFIC METHODS
  // =========================================================================
  loadAssignedSchedules(): void {
    const termId = this.periodStore.selectedTermId();
    if (termId) {
      this.fetchSectionsForTerm(termId);
      return;
    }
    this.schedulingApi.getSchedulingTerms().subscribe({
      next: (terms) => {
        const activeTerm = terms && terms.length > 0 ? (terms.find(t => t.isActive) || terms[0]) : null;
        if (activeTerm) {
          this.fetchSectionsForTerm(activeTerm.id);
        } else {
          this.scheduleOptions.set([]);
          this.selectedScheduleId.set(null);
          this.dailyRecords.set([]);
          this.activeSession.set(null);
        }
      },
      error: () => {
        this.scheduleOptions.set([]);
        this.selectedScheduleId.set(null);
        this.dailyRecords.set([]);
        this.activeSession.set(null);
      }
    });
  }

  private fetchSectionsForTerm(termId: number): void {
    this.schedulingApi.getSectionsByTerm(termId).subscribe({
      next: (sections) => {
        if (sections && sections.length > 0) {
          const options: ScheduleOption[] = [];
          const filterOpts: { label: string; value: number | null }[] = [{ label: 'All Assigned Sections', value: null }];

          const currentUserId = this.authService.getUserId();
          const user = this.authService.currentUser();
          const rawRoles = user?.roles && user.roles.length > 0 ? user.roles : (user?.role ? [user.role] : []);
          const normalizedRoles = rawRoles.map(r => r.replace(/^ROLE_/, '').toUpperCase());
          const isAcademicLeader = normalizedRoles.includes('DEAN') || normalizedRoles.includes('CHAIRPERSON');

          sections.forEach(sec => {
            if (sec.schedules && sec.schedules.length > 0) {
              sec.schedules.forEach(sch => {
                // If Dean or Chairperson, only include schedule slots specifically assigned to their teaching load
                if (isAcademicLeader && currentUserId !== null && sch.instructorUserId && sch.instructorUserId !== currentUserId) {
                  return;
                }
                const dayStr = sch.dayOfWeek ? sch.dayOfWeek.substring(0, 3) : 'TBA';
                const timeStr = sch.startTime ? ` ${sch.startTime.substring(0, 5)}-${sch.endTime ? sch.endTime.substring(0, 5) : ''}` : '';
                const roomStr = sch.roomCode ? ` - ${sch.roomCode}` : '';
                options.push({
                  label: `[${sec.sectionCode}] ${sec.courseCode}: ${sec.courseTitle} (${dayStr}${timeStr}${roomStr})`,
                  value: sch.id
                });
              });
            } else if (!isAcademicLeader) {
              options.push({
                label: `[${sec.sectionCode}] ${sec.courseCode}: ${sec.courseTitle}`,
                value: sec.id
              });
            }

            if (!isAcademicLeader || (sec.schedules && sec.schedules.some(s => currentUserId === null || s.instructorUserId === currentUserId))) {
              filterOpts.push({
                label: `[${sec.sectionCode}] ${sec.courseCode}`,
                value: sec.id
              });
            }
          });

          this.scheduleOptions.set(options);
          this.filterSectionOptions.set(filterOpts);
          if (options.length > 0 && !this.selectedScheduleId()) {
            this.selectedScheduleId.set(options[0].value);
          } else if (options.length === 0) {
            this.selectedScheduleId.set(null);
          }
        } else {
          this.scheduleOptions.set([]);
          this.selectedScheduleId.set(null);
          this.dailyRecords.set([]);
          this.activeSession.set(null);
          this.filterSectionOptions.set([{ label: 'All Assigned Sections', value: null }]);
        }
      },
      error: () => {
        this.scheduleOptions.set([]);
        this.selectedScheduleId.set(null);
        this.dailyRecords.set([]);
        this.activeSession.set(null);
        this.filterSectionOptions.set([{ label: 'All Assigned Sections', value: null }]);
      }
    });
  }

  loadDailyAttendance(): void {
    this.isLoadingDaily.set(true);
    const dateStr = this.selectedDate();
    const sectionId = this.selectedFilterSectionId();
    this.analyticsApi.getDailyAttendance(dateStr, sectionId || undefined).subscribe({
      next: (records) => {
        if (records && records.length > 0) {
          this.dailyRecords.set(records);
          this.isLoadingDaily.set(false);
        } else {
          this.analyticsApi.getDailyAttendance(undefined, sectionId || undefined).subscribe({
            next: (allRecords) => {
              this.dailyRecords.set(allRecords || []);
              this.isLoadingDaily.set(false);
            },
            error: () => {
              this.dailyRecords.set([]);
              this.isLoadingDaily.set(false);
            }
          });
        }
      },
      error: () => {
        this.analyticsApi.getDailyAttendance(undefined, sectionId || undefined).subscribe({
          next: (allRecords) => {
            this.dailyRecords.set(allRecords || []);
            this.isLoadingDaily.set(false);
          },
          error: () => {
            this.dailyRecords.set([]);
            this.isLoadingDaily.set(false);
          }
        });
      }
    });

    this.loadDailyFacultyAttendance();
  }

  loadDailyFacultyAttendance(): void {
    this.isLoadingFaculty.set(true);
    const dateStr = this.selectedDate();
    const sectionId = this.selectedFilterSectionId();
    this.analyticsApi.getDailyFacultyAttendance(dateStr, sectionId || undefined).subscribe({
      next: (records) => {
        if (records && records.length > 0) {
          this.facultyDailyRecords.set(records);
          this.isLoadingFaculty.set(false);
        } else {
          this.analyticsApi.getDailyFacultyAttendance(undefined, sectionId || undefined).subscribe({
            next: (allRecords) => {
              this.facultyDailyRecords.set(allRecords || []);
              this.isLoadingFaculty.set(false);
            },
            error: () => {
              this.facultyDailyRecords.set([]);
              this.isLoadingFaculty.set(false);
            }
          });
        }
      },
      error: () => {
        this.analyticsApi.getDailyFacultyAttendance(undefined, sectionId || undefined).subscribe({
          next: (allRecords) => {
            this.facultyDailyRecords.set(allRecords || []);
            this.isLoadingFaculty.set(false);
          },
          error: () => {
            this.facultyDailyRecords.set([]);
            this.isLoadingFaculty.set(false);
          }
        });
      }
    });
  }

  onDateChange(event: Event | string): void {
    const val = typeof event === 'string' ? event : (event?.target as HTMLInputElement)?.value;
    if (val) {
      this.selectedDate.set(val);
      this.loadDailyAttendance();
    }
  }

  onFilterSectionChange(sectionId: number | null): void {
    this.selectedFilterSectionId.set(sectionId);
    this.loadDailyAttendance();
  }

  listenToLiveSessionStream(sessionId: number): void {
    if (this.sseSub) {
      this.sseSub.unsubscribe();
    }
    this.sseSub = this.analyticsApi.subscribeToSessionStream(sessionId).subscribe({
      next: (record) => {
        this.dailyRecords.update(prev => {
          const exists = prev.some(r => r.recordId === record.recordId);
          return exists ? prev.map(r => r.recordId === record.recordId ? record : r) : [record, ...prev];
        });
        this.messageService.add({ severity: 'info', summary: 'Live Student Check-In', detail: `${record.studentName} checked in via QR scan!` });
      },
      error: (err) => {
        console.warn('SSE stream inactive or unseeded:', err);
      }
    });

    if (this.livePollTimer) {
      clearInterval(this.livePollTimer);
    }
    this.livePollTimer = setInterval(() => {
      const dateStr = this.selectedDate();
      const sectionId = this.selectedFilterSectionId();
      this.analyticsApi.getDailyAttendance(dateStr, sectionId || undefined).subscribe({
        next: (records) => {
          if (records) {
            this.dailyRecords.set(records);
          }
        }
      });
    }, 3000);
  }

  startClassSession(scheduleId?: number): void {
    const targetId = scheduleId || this.selectedScheduleId();
    if (!targetId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Schedule Required',
        detail: 'Please select an assigned class schedule before generating QR attendance.'
      });
      return;
    }
    this.isGenerating.set(true);
    this.obtainGeolocation((lat, lon) => {
      const validLat = (lat !== null && lat !== 0) ? lat : undefined;
      const validLon = (lon !== null && lon !== 0) ? lon : undefined;

      this.analyticsApi.startAttendanceSession({
        sectionScheduleId: targetId,
        latitude: validLat,
        longitude: validLon,
        allowedRadiusMeters: 50
      }).subscribe({
        next: (session) => {
          this.activeSession.set(session);
          this.qrSeedInput.set(session.qrSeed);
          this.isGenerating.set(false);
          const locationNote = (validLat !== undefined && validLon !== undefined)
            ? `active at (${validLat.toFixed(4)}, ${validLon.toFixed(4)})`
            : `active with campus centroid bounds`;
          this.messageService.add({
            severity: 'success',
            summary: 'QR Session Generated',
            detail: `Dynamic 15-min QR Attendance Session ${locationNote}.`
          });
          this.loadDailyAttendance();
          this.listenToLiveSessionStream(session.sessionId);
        },
        error: (err) => {
          this.isGenerating.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Session Failed',
            detail: err?.error?.detail || err?.error?.message || 'Could not start attendance session.'
          });
        }
      });
    });
  }

  exportAttendanceCsv(): void {
    const records = this.dailyRecords();
    if (!records || records.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Export Warning', detail: 'No attendance records available for export.' });
      return;
    }

    const headers = ['Scanned At', 'Student Name', 'Student Number', 'Section Code', 'Course Code', 'Status', 'Geofence Valid', 'Device Fingerprint'];
    const rows = records.map(r => [
      r.scannedAt || '',
      `"${r.studentName || ''}"`,
      `"${r.studentNumber || ''}"`,
      `"${r.sectionCode || ''}"`,
      `"${r.courseCode || ''}"`,
      r.attendanceStatus || 'PRESENT',
      r.isGeofenceValid ? 'YES' : 'NO',
      `"${r.deviceFingerprint || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Log_${this.selectedDate()}_${this.selectedFilterSectionId() || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.messageService.add({ severity: 'success', summary: 'CSV Exported', detail: `Downloaded ${records.length} telemetry records as CSV.` });
  }

  // =========================================================================
  // GPS TELEMETRY & DIAGNOSTICS METHODS
  // =========================================================================
  checkGpsPermissions(): void {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        this.gpsPermissionState.set(result.state);
        result.onchange = () => {
          this.gpsPermissionState.set(result.state);
        };
      }).catch(() => {
        this.gpsPermissionState.set('unknown');
      });
    }
  }

  openGpsDiagnostics(): void {
    this.checkGpsPermissions();
    this.showGpsDiagnosticsDialog.set(true);
  }

  refreshGpsTelemetry(): void {
    this.obtainGeolocation((lat, lon, acc) => {
      if (lat !== null && lon !== null) {
        this.messageService.add({
          severity: 'success',
          summary: 'GPS Telemetry Acquired',
          detail: `Coordinates: (${lat.toFixed(6)}, ${lon.toFixed(6)}) with ±${Math.round(acc ?? 0)}m precision.`
        });
      }
    });
  }

  obtainGeolocation(callback: (lat: number | null, lon: number | null, accuracy: number | null) => void): void {
    // 1. Guard against non-browser environments (SSR)
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      callback(null, null, null);
      return;
    }

    // 2. Guard against Insecure Context (HTTP over IP / LAN)
    if (!window.isSecureContext) {
      this.gpsStatus.set('ERROR');
      const errorMsg = 'Insecure Context: Geolocation API requires HTTPS or localhost. Modern browsers block GPS access over plain HTTP (e.g. http://192.168.x.x).';
      this.gpsErrorMessage.set(errorMsg);
      this.messageService.add({
        severity: 'warn',
        summary: 'HTTPS Required for GPS',
        detail: 'Geolocation requires a secure HTTPS connection or localhost. Check-in will proceed without GPS geofencing.',
        life: 8000
      });
      callback(null, null, null);
      return;
    }

    // 3. Guard against unsupported Geolocation API
    if (!('geolocation' in navigator)) {
      this.gpsStatus.set('ERROR');
      const errorMsg = 'Browser does not support Geolocation API.';
      this.gpsErrorMessage.set(errorMsg);
      this.messageService.add({
        severity: 'warn',
        summary: 'Geolocation Unsupported',
        detail: 'Browser geolocation is unavailable on this device. Attendance will proceed without GPS coordinates.',
        life: 6000
      });
      callback(null, null, null);
      return;
    }

    this.gpsStatus.set('ACQUIRING');
    this.gpsErrorMessage.set(null);

    // Tier 1: High Accuracy GPS (Satellites + Wi-Fi) with 12s timeout and 30s cache tolerance
    const tier1Options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000
    };

    // Tier 2: Low-accuracy fallback (Cellular / IP / Network triangulation) with 7s timeout and 60s cache tolerance
    const tier2Options: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 7000,
      maximumAge: 60000
    };

    const handleSuccess = (pos: GeolocationPosition) => {
      this.gpsStatus.set('ACQUIRED');
      this.gpsCoordinates.set({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      this.gpsAccuracy.set(pos.coords.accuracy);
      this.gpsErrorMessage.set(null);
      callback(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    };

    const handleFinalError = (err: GeolocationPositionError) => {
      console.warn('[QR Attendance] Geolocation lookup failed:', err.code, err.message);
      this.gpsStatus.set('ERROR');
      let userMsg = '';

      switch (err.code) {
        case 1: // PERMISSION_DENIED
          userMsg = 'Location permission was denied. Please allow location access in your browser or device settings to verify geofence.';
          this.gpsPermissionState.set('denied');
          break;
        case 2: // POSITION_UNAVAILABLE
          userMsg = 'Position unavailable. Please ensure your device GPS or Location Services are enabled.';
          break;
        case 3: // TIMEOUT
          userMsg = 'GPS acquisition timed out indoors. Attendance will proceed without precise GPS coordinates.';
          break;
        default:
          userMsg = err.message || 'Could not acquire precise GPS telemetry.';
          break;
      }

      this.gpsErrorMessage.set(userMsg);
      this.messageService.add({
        severity: 'warn',
        summary: 'GPS Telemetry Unavailable',
        detail: userMsg,
        life: 7000
      });
      // CRITICAL: NEVER pass (0, 0)! Pass null to prevent 13,000km Null Island geofence violations
      callback(null, null, null);
    };

    try {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (tier1Err) => {
          // If permission was explicitly denied, do NOT retry - fail immediately
          if (tier1Err.code === 1) { // PERMISSION_DENIED
            handleFinalError(tier1Err);
            return;
          }

          // Otherwise (TIMEOUT or POSITION_UNAVAILABLE), attempt Tier 2 fallback with network positioning
          console.info('[QR Attendance] Tier 1 high-accuracy GPS failed. Attempting Tier 2 network positioning fallback...');
          try {
            navigator.geolocation.getCurrentPosition(
              handleSuccess,
              handleFinalError,
              tier2Options
            );
          } catch {
            handleFinalError(tier1Err);
          }
        },
        tier1Options
      );
    } catch (e: any) {
      this.gpsStatus.set('ERROR');
      this.gpsErrorMessage.set(e?.message || 'Error executing geolocation request');
      callback(null, null, null);
    }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'LATE': return 'warn';
      case 'ABSENT': return 'danger';
      default: return 'info';
    }
  }
}
