import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth-service';

describe('AuthService', () => {
  let service: AuthService;

  function createMockJwt(payload: Record<string, any>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock_signature';
    return `${header}.${body}.${signature}`;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return guest context when not authenticated', () => {
    service.clearAuth();
    const user = service.currentUser();
    expect(user.id).toBeNull();
    expect(user.role).toBe('GUEST');
    expect(user.roles).toEqual([]);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getUserId()).toBeNull();
  });

  it('should correctly parse numeric sub claim into UserContext id', () => {
    const token = createMockJwt({
      sub: '42',
      preferred_username: 'instructor_doe',
      email: 'doe@institution.edu',
      roles: ['ROLE_FACULTY']
    });

    service.setAccessToken(token);

    const user = service.currentUser();
    expect(user.id).toBe(42);
    expect(user.username).toBe('instructor_doe');
    expect(user.email).toBe('doe@institution.edu');
    expect(user.role).toBe('FACULTY');
    expect(user.roles).toContain('FACULTY');
    expect(service.getUserId()).toBe(42);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should verify roles accurately with hasRole and hasAnyRole', () => {
    const token = createMockJwt({
      sub: '99',
      roles: ['ROLE_REGISTRAR', 'ROLE_ADMIN']
    });

    service.setAccessToken(token);

    expect(service.hasRole('REGISTRAR')).toBe(true);
    expect(service.hasRole('ADMIN')).toBe(true);
    expect(service.hasRole('STUDENT')).toBe(false);

    expect(service.hasAnyRole(['ADMIN', 'DEAN'])).toBe(true);
    expect(service.hasAnyRole(['STUDENT', 'FACULTY'])).toBe(false);
  });
});
