import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DepartmentManagerComponent } from './department-manager.component';

describe('DepartmentManagerComponent', () => {
  let component: DepartmentManagerComponent;
  let fixture: ComponentFixture<DepartmentManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentManagerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DepartmentManagerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
