import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../../service/authentication/auth-service';

describe('roleGuard', () => {
  let authService: AuthService;
  let router: Router;

  function createMockJwt(roles: string[]): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({ sub: '1', roles }));
    return `${header}.${body}.mock_sig`;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should allow navigation when user has required role', () => {
    authService.setAccessToken(createMockJwt(['ROLE_ADMIN']));
    const guard = roleGuard(['ADMIN', 'DEAN']);

    TestBed.runInInjectionContext(() => {
      const mockRoute = {} as ActivatedRouteSnapshot;
      const mockState = { url: '/dashboard/scheduling' } as RouterStateSnapshot;
      const result = guard(mockRoute, mockState);

      expect(result).toBe(true);
    });
  });

  it('should redirect to /forbidden with blockedUrl when user lacks required role', () => {
    authService.setAccessToken(createMockJwt(['ROLE_STUDENT']));
    const guard = roleGuard(['ADMIN', 'DEAN']);

    TestBed.runInInjectionContext(() => {
      const mockRoute = {} as ActivatedRouteSnapshot;
      const mockState = { url: '/dashboard/scheduling' } as RouterStateSnapshot;
      const result = guard(mockRoute, mockState);

      expect(result instanceof UrlTree).toBe(true);
      const urlTree = result as UrlTree;
      expect(router.serializeUrl(urlTree)).toBe('/forbidden?blockedUrl=%2Fdashboard%2Fscheduling');
    });
  });
});
