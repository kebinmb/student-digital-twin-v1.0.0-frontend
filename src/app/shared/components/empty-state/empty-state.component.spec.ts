// File: src/app/shared/components/empty-state/empty-state.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create empty state component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit actionClick when action button is clicked', () => {
    let emitted = false;
    component.actionClick.subscribe(() => { emitted = true; });
    component.onActionClick();
    expect(emitted).toBe(true);
  });
});
