import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="forbidden-container">
      <div class="forbidden-card">
        <div class="forbidden-icon-badge">
          <i class="pi pi-shield"></i>
        </div>
        <h1 class="forbidden-title">403 — Access Restricted</h1>
        <p class="forbidden-desc">
          Your current institutional account credentials do not possess the required authorities to access this resource or feature.
        </p>
        @if (blockedUrl) {
          <div class="forbidden-context">
            <span class="context-label">Requested Resource:</span>
            <code class="context-path">{{ blockedUrl }}</code>
          </div>
        }
        <div class="forbidden-actions">
          <p-button 
            label="Return to Dashboard" 
            icon="pi pi-arrow-left" 
            severity="primary"
            (onClick)="navigateToDashboard()">
          </p-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forbidden-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 70vh;
      padding: 1.5rem;
      background-color: var(--surface-ground, #f8fafc);
    }
    .forbidden-card {
      max-width: 480px;
      width: 100%;
      background: var(--surface-card, #ffffff);
      border: 1px solid var(--surface-border, #e2e8f0);
      border-radius: 8px;
      padding: 2.5rem 2rem;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .forbidden-icon-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: #fef2f2;
      color: #dc2626;
      font-size: 1.75rem;
      margin-bottom: 1.25rem;
      border: 1px solid #fee2e2;
    }
    .forbidden-title {
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--text-color, #0f172a);
      margin: 0 0 0.75rem 0;
      letter-spacing: -0.01em;
    }
    .forbidden-desc {
      font-size: 0.9375rem;
      color: var(--text-color-secondary, #64748b);
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
    }
    .forbidden-context {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      background-color: var(--surface-50, #f8fafc);
      border: 1px solid var(--surface-border, #e2e8f0);
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .context-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-color-secondary, #64748b);
    }
    .context-path {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8125rem;
      color: #0f172a;
      word-break: break-all;
    }
    .forbidden-actions {
      display: flex;
      justify-content: center;
    }
  `]
})
export class ForbiddenComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly blockedUrl = this.route.snapshot.queryParamMap.get('blockedUrl');

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
