import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ObeMatrixComponent } from './obe-matrix.component';
import { CurriculumDesignerStore } from '../../state/curriculum-designer.store';

describe('ObeMatrixComponent', () => {
  let component: ObeMatrixComponent;
  let fixture: ComponentFixture<ObeMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObeMatrixComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        CurriculumDesignerStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ObeMatrixComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
