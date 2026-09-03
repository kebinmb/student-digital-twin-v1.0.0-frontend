import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

export const globalErrorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  let messageService: MessageService | null = null;
  try {
    messageService = inject(MessageService);
  } catch {
    // MessageService not available in context
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Allow auth-interceptor to handle 401s
      if (error.status === 401) {
        return throwError(() => error);
      }

      let summary = 'Request Error';
      let detail = error.error?.detail || error.error?.message || error.message || 'An unexpected error occurred.';

      if (error.status === 400) {
        summary = error.error?.title || 'Bad Request';
        if (error.error?.invalidParams) {
          const fields = Object.entries(error.error.invalidParams)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('; ');
          detail = fields || detail;
        }
      } else if (error.status === 403) {
        summary = 'Access Denied';
        detail = 'You do not have the required permissions for this action.';
      } else if (error.status === 409) {
        summary = error.error?.title || 'Rule Violation / Conflict';
      } else if (error.status >= 500) {
        summary = 'Server Error';
        detail = 'An unexpected server error occurred. Please try again later.';
      }

      if (messageService) {
        messageService.add({
          severity: error.status >= 500 ? 'error' : 'warn',
          summary,
          detail,
          life: 5000
        });
      }

      return throwError(() => error);
    })
  );
};
