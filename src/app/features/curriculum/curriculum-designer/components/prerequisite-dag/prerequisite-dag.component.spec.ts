import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PrerequisiteDagComponent } from './prerequisite-dag.component';
import { CurriculumDesignerStore } from '../../state/curriculum-designer.store';

describe('PrerequisiteDagComponent', () => {
  let component: PrerequisiteDagComponent;
  let fixture: ComponentFixture<PrerequisiteDagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrerequisiteDagComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        CurriculumDesignerStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PrerequisiteDagComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
