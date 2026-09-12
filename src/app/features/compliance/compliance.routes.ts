// File: src/app/features/compliance/compliance.routes.ts

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/authorization/role.guard';

export const COMPLIANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'clearance',
    pathMatch: 'full'
  },
  {
    path: 'clearance',
    canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'ACCOUNTANT', 'STUDENT'])],
    loadComponent: () =>
      import('./student-clearance/student-clearance.component').then(m => m.StudentClearanceComponent),
    title: 'Student Multi-Department Clearance — Student Digital Twin'
  },
  {
    path: 'audit',
    canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'STUDENT'])],
    loadComponent: () =>
      import('./degree-audit/degree-audit.component').then(m => m.DegreeAuditComponent),
    title: 'Degree Audit & Graduation — Student Digital Twin'
  },
  {
    path: 'ched',
    canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN'])],
    loadComponent: () =>
      import('./ched-reporting/ched-reporting.component').then(m => m.ChedReportingComponent),
    title: 'CHED HEMIS Reporting — Student Digital Twin'
  },
  {
    path: 'equity-my-profile',
    canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'STUDENT'])],
    loadComponent: () =>
      import('./student-equity-profiling/student-equity-profiling.component').then(m => m.StudentEquityProfilingComponent),
    title: 'Statutory Equity Profiling — Student Digital Twin'
  },
  {
    path: 'equity-portal',
    canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'ACCOUNTANT'])],
    loadComponent: () =>
      import('./institutional-equity-portal/institutional-equity-portal.component').then(m => m.InstitutionalEquityPortalComponent),
    title: 'Institutional Statutory Equity Audit — Student Digital Twin'
  }
];

