import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { AttendanceRecordResponse, AttendanceSessionResponse } from '../../../core/models/analytics.model';

import { TagModule } from 'primeng/tag';

import { SkeletonModule } from 'primeng/skeleton';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../core/service/authentication/auth-service';

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
    SkeletonModule,
    EmptyStateComponent
  ],
  templateUrl: './qr-attendance.component.html',
  styleUrl: './qr-attendance.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrAttendanceScannerComponent {
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly activeSession = signal<AttendanceSessionResponse | null>(null);
  readonly scanResult = signal<AttendanceRecordResponse | null>(null);
  readonly qrSeedInput = signal<string>('');

  readonly isGenerating = signal<boolean>(false);
  readonly isScanning = signal<boolean>(false);

  startClassSession(scheduleId: number): void {
    this.isGenerating.set(true);
    this.obtainGeolocation((lat, lon) => {
      this.analyticsApi.startAttendanceSession({
        sectionScheduleId: scheduleId,
        latitude: lat,
        longitude: lon,
        allowedRadiusMeters: 50
      }).subscribe({
        next: (session) => {
          this.activeSession.set(session);
          this.qrSeedInput.set(session.qrSeed);
          this.isGenerating.set(false);
          this.messageService.add({ severity: 'success', summary: 'QR Session Generated', detail: `Dynamic 15-min QR Attendance Session active at (${lat.toFixed(4)}, ${lon.toFixed(4)}).` });
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Session Error', detail: err.error?.detail || 'Failed to start attendance session.' });
          this.isGenerating.set(false);
        }
      });
    });
  }

  scanAttendance(): void {
    const seed = this.qrSeedInput().trim();
    if (!seed) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please enter or scan a valid QR attendance seed.' });
      return;
    }

    const studentId = this.authService.getUserId() || 1;
    const fingerprint = navigator.userAgent || 'Browser-Client';

    this.isScanning.set(true);
    this.obtainGeolocation((lat, lon) => {
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
          this.messageService.add({ severity: 'success', summary: 'Attendance Verified', detail: `Marked ${res.attendanceStatus} with GPS Geofence Verification!` });
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Scan Rejected', detail: err.error?.detail || 'Failed to verify attendance scan.' });
          this.isScanning.set(false);
        }
      });
    });
  }

  private obtainGeolocation(callback: (lat: number, lon: number) => void): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => callback(pos.coords.latitude, pos.coords.longitude),
        () => callback(10.7202, 122.5621), // Fallback CHMSU Campus GPS coordinates
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      callback(10.7202, 122.5621);
    }
  }
}

