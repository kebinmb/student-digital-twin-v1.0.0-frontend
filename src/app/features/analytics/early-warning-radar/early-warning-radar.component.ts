import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { DrawerModule } from 'primeng/drawer';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';

import { AnalyticsApiService } from '../../../core/service/analytics/analytics-api.service';
import {
  EarlyWarningRadarItemDto,
  DigitalTwinRiskProfileDto,
  StudentInterventionDto
} from '../../../core/models/analytics.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-early-warning-radar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    SkeletonModule,
    DrawerModule,
    DialogModule,
    SelectModule,
    TextareaModule,
    ProgressBarModule,
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

  // Detail Drawer state
  readonly isDetailDrawerOpen = signal<boolean>(false);
  readonly selectedStudent = signal<EarlyWarningRadarItemDto | null>(null);
  readonly selectedRiskProfile = signal<DigitalTwinRiskProfileDto | null>(null);
  readonly isLoadingProfile = signal<boolean>(false);
  readonly studentInterventions = signal<StudentInterventionDto[]>([]);

  // Dispatch Case Modal state
  readonly isDispatchModalOpen = signal<boolean>(false);
  readonly targetStudent = signal<EarlyWarningRadarItemDto | null>(null);
  readonly selectedInterventionType = signal<string>('ACADEMIC_TUTORING');
  readonly counselorNotes = signal<string>('');
  readonly isDispatching = signal<boolean>(false);

  readonly interventionTypeOptions = [
    { label: 'Academic Tutoring & Remediation', value: 'ACADEMIC_TUTORING' },
    { label: 'Attendance Advisory Conference', value: 'ATTENDANCE_CONFERENCE' },
    { label: 'UniFAST / Financial Emergency Subsidy', value: 'FINANCIAL_SUBSIDY_AID' },
    { label: 'Guidance & Psychosocial Counseling', value: 'GUIDANCE_COUNSELING' },
    { label: 'Peer Mentoring Session', value: 'PEER_MENTORING' }
  ];

  ngOnInit(): void {
    this.loadRadar();
  }

  loadRadar(): void {
    this.isLoading.set(true);
    this.analyticsApi.getEarlyWarningRadar().subscribe({
      next: (items) => {
        // Enforce uniqueness by studentId, ensuring no duplicate student rows appear on radar
        const uniqueItems = Array.from(
          new Map((items || []).map(item => [item.studentId, item])).values()
        );
        this.radarItems.set(uniqueItems);
        this.isLoading.set(false);
      },
      error: () => {
        this.radarItems.set([]);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Radar Ingestion Error',
          detail: 'Unable to fetch early warning telemetry roster from backend.'
        });
      }
    });
  }

  openDetail(item: EarlyWarningRadarItemDto): void {
    this.selectedStudent.set(item);
    this.isDetailDrawerOpen.set(true);
    this.isLoadingProfile.set(true);
    this.selectedRiskProfile.set(null);

    this.analyticsApi.getStudentRiskProfile(item.studentId).subscribe({
      next: (profile) => {
        this.selectedRiskProfile.set(profile);
        this.isLoadingProfile.set(false);
      },
      error: () => {
        this.isLoadingProfile.set(false);
        this.messageService.add({
          severity: 'warn',
          summary: 'Profile Telemetry Unavailable',
          detail: `Could not retrieve detailed risk metrics for student #${item.studentNumber}`
        });
      }
    });

    this.analyticsApi.getStudentInterventions(item.studentId).subscribe({
      next: (interventions) => {
        this.studentInterventions.set(interventions || []);
      },
      error: () => {
        this.studentInterventions.set([]);
      }
    });
  }

  openDispatchModal(item: EarlyWarningRadarItemDto): void {
    this.targetStudent.set(item);
    this.selectedInterventionType.set('ACADEMIC_TUTORING');
    this.counselorNotes.set(item.suggestedAction || '');
    this.isDispatchModalOpen.set(true);
  }

  confirmDispatch(): void {
    const student = this.targetStudent();
    if (!student) return;

    this.isDispatching.set(true);
    this.analyticsApi.dispatchIntervention({
      studentId: student.studentId,
      interventionType: this.selectedInterventionType(),
      triggerFactor: student.primaryRiskFactor || 'Early Warning Radar Alert',
      notes: this.counselorNotes()
    }).subscribe({
      next: (savedCase) => {
        this.isDispatching.set(false);
        this.isDispatchModalOpen.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Intervention Dispatched',
          detail: `Case #${savedCase.id} created for ${student.studentName}. Status: ${savedCase.status}`
        });
        if (this.selectedStudent()?.studentId === student.studentId) {
          this.analyticsApi.getStudentInterventions(student.studentId).subscribe(list => {
            this.studentInterventions.set(list || []);
          });
        }
      },
      error: (err) => {
        this.isDispatching.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Dispatch Failed',
          detail: err?.error?.detail || 'Could not record intervention case.'
        });
      }
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

  humanizeInterventionType(type: string | undefined): string {
    if (!type) return 'Support Advisory';
    switch (type) {
      case 'GUIDANCE_COUNSELING': return 'Guidance Counseling';
      case 'ACADEMIC_TUTORING': return 'Academic Peer Tutoring';
      case 'ATTENDANCE_CONFERENCE': return 'Attendance Conference';
      case 'FINANCIAL_SUBSIDY_AID': return 'UniFAST Financial Aid Review';
      case 'PEER_MENTORING': return 'Peer Mentoring Assignment';
      default: return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
  }
}
