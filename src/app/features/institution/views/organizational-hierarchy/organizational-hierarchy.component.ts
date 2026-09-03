import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';

import { CampusManagerComponent } from '../../components/campus-manager/campus-manager.component';
import { DepartmentManagerComponent } from '../../components/department-manager/department-manager.component';
import { ProgramManagerComponent } from '../../components/program-manager/program-manager.component';

@Component({
  selector: 'app-organizational-hierarchy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectButtonModule,
    CampusManagerComponent,
    DepartmentManagerComponent,
    ProgramManagerComponent
  ],
  template: `
    <div class="hierarchy-container">
      <div class="hierarchy-nav">
        <p-selectbutton
          [options]="subTabs"
          [(ngModel)]="activeSubTab"
          optionLabel="label"
          optionValue="value"
          styleClass="p-buttonset-sm">
        </p-selectbutton>
      </div>

      <div class="hierarchy-content">
        @switch (activeSubTab) {
          @case ('campuses') {
            <app-campus-manager></app-campus-manager>
          }
          @case ('departments') {
            <app-department-manager></app-department-manager>
          }
          @case ('programs') {
            <app-program-manager></app-program-manager>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .hierarchy-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .hierarchy-nav {
      display: flex;
      align-items: center;
    }
  `]
})
export class OrganizationalHierarchyComponent {
  activeSubTab = 'campuses';

  readonly subTabs = [
    { label: 'Campuses', value: 'campuses' },
    { label: 'Academic Departments', value: 'departments' },
    { label: 'Degree Programs & PILOs', value: 'programs' }
  ];
}
