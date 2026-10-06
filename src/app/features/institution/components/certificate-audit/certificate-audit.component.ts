import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

import { TermService } from '../../../../core/services/institution.service';
import { CertificateRevocationSummary } from '../../../../core/models/institution.model';

@Component({
  selector: 'app-certificate-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    SkeletonModule,
    CardModule,
    DividerModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './certificate-audit.component.html',
  styleUrl: './certificate-audit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CertificateAuditComponent implements OnInit {
  private readonly termService = inject(TermService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly revocations = signal<CertificateRevocationSummary[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isReinstating = signal<string | null>(null);
  readonly isExporting = signal<boolean>(false);

  /** Bound to global filter input */
  globalFilter = '';

  ngOnInit(): void {
    this.loadRevocations();
  }

  loadRevocations(): void {
    this.isLoading.set(true);
    this.termService.getActiveCertificateRevocations().subscribe({
      next: (data) => {
        this.revocations.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: 'Could not retrieve certificate revocations.'
        });
        this.isLoading.set(false);
      }
    });
  }

  promptReinstate(rev: CertificateRevocationSummary): void {
    this.confirmationService.confirm({
      header: 'Reinstate Certificate',
      message: `Reinstate certificate <strong>${rev.certificateId}</strong>? This will remove the active revocation record.`,
      icon: 'pi pi-undo',
      acceptLabel: 'Yes, Reinstate',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.executeReinstate(rev)
    });
  }

  private executeReinstate(rev: CertificateRevocationSummary): void {
    this.isReinstating.set(rev.certificateId);
    this.termService.reinstateCertificate(rev.certificateId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Reinstated',
          detail: `Certificate ${rev.certificateId} has been reinstated.`
        });
        // Remove from local signal immediately for instant UI feedback
        this.revocations.update(list =>
          list.filter(r => r.certificateId !== rev.certificateId)
        );
        this.isReinstating.set(null);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Reinstatement Failed',
          detail: `Could not reinstate certificate ${rev.certificateId}.`
        });
        this.isReinstating.set(null);
      }
    });
  }

  refreshList(): void {
    this.loadRevocations();
  }

  exportCsv(): void {
    this.isExporting.set(true);
    this.termService.exportCertificateRevocations('csv').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-revocations-audit-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'CSV Exported',
          detail: 'Revocation audit registry exported to CSV.'
        });
      },
      error: () => {
        this.isExporting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Export Failed',
          detail: 'Could not generate CSV export.'
        });
      }
    });
  }

  exportHtmlReport(): void {
    this.isExporting.set(true);
    this.termService.exportCertificateRevocations('html').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          // If popup blocked, download instead
          const a = document.createElement('a');
          a.href = url;
          a.download = `certificate-revocations-report-${new Date().toISOString().slice(0, 10)}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        this.isExporting.set(false);
      },
      error: () => {
        this.isExporting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Report Failed',
          detail: 'Could not generate printable HTML audit report.'
        });
      }
    });
  }
}
