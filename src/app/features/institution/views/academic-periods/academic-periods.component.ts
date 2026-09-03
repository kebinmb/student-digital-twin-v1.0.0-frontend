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
  templateUrl: './academic-periods.component.html',
  styleUrl: './academic-periods.component.css'
})
export class AcademicPeriodsComponent {}
