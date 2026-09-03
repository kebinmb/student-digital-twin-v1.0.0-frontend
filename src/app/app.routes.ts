import { Routes } from '@angular/router';
import { guestGuard, authGuard } from './core/guards/authentication/auth-guard';

export const routes: Routes = [
  // Default redirect
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },

  // Public / Guest Only Routes
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

  // Academics Curriculum Designer URL Aliases
  {
    path: 'academics/curriculum-designer',
    redirectTo: 'dashboard/curriculum/designer',
    pathMatch: 'full'
  },
  {
    path: 'academics/curriculum-designer/:id',
    redirectTo: 'dashboard/curriculum/designer/:id'
  },

  // Institutional Management URL Aliases
  {
    path: 'institution',
    redirectTo: 'dashboard/institution/academic-periods',
    pathMatch: 'full'
  },
  {
    path: 'institution/:tab',
    redirectTo: 'dashboard/institution/:tab'
  },

  // Protected Dashboard Layout with Child Routes
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
        loadChildren: () =>
          import('./features/curriculum/curriculum.routes').then(m => m.CURRICULUM_ROUTES)
      },
      {
        path: 'institution',
        loadChildren: () =>
          import('./features/institution/institution.routes').then(m => m.INSTITUTION_ROUTES)
      },
      {
        path: '**',
        redirectTo: ''
      }
    ]
  },

  // Wildcard fallback
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];