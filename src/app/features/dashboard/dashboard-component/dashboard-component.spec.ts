import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardComponent } from './dashboard-component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create dashboard overview component', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial KPI metrics', () => {
    expect(component.metrics.length).toBe(4);
    expect(component.metrics[0].title).toBe('Current GWA');
  });

  it('should list today classes', () => {
    expect(component.todayClasses.length).toBeGreaterThan(0);
    expect(component.todayClasses[0].courseCode).toBe('IT 311');
  });
});
