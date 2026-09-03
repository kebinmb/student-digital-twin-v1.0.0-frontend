import { Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Drawer, DrawerModule } from 'primeng/drawer';
import { Button, ButtonModule } from 'primeng/button';
import { InputText, InputTextModule } from 'primeng/inputtext';
import { Tag, TagModule } from 'primeng/tag';
import { IconField, IconFieldModule } from 'primeng/iconfield';
import { InputIcon, InputIconModule } from 'primeng/inputicon';
import { CurriculumDesignerStore } from '../../state/curriculum-designer.store';

@Component({
  selector: 'app-course-palette-drawer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Drawer,
    DrawerModule,
    Button,
    ButtonModule,
    InputText,
    InputTextModule,
    Tag,
    TagModule,
    IconField,
    IconFieldModule,
    InputIcon,
    InputIconModule
  ],
  template: `
    <p-drawer
      [visible]="store.isDrawerOpen()"
      (visibleChange)="store.isDrawerOpen.set($event)"
      position="right"
      [style]="{ width: '460px', maxWidth: '100vw' }"
      header="Available Course Catalog">
      
      <div class="drawer-content-container">
        
        <!-- Search Input with PrimeNG IconField -->
        <div>
          <p-iconfield style="width: 100%;">
            <p-inputicon class="pi pi-search" style="color: #94a3b8; font-size: 0.8125rem;"></p-inputicon>
            <input
              pInputText
              type="text"
              placeholder="Search course code or title..."
              style="width: 100%; font-size: 0.8125rem;"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChanged($event)" />
          </p-iconfield>
        </div>

        <!-- Catalog Status Counter -->
        <div class="catalog-status-bar">
          <span class="catalog-status-tag">
            <span class="status-dot"></span>
            {{ store.availableCourses().length }} unassigned course(s) found
          </span>
          @if (store.isSearching()) {
            <span style="color: #116834; display: flex; align-items: center; gap: 0.35rem; font-weight: 600;">
              <i class="pi pi-spin pi-spinner" style="font-size: 0.75rem;"></i> Searching...
            </span>
          }
        </div>

        <!-- Course List Cards -->
        <div class="catalog-scroll-list">
          @for (course of store.availableCourses(); track course.courseId) {
            <div class="catalog-course-card">
              
              <!-- Card Header -->
              <div class="catalog-card-header">
                <div>
                  <span class="catalog-course-code">{{ course.code }}</span>
                  <h4 class="catalog-course-title">{{ course.title }}</h4>
                </div>
                <p-tag [value]="course.creditUnits + ' Units'" severity="info"></p-tag>
              </div>

              <!-- Course Load Breakdown -->
              <div class="catalog-load-row">
                <span class="load-tag">Lec: {{ course.lectureUnits }}h</span>
                <span class="load-tag">Lab: {{ course.labUnits * 3 }}h</span>
                <span style="margin-left: auto; font-weight: 500;">Load: {{ course.contactHoursLec + course.contactHoursLab }} hrs/wk</span>
              </div>

              <!-- Quick Target Placement Selector & Action -->
              @if (store.canEdit()) {
                <div class="placement-action-row">
                  <div class="term-select-controls">
                    <select
                      #yearSelect
                      aria-label="Target Year Level"
                      class="term-select">
                      <option value="1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                      <option value="4">Year 4</option>
                    </select>

                    <select
                      #semSelect
                      aria-label="Target Semester"
                      class="term-select">
                      <option value="1ST_SEM">1st Sem</option>
                      <option value="2ND_SEM">2nd Sem</option>
                      <option value="SUMMER">Summer</option>
                    </select>
                  </div>

                  <p-button
                    icon="pi pi-plus"
                    label="Assign to Term"
                    size="small"
                    severity="primary"
                    [disabled]="store.isSaving()"
                    (onClick)="onAddCourse(course.courseId, +yearSelect.value, semSelect.value)">
                  </p-button>
                </div>
              }
            </div>
          } @empty {
            <div class="catalog-empty-view">
              <i class="pi pi-inbox" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 0.75rem;"></i>
              <p style="font-size: 0.875rem; font-weight: 600; color: #475569; margin: 0;">No unassigned courses found</p>
              <p style="font-size: 0.75rem; margin-top: 0.25rem; color: #94a3b8;">All catalog subjects may already be allocated to terms or no search matches exist.</p>
            </div>
          }
        </div>

      </div>
    </p-drawer>
  `,
  styles: [`
    :host {
      display: block;
    }

    .drawer-content-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
    }

    .catalog-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 500;
      padding: 0 0.25rem;
    }

    .catalog-status-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #116834;
    }

    .catalog-scroll-list {
      flex: 1;
      overflow-y: auto;
      padding-right: 0.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .catalog-course-card {
      padding: 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      transition: all 0.15s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .catalog-course-card:hover {
      border-color: #116834;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06);
    }

    .catalog-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .catalog-course-code {
      font-size: 0.875rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.02em;
    }

    .catalog-course-title {
      font-size: 0.75rem;
      color: #475569;
      font-weight: 500;
      margin: 0.15rem 0 0;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .catalog-load-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.6875rem;
      color: #64748b;
    }

    .load-tag {
      background: #f1f5f9;
      color: #334155;
      font-weight: 500;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .placement-action-row {
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .term-select-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .term-select {
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.3rem 0.5rem;
      background: #f8fafc;
      color: #334155;
    }

    .term-select:focus {
      outline: none;
      border-color: #116834;
      background: #ffffff;
    }

    .catalog-empty-view {
      text-align: center;
      padding: 4rem 1rem;
      color: #94a3b8;
    }
  `]
})
export class CoursePaletteDrawerComponent implements OnInit, OnDestroy {
  readonly store = inject(CurriculumDesignerStore);
  readonly searchQuery = signal<string>('');
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.store.isDrawerOpen()) {
        this.store.loadAvailableCourses(this.searchQuery());
      }
    });
  }

  ngOnInit(): void {
    this.store.loadAvailableCourses(this.searchQuery());
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  onSearchChanged(query: string): void {
    this.searchQuery.set(query);
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.store.searchQuery.set(query);
      this.store.loadAvailableCourses(query);
    }, 300);
  }

  onAddCourse(courseId: number, yearLevel: number, semester: string): void {
    this.store.addCourse(courseId, yearLevel, semester);
  }
}
