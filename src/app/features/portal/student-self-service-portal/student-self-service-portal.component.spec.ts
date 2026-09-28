import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { StudentSelfServicePortalComponent } from './student-self-service-portal.component';
import { AuthService } from '../../../core/service/authentication/auth-service';

describe('StudentSelfServicePortalComponent', () => {
  let component: StudentSelfServicePortalComponent;
  let fixture: ComponentFixture<StudentSelfServicePortalComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentSelfServicePortalComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentSelfServicePortalComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    await fixture.whenStable();
  });

  it('should create student self-service portal component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle course expansion row', () => {
    expect(component.expandedSectionId()).toBeNull();
    component.toggleCourseExpand(101);
    expect(component.expandedSectionId()).toBe(101);
    component.toggleCourseExpand(101);
    expect(component.expandedSectionId()).toBeNull();
  });

  it('should clear search query', () => {
    component.searchQuery.set('BSIT');
    expect(component.searchQuery()).toBe('BSIT');
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
  });
});
