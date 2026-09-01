import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

// PrimeNG Standalone Components & Directives
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';

import { ProblemDetail } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/service/authentication/auth-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputText,
    Password,
    Button,
    Checkbox
  ],
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private valueChangeSub?: Subscription;

  // Component UI State Signals
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Strongly Typed Reactive Form
  readonly loginForm = this.fb.nonNullable.group({
    usernameOrEmail: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required]],
    rememberMe: [false]
  });

  get usernameOrEmail() {
    return this.loginForm.get('usernameOrEmail');
  }

  get password() {
    return this.loginForm.get('password');
  }

  ngOnInit(): void {
    // Restore remembered username if available
    try {
      const savedUser = localStorage.getItem('chmsu_remembered_user');
      if (savedUser) {
        this.loginForm.patchValue({
          usernameOrEmail: savedUser,
          rememberMe: true
        });
      }
    } catch {
      // Ignore localStorage security exceptions in restricted contexts
    }

    // Automatically dismiss error banner when user begins typing again
    this.valueChangeSub = this.loginForm.valueChanges.subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    this.valueChangeSub?.unsubscribe();
  }

  isFieldInvalid(fieldName: 'usernameOrEmail' | 'password'): boolean {
    const control = this.loginForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { usernameOrEmail, password, rememberMe } = this.loginForm.getRawValue();

    this.authService.login({ usernameOrEmail, password }).subscribe({
      next: () => {
        this.isLoading.set(false);

        // Handle remember-me storage
        try {
          if (rememberMe) {
            localStorage.setItem('chmsu_remembered_user', usernameOrEmail);
          } else {
            localStorage.removeItem('chmsu_remembered_user');
          }
        } catch {
          // Ignore storage errors
        }

        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        const problem: ProblemDetail = err.error;
        this.errorMessage.set(
          problem?.detail || 'Invalid username or password. Please check your credentials and try again.'
        );
      }
    });
  }
}