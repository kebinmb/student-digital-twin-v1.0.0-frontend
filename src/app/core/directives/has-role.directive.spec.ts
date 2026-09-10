import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HasRoleDirective } from './has-role.directive';
import { AuthService } from '../service/authentication/auth-service';

@Component({
  standalone: true,
  imports: [HasRoleDirective],
  template: `
    <div *hasRole="['ADMIN', 'REGISTRAR']" id="admin-registrar-content">Admin/Registrar Area</div>
    <div *hasRole="'STUDENT'" id="student-content">Student Area</div>
  `
})
class TestHostComponent {}

describe('HasRoleDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let authService: AuthService;

  function createMockJwt(roles: string[]): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({ sub: '1', roles }));
    return `${header}.${body}.mock_sig`;
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should not render restricted content when user lacks roles', () => {
    authService.setAccessToken(createMockJwt(['ROLE_FACULTY']));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#admin-registrar-content')).toBeNull();
    expect(compiled.querySelector('#student-content')).toBeNull();
  });

  it('should render content when user has matching role', () => {
    authService.setAccessToken(createMockJwt(['ROLE_ADMIN']));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#admin-registrar-content')).not.toBeNull();
    expect(compiled.querySelector('#student-content')).toBeNull();
  });

  it('should render student content when user is STUDENT', () => {
    authService.setAccessToken(createMockJwt(['ROLE_STUDENT']));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#admin-registrar-content')).toBeNull();
    expect(compiled.querySelector('#student-content')).not.toBeNull();
  });
});
