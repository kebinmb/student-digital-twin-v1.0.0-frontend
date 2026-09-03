import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CampusManagerComponent } from './campus-manager.component';

describe('CampusManagerComponent', () => {
  let component: CampusManagerComponent;
  let fixture: ComponentFixture<CampusManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampusManagerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CampusManagerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
