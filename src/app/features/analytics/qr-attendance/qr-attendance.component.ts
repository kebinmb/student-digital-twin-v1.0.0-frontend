import { Component, inject, signal, computed, effect, OnInit, OnDestroy, ChangeDetectionStrategy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { KnobModule } from 'primeng/knob';
import { ProgressBarModule } from 'primeng/progressbar';
import { AvatarModule } from 'primeng/avatar';
import { DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';

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
    CardModule,
    InputTextModule,
    TagModule,
    ToastModule,
    TableModule,
    SelectModule,
    SkeletonModule,
    TooltipModule,
    KnobModule,
    ProgressBarModule,
    AvatarModule,
    DialogModule,
    BadgeModule,
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

  readonly isStudent = computed(() => this.authService.hasRole('STUDENT'));
  readonly studentProfile = signal<StudentProfileResponse | null>(null);

  readonly activeSession = signal<AttendanceSessionResponse | null>(null);
  readonly scanResult = signal<AttendanceRecordResponse | null>(null);
  readonly creatorScanResult = signal<FacultyAttendanceRecordResponse | null>(null);
  readonly facultyDailyRecords = signal<FacultyAttendanceRecordResponse[]>([]);
  readonly isLoadingFaculty = signal<boolean>(false);
  readonly isVerifyingCreator = signal<boolean>(false);
  readonly qrSeedInput = signal<string>('');

  readonly isGenerating = signal<boolean>(false);
  readonly isScanning = signal<boolean>(false);
  readonly isCameraActive = signal<boolean>(false);
  private cameraStream: MediaStream | null = null;
  private cameraScanTimer: any = null;

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

  getInitials(name?: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private sseSub?: Subscription;
  private livePollTimer: any = null;

  ngOnInit(): void {
    if (this.isStudent()) {
      // Resolve student profile and personal attendance history only
      this.loadStudentProfileAndHistory();
    } else {
      // Load instructor management schedules and daily section attendance
      this.loadAssignedSchedules();
      this.loadDailyAttendance();
    }
  }

  ngOnDestroy(): void {
    if (this.sseSub) {
      this.sseSub.unsubscribe();
    }
    if (this.livePollTimer) {
      clearInterval(this.livePollTimer);
      this.livePollTimer = null;
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

    // Prefer dedicated /student/me/slice endpoint
    this.analyticsApi.getCurrentStudentAttendanceSlice(0, 50).subscribe({
      next: (slice) => {
        this.studentHistoryRecords.set(slice?.content || []);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        // Fallback to numeric endpoint
        const targetId = studentId || this.studentProfile()?.id || this.authService.getStudentProfileId() || this.authService.getUserId() || 1;
        this.analyticsApi.getStudentAttendanceSlice(targetId, 0, 50).subscribe({
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
    if (this.isCameraActive()) {
      this.stopCameraScanner();
    } else {
      this.startCameraScanner();
    }
  }

  startCameraScanner(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Camera Unsupported',
        detail: 'Camera access is not supported by your browser. Please enter the QR code manually.'
      });
      return;
    }

    const constraintsList: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' } } },
      { video: { facingMode: 'environment' } },
      { video: true }
    ];

    const tryStream = (index: number) => {
      if (index >= constraintsList.length) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Camera Unavailable',
          detail: 'Could not access camera stream. Please enter or paste the QR attendance code manually.'
        });
        this.isCameraActive.set(false);
        return;
      }

      navigator.mediaDevices.getUserMedia(constraintsList[index])
        .then((stream) => {
          this.cameraStream = stream;
          this.isCameraActive.set(true);

          setTimeout(() => {
            if (this.scannerVideoRef && this.scannerVideoRef.nativeElement) {
              const video = this.scannerVideoRef.nativeElement;
              video.setAttribute('playsinline', 'true');
              video.setAttribute('muted', 'true');
              video.srcObject = stream;
              video.play().catch(err => console.warn('Video play error:', err));
              this.startQrDetection(video);
            }
          }, 150);
        })
        .catch((err) => {
          console.warn(`Camera constraint index ${index} failed:`, err);
          tryStream(index + 1);
        });
    };

    tryStream(0);
  }

  stopCameraScanner(): void {
    if (this.cameraScanTimer) {
      clearInterval(this.cameraScanTimer);
      this.cameraScanTimer = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.isCameraActive.set(false);
  }

  private startQrDetection(video: HTMLVideoElement): void {
    if (this.cameraScanTimer) {
      clearInterval(this.cameraScanTimer);
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    this.cameraScanTimer = setInterval(async () => {
      if (!this.isCameraActive() || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }

      let scannedText: string | null = null;

      // 1. Try BarcodeDetector if natively supported by browser engine
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            scannedText = barcodes[0].rawValue;
          }
        } catch {
          // Fallback to jsQR below
        }
      }

      // 2. Fallback to jsQR canvas processing (Works on ALL mobile devices / iOS Safari / Android)
      if (!scannedText && context) {
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

    const fingerprint = navigator.userAgent || 'Conductor-Console';
    this.isScanning.set(true);
    this.isVerifyingCreator.set(true);

    this.obtainGeolocation((lat, lon) => {
      this.analyticsApi.verifyCreatorAttendance({
        qrSeed: seed,
        latitude: lat,
        longitude: lon,
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

          this.messageService.add({
            severity: 'success',
            summary: 'Conductor Attendance Verified',
            detail: `Verified attendance for ${res.facultyName} (${res.facultyRole}) in ${res.courseCode || 'Section'} (${res.sectionCode || 'Session'}) with GPS Geofencing!`
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
    const fingerprint = navigator.userAgent || 'Browser-Client';

    this.isScanning.set(true);
    this.obtainGeolocation((lat, lon) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.offlineSyncService.enqueueScan(seed, studentId, lat, lon, fingerprint);
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
        latitude: lat,
        longitude: lon,
        deviceFingerprint: fingerprint
      }).subscribe({
        next: (res) => {
          this.scanResult.set(res);
          this.isScanning.set(false);
          this.qrSeedInput.set('');

          // Prepend verified record to student's personal attendance history & daily student log
          this.studentHistoryRecords.update(prev => [res, ...prev.filter(r => r.recordId !== res.recordId)]);
          this.dailyRecords.update(prev => [res, ...prev.filter(r => r.recordId !== res.recordId)]);

          this.messageService.add({
            severity: 'success',
            summary: 'Attendance Verified',
            detail: `Checked in for ${res.courseCode} (${res.sectionCode}) with GPS Geofence Verification!`
          });
        },
        error: (err) => {
          this.isScanning.set(false);
          if (err?.status === 0 || (typeof navigator !== 'undefined' && !navigator.onLine)) {
            this.offlineSyncService.enqueueScan(seed, studentId, lat, lon, fingerprint);
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

          sections.forEach(sec => {
            if (sec.schedules && sec.schedules.length > 0) {
              sec.schedules.forEach(sch => {
                const dayStr = sch.dayOfWeek ? sch.dayOfWeek.substring(0, 3) : 'TBA';
                const timeStr = sch.startTime ? ` ${sch.startTime.substring(0, 5)}-${sch.endTime ? sch.endTime.substring(0, 5) : ''}` : '';
                const roomStr = sch.roomCode ? ` - ${sch.roomCode}` : '';
                options.push({
                  label: `[${sec.sectionCode}] ${sec.courseCode}: ${sec.courseTitle} (${dayStr}${timeStr}${roomStr})`,
                  value: sch.id
                });
              });
            } else {
              options.push({
                label: `[${sec.sectionCode}] ${sec.courseCode}: ${sec.courseTitle}`,
                value: sec.id
              });
            }

            filterOpts.push({
              label: `[${sec.sectionCode}] ${sec.courseCode}`,
              value: sec.id
            });
          });

          this.scheduleOptions.set(options);
          this.filterSectionOptions.set(filterOpts);
          if (options.length > 0 && !this.selectedScheduleId()) {
            this.selectedScheduleId.set(options[0].value);
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

  onDateChange(event: any): void {
    const val = typeof event === 'string' ? event : event?.target?.value;
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
      this.analyticsApi.startAttendanceSession({
        sectionScheduleId: targetId,
        latitude: lat,
        longitude: lon,
        allowedRadiusMeters: 50
      }).subscribe({
        next: (session) => {
          this.activeSession.set(session);
          this.qrSeedInput.set(session.qrSeed);
          this.isGenerating.set(false);
          this.messageService.add({ severity: 'success', summary: 'QR Session Generated', detail: `Dynamic 15-min QR Attendance Session active at (${lat.toFixed(4)}, ${lon.toFixed(4)}).` });
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
  // UTILITY METHODS
  // =========================================================================
  private obtainGeolocation(callback: (lat: number, lon: number) => void): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => callback(pos.coords.latitude, pos.coords.longitude),
        (err) => {
          console.warn('Geolocation lookup failed:', err.message);
          this.messageService.add({
            severity: 'warn',
            summary: 'GPS Location Unavailable',
            detail: 'Could not acquire precise GPS telemetry. Geofencing may fail without active coordinates.'
          });
          callback(0, 0);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Geolocation Unsupported',
        detail: 'Browser geolocation is unavailable on this device.'
      });
      callback(0, 0);
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
