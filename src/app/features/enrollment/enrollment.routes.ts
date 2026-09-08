import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/authorization/role.guard';
import { EnrollmentComponent } from './enrollment.component';

export const ENROLLMENT_ROUTES: Routes = [
  {
    path: '',
    component: EnrollmentComponent,
    canActivate: [roleGuard(['ADMIN', 'REGISTRAR', 'DEAN', 'CHAIRPERSON', 'FACULTY', 'STUDENT'])],
    title: 'Student Enrollment & Advising'
  }
];
