import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { EnrollmentStore } from '../../state/enrollment.store';
import { CourseEligibilityItemDto, AvailableSectionOptionDto } from '../../../../core/models/enrollment.model';

import { Drawer } from 'primeng/drawer';
import { Skeleton } from 'primeng/skeleton';

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
    Drawer,
    Skeleton,
    ProgressBarModule,
    MessageModule,
    ToastModule,
    SelectModule,
    InputText,
    IconField,
    InputIcon
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
  readonly searchFilter = signal<string>('');
  readonly statusFilter = signal<string>('ELIGIBLE');
  readonly yearFilter = signal<string>('ALL');
  readonly semesterFilter = signal<string>('ALL');

  readonly eligibleCount = computed(() => {
    return (this.store.advising()?.courses || []).filter(c => c.eligibilityStatus === 'ELIGIBLE').length;
  });

  readonly passedCount = computed(() => {
    return (this.store.advising()?.courses || []).filter(c => c.eligibilityStatus === 'ALREADY_PASSED').length;
  });

  readonly allCount = computed(() => {
    return (this.store.advising()?.courses || []).length;
  });

  readonly filteredCourses = computed(() => {
    const courses = this.store.advising()?.courses || [];
    const search = this.searchFilter().toLowerCase().trim();
    const status = this.statusFilter();
    const year = this.yearFilter();
    const sem = this.semesterFilter();

    return courses.filter((c) => {
      const matchesSearch = !search || c.code.toLowerCase().includes(search) || c.title.toLowerCase().includes(search);
      const matchesStatus = status === 'ALL' || c.eligibilityStatus === status;
      const matchesYear = year === 'ALL' || String(c.yearLevel) === year;
      
      let matchesSem = true;
      if (sem !== 'ALL') {
        const courseSem = (c.semester || '').toUpperCase();
        if (sem === '1ST_SEM') matchesSem = courseSem.includes('1') || courseSem.includes('FIRST');
        else if (sem === '2ND_SEM') matchesSem = courseSem.includes('2') || courseSem.includes('SECOND');
        else if (sem === 'SUMMER') matchesSem = courseSem.includes('SUMMER');
      }

      return matchesSearch && matchesStatus && matchesYear && matchesSem;
    });
  });

  readonly statusOptions = [
    { label: 'Eligible Only', value: 'ELIGIBLE' },
    { label: 'Already Passed', value: 'ALREADY_PASSED' },
    { label: 'All Courses', value: 'ALL' }
  ];

  readonly yearOptions = [
    { label: 'All Years', value: 'ALL' },
    { label: '1st Year', value: '1' },
    { label: '2nd Year', value: '2' },
    { label: '3rd Year', value: '3' },
    { label: '4th Year', value: '4' }
  ];

  readonly semesterOptions = [
    { label: 'All Semesters', value: 'ALL' },
    { label: '1st Semester', value: '1ST_SEM' },
    { label: '2nd Semester', value: '2ND_SEM' },
    { label: 'Summer Term', value: 'SUMMER' }
  ];

  ngOnInit(): void {
    this.store.loadInitialData();
  }

  onStudentSelect(studentId: number | { value: number } | string | null): void {
    const id = typeof studentId === 'object' ? studentId?.value : Number(studentId);
    if (id) {
      this.store.setStudentId(id);
    }
  }

  onTermSelect(termId: number | { value: number } | string | null): void {
    const id = typeof termId === 'object' ? termId?.value : Number(termId);
    if (id) {
      this.store.setSelectedTermId(id);
    }
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

  formatScheduleSlots(summary: string | undefined): { day: string; timeRoom: string }[] {
    if (!summary || summary === 'Schedule TBA' || summary === 'No timetable assigned') {
      return [{ day: 'Schedule', timeRoom: 'To Be Announced (TBA)' }];
    }

    const parts = summary.split(/;|\n/);
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
      case 'ELIGIBLE': return 'success';
      case 'CURRENTLY_ENROLLED': return 'info';
      case 'LOCKED_PREREQUISITE': return 'danger';
      case 'ALREADY_PASSED': return 'secondary';
      default: return 'info';
    }
  }

  getOptionIcon(value: string): string {
    switch (value) {
      case 'ALL': return 'pi pi-list text-slate-600';
      case 'ELIGIBLE': return 'pi pi-check-circle text-emerald-600';
      case 'LOCKED_PREREQUISITE': return 'pi pi-lock text-rose-600';
      case 'ALREADY_PASSED': return 'pi pi-verified text-blue-600';
      default: return 'pi pi-filter';
    }
  }
}
