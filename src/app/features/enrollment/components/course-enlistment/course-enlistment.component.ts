import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EnrollmentStore } from '../../state/enrollment.store';
import { EnrollmentItemResponse } from '../../../../core/models/enrollment.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

import { Drawer } from 'primeng/drawer';
import { Skeleton } from 'primeng/skeleton';

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
    MessageModule,
    Drawer,
    Skeleton
  ],
  templateUrl: './course-enlistment.component.html',
  styleUrls: ['./course-enlistment.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseEnlistmentComponent {
  readonly store = inject(EnrollmentStore);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  readonly isStudent = computed(() => this.authService.hasRole('STUDENT'));

  readonly selectedEnlistedItem = signal<EnrollmentItemResponse | null>(null);
  readonly isItemDrawerOpen = signal<boolean>(false);

  openItemDrawer(item: EnrollmentItemResponse): void {
    this.selectedEnlistedItem.set(item);
    this.isItemDrawerOpen.set(true);
  }

  confirmDropSection(item: EnrollmentItemResponse): void {
    if (this.store.isEnrollmentClosed() && this.isStudent()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Enrollment Closed',
        detail: 'Cannot drop class sections while the enrollment period is closed. Please contact the Registrar.'
      });
      return;
    }

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
    if (this.store.isEnrollmentClosed() && this.isStudent()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Enrollment Closed',
        detail: 'The enrollment period for this term is closed. Cannot finalize enrollment.'
      });
      return;
    }

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

  formatScheduleSlots(summary: string | undefined): { day: string; timeRoom: string }[] {
    if (!summary || summary === 'Schedule TBA' || summary === 'No timetable assigned' || summary === 'No schedule') {
      return [{ day: 'Schedule', timeRoom: 'To Be Announced (TBA)' }];
    }

    const parts = summary.includes(';') || summary.includes('\n')
      ? summary.split(/;|\n/)
      : summary.split(/,\s*(?=[A-Za-z]{3,}\s+\d{1,2}:\d{2})/);
    const slots: { day: string; timeRoom: string }[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const match = trimmed.match(/^([A-Za-z,\s]+?)\s+(\d{1,2}:\d{2}.*)$/);
      if (match) {
        const daysRaw = match[1].trim();
        const timeRoom = match[2].trim();
        const days = daysRaw.split(',').map(d => d.trim());
        if (days.length > 1) {
          for (const d of days) {
            slots.push({ day: d, timeRoom });
          }
        } else {
          slots.push({ day: daysRaw, timeRoom });
        }
      } else {
        slots.push({ day: 'Slot', timeRoom: trimmed });
      }
    }

    return slots.length > 0 ? slots : [{ day: 'Schedule', timeRoom: summary }];
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
