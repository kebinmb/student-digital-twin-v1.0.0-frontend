import { Component, OnInit, OnDestroy, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import jsQR from 'jsqr';

@Component({
  selector: 'app-camera-test',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, CardModule, TagModule, MessageModule],
  templateUrl: './camera-test.component.html',
  styleUrls: ['./camera-test.component.css']
})
export class CameraTestComponent implements OnInit, OnDestroy {
  @ViewChild('testVideo') testVideoRef?: ElementRef<HTMLVideoElement>;

  // Environment & Context Telemetry Signals
  readonly isSecureContext = signal<boolean>(typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false);
  readonly currentProtocol = signal<string>(typeof window !== 'undefined' ? window.location.protocol : 'unknown');
  readonly currentHostname = signal<string>(typeof window !== 'undefined' ? window.location.hostname : 'unknown');
  readonly currentPort = signal<string>(
    typeof window !== 'undefined'
      ? (window.location.port || (window.location.protocol === 'https:' ? '443' : '80'))
      : ''
  );
  readonly hasMediaDevices = signal<boolean>(
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices)
  );
  readonly hasGetUserMedia = signal<boolean>(
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
  readonly hasBarcodeDetector = signal<boolean>(
    typeof window !== 'undefined' && 'BarcodeDetector' in window
  );
  readonly permissionState = signal<string>('unknown');

  // Camera Acquisition State Signals
  readonly isCameraActive = signal<boolean>(false);
  readonly isCameraLoading = signal<boolean>(false);
  readonly cameraError = signal<string | null>(null);
  readonly streamTrackLabel = signal<string>('');
  readonly streamResolution = signal<string>('');
  readonly activeFacingMode = signal<'user' | 'environment'>('environment');

  // QR Detection Diagnostics
  readonly lastDetectedQr = signal<string | null>(null);
  readonly qrDetectionCount = signal<number>(0);
  readonly lastScanTimestamp = signal<string>('');
  readonly detectedWithEngine = signal<string>('');

  private mediaStream: MediaStream | null = null;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private barcodeDetectorInstance: any = null;

  async ngOnInit(): Promise<void> {
    await this.inspectPermissionState();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async inspectPermissionState(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        this.permissionState.set(status.state);
        status.onchange = () => {
          this.permissionState.set(status.state);
        };
      } catch {
        this.permissionState.set('unsupported_query');
      }
    } else {
      this.permissionState.set('unsupported_api');
    }
  }

  async startCamera(facingMode: 'user' | 'environment' = 'environment'): Promise<void> {
    this.stopCamera();
    this.isCameraLoading.set(true);
    this.cameraError.set(null);
    this.activeFacingMode.set(facingMode);

    if (!this.hasGetUserMedia()) {
      this.cameraError.set('navigator.mediaDevices.getUserMedia is not available in this browser context.');
      this.isCameraLoading.set(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;
      this.isCameraActive.set(true);

      const track = stream.getVideoTracks()[0];
      if (track) {
        this.streamTrackLabel.set(track.label || 'Unknown Camera Device');
        const settings = track.getSettings();
        if (settings.width && settings.height) {
          this.streamResolution.set(`${settings.width} x ${settings.height}`);
        }
      }

      // Allow DOM cycle to render video element
      setTimeout(() => {
        if (this.testVideoRef?.nativeElement) {
          const video = this.testVideoRef.nativeElement;
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.muted = true;
          video.play().catch(err => {
            console.warn('[CameraTest] Autoplay prevented:', err);
          });
          this.startQrDetection(video);
        }
      }, 50);

      await this.inspectPermissionState();
    } catch (err: any) {
      console.error('[CameraTest] Acquisition error:', err);
      const name = err?.name || 'Error';
      const msg = err?.message || 'Failed to acquire camera stream';
      this.cameraError.set(`${name}: ${msg}`);
      this.stopCamera();
    } finally {
      this.isCameraLoading.set(false);
    }
  }

  stopCamera(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }

    if (this.testVideoRef?.nativeElement) {
      try {
        this.testVideoRef.nativeElement.srcObject = null;
      } catch {
        // ignore
      }
    }

    this.barcodeDetectorInstance = null;
    this.isCameraActive.set(false);
    this.streamTrackLabel.set('');
    this.streamResolution.set('');
  }

  private startQrDetection(video: HTMLVideoElement): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if ('BarcodeDetector' in window) {
      try {
        this.barcodeDetectorInstance = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        this.barcodeDetectorInstance = null;
      }
    }

    this.scanTimer = setInterval(async () => {
      if (!this.isCameraActive() || !video || video.readyState < video.HAVE_ENOUGH_DATA) {
        return;
      }

      let detectedText: string | null = null;
      let engine = '';

      // 1. Try BarcodeDetector
      if (this.barcodeDetectorInstance) {
        try {
          const barcodes = await this.barcodeDetectorInstance.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedText = barcodes[0].rawValue;
            engine = 'Native BarcodeDetector';
          }
        } catch {
          // Fallback
        }
      }

      // 2. Fallback to jsQR
      if (!detectedText && context && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data) {
            detectedText = code.data;
            engine = 'jsQR Fallback';
          }
        } catch {
          // Frame extraction error ignored
        }
      }

      if (detectedText) {
        this.lastDetectedQr.set(detectedText);
        this.detectedWithEngine.set(engine);
        this.lastScanTimestamp.set(new Date().toLocaleTimeString());
        this.qrDetectionCount.update(c => c + 1);
      }
    }, 300);
  }
}
