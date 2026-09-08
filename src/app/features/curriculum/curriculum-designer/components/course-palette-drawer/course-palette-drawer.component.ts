import { Component, effect, inject, OnDestroy, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Drawer, DrawerModule } from 'primeng/drawer';
import { Button, ButtonModule } from 'primeng/button';
import { InputText, InputTextModule } from 'primeng/inputtext';
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
    IconField,
    IconFieldModule,
    InputIcon,
    InputIconModule
  ],
  templateUrl: './course-palette-drawer.component.html',
  styleUrl: './course-palette-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
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
