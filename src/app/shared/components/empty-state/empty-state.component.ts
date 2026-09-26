// File: src/app/shared/components/empty-state/empty-state.component.ts

import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  readonly icon = input<string>('pi pi-inbox');
  readonly title = input<string>('No Data Available');
  readonly description = input<string>('There are no records to display at this time.');
  readonly actionLabel = input<string | null>(null);
  readonly actionIcon = input<string | null>('pi pi-plus');
  readonly actionDisabled = input<boolean>(false);
  readonly severity = input<'info' | 'warn' | 'success' | 'danger'>('info');

  readonly actionClick = output<void>();

  onActionClick(): void {
    if (!this.actionDisabled()) {
      this.actionClick.emit();
    }
  }

  getIconColorClass(): string {
    switch (this.severity()) {
      case 'success':
        return 'severity-success';
      case 'warn':
        return 'severity-warn';
      case 'danger':
        return 'severity-danger';
      default:
        return 'severity-info';
    }
  }
}
