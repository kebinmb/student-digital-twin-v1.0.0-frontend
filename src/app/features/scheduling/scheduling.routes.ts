import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/authorization/role.guard';

export const SCHEDULING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./scheduling.component').then(m => m.SchedulingComponent),
    canActivate: [roleGuard(['ADMIN', 'DEAN', 'CHAIRPERSON', 'REGISTRAR', 'FACULTY'])],
    title: 'Class Scheduling & Timetable'
  }
];
