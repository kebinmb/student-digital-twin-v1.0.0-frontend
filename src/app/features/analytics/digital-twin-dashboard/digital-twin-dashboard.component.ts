import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { DigitalTwinRiskProfileDto } from '../../../core/models/analytics.model';
import { AuthService } from '../../../core/service/authentication/auth-service';

@Component({
  selector: 'app-digital-twin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    ProgressBarModule,
    SkeletonModule,
    ToastModule
  ],
  templateUrl: './digital-twin-dashboard.component.html',
  styleUrl: './digital-twin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DigitalTwinAnalyticsDashboardComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly riskProfile = signal<DigitalTwinRiskProfileDto | null>(null);
  readonly isLoading = signal<boolean>(false);

  ngOnInit(): void {
    const studentId = this.authService.getUserId() || 1;
    this.loadRiskProfile(studentId);
  }

  loadRiskProfile(studentId: number): void {
    this.isLoading.set(true);
    this.analyticsApi.getStudentRiskProfile(studentId).subscribe({
      next: (profile) => {
        this.riskProfile.set(profile);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Analytics Error', detail: 'Failed to load Student Digital Twin ML Risk Profile.' });
        this.isLoading.set(false);
      }
    });
  }

  getRiskSeverity(level: string | undefined): 'success' | 'info' | 'warn' | 'danger' {
    switch (level) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warn';
      case 'MODERATE': return 'info';
      default: return 'success';
    }
  }
}

