import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/authorization/role.guard';

export const CURRICULUM_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'designer', // <-- Clean redirect without hardcoded ID
    pathMatch: 'full'
  },
  {
    path: 'designer',
    loadComponent: () =>
      import('./curriculum-designer/curriculum-designer.component').then(
        m => m.CurriculumDesignerComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'DEAN', 'CHAIRPERSON', 'REGISTRAR', 'FACULTY'] }
  },
  {
    path: 'designer/:id',
    loadComponent: () =>
      import('./curriculum-designer/curriculum-designer.component').then(
        m => m.CurriculumDesignerComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'DEAN', 'CHAIRPERSON', 'REGISTRAR', 'FACULTY'] }
  }
];