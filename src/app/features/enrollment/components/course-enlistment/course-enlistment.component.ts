import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EnrollmentStore } from '../../state/enrollment.store';
import { EnrollmentItemResponse } from '../../../../core/models/enrollment.model';

@Component({
  selector: 'app-course-enlistment',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
    MessageModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './course-enlistment.component.html',
  styleUrls: ['./course-enlistment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseEnlistmentComponent {
  readonly store = inject(EnrollmentStore);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  confirmDropSection(item: EnrollmentItemResponse): void {
    this.confirmationService.confirm({
      key: 'enrollmentConfirmDialog',
      header: 'Drop Class Section',
      message: `Are you sure you want to drop ${item.courseCode} (${item.sectionCode})? Your reserved seat will be released immediately.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Drop Section',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-secondary p-button-sm',
      accept: () => {
        this.store.removeEnlistedSection(
          item.sectionId,
          () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Section Removed',
              detail: `Successfully dropped ${item.courseCode} (${item.sectionCode}).`
            });
          },
          errorMsg => {
            this.messageService.add({
              severity: 'error',
              summary: 'Drop Failed',
              detail: errorMsg
            });
          }
        );
      }
    });
  }

  confirmFinalizeEnrollment(): void {
    const enrollment = this.store.enrollment();
    if (!enrollment || !enrollment.items || enrollment.items.length === 0) {
      return;
    }

    this.confirmationService.confirm({
      key: 'enrollmentConfirmDialog',
      header: 'Confirm & Finalize Enrollment',
      message: `You are about to officially finalize your enrollment for ${enrollment.termName} with a total of ${enrollment.totalCreditUnits} credit units across ${enrollment.items.length} subjects. Proceed?`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Confirm Enrollment',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-secondary p-button-sm',
      accept: () => {
        this.store.confirmEnrollment(
          confirmation => {
            this.messageService.add({
              severity: 'success',
              summary: 'Enrollment Confirmed',
              detail: confirmation.message
            });
          },
          errorMsg => {
            this.messageService.add({
              severity: 'error',
              summary: 'Confirmation Failed',
              detail: errorMsg
            });
          }
        );
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ENROLLED': return 'success';
      case 'ENLISTED': return 'info';
      case 'ASSESSED': return 'warn';
      case 'DRAFT': return 'secondary';
      case 'DROPPED': return 'danger';
      default: return 'info';
    }
  }
}
