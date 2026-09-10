import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { Drawer } from 'primeng/drawer';
import { Skeleton } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { EnrollmentStore } from '../../state/enrollment.store';
import { StudentEnrollmentResponse } from '../../../../core/models/enrollment.model';

@Component({
  selector: 'app-enrollment-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    SelectModule,
    ToastModule,
    Drawer,
    Skeleton
  ],
  templateUrl: './enrollment-audit.component.html',
  styleUrls: ['./enrollment-audit.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentAuditComponent implements OnInit {
  readonly store = inject(EnrollmentStore);
  private readonly messageService = inject(MessageService);

  readonly selectedEnrollment = signal<StudentEnrollmentResponse | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);

  ngOnInit(): void {
    if (this.store.selectedTermId()) {
      this.store.loadTermEnrollments(this.store.selectedTermId()!);
    }
  }

  onTermSelect(termId: number | { value: number } | string | null): void {
    const id = typeof termId === 'object' ? termId?.value : Number(termId);
    if (id) {
      this.store.setSelectedTermId(id);
    }
  }

  openDetailsDrawer(enrollment: StudentEnrollmentResponse): void {
    this.selectedEnrollment.set(enrollment);
    this.isDrawerOpen.set(true);
  }

  closeDetailsDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedEnrollment.set(null);
  }

  updateStatus(enrollmentId: number, status: string, isOverloadApproved?: boolean): void {
    this.store.updateEnrollmentStatus(
      enrollmentId,
      status,
      isOverloadApproved,
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Status Updated',
          detail: `Enrollment status updated to ${status}`
        });
        if (this.selectedEnrollment()?.enrollmentId === enrollmentId) {
          const current = this.selectedEnrollment();
          if (current) {
            this.selectedEnrollment.set({ ...current, status, isOverloadApproved: isOverloadApproved ?? current.isOverloadApproved });
          }
        }
      },
      msg => {
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: msg
        });
      }
    );
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
      case 'DROPPED': return 'danger';
      case 'DRAFT': return 'secondary';
      default: return 'info';
    }
  }
}
