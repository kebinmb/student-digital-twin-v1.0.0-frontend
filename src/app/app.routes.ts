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
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'CHAIRPERSON', 'REGISTRAR'])],
        loadChildren: () =>
          import('./features/curriculum/curriculum.routes').then(m => m.CURRICULUM_ROUTES)
      },
      {
        path: 'institution',
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'REGISTRAR'])],
        loadChildren: () =>
          import('./features/institution/institution.routes').then(m => m.INSTITUTION_ROUTES)
      },
      {
        path: 'scheduling',
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'CHAIRPERSON', 'REGISTRAR'])],
        loadChildren: () =>
          import('./features/scheduling/scheduling.routes').then(m => m.SCHEDULING_ROUTES)
      },
      {
        path: 'enrollment',
        loadChildren: () =>
          import('./features/enrollment/enrollment.routes').then(m => m.ENROLLMENT_ROUTES)
      },
      {
        path: 'grades',
        canActivate: [roleGuard(['FACULTY', 'DEAN', 'ADMIN', 'REGISTRAR'])],
        loadComponent: () =>
          import('./features/gradebook/faculty-gradebook.component').then(m => m.FacultyGradebookComponent)
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