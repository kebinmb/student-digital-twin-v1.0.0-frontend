// File: src/app/features/compliance/student-clearance/student-clearance.component.ts

import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TimelineModule } from 'primeng/timeline';
import { MessageService } from 'primeng/api';

import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import {
  ClearanceRequestDto,
  ClearanceSignoffDto,
  InitiateClearanceRequest,
  ProcessSignoffRequest
} from '../../../core/models/compliance.model';

@Component({
  selector: 'app-student-clearance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    CardModule,
    DialogModule,
    TimelineModule
  ],
  templateUrl: './student-clearance.component.html',
  styleUrl: './student-clearance.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentClearanceComponent implements OnInit {
  private readonly complianceApi = inject(ComplianceApiService);
  private readonly messageService = inject(MessageService);

  // Search & Form Fields
  searchStudentId: number | null = null;
  searchTermId: number = 1;
  initiatePurpose: string = 'GRADUATION';

  readonly purposes = [
    { label: 'Graduation & Special Order', value: 'GRADUATION' },
    { label: 'Transfer Credentials', value: 'TRANSFER' },
    { label: 'Leave of Absence (LOA)', value: 'LOA' },
    { label: 'General Clearance', value: 'GENERAL' }
  ];

  // Component Signals
  readonly clearanceRequest = signal<ClearanceRequestDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isInitiating = signal<boolean>(false);
  readonly selectedSignoff = signal<ClearanceSignoffDto | null>(null);
  readonly showSignoffModal = signal<boolean>(false);

  // Signoff Form Fields
  signoffActionStatus: string = 'APPROVED';
  signoffRemarks: string = '';

  ngOnInit(): void {}

  loadClearanceStatus(): void {
    if (!this.searchStudentId || !this.searchTermId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Student Profile ID and Term ID required.' });
      return;
    }

    this.isLoading.set(true);
    this.complianceApi.getClearanceByStudentAndTerm(this.searchStudentId, this.searchTermId).subscribe({
      next: (data) => {
        this.clearanceRequest.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.clearanceRequest.set(null);
        this.isLoading.set(false);
        this.messageService.add({ severity: 'info', summary: 'No Active Clearance', detail: 'No clearance request found for this term.' });
      }
    });
  }

  initiateClearance(): void {
    if (!this.searchStudentId || !this.searchTermId) {
      this.messageService.add({ severity: 'warn', summary: 'Input Required', detail: 'Student Profile ID and Term ID required.' });
      return;
    }

    const req: InitiateClearanceRequest = {
      studentProfileId: this.searchStudentId,
      termId: this.searchTermId,
      purpose: this.initiatePurpose
    };

    this.isInitiating.set(true);
    this.complianceApi.initiateClearance(req).subscribe({
      next: (data) => {
        this.isInitiating.set(false);
        this.clearanceRequest.set(data);
        this.messageService.add({ severity: 'success', summary: 'Clearance Initiated', detail: 'Multi-department clearance request started.' });
      },
      error: (err) => {
        this.isInitiating.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to initiate clearance.' });
      }
    });
  }

  openSignoffModal(signoff: ClearanceSignoffDto): void {
    this.selectedSignoff.set(signoff);
    this.signoffActionStatus = 'APPROVED';
    this.signoffRemarks = '';
    this.showSignoffModal.set(true);
  }

  submitSignoff(): void {
    const signoff = this.selectedSignoff();
    if (!signoff) return;

    const req: ProcessSignoffRequest = {
      signoffStatus: this.signoffActionStatus,
      remarks: this.signoffRemarks.trim() || undefined
    };

    this.complianceApi.processSignoff(signoff.id, req).subscribe({
      next: () => {
        this.showSignoffModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Sign-off Processed', detail: `Department status updated to ${this.signoffActionStatus}` });
        this.loadClearanceStatus();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to process sign-off.' });
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'CLEARED':
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warn';
      case 'REJECTED':
        return 'danger';
      default:
        return 'info';
    }
  }
}
