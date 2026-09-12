// File: src/app/features/compliance/compliance.routes.ts

import { Routes } from '@angular/router';

export const COMPLIANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'clearance',
    pathMatch: 'full'
  },
  {
    path: 'clearance',
    loadComponent: () =>
      import('./student-clearance/student-clearance.component').then(m => m.StudentClearanceComponent),
    title: 'Student Multi-Department Clearance — Student Digital Twin'
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('./degree-audit/degree-audit.component').then(m => m.DegreeAuditComponent),
    title: 'Degree Audit & Graduation — Student Digital Twin'
  },
  {
    path: 'ched',
    loadComponent: () =>
      import('./ched-reporting/ched-reporting.component').then(m => m.ChedReportingComponent),
    title: 'CHED HEMIS Reporting — Student Digital Twin'
  }
];
