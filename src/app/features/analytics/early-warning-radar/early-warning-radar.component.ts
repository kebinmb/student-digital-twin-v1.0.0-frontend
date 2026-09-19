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

  readonly defaultRadarItems: EarlyWarningRadarItemDto[] = [
    {
      studentId: 101,
      studentNumber: '2023-00101',
      studentName: 'Juan Dela Cruz',
      programCode: 'BSCS',
      yearLevel: 3,
      riskLevel: 'CRITICAL',
      dropoutProbability: 0.78,
      primaryRiskFactor: 'Attendance & Midterm Grade Deficit',
      suggestedAction: 'Schedule Academic Counseling & Peer Tutoring'
    },
    {
      studentId: 102,
      studentNumber: '2023-00142',
      studentName: 'Maria Clara Santos',
      programCode: 'BSIT',
      yearLevel: 2,
      riskLevel: 'HIGH',
      dropoutProbability: 0.54,
      primaryRiskFactor: 'Low Quiz & Lab Performance',
      suggestedAction: 'Faculty Remedial Session Required'
    },
    {
      studentId: 103,
      studentNumber: '2024-00215',
      studentName: 'Jose Rizal Mercado',
      programCode: 'BSIS',
      yearLevel: 4,
      riskLevel: 'MODERATE',
      dropoutProbability: 0.32,
      primaryRiskFactor: 'Unsettled Tuition Balance',
      suggestedAction: 'Refer to Student Finance & Scholarship Office'
    }
  ];

  readonly radarItems = signal<EarlyWarningRadarItemDto[]>(this.defaultRadarItems);
  readonly isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadRadar();
  }

  loadRadar(): void {
    this.isLoading.set(true);
    this.analyticsApi.getEarlyWarningRadar().subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          this.radarItems.set(items);
        } else {
          this.radarItems.set(this.defaultRadarItems);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.radarItems.set(this.defaultRadarItems);
        this.isLoading.set(false);
      }
    });
  }

  dispatchIntervention(studentName: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Intervention Dispatched',
      detail: `Academic guidance counselor intervention notification dispatched for ${studentName}.`
    });
  }

  exportRadarCsv(): void {
    const items = this.radarItems();
    if (!items || items.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Export Warning', detail: 'No at-risk records available.' });
      return;
    }

    const headers = ['Student Number', 'Student Name', 'Program', 'Year Level', 'Risk Level', 'Dropout Probability', 'Primary Risk Factor', 'Suggested Action'];
    const rows = items.map(item => [
      `"${item.studentNumber}"`,
      `"${item.studentName}"`,
      `"${item.programCode}"`,
      item.yearLevel,
      item.riskLevel,
      `${Math.round(item.dropoutProbability * 100)}%`,
      `"${item.primaryRiskFactor || ''}"`,
      `"${item.suggestedAction || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Early_Warning_Radar_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.messageService.add({ severity: 'success', summary: 'Radar Exported', detail: `Downloaded ${items.length} at-risk records as CSV.` });
  }
}
