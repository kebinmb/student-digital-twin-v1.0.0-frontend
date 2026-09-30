import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { GradingScaleService } from '../../../../core/services/institution.service';
import { CreateGradingScaleRequest, GradingScale } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

interface GradingScaleForm {
  code: FormControl<string>;
  percentageMin: FormControl<number | null>;
  percentageMax: FormControl<number | null>;
  gradePoint: FormControl<string>;
  remarks: FormControl<string>;
  isPassing: FormControl<boolean>;
  isNonNumeric: FormControl<boolean>;
}

@Component({
  selector: 'app-grading-scale-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    ToggleSwitchModule,
    TagModule,
    ConfirmDialogModule
  ],
  templateUrl: './grading-scale-manager.component.html',
  styleUrl: './grading-scale-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradingScaleManagerComponent implements OnInit {
  private readonly gradingService = inject(GradingScaleService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'REGISTRAR']);
  readonly canDelete = () => this.authService.hasRole('ADMIN');

  readonly gradingScales = signal<GradingScale[]>([]);
  readonly isLoading = signal<boolean>(false);
  isSubmitting = false;

  displayDialog = false;
  isEditing = false;
  selectedScale: GradingScale | null = null;

  simulatedPercentage: number | null = 88.5;
  readonly simulatedScaleResult = signal<GradingScale | null>(null);

  readonly form = new FormGroup<GradingScaleForm>(
    {
      code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(10)] }),
      percentageMin: new FormControl<number | null>(75.0, [Validators.required, Validators.min(0), Validators.max(100)]),
      percentageMax: new FormControl<number | null>(79.99, [Validators.required, Validators.min(0), Validators.max(100)]),
      gradePoint: new FormControl<string>('3.00', { nonNullable: true }),
      remarks: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
      isPassing: new FormControl<boolean>(true, { nonNullable: true }),
      isNonNumeric: new FormControl<boolean>(false, { nonNullable: true })
    },
    {
      validators: (group) => {
        const min = group.get('percentageMin')?.value;
        const max = group.get('percentageMax')?.value;
        if (min !== null && max !== null && min > max) {
          return { percentageRangeInvalid: true };
        }
        return null;
      }
    }
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.gradingService.getAll().subscribe({
      next: (list) => {
        this.gradingScales.set(list);
        this.isLoading.set(false);
        this.simulateTransmutation();
      },
      error: () => this.isLoading.set(false)
    });
  }

  simulateTransmutation(): void {
    if (this.simulatedPercentage === null || this.simulatedPercentage === undefined) {
      this.simulatedScaleResult.set(null);
      return;
    }

    const pct = this.simulatedPercentage;
    const match = this.gradingScales().find(
      (g) => !g.isNonNumeric && pct >= g.percentageMin && pct <= g.percentageMax
    );
    this.simulatedScaleResult.set(match || null);
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.selectedScale = null;
    this.form.reset({
      code: '',
      percentageMin: 75.0,
      percentageMax: 79.99,
      gradePoint: '3.00',
      remarks: '',
      isPassing: true,
      isNonNumeric: false
    });
    this.displayDialog = true;
  }

  openEditDialog(g: GradingScale): void {
    this.isEditing = true;
    this.selectedScale = g;
    this.form.patchValue({
      code: g.code,
      percentageMin: g.percentageMin,
      percentageMax: g.percentageMax,
      gradePoint: g.gradePoint || g.code,
      remarks: g.remarks || g.description,
      isPassing: g.isPassing ?? true,
      isNonNumeric: g.isNonNumeric ?? false
    });
    this.displayDialog = true;
  }

  saveGradingScale(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = this.form.getRawValue();

    if (this.isEditing && this.selectedScale) {
      this.gradingService.update(this.selectedScale.id, {
        percentageMin: val.percentageMin!,
        percentageMax: val.percentageMax!,
        gradePoint: val.gradePoint,
        description: val.remarks.trim(),
        remarks: val.remarks.trim(),
        isPassing: val.isPassing
      }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Bracket Updated', detail: 'Grading scale bracket updated.' });
          this.displayDialog = false;
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: err.error?.detail || 'Failed to update bracket.' });
        }
      });
    } else {
      const req: CreateGradingScaleRequest = {
        code: val.code.trim().toUpperCase(),
        percentageMin: val.percentageMin!,
        percentageMax: val.percentageMax!,
        gradePoint: val.gradePoint,
        description: val.remarks.trim(),
        remarks: val.remarks.trim(),
        isPassing: val.isPassing,
        isNonNumeric: val.isNonNumeric
      };

      this.gradingService.create(req).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Bracket Created', detail: 'Grading scale bracket added.' });
          this.displayDialog = false;
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Creation Failed', detail: err.error?.detail || 'Failed to create bracket.' });
        }
      });
    }
  }

  confirmDelete(g: GradingScale): void {
    this.confirmationService.confirm({
      message: `Delete grading bracket "${g.code}" (${g.remarks || g.description})?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => {
        this.gradingService.delete(g.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Bracket removed.' });
            this.loadData();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to delete bracket.' });
          }
        });
      }
    });
  }
}
