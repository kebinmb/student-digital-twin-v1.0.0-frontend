// File: src/app/features/finance/finance.routes.ts

import { Routes } from '@angular/router';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'cashier',
    pathMatch: 'full'
  },
  {
    path: 'cashier',
    loadComponent: () =>
      import('./cashier-terminal/cashier-terminal.component').then(m => m.CashierTerminalComponent),
    title: 'Cashier POS Terminal — Student Digital Twin'
  },
  {
    path: 'ledger',
    loadComponent: () =>
      import('./student-account-ledger/student-account-ledger.component').then(m => m.StudentAccountLedgerComponent),
    title: 'Student Account Ledger — Student Digital Twin'
  },
  {
    path: 'unifast',
    loadComponent: () =>
      import('./unifast-billing-claim/unifast-billing-claim.component').then(m => m.UnifastBillingClaimComponent),
    title: 'UniFAST FHE Claims — Student Digital Twin'
  }
];
