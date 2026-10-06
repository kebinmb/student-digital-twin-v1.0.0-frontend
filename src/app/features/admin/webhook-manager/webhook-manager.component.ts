import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { WebhookService, InstitutionalWebhook, WebhookDelivery } from '../../../core/services/webhook.service';

@Component({
  selector: 'app-webhook-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TagModule,
    InputTextModule,
    ToastModule,
    TooltipModule
  ],
  templateUrl: './webhook-manager.component.html',
  styleUrl: './webhook-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService]
})
export class WebhookManagerComponent implements OnInit {
  private readonly webhookService = inject(WebhookService);
  private readonly messageService = inject(MessageService);

  readonly webhooks = signal<InstitutionalWebhook[]>([]);
  readonly deliveries = signal<WebhookDelivery[]>([]);
  readonly selectedWebhook = signal<InstitutionalWebhook | null>(null);

  readonly isLoading = signal<boolean>(false);
  readonly isDeliveriesLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isRetrying = signal<boolean>(false);
  readonly testingPingId = signal<number | null>(null);

  readonly isCreateDialogVisible = signal<boolean>(false);
  readonly isDeliveriesDialogVisible = signal<boolean>(false);

  readonly availableEvents = [
    { code: 'STUDENT_HONOR_AWARDED', label: 'Honor Roll Awarded' },
    { code: 'TUITION_DISCOUNT_APPLIED', label: 'Tuition Discount Applied' },
    { code: 'RISK_ALERT_TRIGGERED', label: 'Academic Risk Alert' },
    { code: 'CLEARANCE_STATUS_CHANGED', label: 'Department Clearance Sign-Off' },
    { code: 'ENROLLMENT_CONFIRMED', label: 'Official Enrollment Confirmed' }
  ];

  readonly selectedEvents = signal<string[]>(['STUDENT_HONOR_AWARDED', 'TUITION_DISCOUNT_APPLIED']);

