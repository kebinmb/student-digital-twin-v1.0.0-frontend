// File: src/app/app.routes.ts

import { Routes } from '@angular/router';
import { guestGuard, authGuard } from './core/guards/authentication/auth-guard';
import { roleGuard } from './core/guards/authorization/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login-component/login-component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/login/forgot-password-component/forgot-password-component').then(m => m.ForgotPasswordComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/login/reset-password-component/reset-password-component').then(m => m.ResetPasswordComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./features/forbidden/forbidden.component').then(m => m.ForbiddenComponent),
    title: 'Access Restricted — Student Digital Twin'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard-layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard-component/dashboard-component').then(m => m.DashboardComponent)
      },
      {
        path: 'curriculum',
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'CHAIRPERSON'])],
        loadChildren: () =>
          import('./features/curriculum/curriculum.routes').then(m => m.CURRICULUM_ROUTES)
      },
      {
        path: 'institution',
        canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON'])],
        loadChildren: () =>
          import('./features/institution/institution.routes').then(m => m.INSTITUTION_ROUTES)
      },
      {
        path: 'scheduling',
        canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON'])],
        loadChildren: () =>
          import('./features/scheduling/scheduling.routes').then(m => m.SCHEDULING_ROUTES)
      },
      {
        path: 'enrollment',
        canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'STUDENT'])],
        loadChildren: () =>
          import('./features/enrollment/enrollment.routes').then(m => m.ENROLLMENT_ROUTES)
      },
      {
        path: 'grades',
        canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'FACULTY'])],
        loadComponent: () =>
          import('./features/gradebook/faculty-gradebook.component').then(m => m.FacultyGradebookComponent)
      },
      {
        path: 'finance',
        canActivate: [roleGuard(['ADMIN', 'ACCOUNTANT', 'CASHIER', 'REGISTRAR', 'STUDENT'])],
        loadChildren: () =>
          import('./features/finance/finance.routes').then(m => m.FINANCE_ROUTES)
      },
      {
        path: 'compliance',
        canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN', 'ACCOUNTANT', 'STUDENT'])],
        loadChildren: () =>
          import('./features/compliance/compliance.routes').then(m => m.COMPLIANCE_ROUTES)
      },
      {
        path: 'users',
        canActivate: [roleGuard(['ADMIN', 'REGISTRAR'])],
        loadComponent: () =>
          import('./features/admin/user-management/user-management.component').then(m => m.UserManagementComponent)
      },
      {
        path: 'faculty-accounts',
        canActivate: [roleGuard(['ADMIN', 'REGISTRAR'])],
        loadComponent: () =>
          import('./features/faculty-management/faculty-management.component').then(m => m.FacultyManagementComponent)
      },
      {
        path: '**',
        redirectTo: ''
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];