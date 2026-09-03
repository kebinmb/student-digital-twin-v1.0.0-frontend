import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TermManagerComponent } from './term-manager.component';

describe('TermManagerComponent', () => {
  let component: TermManagerComponent;
  let fixture: ComponentFixture<TermManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermManagerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TermManagerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