  readonly webhookForm = new FormGroup({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    targetUrl: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern('https?://.+')] }),
    secretKey: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] })
  });

  // Summary Metrics
  readonly totalWebhooks = computed(() => this.webhooks().length);
  readonly activeWebhooks = computed(() => this.webhooks().filter(w => w.active).length);

  ngOnInit(): void {
    this.loadWebhooks();
  }

  loadWebhooks(): void {
    this.isLoading.set(true);
    this.webhookService.getAll().subscribe({
      next: (data) => {
        this.webhooks.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to Load Webhooks',
          detail: err?.error?.message || 'Could not fetch registered webhooks.'
        });
      }
    });
  }

  openCreateDialog(): void {
    this.webhookForm.reset({
      name: '',
      targetUrl: 'https://',
      secretKey: this.generateRandomSecret()
    });
    this.selectedEvents.set(['STUDENT_HONOR_AWARDED', 'TUITION_DISCOUNT_APPLIED']);
    this.isCreateDialogVisible.set(true);
  }

  generateRandomSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = 'whsec_';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  regenerateSecret(): void {
    this.webhookForm.patchValue({ secretKey: this.generateRandomSecret() });
  }

  toggleEventSelection(eventCode: string): void {
    const current = [...this.selectedEvents()];
    const idx = current.indexOf(eventCode);
    if (idx >= 0) {
      if (current.length > 1) {
        current.splice(idx, 1);
      }
    } else {
      current.push(eventCode);
    }
    this.selectedEvents.set(current);
  }

  isEventSelected(eventCode: string): boolean {
    return this.selectedEvents().includes(eventCode);
  }

  submitWebhook(): void {
    if (this.webhookForm.invalid || this.selectedEvents().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Incomplete',
        detail: 'Please complete all required fields and select at least one subscribed event.'
      });
      return;
    }

    const val = this.webhookForm.getRawValue();
    this.isSaving.set(true);

    this.webhookService.create({
      name: val.name,
      targetUrl: val.targetUrl,
      secretKey: val.secretKey,
      subscribedEvents: this.selectedEvents().join(',')
    }).subscribe({
      next: (created) => {
        this.isSaving.set(false);
        this.isCreateDialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Webhook Registered',
          detail: `Webhook "${created.name}" created with HMAC-SHA256 signature security.`
        });
        this.loadWebhooks();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Registration Failed',
          detail: err?.error?.message || 'Could not register webhook endpoint.'
        });
      }
    });
  }

  toggleWebhookStatus(wh: InstitutionalWebhook): void {
    const newStatus = !wh.active;
    this.webhookService.toggle(wh.id, newStatus).subscribe({
      next: (updated) => {
        this.webhooks.update(list => list.map(item => item.id === updated.id ? updated : item));
        this.messageService.add({
          severity: updated.active ? 'success' : 'info',
          summary: updated.active ? 'Webhook Activated' : 'Webhook Deactivated',
          detail: `Endpoint ${updated.name} is now ${updated.active ? 'actively receiving' : 'paused from'} dispatches.`
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Status Update Failed',
          detail: err?.error?.message || 'Failed to toggle webhook state.'
        });
      }
    });
  }

  deleteWebhook(wh: InstitutionalWebhook): void {
    if (!confirm(`Are you sure you want to delete webhook endpoint "${wh.name}"? This will permanently remove its delivery history.`)) {
      return;
    }

    this.webhookService.delete(wh.id).subscribe({
      next: () => {
        this.webhooks.update(list => list.filter(item => item.id !== wh.id));
        this.messageService.add({
          severity: 'success',
          summary: 'Webhook Deleted',
          detail: `Webhook "${wh.name}" has been removed.`
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Deletion Failed',
          detail: err?.error?.message || 'Failed to delete webhook.'
        });
      }
    });
  }

  viewDeliveries(wh: InstitutionalWebhook): void {
    this.selectedWebhook.set(wh);
    this.isDeliveriesDialogVisible.set(true);
    this.loadDeliveries(wh.id);
  }

  loadDeliveries(webhookId: number): void {
    this.isDeliveriesLoading.set(true);
    this.webhookService.getDeliveries(webhookId).subscribe({
      next: (data) => {
        this.deliveries.set(data);
        this.isDeliveriesLoading.set(false);
      },
      error: (err) => {
        this.isDeliveriesLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to Load Deliveries',
          detail: err?.error?.message || 'Could not fetch delivery history.'
        });
      }
    });
  }

  retryDelivery(delivery: WebhookDelivery): void {
    this.isRetrying.set(true);
    this.webhookService.retryDelivery(delivery.id).subscribe({
      next: (retried) => {
        this.isRetrying.set(false);
        this.deliveries.update(list => list.map(d => d.id === retried.id ? retried : d));
        this.messageService.add({
          severity: 'success',
          summary: 'Re-delivery Triggered',
          detail: `Attempt #${retried.attemptCount} queued. Status: ${retried.status}`
        });
      },
      error: (err) => {
        this.isRetrying.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Retry Request Failed',
          detail: err?.error?.message || 'Failed to trigger re-delivery.'
        });
      }
    });
  }

  testPingWebhook(wh: InstitutionalWebhook): void {
    this.testingPingId.set(wh.id);
    this.webhookService.testPing(wh.id).subscribe({
      next: (delivery) => {
        this.testingPingId.set(null);
        const code = delivery.responseHttpCode;
        const isSuccess = code && code >= 200 && code < 300;
        this.messageService.add({
          severity: isSuccess ? 'success' : 'warn',
          summary: isSuccess ? 'Ping Delivered' : 'Ping Warning',
          detail: `HTTP ${code || 'N/A'}: ${wh.targetUrl} received HMAC-signed PING_VERIFICATION event.`
        });
      },
      error: (err) => {
        this.testingPingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Ping Test Failed',
          detail: err?.error?.message || 'Could not dispatch test ping to endpoint.'
        });
      }
    });
  }

  splitEvents(eventsStr: string): string[] {
    if (!eventsStr) return [];
    return eventsStr.split(',').map(e => e.trim());
  }

  getStatusSeverity(status: string): 'success' | 'danger' | 'warn' | 'info' {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'FAILED': return 'danger';
      case 'DEAD_LETTER': return 'danger';
      case 'PENDING': return 'warn';
      default: return 'info';
    }
  }

  getHttpCodeSeverity(code: number | null): 'success' | 'danger' | 'warn' | 'info' {
    if (!code) return 'info';
    if (code >= 200 && code < 300) return 'success';
    if (code >= 400 && code < 500) return 'warn';
    return 'danger';
  }
}
