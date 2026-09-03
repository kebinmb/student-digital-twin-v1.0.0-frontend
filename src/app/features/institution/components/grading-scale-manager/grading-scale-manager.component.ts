import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  template: `
    <div class="institution-sub-card">
      <div class="card-header-row">
        <div>
          <h2 class="card-section-title">Academic Grading Scales & Transmutation</h2>
          <p class="card-section-subtitle">
            Configure institutional grade point brackets, score percentage equivalents, and passing evaluation thresholds.
          </p>
        </div>
        <div class="header-actions">
          <p-button
            label="Add Grade Bracket"
            icon="pi pi-plus"
            size="small"
            severity="primary"
            [disabled]="!canManage()"
            (onClick)="openCreateDialog()">
          </p-button>
        </div>
      </div>

      <!-- Live Transmutation Calculator Simulator -->
      <div class="calculator-panel">
        <div class="calc-header">
          <i class="pi pi-calculator calc-icon"></i>
          <span class="calc-title">Transmutation Simulation Engine</span>
        </div>
        <div class="calc-controls">
          <div class="calc-input-group">
            <label class="calc-label">Raw Score / Percentage:</label>
            <p-inputnumber
              [(ngModel)]="simulatedPercentage"
              [min]="0"
              [max]="100"
              [minFractionDigits]="2"
              [maxFractionDigits]="2"
              suffix="%"
              placeholder="e.g. 88.50"
              (onInput)="simulateTransmutation()"
              styleClass="calc-input">
            </p-inputnumber>
          </div>
          <div class="calc-result-box">
            @if (simulatedScaleResult()) {
              <div class="result-content">
                <span class="result-code">{{ simulatedScaleResult()!.code }}</span>
                <span class="result-remarks">({{ simulatedScaleResult()!.remarks }})</span>
                <p-tag
                  [value]="simulatedScaleResult()!.isPassing ? 'PASSED' : 'FAILED'"
                  [severity]="simulatedScaleResult()!.isPassing ? 'success' : 'danger'"
                  styleClass="text-xs">
                </p-tag>
              </div>
            } @else {
              <span class="result-placeholder">Enter a score between 0.00% and 100.00% to simulate transmutation</span>
            }
          </div>
        </div>
      </div>

      <!-- Grading Scale Table -->
      <p-table
        [value]="gradingScales()"
        [loading]="isLoading()"
        responsiveLayout="scroll"
        styleClass="p-datatable-sm p-datatable-gridlines">
        <ng-template #header>
          <tr>
            <th style="width: 100px">Grade Code</th>
            <th style="width: 170px">Percentage Range</th>
            <th>Descriptor / Remarks</th>
            <th style="width: 110px; text-align: center">Classification</th>
            <th style="width: 90px; text-align: center">Status</th>
            <th style="width: 110px; text-align: right">Actions</th>
          </tr>
        </ng-template>

        <ng-template #body let-g>
          <tr>
            <td class="font-mono font-bold text-primary">{{ g.code }}</td>
            <td class="font-mono">
              @if (g.isNonNumeric) {
                <span class="text-secondary">—</span>
              } @else {
                {{ g.percentageMin }}% – {{ g.percentageMax }}%
              }
            </td>
            <td>{{ g.remarks || g.description }}</td>
            <td style="text-align: center">
              <p-tag
                [value]="g.isNonNumeric ? 'NON-NUMERIC' : 'NUMERIC'"
                [severity]="g.isNonNumeric ? 'warn' : 'info'"
                styleClass="text-xs">
              </p-tag>
            </td>
            <td style="text-align: center">
              <p-tag
                [value]="g.isPassing ? 'PASSED' : 'FAILED'"
                [severity]="g.isPassing ? 'success' : 'danger'"
                styleClass="text-xs">
              </p-tag>
            </td>
            <td style="text-align: right">
              <div class="action-buttons-cell">
                <p-button
                  icon="pi pi-pencil"
                  size="small"
                  [text]="true"
                  severity="secondary"
                  [disabled]="!canManage()"
                  title="Edit Bracket"
                  (onClick)="openEditDialog(g)">
                </p-button>
                <p-button
                  icon="pi pi-trash"
                  size="small"
                  [text]="true"
                  severity="danger"
                  [disabled]="!canManage()"
                  title="Delete Bracket"
                  (onClick)="confirmDelete(g)">
                </p-button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td colspan="6" class="empty-message-cell">
              No grading scale brackets registered.
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Modal -->
      <p-dialog
        [header]="isEditing ? 'Edit Grading Scale Bracket' : 'Add Grading Scale Bracket'"
        [(visible)]="displayDialog"
        [modal]="true"
        [style]="{ width: '460px', maxWidth: '95vw' }">
        
        <form [formGroup]="form" (ngSubmit)="saveGradingScale()" class="dialog-form">
          <div class="form-group">
            <label class="form-label">Grade Code / Point *</label>
            <input
              pInputText
              formControlName="code"
              placeholder="e.g. 1.25 or INC"
              class="form-input"
              [readonly]="isEditing" />
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Min Percentage (%) *</label>
              <p-inputnumber
                formControlName="percentageMin"
                [min]="0"
                [max]="100"
                [minFractionDigits]="2"
                [maxFractionDigits]="2"
                styleClass="w-full">
              </p-inputnumber>
            </div>
            <div class="form-group">
              <label class="form-label">Max Percentage (%) *</label>
              <p-inputnumber
                formControlName="percentageMax"
                [min]="0"
                [max]="100"
                [minFractionDigits]="2"
                [maxFractionDigits]="2"
                styleClass="w-full">
              </p-inputnumber>
            </div>
          </div>
          @if (form.hasError('percentageRangeInvalid')) {
            <span class="field-error-text">Minimum percentage cannot exceed maximum percentage.</span>
          }

          <div class="form-group">
            <label class="form-label">Remarks / Description *</label>
            <input
              pInputText
              formControlName="remarks"
              placeholder="e.g. Superior Performance"
              class="form-input" />
          </div>

          <div class="toggles-row">
            <div class="toggle-item">
              <label class="toggle-label">Passing Grade</label>
              <p-toggleswitch formControlName="isPassing"></p-toggleswitch>
            </div>
            <div class="toggle-item">
              <label class="toggle-label">Non-Numeric Mark</label>
              <p-toggleswitch formControlName="isNonNumeric"></p-toggleswitch>
            </div>
          </div>

          <div class="dialog-actions">
            <p-button
              label="Cancel"
              size="small"
              [outlined]="true"
              severity="secondary"
              (onClick)="displayDialog = false">
            </p-button>
            <p-button
              [label]="isEditing ? 'Update Bracket' : 'Add Bracket'"
              icon="pi pi-check"
              size="small"
              severity="primary"
              type="submit"
              [disabled]="form.invalid || isSubmitting">
            </p-button>
          </div>
        </form>
      </p-dialog>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .institution-sub-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04);
    }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      gap: 1rem;
    }
    .card-section-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .card-section-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0.25rem 0 0;
    }
    .calculator-panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.25rem;
    }
    .calc-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .calc-icon {
      color: #116834;
      font-size: 1rem;
    }
    .calc-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #1e293b;
    }
    .calc-controls {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .calc-input-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .calc-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
    }
    .calc-input {
      width: 140px;
    }
    .calc-result-box {
      flex: 1;
      min-width: 250px;
    }
    .result-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .result-code {
      font-size: 1.125rem;
      font-weight: 700;
      color: #116834;
      font-family: monospace;
    }
    .result-remarks {
      font-size: 0.8125rem;
      color: #475569;
    }
    .result-placeholder {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .action-buttons-cell {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.25rem;
    }
    .empty-message-cell {
      text-align: center;
      padding: 2rem !important;
      color: #94a3b8;
      font-size: 0.8125rem;
    }
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
    }
    .form-input {
      width: 100%;
      font-size: 0.8125rem;
    }
    .toggles-row {
      display: flex;
      align-items: center;
      gap: 2rem;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 8px;
    }
    .toggle-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .toggle-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
    }
    .field-error-text {
      font-size: 0.6875rem;
      color: #dc2626;
      font-weight: 500;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }
    .w-full { width: 100%; }
    .text-xs { font-size: 0.6875rem !important; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #116834; }
  `]
})
export class GradingScaleManagerComponent implements OnInit {
  private readonly gradingService = inject(GradingScaleService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON']);

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
      acceptButtonStyleClass: 'p-button-danger',
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
