// File: src/app/features/compliance/degree-audit/degree-audit.component.ts

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import {
  DegreeAuditResultDto,
  GraduationApplicationDto,
  ApplyForGraduationRequest
} from '../../../core/models/compliance.model';
import { TermResponse } from '../../../core/models/institution.model';
import { StudentProfileResponse } from '../../../core/models/enrollment.model';

import { HasRoleDirective } from '../../../core/directives/has-role.directive';
import { AuthService } from '../../../core/service/authentication/auth-service';
import { EnrollmentApiService } from '../../../core/service/enrollment/enrollment-api.service';
import { TermService } from '../../../core/services/institution.service';

interface StudentOption {
  label: string;
  value: number;
  studentIdNumber: string;
  fullName: string;
  programCode: string;
  academicStatus: string;
}

@Component({
  selector: 'app-degree-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    CardModule,
    DialogModule,
    ProgressBarModule,
    SelectModule,
    HasRoleDirective
  ],
  templateUrl: './degree-audit.component.html',
  styleUrl: './degree-audit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DegreeAuditComponent implements OnInit {
  private readonly complianceApi = inject(ComplianceApiService);
  protected readonly authService = inject(AuthService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly termService = inject(TermService);
  private readonly messageService = inject(MessageService);

  // User Role & Context Signals
  readonly isStudentRole = computed(() => this.authService.hasRole('STUDENT'));
  readonly currentStudent = signal<StudentProfileResponse | null>(null);

  // Search Fields
  searchStudentId: number | null = null;
  applyTermId: number | null = null;
  specialOrderNumber: string = '';

  // Options Signals
  readonly studentOptions = signal<StudentOption[]>([]);
  readonly terms = signal<TermResponse[]>([]);
  readonly termOptions = computed(() =>
    this.terms().map((t) => {
      const yearCode = t.academicYearCode || (t as any).academicYear?.code || '';
      const type = t.termName || t.termType || `Term ${t.id}`;
      const activeMarker = t.isActive ? ' (Active)' : '';
      return {
        label: `${type}${yearCode ? ' - ' + yearCode : ''}${activeMarker}`,
        value: t.id
      };
    })
  );

  // Component Signals
  readonly auditResult = signal<DegreeAuditResultDto | null>(null);
  readonly graduationApp = signal<GraduationApplicationDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isApplying = signal<boolean>(false);
  readonly isIssuingSo = signal<boolean>(false);

  ngOnInit(): void {
    this.loadAcademicTerms();

    if (this.isStudentRole()) {
      this.initStudentSelfAudit();
    } else {
      this.loadStudentOptions();
    }
  }

  private loadAcademicTerms(): void {
    this.termService.getAll().subscribe({
      next: (termsList) => {
        this.terms.set(termsList);
        const active = termsList.find((t) => t.isActive);
        if (active) {
          this.applyTermId = active.id;
        } else if (termsList.length > 0) {
          this.applyTermId = termsList[0].id;
        }
      },
      error: () => {
        this.termService.getActive().subscribe({
          next: (active) => {
            this.terms.set([active]);
            this.applyTermId = active.id;
          }
        });
      }
    });
  }

  private initStudentSelfAudit(): void {
    this.isLoading.set(true);
    this.enrollmentApi.getCurrentStudentProfile().subscribe({
      next: (profile) => {
        if (profile?.id) {
          this.currentStudent.set(profile);
          this.searchStudentId = profile.id;
          this.runDegreeAudit();
        } else {
          this.fallbackUserIdAudit();
        }
      },
      error: () => {
        this.fallbackUserIdAudit();
      }
    });
  }

  private fallbackUserIdAudit(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.searchStudentId = userId;
      this.runDegreeAudit();
    } else {
      this.isLoading.set(false);
    }
  }

  loadStudentOptions(query: string = ''): void {
    this.enrollmentApi.searchStudents(query).subscribe({
      next: (students) => {
        const options: StudentOption[] = (students || []).map((s) => ({
          label: `${s.studentIdNumber} - ${s.fullName} (${s.programCode || 'N/A'})`,
          value: s.id,
          studentIdNumber: s.studentIdNumber,
          fullName: s.fullName,
          programCode: s.programCode || 'N/A',
          academicStatus: s.academicStatus || 'REGULAR'
        }));
        this.studentOptions.set(options);
        if (!this.searchStudentId && options.length > 0) {
          this.searchStudentId = options[0].value;
          this.runDegreeAudit();
        }
      },
      error: () => {
        this.studentOptions.set([]);
      }
    });
  }

  onStudentSelect(studentId: number | null): void {
    this.searchStudentId = studentId;
    if (studentId) {
      this.runDegreeAudit();
    } else {
      this.auditResult.set(null);
    }
  }

  runDegreeAudit(): void {
    if (!this.searchStudentId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Input Required',
        detail: 'Please select a student profile to evaluate.'
      });
      return;
    }

    this.isLoading.set(true);
    this.complianceApi.evaluateDegreeAudit(this.searchStudentId).subscribe({
      next: (data) => {
        this.auditResult.set(data);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'Audit Evaluated',
          detail: `Degree audit completed: ${data.totalUnitsEarned}/${data.totalCurriculumUnits} units completed.`
        });
      },
      error: (err) => {
        this.auditResult.set(null);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Audit Error',
          detail: err.error?.message || 'Failed to evaluate degree audit for the student profile.'
        });
      }
    });
  }

  applyForGraduation(): void {
    if (!this.searchStudentId || !this.applyTermId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Input Required',
        detail: 'Student Profile and Graduation Academic Term are required.'
      });
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
          detail: `Graduation application submitted. Degree audit status: ${app.degreeAuditStatus}`
        });
      },
      error: (err) => {
        this.isApplying.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Application Failed',
          detail: err.error?.message || 'Failed to submit graduation application.'
        });
      }
    });
  }

  issueSpecialOrder(): void {
    const app = this.graduationApp();
    if (!app || !this.specialOrderNumber.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Input Required',
        detail: 'Please enter a valid CHED Special Order Number.'
      });
      return;
    }

    this.isIssuingSo.set(true);
    this.complianceApi.issueSpecialOrder(app.id, this.specialOrderNumber.trim()).subscribe({
      next: (updated) => {
        this.isIssuingSo.set(false);
        this.graduationApp.set(updated);
        this.messageService.add({
          severity: 'success',
          summary: 'Special Order Assigned',
          detail: `CHED Special Order ${updated.specialOrderNumber} successfully issued.`
        });
      },
      error: (err) => {
        this.isIssuingSo.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Issuance Error',
          detail: err.error?.message || 'Failed to assign Special Order.'
        });
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
