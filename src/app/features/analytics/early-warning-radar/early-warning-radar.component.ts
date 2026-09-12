import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import { EarlyWarningRadarItemDto } from '../../../core/models/analytics.model';

import { SkeletonModule } from 'primeng/skeleton';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-early-warning-radar',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    SkeletonModule,
    EmptyStateComponent
  ],
  templateUrl: './early-warning-radar.component.html',
  styleUrl: './early-warning-radar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EarlyWarningRadarComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly messageService = inject(MessageService);

  readonly radarItems = signal<EarlyWarningRadarItemDto[]>([]);
  readonly isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadRadar();
  }

  loadRadar(): void {
    this.isLoading.set(true);
    this.analyticsApi.getEarlyWarningRadar().subscribe({
      next: (items) => {
        this.radarItems.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Radar Error', detail: 'Failed to load Academic Early Warning Radar.' });
        this.isLoading.set(false);
      }
    });
  }

  dispatchIntervention(studentName: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Intervention Dispatched',
      detail: `Academic counselor intervention notification dispatched for ${studentName}.`
    });
  }
}
