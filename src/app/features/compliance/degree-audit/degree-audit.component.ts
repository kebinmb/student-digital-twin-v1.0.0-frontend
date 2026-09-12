// File: src/app/features/compliance/degree-audit/degree-audit.component.ts

import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';

import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import {
  DegreeAuditResultDto,
  GraduationApplicationDto,
  ApplyForGraduationRequest
} from '../../../core/models/compliance.model';

@Component({
  selector: 'app-degree-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TagModule,
    CardModule,
    DialogModule,
    ProgressBarModule
  ],
  templateUrl: './degree-audit.component.html',
  styleUrl: './degree-audit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DegreeAuditComponent implements OnInit {
  private readonly complianceApi = inject(ComplianceApiService);
  private readonly messageService = inject(MessageService);

  // Search Fields
  searchStudentId: number | null = null;
  applyTermId: number = 1;
  specialOrderNumber: string = '';

  // Component Signals
  readonly auditResult = signal<DegreeAuditResultDto | null>(null);
  readonly graduationApp = signal<GraduationApplicationDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isApplying = signal<boolean>(false);
  readonly isIssuingSo = signal<boolean>(false);

  ngOnInit(): void {}

  runDegreeAudit(): void {
    if (!this.searchStudentId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please enter a Student Profile ID.' });
      return;
    }

    this.isLoading.set(true);
    this.complianceApi.evaluateDegreeAudit(this.searchStudentId).subscribe({
      next: (data) => {
        this.auditResult.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.auditResult.set(null);
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Audit Error', detail: err.error?.message || 'Failed to run degree audit.' });
      }
    });
  }

  applyForGraduation(): void {
    if (!this.searchStudentId || !this.applyTermId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Student Profile ID and Term ID required.' });
      return;
    }

    const req: ApplyForGraduationRequest = {
      studentProfileId: this.searchStudentId,
      termId: this.applyTermId
    };

    this.isApplying.set(true);
    this.complianceApi.applyForGraduation(req).subscribe({
      next: (app) => {
        this.isApplying.set(false);
        this.graduationApp.set(app);
        this.messageService.add({
          severity: 'success',
          summary: 'Application Submitted',
          detail: `Graduation Application status: ${app.degreeAuditStatus}`
        });
      },
      error: (err) => {
        this.isApplying.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to submit graduation application.' });
      }
    });
  }

  issueSpecialOrder(): void {
    const app = this.graduationApp();
    if (!app || !this.specialOrderNumber.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Please enter CHED Special Order Number.' });
      return;
    }

    this.isIssuingSo.set(true);
    this.complianceApi.issueSpecialOrder(app.id, this.specialOrderNumber.trim()).subscribe({
      next: (updated) => {
        this.isIssuingSo.set(false);
        this.graduationApp.set(updated);
        this.messageService.add({ severity: 'success', summary: 'SO Issued', detail: `CHED Special Order ${updated.specialOrderNumber} assigned.` });
      },
      error: (err) => {
        this.isIssuingSo.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to issue Special Order.' });
      }
    });
  }

  getHonorsSeverity(honors: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (honors) {
      case 'SUMMA_CUM_LAUDE':
      case 'MAGNA_CUM_LAUDE':
      case 'CUM_LAUDE':
        return 'success';
      default:
        return 'secondary';
    }
  }

  getCourseStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'PASSED':
        return 'success';
      case 'FAILED':
        return 'danger';
      default:
        return 'warn';
    }
  }
}
