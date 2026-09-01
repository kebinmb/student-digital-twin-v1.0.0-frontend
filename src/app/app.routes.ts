import { Routes } from '@angular/router';
import { guestGuard, authGuard } from './core/guards/authentication/auth-guard';

export const routes: Routes = [
  // Default redirect
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },

  // Public / Guest Only Route
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login-component/login-component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
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