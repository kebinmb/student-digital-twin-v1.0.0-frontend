import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import { CampusService, TermService } from '../../../core/services/institution.service';
import { Campus, TermResponse } from '../../../core/models/institution.model';
import { AcademicPeriodStore } from '../../../core/services/academic-period.store';
import {
  ChedFormE1InstitutionalDto,
  ChedFormE3EnrolmentDto,
  ChedFormE4GraduateDto,
  ChedFormE5FacultyDto
} from '../../../core/models/compliance.model';

import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-ched-reporting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    CardModule,
    SelectModule,
    SkeletonModule,
    EmptyStateComponent
  ],
  templateUrl: './ched-reporting.component.html',
  styleUrl: './ched-reporting.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChedReportingComponent implements OnInit {
  private readonly complianceApi = inject(ComplianceApiService);
  private readonly campusService = inject(CampusService);
  private readonly termService = inject(TermService);
  readonly periodStore = inject(AcademicPeriodStore);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // Form Controls Signals
  readonly campusId = signal<number | null>(null);
  readonly termId = signal<number | null>(null);
  readonly activeTab = signal<'E1' | 'E3' | 'E4' | 'E5'>('E1');

  constructor() {
    effect(() => {
      const globalTermId = this.periodStore.selectedTermId();
      if (globalTermId && globalTermId !== this.termId()) {
        this.termId.set(globalTermId);
        if (this.activeTab() === 'E3') this.loadFormE3();
        if (this.activeTab() === 'E4') this.loadFormE4();
        if (this.activeTab() === 'E5') this.loadFormE5();
      }
    });
  }

  // Institution Options Signals
  readonly campuses = signal<Campus[]>([]);
  readonly terms = signal<TermResponse[]>([]);

  readonly campusOptions = computed(() =>
    this.campuses().map((c) => ({
      label: `${c.name} (${c.code})${c.isMain ? ' — Main' : ''}`,
      value: c.id
    }))
  );

  readonly termOptions = computed(() =>
    this.terms().map((t) => {
      const yearCode = t.academicYearCode || '';
      const type = t.termName || t.termType || `Term ${t.id}`;
      const activeMarker = t.isActive ? ' (Active)' : '';
      return {
        label: `${type}${yearCode ? ' - ' + yearCode : ''}${activeMarker}`,
        value: t.id
      };
    })
  );

  // Data State Signals
  readonly formE1 = signal<ChedFormE1InstitutionalDto | null>(null);
  readonly formE3 = signal<ChedFormE3EnrolmentDto[]>([]);
  readonly formE4 = signal<ChedFormE4GraduateDto[]>([]);
  readonly formE5 = signal<ChedFormE5FacultyDto[]>([]);
  readonly isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadCampusOptions();
    this.loadTermOptions();
  }

  loadCampusOptions(): void {
    if (this.campusService?.activeCampuses$?.pipe) {
      this.campusService.activeCampuses$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (campusesList) => {
          if (campusesList && campusesList.length > 0) {
            this.campuses.set(campusesList);
            const main = campusesList.find((c) => c.isMain) || campusesList[0];
            if (main && !this.campusId()) {
              this.campusId.set(main.id);
              this.loadFormE1();
            }
          }
        }
      });
    }

    if (this.campusService?.getActive) {
      this.campusService.getActive().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (campusesList) => {
          this.campuses.set(campusesList);
          const main = campusesList.find((c) => c.isMain) || campusesList[0];
          if (main && !this.campusId()) {
            this.campusId.set(main.id);
            this.loadFormE1();
          }
        },
        error: () => {
          if (this.campusService?.getAll) {
            this.campusService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: (allCampuses) => {
                this.campuses.set(allCampuses);
                if (allCampuses.length > 0 && !this.campusId()) {
                  this.campusId.set(allCampuses[0].id);
                  this.loadFormE1();
                }
              }
            });
          }
        }
      });
    }
  }

  loadTermOptions(): void {
    if (this.termService?.allTerms$?.pipe) {
      this.termService.allTerms$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (termsList) => {
          if (termsList && termsList.length > 0) {
            this.terms.set(termsList);
            const active = termsList.find((t) => t.isActive) || termsList[0];
            if (active && !this.termId()) {
              this.termId.set(active.id);
            }
          }
        }
      });
    }

    if (this.termService?.getAll) {
      this.termService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (termsList) => {
          this.terms.set(termsList);
          const active = termsList.find((t) => t.isActive) || termsList[0];
          if (active && !this.termId()) {
            this.termId.set(active.id);
          }
        },
        error: () => {
          if (this.termService?.getActive) {
            this.termService.getActive().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: (active) => {
                this.terms.set([active]);
                if (!this.termId()) {
                  this.termId.set(active.id);
                }
              }
            });
          }
        }
      });
    }
  }

  onCampusChange(newCampusId: number | null): void {
    this.campusId.set(newCampusId);
    if (this.activeTab() === 'E1' && newCampusId) {
      this.loadFormE1();
    }
  }

  onTermChange(newTermId: number | null): void {
    this.termId.set(newTermId);
    if (newTermId) {
      this.periodStore.setTerm(newTermId);
      if (this.activeTab() === 'E3') this.loadFormE3();
      if (this.activeTab() === 'E4') this.loadFormE4();
      if (this.activeTab() === 'E5') this.loadFormE5();
    } else {
      this.formE3.set([]);
      this.formE4.set([]);
      this.formE5.set([]);
    }
  }

  loadFormE1(): void {
    const campus = this.campusId();
    if (!campus) return;

    this.isLoading.set(true);
    this.complianceApi.exportChedE1(campus).subscribe({
      next: (data) => {
        this.formE1.set(data);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'CHED Form E-1 Loaded',
          detail: `Institutional profile for ${data.campusName} generated.`
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Query Failed',
          detail: err.error?.message || 'Failed to retrieve CHED Form E-1 institutional data.'
        });
      }
    });
  }

  loadFormE3(): void {
    const term = this.termId();
    if (!term) return;

    this.isLoading.set(true);
    this.complianceApi.exportChedE3(term).subscribe({
      next: (data) => {
        this.formE3.set(data);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'CHED Form E-3 Loaded',
          detail: `Enrolment data for ${data.length} program offerings loaded.`
        });
      },
      error: (err) => {
        this.formE3.set([]);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Query Failed',
          detail: err.error?.message || 'Failed to retrieve CHED Form E-3 enrolment data.'
        });
      }
    });
  }

  loadFormE4(): void {
    const term = this.termId();
    if (!term) return;

    this.isLoading.set(true);
    this.complianceApi.exportChedE4(term).subscribe({
      next: (data) => {
        this.formE4.set(data);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'CHED Form E-4 Loaded',
          detail: `Graduate statistics across ${data.length} programs loaded.`
        });
      },
      error: (err) => {
        this.formE4.set([]);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Query Failed',
          detail: err.error?.message || 'Failed to retrieve CHED Form E-4 graduate data.'
        });
      }
    });
  }

  loadFormE5(): void {
    const term = this.termId();
    if (!term) return;

    this.isLoading.set(true);
    this.complianceApi.exportChedE5(term).subscribe({
      next: (data) => {
        this.formE5.set(data);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'CHED Form E-5 Loaded',
          detail: `Teaching load records for ${data.length} faculty members loaded.`
        });
      },
      error: (err) => {
        this.formE5.set([]);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Query Failed',
          detail: err.error?.message || 'Failed to retrieve CHED Form E-5 faculty data.'
        });
      }
    });
  }

  switchTab(tab: 'E1' | 'E3' | 'E4' | 'E5'): void {
    this.activeTab.set(tab);
    if (tab === 'E1') this.loadFormE1();
    if (tab === 'E3') this.loadFormE3();
    if (tab === 'E4') this.loadFormE4();
    if (tab === 'E5') this.loadFormE5();
  }

  exportCsv(formName: 'E1' | 'E3' | 'E4' | 'E5'): void {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (formName === 'E1' && this.formE1()) {
      const e1 = this.formE1()!;
      headers = ['Campus ID', 'Campus Name', 'CHED Institutional Code', 'Total Programs', 'Total Enrolled', 'Total Faculty'];
      rows = [[e1.campusId, `"${e1.campusName}"`, `"${e1.chedInstitutionalCode}"`, e1.totalPrograms, e1.totalEnrolledStudents, e1.totalFaculty]];
    } else if (formName === 'E3') {
      headers = ['Term ID', 'Program Code', 'Program Name', 'Male Count', 'Female Count', 'Total Enrolled', 'Total Units'];
      rows = this.formE3().map((d) => [d.termId, `"${d.programCode}"`, `"${d.programName}"`, d.maleCount, d.femaleCount, d.totalEnrolled, d.totalUnitsTaken]);
    } else if (formName === 'E4') {
      headers = ['Term ID', 'Program Code', 'Total Graduates', 'Summa Cum Laude', 'Magna Cum Laude', 'Cum Laude'];
      rows = this.formE4().map((d) => [d.termId, `"${d.programCode}"`, d.totalGraduates, d.summaCumLaudeCount, d.magnaCumLaudeCount, d.cumLaudeCount]);
    } else if (formName === 'E5') {
      headers = ['Faculty ID', 'Faculty Name', 'Highest Degree', 'Status', 'Contact Hours', 'Assigned Sections'];
      rows = this.formE5().map((d) => [d.facultyId, `"${d.facultyName}"`, `"${d.highestDegree}"`, `"${d.employmentStatus}"`, d.teachingLoadContactHours, d.assignedSectionsCount]);
    }

    if (headers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data to Export',
        detail: `Please ensure CHED Form ${formName} has loaded data before exporting.`
      });
      return;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CHED_Form_${formName}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.messageService.add({
      severity: 'success',
      summary: 'Export Successful',
      detail: `CHED Form ${formName} CSV report successfully generated.`
    });
  }
}
