import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ForgotPasswordRequest, ResetPasswordRequest } from '../../models/password-reset.model';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PasswordResetService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    private readonly baseUrl = `${environment.apiUrl}/public/auth`;

    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly statusMessageSignal = signal<string | null>(null);
    private readonly errorMessageSignal = signal<string | null>(null);

    readonly isLoading = computed(() => this.isLoadingSignal());
    readonly statusMessage = computed(() => this.statusMessageSignal());
    readonly errorMessage = computed(() => this.errorMessageSignal());

    requestPasswordReset(data: ForgotPasswordRequest): Observable<string> {
        this.setLoadingState(true);
        return this.http.post(`${this.baseUrl}/forgot-password`, data, { responseType: 'text' }).pipe(
            tap((res) => {
                this.statusMessageSignal.set(res);
                this.errorMessageSignal.set(null);
                this.isLoadingSignal.set(false);
            }),
            catchError((err) => {
                const message = err.error || 'Failed to process password reset request.';
                this.errorMessageSignal.set(message);
                this.isLoadingSignal.set(false);
                return throwError(() => err);
            })
        )
    }
    resetPassword(data: ResetPasswordRequest): Observable<string> {
        this.setLoadingState(true);

        return this.http.post(`${this.baseUrl}/reset-password`, data, { responseType: 'text' }).pipe(
            tap((res) => {
                this.statusMessageSignal.set(res);
                this.errorMessageSignal.set(null);
                this.isLoadingSignal.set(false);
            }),
            catchError((err) => {
                const message = err.error || 'Failed to reset password. The link may have expired.';
                this.errorMessageSignal.set(message);
                this.isLoadingSignal.set(false);
                return throwError(() => err);
            })
        );
    }
    clearState(): void {
        this.isLoadingSignal.set(false);
        this.statusMessageSignal.set(null);
        this.errorMessageSignal.set(null);
    }

    private setLoadingState(loading: boolean): void {
        this.isLoadingSignal.set(loading);
        this.errorMessageSignal.set(null);
        this.statusMessageSignal.set(null);
    }
}
