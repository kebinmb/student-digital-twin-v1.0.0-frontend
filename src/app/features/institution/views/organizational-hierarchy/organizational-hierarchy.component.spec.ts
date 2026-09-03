import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { OrganizationalHierarchyComponent } from './organizational-hierarchy.component';

describe('OrganizationalHierarchyComponent', () => {
  let component: OrganizationalHierarchyComponent;
  let fixture: ComponentFixture<OrganizationalHierarchyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationalHierarchyComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationalHierarchyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
