import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CiloPiloMatrixComponent } from './cilo-pilo-matrix.component';

describe('CiloPiloMatrixComponent', () => {
  let component: CiloPiloMatrixComponent;
  let fixture: ComponentFixture<CiloPiloMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CiloPiloMatrixComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CiloPiloMatrixComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
