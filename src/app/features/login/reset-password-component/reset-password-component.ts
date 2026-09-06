import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { Subscription } from 'rxjs';
import { ProblemDetail } from '../../../core/models/auth.model';
import { PasswordResetService } from '../../../core/service/password-reset/password-reset-service';
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword ? { passwordMismatch: true } : null;
};
@Component({
  imports: [CommonModule,
    ReactiveFormsModule,
    RouterLink,
    Password,
    Button],
  selector: 'app-reset-password-component',
  styleUrl: './reset-password-component.css',
  templateUrl: './reset-password-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly resetService = inject(PasswordResetService);

  private valueChangeSub?: Subscription;

  readonly token = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isSuccess = signal(false);

  readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  get newPassword() {
    return this.resetForm.get('newPassword');
  }

  get confirmPassword() {
    return this.resetForm.get('confirmPassword');
  }

  ngOnInit(): void {
    const rawToken = this.route.snapshot.queryParamMap.get('token');
    if (!rawToken) {
      this.errorMessage.set('Invalid or missing password reset token. Please request a new link.');
    } else {
      this.token.set(rawToken);
    }

    this.valueChangeSub = this.resetForm.valueChanges.subscribe(() => {
      if (this.errorMessage() && this.token()) {
        this.errorMessage.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    this.valueChangeSub?.unsubscribe();
  }

  isFieldInvalid(fieldName: 'newPassword' | 'confirmPassword'): boolean {
    const control = this.resetForm.get(fieldName);
    const isTouched = !!(control && (control.dirty || control.touched));

    if (fieldName === 'confirmPassword' && this.resetForm.hasError('passwordMismatch') && isTouched) {
      return true;
    }
    return !!(control && control.invalid && isTouched);
  }

  onSubmit(): void {
    const currentToken = this.token();
    if (!currentToken) {
      this.errorMessage.set('No reset token present.');
      return;
    }

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { newPassword } = this.resetForm.getRawValue();

    this.resetService.resetPassword({ token: currentToken, newPassword }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        const problem: ProblemDetail = err.error;
        this.errorMessage.set(
          problem?.detail || 'Unable to update password. The link may have expired or is invalid.'
        );
      }
    });
  }
}
