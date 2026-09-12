// File: src/app/features/finance/finance.routes.ts

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/authorization/role.guard';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'cashier',
    pathMatch: 'full'
  },
  {
    path: 'cashier',
    canActivate: [roleGuard(['ADMIN', 'CASHIER'])],
    loadComponent: () =>
      import('./cashier-terminal/cashier-terminal.component').then(m => m.CashierTerminalComponent),
    title: 'Cashier POS Terminal — Student Digital Twin'
  },
  {
    path: 'ledger',
    canActivate: [roleGuard(['ADMIN', 'ACCOUNTANT', 'CASHIER', 'REGISTRAR', 'STUDENT'])],
    loadComponent: () =>
      import('./student-account-ledger/student-account-ledger.component').then(m => m.StudentAccountLedgerComponent),
    title: 'Student Account Ledger — Student Digital Twin'
  },
  {
    path: 'unifast',
    canActivate: [roleGuard(['ADMIN', 'ACCOUNTANT', 'REGISTRAR'])],
    loadComponent: () =>
      import('./unifast-billing-claim/unifast-billing-claim.component').then(m => m.UnifastBillingClaimComponent),
    title: 'UniFAST FHE Claims — Student Digital Twin'
  }
];

