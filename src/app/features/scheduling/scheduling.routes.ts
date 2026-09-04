import { Routes } from '@angular/router';

export const SCHEDULING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./scheduling.component').then(m => m.SchedulingComponent),
    title: 'Class Scheduling & Timetable'
  }
];
