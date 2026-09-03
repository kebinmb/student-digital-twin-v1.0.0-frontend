import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicYearManagerComponent } from '../../components/academic-year-manager/academic-year-manager.component';
import { TermManagerComponent } from '../../components/term-manager/term-manager.component';

@Component({
  selector: 'app-academic-periods',
  standalone: true,
  imports: [
    CommonModule,
    AcademicYearManagerComponent,
    TermManagerComponent
  ],
  template: `
    <div class="periods-container">
      <app-academic-year-manager></app-academic-year-manager>
      <app-term-manager></app-term-manager>
    </div>
  `,
  styles: [`
    .periods-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
  `]
})
export class AcademicPeriodsComponent {}
