import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AcademicYearService, ProgramService, TermService } from '../../../../core/services/institution.service';
import { AcademicPeriodStore } from '../../../../core/services/academic-period.store';
import { AcademicYear, Term, TermType, TermHonorRollReport, HonorStudent, CertificateVerification } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

interface TermForm {
  academicYearId: FormControl<number | null>;
  termType: FormControl<TermType>;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
}

import { Drawer } from 'primeng/drawer';
import { Skeleton } from 'primeng/skeleton';

@Component({
  selector: 'app-term-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    TagModule,
    ConfirmDialogModule,
    MessageModule,
    Drawer,
    Skeleton
  ],
  templateUrl: './term-manager.component.html',
  styleUrl: './term-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TermManagerComponent implements OnInit {
  private readonly termService = inject(TermService);
  private readonly ayService = inject(AcademicYearService);
  private readonly programService = inject(ProgramService);
  private readonly periodStore = inject(AcademicPeriodStore);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'REGISTRAR']);
  readonly canManageWindows = () => this.authService.hasAnyRole(['ADMIN', 'REGISTRAR']);
  readonly canDelete = () => this.authService.hasRole('ADMIN');

  readonly selectedTermForDetail = signal<Term | null>(null);
  readonly isDetailDrawerOpen = signal<boolean>(false);

  openDetailDrawer(t: Term): void {
    this.selectedTermForDetail.set(t);
    this.isDetailDrawerOpen.set(true);
  }

  readonly academicYears = signal<AcademicYear[]>([]);
  readonly terms = signal<Term[]>([]);
  readonly isLoading = signal<boolean>(false);
  isSubmitting = false;

  selectedAyId: number | null = null;
  displayDialog = false;
  isEditing = false;
  selectedTerm: Term | null = null;

  readonly termTypeOptions: { label: string; value: TermType }[] = [
    { label: '1st Semester', value: 'FIRST_SEM' },
    { label: '2nd Semester', value: 'SECOND_SEM' },
    { label: 'Summer Term', value: 'SUMMER' }
  ];

  readonly academicYearOptions = computed(() =>
    this.academicYears().map((ay) => ({
      label: ay.isCurrent ? `${ay.code} (Current)` : ay.code,
      value: ay.id
    }))
  );

  readonly termForm = new FormGroup<TermForm>(
    {
      academicYearId: new FormControl<number | null>(null, [Validators.required]),
      termType: new FormControl<TermType>('FIRST_SEM', { nonNullable: true, validators: [Validators.required] }),
      startDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
      endDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
    },
    {
      validators: (group) => {
        const ayId = group.get('academicYearId')?.value;
        const start = group.get('startDate')?.value;
        const end = group.get('endDate')?.value;

        if (start && end && end <= start) {
          return { dateOrderInvalid: true };
        }

        if (start && end && ayId) {
          const ay = this.academicYears().find((a) => a.id === ayId);
          if (ay && ay.startDate && start < ay.startDate) {
            return { ayStartOutOfBounds: true, ayStartDate: ay.startDate };
          }
          if (ay && ay.endDate && end > ay.endDate) {
            return { ayEndOutOfBounds: true, ayEndDate: ay.endDate };
          }

          const existingTerms = this.terms();
          for (const existing of existingTerms) {
            if (this.isEditing && this.selectedTerm && existing.id === this.selectedTerm.id) {
              continue;
            }
            if (existing.startDate && existing.endDate) {
              const overlaps =
                (start < existing.endDate && end > existing.startDate) ||
                start === existing.startDate ||
                end === existing.endDate;
              if (overlaps) {
                return { termOverlap: true, overlappingTerm: this.formatTermType(existing.termType) };
              }
            }
          }
        }
        return null;
      }
    }
  );

  ngOnInit(): void {
    this.loadAcademicYears();
  }

  loadAcademicYears(): void {
    this.ayService.getAll().subscribe({
      next: (ays) => {
        this.academicYears.set(ays);
        if (!this.selectedAyId) {
          const current = ays.find((ay) => ay.isCurrent) || ays[0];
          if (current) {
            this.selectedAyId = current.id;
          }
        }
        if (this.selectedAyId) {
          this.loadTermsForSelectedAy();
        }
      }
    });
  }

  loadTermsForSelectedAy(): void {
    if (!this.selectedAyId) return;
    this.isLoading.set(true);
    this.termService.getByAcademicYear(this.selectedAyId).subscribe({
      next: (list) => {
        this.terms.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.terms.set([]);
        this.isLoading.set(false);
      }
    });
  }

  formatTermType(type: string): string {
    if (!type) return '';
    if (type === '1ST_SEM' || type === 'FIRST_SEM') return '1st Semester';
    if (type === '2ND_SEM' || type === 'SECOND_SEM') return '2nd Semester';
    if (type === 'SUMMER') return 'Summer Term';
    return type;
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.selectedTerm = null;
    this.termForm.reset({
      academicYearId: this.selectedAyId,
      termType: 'FIRST_SEM',
      startDate: '',
      endDate: ''
    });
    this.displayDialog = true;
  }

  openEditDialog(t: Term): void {
    this.isEditing = true;
    this.selectedTerm = t;
    this.termForm.patchValue({
      academicYearId: t.academicYearId,
      termType: t.termType,
      startDate: t.startDate,
      endDate: t.endDate
    });
    this.displayDialog = true;
  }

  saveTerm(): void {
    if (this.termForm.invalid) {
      this.termForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = this.termForm.getRawValue();

    if (this.isEditing && this.selectedTerm) {
      this.termService
        .updateSchedule(this.selectedTerm.id, {
          startDate: val.startDate,
          endDate: val.endDate
        })
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.messageService.add({ severity: 'success', summary: 'Schedule Updated', detail: 'Term schedule adjusted.' });
            this.displayDialog = false;
            this.loadTermsForSelectedAy();
            this.periodStore.refresh();
            this.termService.refresh();
          },
          error: (err) => {
            this.isSubmitting = false;
            this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: err.error?.detail || 'Failed to update schedule.' });
          }
        });
    } else {
      this.termService
        .create({
          academicYearId: val.academicYearId!,
          termType: val.termType,
          startDate: val.startDate,
          endDate: val.endDate
        })
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.messageService.add({ severity: 'Term Created', summary: 'Term Created', detail: 'Academic term scheduled.' });
            this.displayDialog = false;
            this.loadTermsForSelectedAy();
            this.periodStore.refresh();
            this.termService.refresh();
          },
          error: (err) => {
            this.isSubmitting = false;
            this.messageService.add({ severity: 'error', summary: 'Creation Failed', detail: err.error?.detail || 'Failed to schedule term.' });
          }
        });
    }
  }

  confirmActivate(t: Term): void {
    this.confirmationService.confirm({
      message: `Activate ${this.formatTermType(t.termType)} as the current operational term? This will deactivate any previously active term and promote its parent Academic Year.`,
      header: 'Confirm Term Activation',
      icon: 'pi pi-play',
      accept: () => {
        this.termService.activate(t.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Term Activated', detail: `${this.formatTermType(t.termType)} is now active.` });
            this.loadAcademicYears();
            this.periodStore.refresh();
            this.termService.refresh();
            this.periodStore.setTerm(t.id);
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Activation Failed', detail: err.error?.detail || 'Failed to activate term.' });
          }
        });
      }
    });
  }

  toggleEnrollmentWindow(t: Term): void {
    if (!t.isActive) {
      this.messageService.add({ severity: 'warn', summary: 'Action Blocked', detail: 'Operational windows can only be altered on an active term.' });
      return;
    }
    const targetState = !t.enrollmentOpen;
    this.termService.toggleEnrollmentWindow(t.id, targetState).subscribe({
      next: (updated) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Enrollment Window Updated',
          detail: `Enrollment window is now ${updated.enrollmentOpen ? 'OPEN' : 'CLOSED'}.`
        });
        this.loadTermsForSelectedAy();
        this.periodStore.refresh();
        this.termService.refresh();
        if (this.selectedTermForDetail()?.id === t.id) {
          this.selectedTermForDetail.set(updated);
        }
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Toggle Failed', detail: err.error?.detail || 'Failed to toggle enrollment window.' });
      }
    });
  }

  toggleGradingWindow(t: Term): void {
    if (!t.isActive) {
      this.messageService.add({ severity: 'warn', summary: 'Action Blocked', detail: 'Operational windows can only be altered on an active term.' });
      return;
    }
    const targetState = !t.gradingOpen;
    this.termService.toggleGradingWindow(t.id, targetState).subscribe({
      next: (updated) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Grading Window Updated',
          detail: `Grading window is now ${updated.gradingOpen ? 'OPEN' : 'CLOSED'}.`
        });
        this.loadTermsForSelectedAy();
        this.periodStore.refresh();
        this.termService.refresh();
        if (this.selectedTermForDetail()?.id === t.id) {
          this.selectedTermForDetail.set(updated);
        }
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Toggle Failed', detail: err.error?.detail || 'Failed to toggle grading window.' });
      }
    });
  }

  confirmDelete(t: Term): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${this.formatTermType(t.termType)}?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.termService.delete(t.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Term removed.' });
            this.loadTermsForSelectedAy();
            this.periodStore.refresh();
            this.termService.refresh();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Deletion Guarded', detail: err.error?.detail || 'Cannot delete active operational term.' });
          }
        });
      }
    });
  }

  // Honor Roll State & Methods
  readonly isHonorRollDialogOpen = signal<boolean>(false);
  readonly honorRollReport = signal<TermHonorRollReport | null>(null);
  readonly isLoadingHonorRoll = signal<boolean>(false);
  readonly selectedProgramFilter = signal<number | null>(null);
  readonly programOptions = signal<{ label: string; value: number | null }[]>([{ label: 'All Programs', value: null }]);
  readonly activeHonorRollTerm = signal<Term | null>(null);

  openHonorRoll(t: Term): void {
    this.activeHonorRollTerm.set(t);
    this.selectedProgramFilter.set(null);
    this.isHonorRollDialogOpen.set(true);
    this.loadHonorRoll(t.id, null);
    this.loadProgramOptions();
  }

  loadProgramOptions(): void {
    this.programService.getAll().subscribe({
      next: (programs) => {
        const opts = [
          { label: 'All Programs', value: null },
          ...programs.map(p => ({ label: `${p.code} - ${p.name}`, value: p.id }))
        ];
        this.programOptions.set(opts);
      },
      error: () => {
        // Fallback to default
      }
    });
  }

  loadHonorRoll(termId: number, programId?: number | null): void {
    this.isLoadingHonorRoll.set(true);
    this.termService.getHonorRoll(termId, programId || undefined).subscribe({
      next: (report) => {
        this.honorRollReport.set(report);
        this.isLoadingHonorRoll.set(false);
      },
      error: (err) => {
        this.isLoadingHonorRoll.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Honor Roll Error',
          detail: err.error?.detail || 'Failed to load term honor roll.'
        });
      }
    });
  }

  onProgramFilterChange(progId: number | null): void {
    this.selectedProgramFilter.set(progId);
    const term = this.activeHonorRollTerm();
    if (term) {
      this.loadHonorRoll(term.id, progId);
    }
  }

  getPresidentsCount(report: TermHonorRollReport): number {
    return report.honorees.filter(h => h.honorCategory === 'PRESIDENTS_LIST').length;
  }

  getDeansCount(report: TermHonorRollReport): number {
    return report.honorees.filter(h => h.honorCategory === 'DEANS_LIST').length;
  }

  readonly isCertificateDialogOpen = signal<boolean>(false);
  readonly selectedCertificate = signal<CertificateVerification | null>(null);
  readonly isLoadingCertificate = signal<boolean>(false);

  viewHonorCertificate(h: HonorStudent): void {
    const term = this.activeHonorRollTerm();
    if (!term) return;

    this.isLoadingCertificate.set(true);
    this.isCertificateDialogOpen.set(true);
    this.termService.getHonorCertificate(term.id, h.studentId).subscribe({
      next: (cert) => {
        this.selectedCertificate.set(cert);
        this.isLoadingCertificate.set(false);
      },
      error: (err) => {
        this.isLoadingCertificate.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Certificate Error',
          detail: err.error?.detail || 'Failed to retrieve certificate details.'
        });
      }
    });
  }

  printCertificate(): void {
    window.print();
  }

  promptRevocation(): void {
    const cert = this.selectedCertificate();
    if (!cert) return;
    const reason = window.prompt(`Enter reason for revoking certificate ${cert.certificateId}:`, 'Academic integrity investigation');
    if (!reason || reason.trim().length === 0) return;

    this.termService.revokeCertificate(cert.certificateId, reason.trim()).subscribe({
      next: (summary) => {
        this.selectedCertificate.update(c => c ? {
          ...c,
          isRevoked: true,
          revocationReason: summary.revocationReason,
          revokedAt: summary.revokedAt
        } : null);
        this.messageService.add({
          severity: 'warn',
          summary: 'Certificate Revoked',
          detail: `Certificate ${cert.certificateId} has been flagged as revoked.`
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Revocation Failed',
          detail: err.error?.detail || 'Failed to revoke certificate in registry.'
        });
      }
    });
  }

  reinstateCurrentCertificate(): void {
    const cert = this.selectedCertificate();
    if (!cert) return;
    this.termService.reinstateCertificate(cert.certificateId).subscribe({
      next: () => {
        this.selectedCertificate.update(c => c ? {
          ...c,
          isRevoked: false,
          revocationReason: undefined,
          revokedAt: undefined
        } : null);
        this.messageService.add({
          severity: 'success',
          summary: 'Certificate Reinstated',
          detail: `Certificate ${cert.certificateId} has been reinstated.`
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Reinstatement Failed',
          detail: err.error?.detail || 'Failed to reinstate certificate.'
        });
      }
    });
  }

  exportHonorRollCsv(): void {
    const report = this.honorRollReport();
    if (!report || report.honorees.length === 0) return;

    const headers = ['Rank', 'Student Number', 'Full Name', 'Program', 'Honor Category', 'Term GPA', 'Total Units'];
    const rows = report.honorees.map(h => [
      h.rank,
      `"${h.studentNumber}"`,
      `"${h.fullName}"`,
      `"${h.programCode}"`,
      `"${h.honorCategory}"`,
      h.termGpa.toFixed(2),
      h.totalUnits
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `HonorRoll_Term_${report.termId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  readonly isDownloadingZip = signal<boolean>(false);

  downloadBatchZip(): void {
    const report = this.honorRollReport();
    if (!report) return;

    this.isDownloadingZip.set(true);
    this.termService.downloadCertificatesZip(report.termId, this.selectedProgramFilter() || undefined).subscribe({
      next: (blob) => {
        this.isDownloadingZip.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Term_${report.termId}_Honor_Certificates.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.messageService.add({
          severity: 'success',
          summary: 'Zip Export Complete',
          detail: 'Batch certificates archive downloaded successfully.'
        });
      },
      error: () => {
        this.isDownloadingZip.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: 'Failed to generate batch certificates zip archive.'
        });
      }
    });
  }
}
