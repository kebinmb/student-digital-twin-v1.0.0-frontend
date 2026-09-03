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
  templateUrl: './organizational-hierarchy.component.html',
  styleUrl: './organizational-hierarchy.component.css'
})
export class OrganizationalHierarchyComponent {
  activeSubTab = 'campuses';

  readonly subTabs = [
    { label: 'Campuses', value: 'campuses' },
    { label: 'Academic Departments', value: 'departments' },
    { label: 'Degree Programs & PILOs', value: 'programs' }
  ];
}
