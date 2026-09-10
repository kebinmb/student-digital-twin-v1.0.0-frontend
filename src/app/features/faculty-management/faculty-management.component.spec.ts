import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { FacultyManagementComponent } from './faculty-management.component';

describe('FacultyManagementComponent', () => {
  let component: FacultyManagementComponent;
  let fixture: ComponentFixture<FacultyManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacultyManagementComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FacultyManagementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
