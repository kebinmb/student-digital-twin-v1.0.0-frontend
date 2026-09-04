import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { EnrollmentStore } from '../../state/enrollment.store';
import { CourseEligibilityItemDto, AvailableSectionOptionDto } from '../../../../core/models/enrollment.model';

@Component({
  selector: 'app-student-advising',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    ProgressBarModule,
    MessageModule,
    ToastModule,
    SelectModule
  ],
  providers: [MessageService],
  templateUrl: './student-advising.component.html',
  styleUrls: ['./student-advising.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAdvisingComponent implements OnInit {
  readonly store = inject(EnrollmentStore);
  private readonly messageService = inject(MessageService);

  readonly isSectionModalVisible = signal<boolean>(false);
  readonly selectedCourse = signal<CourseEligibilityItemDto | null>(null);

  ngOnInit(): void {
    this.store.loadInitialData();
  }

  onTermSelect(termId: any): void {
    const id = typeof termId === 'object' ? termId?.value : Number(termId);
    this.store.selectedTermId.set(id);
    this.store.loadStudentAdvising(this.store.studentId(), id);
  }

  openSectionChooser(course: CourseEligibilityItemDto): void {
    this.selectedCourse.set(course);
    this.isSectionModalVisible.set(true);
  }

  closeSectionChooser(): void {
    this.isSectionModalVisible.set(false);
    this.selectedCourse.set(null);
  }

  enlistInSection(section: AvailableSectionOptionDto): void {
    this.store.enlistSection(
      section.sectionId,
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Enlistment Successful',
          detail: `Enlisted in section ${section.sectionCode}`
        });
        this.closeSectionChooser();
      },
      errorMsg => {
        this.messageService.add({
          severity: 'error',
          summary: 'Enlistment Blocked',
          detail: errorMsg
        });
      }
    );
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ELIGIBLE': return 'success';
      case 'CURRENTLY_ENROLLED': return 'info';
      case 'LOCKED_PREREQUISITE': return 'danger';
      case 'ALREADY_PASSED': return 'secondary';
      default: return 'info';
    }
  }
}
