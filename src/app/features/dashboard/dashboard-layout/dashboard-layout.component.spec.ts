import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardLayoutComponent } from './dashboard-layout.component';

describe('DashboardLayoutComponent', () => {
  let component: DashboardLayoutComponent;
  let fixture: ComponentFixture<DashboardLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create layout component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle sidebar collapse state', () => {
    expect(component.isSidebarCollapsed()).toBe(false);
    component.toggleSidebar();
    expect(component.isSidebarCollapsed()).toBe(true);
    component.toggleSidebar();
    expect(component.isSidebarCollapsed()).toBe(false);
  });

  it('should compute user initials correctly', () => {
    expect(component.userInitials()).toBeTruthy();
    expect(component.userInitials().length).toBeLessThanOrEqual(2);
  });
});
