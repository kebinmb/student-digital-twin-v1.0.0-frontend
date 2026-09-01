import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProblemDetail } from '../../../core/models/auth.model';
import { PasswordResetService } from '../../../core/service/password-reset/password-reset-service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

@Component({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputText,
    Button
  ],
  selector: 'app-forgot-password-component',
  styleUrl: './forgot-password-component.css',
  templateUrl: './forgot-password-component.html',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly resetService = inject(PasswordResetService);

  private valueChangeSub?: Subscription;

  // Component State Signals
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  get email() {
    return this.forgotForm.get('email');
  }

  ngOnInit(): void {
    this.valueChangeSub = this.forgotForm.valueChanges.subscribe(() => {
      if (this.errorMessage()) this.errorMessage.set(null);
    });
  }

  ngOnDestroy(): void {
    this.valueChangeSub?.unsubscribe();
  }

  isFieldInvalid(fieldName: 'email'): boolean {
    const control = this.forgotForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { email } = this.forgotForm.getRawValue();

    this.resetService.requestPasswordReset({ email }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res || 'If the email is registered, a password reset link has been dispatched.');
        this.forgotForm.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        const problem: ProblemDetail = err.error;
        this.errorMessage.set(
          problem?.detail || 'Unable to process your request. Please verify your email and try again.'
        );
      }
    });
  }
}
