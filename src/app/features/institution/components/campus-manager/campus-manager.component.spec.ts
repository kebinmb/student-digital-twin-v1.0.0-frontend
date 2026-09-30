import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { vi } from 'vitest';
import { CampusManagerComponent } from './campus-manager.component';
import { Campus } from '../../../../core/models/institution.model';

describe('CampusManagerComponent', () => {
  let component: CampusManagerComponent;
  let fixture: ComponentFixture<CampusManagerComponent>;
  let confirmationService: ConfirmationService;

  const mockActiveCampus: Campus = {
    id: 1,
    code: 'MC',
    name: 'Main Campus',
    region: 'NCR',
    isMain: true,
    isActive: true
  };

  const mockInactiveCampus: Campus = {
    id: 2,
    code: 'EXT',
    name: 'Extension Campus',
    region: 'Region IV-A',
    isMain: false,
    isActive: false
  };

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
    confirmationService = TestBed.inject(ConfirmationService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Confirmation Dialog Behavior', () => {
    it('should configure confirmDelete with explicit acceptLabel "Yes" and rejectLabel "No"', () => {
      let capturedConfirmation: Confirmation | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        capturedConfirmation = conf;
        return confirmationService;
      });

      component.confirmDelete(mockActiveCampus);

      expect(capturedConfirmation).toBeDefined();
      expect(capturedConfirmation?.acceptLabel).toBe('Yes');
      expect(capturedConfirmation?.rejectLabel).toBe('No');
      expect(capturedConfirmation?.acceptButtonStyleClass).toBe('p-button-danger');
      expect(capturedConfirmation?.rejectButtonStyleClass).toBe('p-button-outlined p-button-secondary');
      expect(capturedConfirmation?.header).toBe('Delete Campus');
    });

    it('should configure confirmToggleStatus to deactivate with explicit acceptLabel "Confirm Deactivate"', () => {
      let capturedConfirmation: Confirmation | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        capturedConfirmation = conf;
        return confirmationService;
      });

      component.confirmToggleStatus(mockActiveCampus);

      expect(capturedConfirmation).toBeDefined();
      expect(capturedConfirmation?.acceptLabel).toBe('Confirm Deactivate');
      expect(capturedConfirmation?.rejectLabel).toBe('No');
      expect(capturedConfirmation?.acceptButtonStyleClass).toBe('p-button-warn');
      expect(capturedConfirmation?.header).toBe('DEACTIVATE Campus');
    });

    it('should configure confirmToggleStatus to activate with explicit acceptLabel "Confirm Activate"', () => {
      let capturedConfirmation: Confirmation | undefined;
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        capturedConfirmation = conf;
        return confirmationService;
      });

      component.confirmToggleStatus(mockInactiveCampus);

      expect(capturedConfirmation).toBeDefined();
      expect(capturedConfirmation?.acceptLabel).toBe('Confirm Activate');
      expect(capturedConfirmation?.rejectLabel).toBe('No');
      expect(capturedConfirmation?.acceptButtonStyleClass).toBe('p-button-success');
      expect(capturedConfirmation?.header).toBe('ACTIVATE Campus');
    });

    it('should preserve explicit "Yes" and "No" on confirmDelete even after confirmToggleStatus was called', () => {
      const confirmations: Confirmation[] = [];
      vi.spyOn(confirmationService, 'confirm').mockImplementation((conf: Confirmation) => {
        confirmations.push(conf);
        return confirmationService;
      });

      // 1. First toggle status (e.g. deactivate)
      component.confirmToggleStatus(mockActiveCampus);
      expect(confirmations[0].acceptLabel).toBe('Confirm Deactivate');

      // 2. Then call delete - must have explicit 'Yes' so shared ConfirmDialog does not reuse 'Confirm Deactivate'
      component.confirmDelete(mockActiveCampus);
      expect(confirmations[1].acceptLabel).toBe('Yes');
      expect(confirmations[1].rejectLabel).toBe('No');
      expect(confirmations[1].acceptButtonStyleClass).toBe('p-button-danger');
    });
  });
});
