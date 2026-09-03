import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CurriculumDesignerComponent } from './curriculum-designer.component';

describe('CurriculumDesignerComponent', () => {
  let component: CurriculumDesignerComponent;
  let fixture: ComponentFixture<CurriculumDesignerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurriculumDesignerComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CurriculumDesignerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
