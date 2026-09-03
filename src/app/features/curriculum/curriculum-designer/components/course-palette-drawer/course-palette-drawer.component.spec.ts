import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CoursePaletteDrawerComponent } from './course-palette-drawer.component';
import { CurriculumDesignerStore } from '../../state/curriculum-designer.store';

describe('CoursePaletteDrawerComponent', () => {
  let component: CoursePaletteDrawerComponent;
  let fixture: ComponentFixture<CoursePaletteDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoursePaletteDrawerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        CurriculumDesignerStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CoursePaletteDrawerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
