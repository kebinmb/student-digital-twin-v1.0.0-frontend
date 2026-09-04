import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SchedulingComponent } from './scheduling.component';
import { SchedulingStore } from './state/scheduling.store';

describe('SchedulingComponent', () => {
  let component: SchedulingComponent;
  let fixture: ComponentFixture<SchedulingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchedulingComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        SchedulingStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SchedulingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle between sections and timetable tabs', () => {
    expect(component.activeTab()).toBe('sections');
    component.setTab('timetable');
    expect(component.activeTab()).toBe('timetable');
    component.setTab('sections');
    expect(component.activeTab()).toBe('sections');
  });
});
