import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login-component';

import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        providePrimeNG()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with invalid empty form', () => {
    expect(component.loginForm.valid).toBe(false);
    expect(component.usernameOrEmail?.valid).toBe(false);
    expect(component.password?.valid).toBe(false);
  });

  it('should mark all controls as touched if submitted when invalid', () => {
    component.onSubmit();
    expect(component.usernameOrEmail?.touched).toBe(true);
    expect(component.password?.touched).toBe(true);
    expect(component.isFieldInvalid('usernameOrEmail')).toBe(true);
  });

  it('should auto-clear errorMessage when user edits form values', () => {
    component.errorMessage.set('Invalid credentials');
    expect(component.errorMessage()).toBe('Invalid credentials');

    component.loginForm.patchValue({ usernameOrEmail: 'student123' });
    expect(component.errorMessage()).toBeNull();
  });
});
