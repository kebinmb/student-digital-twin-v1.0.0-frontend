import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../service/authentication/auth-service';

function checkRoles(roles: string[], authService: AuthService, router: Router, state: RouterStateSnapshot) {
  const checkRole = (): boolean => {
    if (roles.length === 0) {
      return true;
    }
    return authService.hasAnyRole(roles);
  };

  if (authService.isAuthenticated()) {
    if (checkRole()) {
      return true;
    }
    return router.createUrlTree(['/dashboard']);
  }

  return authService.refreshToken().pipe(
    map(() => {
      if (checkRole()) {
        return true;
      }
      return router.createUrlTree(['/dashboard']);
    }),
    catchError(() => {
      return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
    })
  );
}

export function roleGuard(roles: string[]): CanActivateFn;
export function roleGuard(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): ReturnType<CanActivateFn>;
export function roleGuard(
  rolesOrRoute: string[] | ActivatedRouteSnapshot,
  state?: RouterStateSnapshot
): any {
  if (Array.isArray(rolesOrRoute)) {
    const roles = rolesOrRoute;
    return (route: ActivatedRouteSnapshot, st: RouterStateSnapshot) => {
      const authService = inject(AuthService);
      const router = inject(Router);
      return checkRoles(roles, authService, router, st);
    };
  }

  const route = rolesOrRoute as ActivatedRouteSnapshot;
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredRoles: string[] = route.data?.['roles'] || [];
  return checkRoles(requiredRoles, authService, router, state!);
}
