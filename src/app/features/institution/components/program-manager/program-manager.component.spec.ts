import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProgramManagerComponent } from './program-manager.component';

describe('ProgramManagerComponent', () => {
  let component: ProgramManagerComponent;
  let fixture: ComponentFixture<ProgramManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgramManagerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgramManagerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
