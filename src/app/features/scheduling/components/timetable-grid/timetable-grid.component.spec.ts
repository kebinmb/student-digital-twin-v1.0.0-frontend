import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TimetableGridComponent } from './timetable-grid.component';
import { SchedulingStore } from '../../state/scheduling.store';

describe('TimetableGridComponent', () => {
  let component: TimetableGridComponent;
  let fixture: ComponentFixture<TimetableGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimetableGridComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SchedulingStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimetableGridComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 6 days of the week', () => {
    expect(component.days.length).toBe(6);
  });

  it('should filter by room and reset filter', () => {
    component.onRoomChange(2);
    expect(component.selectedRoomId()).toBe(2);
    component.resetFilter();
    expect(component.selectedRoomId()).toBeNull();
  });

  it('should emit addSchedule and trigger store modal request when onAddSchedule is called', () => {
    let emitted = false;
    component.addSchedule.subscribe(() => { emitted = true; });
    const store = TestBed.inject(SchedulingStore);
    component.onAddSchedule();
    expect(emitted).toBe(true);
    expect(store.openModalRequest()).toBe(true);
  });
});
