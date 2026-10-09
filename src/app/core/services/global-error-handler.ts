import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private injector: Injector,
    private zone: NgZone
  ) {}

  handleError(error: unknown): void {
    // Log detailed trace only in development
    if (!environment.production) {
      console.error('[GlobalErrorHandler] Uncaught application error:', error);
    }

    // Safely present user-friendly error notice via MessageService
    this.zone.run(() => {
      try {
        const messageService = this.injector.get(MessageService, null);
        if (messageService) {
          messageService.add({
            severity: 'error',
            summary: 'Application Error',
            detail: 'An unexpected application error occurred. If the issue persists, please reload the page.',
            life: 6000
          });
        }
      } catch {
        // Fail-safe suppression if MessageService is unavailable
      }
    });
  }
}
