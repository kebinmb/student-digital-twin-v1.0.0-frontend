// File: src/app/features/compliance/ched-reporting/ched-reporting.component.ts

import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';

import { ComplianceApiService } from '../../../core/service/compliance/compliance-api.service';
import {
  ChedFormE1InstitutionalDto,
  ChedFormE3EnrolmentDto,
  ChedFormE4GraduateDto,
  ChedFormE5FacultyDto
} from '../../../core/models/compliance.model';

@Component({
  selector: 'app-ched-reporting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TagModule,
    CardModule
  ],
  templateUrl: './ched-reporting.component.html',
  styleUrl: './ched-reporting.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChedReportingComponent implements OnInit {
  private readonly complianceApi = inject(ComplianceApiService);
  private readonly messageService = inject(MessageService);

  // Form Controls
  campusId: number = 1;
  termId: number = 1;
  activeTab: string = 'E1';

  // Component Signals
  readonly formE1 = signal<ChedFormE1InstitutionalDto | null>(null);
  readonly formE3 = signal<ChedFormE3EnrolmentDto[]>([]);
  readonly formE4 = signal<ChedFormE4GraduateDto[]>([]);
  readonly formE5 = signal<ChedFormE5FacultyDto[]>([]);
  readonly isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadFormE1();
  }

  loadFormE1(): void {
    this.isLoading.set(true);
    this.complianceApi.exportChedE1(this.campusId).subscribe({
      next: (data) => {
        this.formE1.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadFormE3(): void {
    this.isLoading.set(true);
    this.complianceApi.exportChedE3(this.termId).subscribe({
      next: (data) => {
        this.formE3.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadFormE4(): void {
    this.isLoading.set(true);
    this.complianceApi.exportChedE4(this.termId).subscribe({
      next: (data) => {
        this.formE4.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadFormE5(): void {
    this.isLoading.set(true);
    this.complianceApi.exportChedE5(this.termId).subscribe({
      next: (data) => {
        this.formE5.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'E1') this.loadFormE1();
    if (tab === 'E3') this.loadFormE3();
    if (tab === 'E4') this.loadFormE4();
    if (tab === 'E5') this.loadFormE5();
  }

  exportCsv(formName: string): void {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (formName === 'E1' && this.formE1()) {
      const e1 = this.formE1()!;
      headers = ['Campus ID', 'Campus Name', 'CHED Institutional Code', 'Total Programs', 'Total Enrolled', 'Total Faculty'];
      rows = [[e1.campusId, `"${e1.campusName}"`, `"${e1.chedInstitutionalCode}"`, e1.totalPrograms, e1.totalEnrolledStudents, e1.totalFaculty]];
    } else if (formName === 'E3') {
      headers = ['Term ID', 'Program Code', 'Program Name', 'Male Count', 'Female Count', 'Total Enrolled', 'Total Units'];
      rows = this.formE3().map(d => [d.termId, `"${d.programCode}"`, `"${d.programName}"`, d.maleCount, d.femaleCount, d.totalEnrolled, d.totalUnitsTaken]);
    } else if (formName === 'E4') {
      headers = ['Term ID', 'Program Code', 'Total Graduates', 'Summa Cum Laude', 'Magna Cum Laude', 'Cum Laude'];
      rows = this.formE4().map(d => [d.termId, `"${d.programCode}"`, d.totalGraduates, d.summaCumLaudeCount, d.magnaCumLaudeCount, d.cumLaudeCount]);
    } else if (formName === 'E5') {
      headers = ['Faculty ID', 'Faculty Name', 'Highest Degree', 'Status', 'Contact Hours', 'Assigned Sections'];
      rows = this.formE5().map(d => [d.facultyId, `"${d.facultyName}"`, `"${d.highestDegree}"`, `"${d.employmentStatus}"`, d.teachingLoadContactHours, d.assignedSectionsCount]);
    }

    if (headers.length === 0) return;

    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CHED_Form_${formName}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
