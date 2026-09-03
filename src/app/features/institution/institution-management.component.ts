import { Component, OnInit, inject, signal } from '@angular/core';
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

import { AcademicYearService } from '../../core/services/institution.service';

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
    MessageModule
  ],
  template: `
    <div class="institution-page-container">
      <p-toast></p-toast>

      <!-- Institutional Header Banner -->
      <div class="institution-header-card">
        <div class="header-content-left">
          <div class="brand-row">
            <span class="brand-tag">CHMSU Academic Registry</span>
            @if (currentAcademicYear()) {
              <p-tag
                severity="success"
                [value]="'Active AY: ' + currentAcademicYear()!.code"
                icon="pi pi-check-circle">
              </p-tag>
            } @else {
              <p-tag
                severity="warn"
                value="No Active Academic Year"
                icon="pi pi-exclamation-triangle">
              </p-tag>
            }
          </div>
          <h1 class="page-title">Institutional Master Data & Relational Foundations</h1>
          <p class="page-subtitle">
            Manage campuses, academic units, degree programs, master courses, grading scales, and financial foundations feeding the Curriculum Designer.
          </p>
        </div>

        <div class="header-content-right">
          <p-button
            label="Curriculum Designer"
            icon="pi pi-sitemap"
            size="small"
            severity="secondary"
            [outlined]="true"
            (onClick)="navigateToCurriculumDesigner()">
          </p-button>
        </div>
      </div>

      <!-- Prerequisite Warning: If no active academic year is set -->
      @if (!isLoadingAy() && !currentAcademicYear()) {
        <div class="alert-banner">
          <p-message
            severity="warn"
            text="Prerequisite Warning: No operational academic year is currently designated. Please activate an Academic Year below to enable curriculum revisions and scheduling."
            styleClass="w-full">
          </p-message>
        </div>
      }

      <!-- Master Tab Navigation (Routing-backed) -->
      <div class="tabs-nav-bar">
        <p-selectbutton
          [options]="tabs"
          [(ngModel)]="activeTab"
          (onChange)="onTabChange($event.value)"
          optionLabel="label"
          optionValue="value"
          styleClass="institution-tab-switch">
          <ng-template let-item #item>
            <i [class]="item.icon" class="tab-btn-icon"></i>
            <span class="tab-btn-label">{{ item.label }}</span>
          </ng-template>
        </p-selectbutton>
      </div>

      <!-- Child Route Content Outlet -->
      <div class="tab-content-container">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 1.5rem;
      background: #f8fafc;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .institution-page-container {
      max-width: 1380px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .institution-header-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      box-shadow: 0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04);
      flex-wrap: wrap;
    }
    .header-content-left {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .brand-tag {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #116834;
      background: #ecfdf5;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #bbf7d0;
    }
    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      font-size: 0.84rem;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
      max-width: 780px;
    }
    .alert-banner {
      width: 100%;
    }
    .tabs-nav-bar {
      display: flex;
      align-items: center;
      overflow-x: auto;
    }
    :host ::ng-deep .institution-tab-switch .p-button {
      font-size: 0.8125rem;
      padding: 0.55rem 1rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .tab-btn-icon {
      margin-right: 0.4rem;
    }
    .tab-btn-label {
      font-weight: 600;
    }
    .tab-content-container {
      width: 100%;
    }
    .w-full {
      width: 100%;
    }
  `]
})
export class InstitutionManagementComponent implements OnInit {
  private readonly ayService = inject(AcademicYearService);
  private readonly router = inject(Router);

  readonly currentAcademicYear = signal<any | null>(null);
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
    this.router.navigate(['/dashboard/curriculum/designer/1']);
  }
}
