import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/authorization/role.guard';
import { InstitutionManagementComponent } from './institution-management.component';
import { AcademicPeriodsComponent } from './views/academic-periods/academic-periods.component';
import { OrganizationalHierarchyComponent } from './views/organizational-hierarchy/organizational-hierarchy.component';
import { CourseCatalogManagerComponent } from './components/course-catalog-manager/course-catalog-manager.component';
import { CiloPiloMatrixComponent } from './components/cilo-pilo-matrix/cilo-pilo-matrix.component';
import { GradingScaleManagerComponent } from './components/grading-scale-manager/grading-scale-manager.component';
import { FinancialFoundationsComponent } from './components/financial-foundations/financial-foundations.component';

export const INSTITUTION_ROUTES: Routes = [
  {
    path: '',
    component: InstitutionManagementComponent,
    children: [
      {
        path: '',
        redirectTo: 'academic-periods',
        pathMatch: 'full'
      },
      {
        path: 'academic-periods',
        component: AcademicPeriodsComponent,
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON'])]
      },
      {
        path: 'hierarchy',
        component: OrganizationalHierarchyComponent,
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON'])]
      },
      {
        path: 'courses',
        component: CourseCatalogManagerComponent,
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON'])]
      },
      {
        path: 'cilo-pilo-matrix',
        component: CiloPiloMatrixComponent,
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON'])]
      },
      {
        path: 'grading-scales',
        component: GradingScaleManagerComponent,
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON'])]
      },
      {
        path: 'financials',
        component: FinancialFoundationsComponent,
        canActivate: [roleGuard(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON'])]
      }
    ]
  }
];
