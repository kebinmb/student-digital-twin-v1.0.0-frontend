import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { ForbiddenComponent } from './forbidden.component';

describe('ForbiddenComponent', () => {
  let component: ForbiddenComponent;
  let fixture: ComponentFixture<ForbiddenComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForbiddenComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'blockedUrl' ? '/dashboard/institution' : null)
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForbiddenComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create and display 403 Access Restricted', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.forbidden-title')?.textContent).toContain('403 — Access Restricted');
    expect(compiled.querySelector('.context-path')?.textContent).toContain('/dashboard/institution');
  });

  it('should navigate to dashboard on button click', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.navigateToDashboard();
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
