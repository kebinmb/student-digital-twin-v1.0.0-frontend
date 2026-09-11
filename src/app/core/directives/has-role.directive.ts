import { Directive, TemplateRef, ViewContainerRef, inject, effect, input } from '@angular/core';
import { AuthService } from '../service/authentication/auth-service';

@Directive({
  selector: '[hasRole]',
  standalone: true
})
export class HasRoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  readonly hasRole = input<string | string[]>([]);
  private isVisible = false;

  constructor() {
    // Automatically re-evaluate whenever the currentUser reactive signal or hasRole input changes
    effect(() => {
      this.authService.currentUser();
      const rolesVal = this.hasRole();
      const requiredRoles = Array.isArray(rolesVal) ? rolesVal : [rolesVal];
      this.updateView(requiredRoles);
    });
  }

  private updateView(requiredRoles: string[]): void {
    if (requiredRoles.length === 0 || (requiredRoles.length === 1 && !requiredRoles[0])) {
      if (!this.isVisible) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.isVisible = true;
      }
      return;
    }

    const hasPermission = this.authService.hasAnyRole(requiredRoles);

    if (hasPermission && !this.isVisible) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.isVisible = true;
    } else if (!hasPermission && this.isVisible) {
      this.viewContainer.clear();
      this.isVisible = false;
    }
  }
}
