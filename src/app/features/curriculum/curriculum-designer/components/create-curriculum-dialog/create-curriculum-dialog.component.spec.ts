import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CreateCurriculumDialogComponent } from './create-curriculum-dialog.component';
import { CurriculumDesignerStore } from '../../state/curriculum-designer.store';

describe('CreateCurriculumDialogComponent', () => {
  let component: CreateCurriculumDialogComponent;
  let fixture: ComponentFixture<CreateCurriculumDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateCurriculumDialogComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        CurriculumDesignerStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateCurriculumDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
