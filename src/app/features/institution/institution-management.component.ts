import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

// PrimeNG Components
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AcademicYearService } from '../../core/services/institution.service';
import { AcademicYear } from '../../core/models/institution.model';

@Component({
  selector: 'app-institution-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    ButtonModule,
    TagModule,
    SelectButtonModule,
    ToastModule,
    MessageModule,
    ConfirmDialogModule
  ],
  templateUrl: './institution-management.component.html',
  styleUrl: './institution-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstitutionManagementComponent implements OnInit {
  private readonly ayService = inject(AcademicYearService);
  private readonly router = inject(Router);

  readonly currentAcademicYear = signal<AcademicYear | null>(null);
  readonly isLoadingAy = signal<boolean>(false);

  activeTab: string = 'academic-periods';

  readonly tabs = [
    { label: 'Academic Periods', value: 'academic-periods', icon: 'pi pi-calendar' },
    { label: 'Organizational Hierarchy', value: 'hierarchy', icon: 'pi pi-sitemap' },
    { label: 'Course Catalog', value: 'courses', icon: 'pi pi-book' },
    { label: 'OBE Matrix (CILO-PILO)', value: 'cilo-pilo-matrix', icon: 'pi pi-th-large' },
    { label: 'Grading Scales', value: 'grading-scales', icon: 'pi pi-chart-bar' },
    { label: 'Financial Foundations', value: 'financials', icon: 'pi pi-dollar' }
  ];

  ngOnInit(): void {
    this.updateActiveTabFromUrl(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateActiveTabFromUrl(event.urlAfterRedirects);
      });

    this.loadCurrentAy();
  }

  updateActiveTabFromUrl(url: string): void {
    for (const tab of this.tabs) {
      if (url.includes(`/institution/${tab.value}`)) {
        this.activeTab = tab.value;
        return;
      }
    }
    // Default
    this.activeTab = 'academic-periods';
  }

  loadCurrentAy(): void {
    this.isLoadingAy.set(true);
    this.ayService.getCurrent().subscribe({
      next: (ay) => {
        this.currentAcademicYear.set(ay);
        this.isLoadingAy.set(false);
      },
      error: () => {
        this.currentAcademicYear.set(null);
        this.isLoadingAy.set(false);
      }
    });
  }

  onTabChange(tab: string): void {
    this.router.navigate(['/dashboard/institution', tab]);
  }

  navigateToCurriculumDesigner(): void {
    this.router.navigate(['/dashboard/curriculum/designer']);
  }
}
