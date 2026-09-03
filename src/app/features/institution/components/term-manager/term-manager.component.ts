import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AcademicYearService, TermService } from '../../../../core/services/institution.service';
import { AcademicYear, Term, TermType } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

interface TermForm {
  academicYearId: FormControl<number | null>;
  termType: FormControl<TermType>;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
}

@Component({
  selector: 'app-term-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    TagModule,
    ConfirmDialogModule,
    MessageModule
  ],
  template: `
    <div class="institution-sub-card">
      <div class="card-header-row">
        <div>
          <h2 class="card-section-title">Academic Terms & Semesters</h2>
          <p class="card-section-subtitle">
            Configure semesters and summer terms under designated academic years, managing enrollment windows and operational activation.
          </p>
        </div>
        <div class="header-actions">
          <p-button
            label="Schedule Term"
            icon="pi pi-plus"
            size="small"
            severity="primary"
            [disabled]="!canManage() || academicYears().length === 0"
            (onClick)="openCreateDialog()">
          </p-button>
        </div>
      </div>

      <!-- AY Filter Selector -->
      <div class="filter-row">
        <label class="filter-label">Academic Year:</label>
        <p-select
          [options]="academicYearOptions()"
          [(ngModel)]="selectedAyId"
          (onChange)="loadTermsForSelectedAy()"
          placeholder="Select Academic Year"
          optionLabel="label"
          optionValue="value"
          styleClass="ay-filter-dropdown">
        </p-select>
      </div>

      <!-- Terms Table -->
      <p-table
        [value]="terms()"
        [loading]="isLoading()"
        responsiveLayout="scroll"
        styleClass="p-datatable-sm p-datatable-gridlines">
        <ng-template #header>
          <tr>
            <th style="width: 150px">Term / Semester</th>
            <th style="width: 140px">Start Date</th>
            <th style="width: 140px">End Date</th>
            <th style="width: 120px; text-align: center">Status</th>
            <th style="text-align: center">Period Windows</th>
            <th style="width: 160px; text-align: right">Actions</th>
          </tr>
        </ng-template>

        <ng-template #body let-t>
          <tr>
            <td class="font-bold text-primary">
              {{ formatTermType(t.termType) }}
            </td>
            <td>{{ t.startDate }}</td>
            <td>{{ t.endDate }}</td>
            <td style="text-align: center">
              @if (t.isActive) {
                <p-tag value="ACTIVE TERM" severity="success" icon="pi pi-check-circle"></p-tag>
              } @else {
                <p-tag value="INACTIVE" severity="secondary"></p-tag>
              }
            </td>
            <td style="text-align: center">
              <div class="window-badges">
                <span class="window-chip" [class.active-chip]="t.enrollmentOpen">
                  Enrollment: {{ t.enrollmentOpen ? 'OPEN' : 'CLOSED' }}
                </span>
                <span class="window-chip" [class.active-chip]="t.gradingOpen">
                  Grading: {{ t.gradingOpen ? 'OPEN' : 'CLOSED' }}
                </span>
              </div>
            </td>
            <td style="text-align: right">
              <div class="action-buttons-cell">
                @if (!t.isActive) {
                  <p-button
                    icon="pi pi-play"
                    size="small"
                    [text]="true"
                    severity="success"
                    title="Activate Term"
                    [disabled]="!canManage()"
                    (onClick)="confirmActivate(t)">
                  </p-button>
                }
                <p-button
                  icon="pi pi-pencil"
                  size="small"
                  [text]="true"
                  severity="secondary"
                  title="Update Schedule"
                  [disabled]="!canManage()"
                  (onClick)="openEditDialog(t)">
                </p-button>
                <p-button
                  icon="pi pi-trash"
                  size="small"
                  [text]="true"
                  severity="danger"
                  title="Delete Term"
                  [disabled]="!canManage() || t.isActive"
                  (onClick)="confirmDelete(t)">
                </p-button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td colspan="6" class="empty-message-cell">
              No academic terms configured for the selected Academic Year.
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Create / Edit Dialog -->
      <p-dialog
        [header]="isEditing ? 'Update Term Schedule' : 'Schedule Academic Term'"
        [(visible)]="displayDialog"
        [modal]="true"
        [style]="{ width: '420px', maxWidth: '95vw' }">
        
        <form [formGroup]="termForm" (ngSubmit)="saveTerm()" class="dialog-form">
          @if (!isEditing) {
            <div class="form-group">
              <label class="form-label">Academic Year *</label>
              <p-select
                [options]="academicYearOptions()"
                formControlName="academicYearId"
                placeholder="Select Academic Year"
                optionLabel="label"
                optionValue="value"
                styleClass="w-full">
              </p-select>
            </div>

            <div class="form-group">
              <label class="form-label">Term Type *</label>
              <p-select
                [options]="termTypeOptions"
                formControlName="termType"
                placeholder="Select Term Type"
                styleClass="w-full">
              </p-select>
            </div>
          }

          <div class="form-group">
            <label class="form-label">Start Date *</label>
            <input
              type="date"
              formControlName="startDate"
              class="form-date-input" />
          </div>

          <div class="form-group">
            <label class="form-label">End Date *</label>
            <input
              type="date"
              formControlName="endDate"
              class="form-date-input" />
            @if (termForm.hasError('dateOrderInvalid')) {
              <span class="field-error-text">End date must be strictly after start date.</span>
            }
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
              [label]="isEditing ? 'Save Schedule' : 'Schedule Term'"
              icon="pi pi-check"
              size="small"
              severity="primary"
              type="submit"
              [disabled]="termForm.invalid || isSubmitting">
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
    .filter-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      background: #f8fafc;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
    }
    .filter-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
    }
    .ay-filter-dropdown {
      min-width: 200px;
    }
    .window-badges {
      display: inline-flex;
      gap: 0.5rem;
    }
    .window-chip {
      font-size: 0.6875rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #64748b;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .window-chip.active-chip {
      background: #ecfdf5;
      color: #166534;
      border-color: #bbf7d0;
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
    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
    }
    .form-date-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.8125rem;
      outline: none;
      width: 100%;
      box-sizing: border-box;
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
    .font-bold { font-weight: 700; }
    .text-primary { color: #116834; }
  `]
})
export class TermManagerComponent implements OnInit {
  private readonly termService = inject(TermService);
  private readonly ayService = inject(AcademicYearService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON']);

  readonly academicYears = signal<AcademicYear[]>([]);
  readonly terms = signal<Term[]>([]);
  readonly isLoading = signal<boolean>(false);
  isSubmitting = false;

  selectedAyId: number | null = null;
  displayDialog = false;
  isEditing = false;
  selectedTerm: Term | null = null;

  readonly termTypeOptions: { label: string; value: TermType }[] = [
    { label: 'First Semester (1ST_SEM)', value: '1ST_SEM' },
    { label: 'Second Semester (2ND_SEM)', value: '2ND_SEM' },
    { label: 'Summer Term (SUMMER)', value: 'SUMMER' }
  ];

  readonly academicYearOptions = computed(() =>
    this.academicYears().map((ay) => ({
      label: ay.isCurrent ? `${ay.code} (Current)` : ay.code,
      value: ay.id
    }))
  );

  readonly termForm = new FormGroup<TermForm>(
    {
      academicYearId: new FormControl<number | null>(null, [Validators.required]),
      termType: new FormControl<TermType>('1ST_SEM', { nonNullable: true, validators: [Validators.required] }),
      startDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
      endDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
    },
    {
      validators: (group) => {
        const start = group.get('startDate')?.value;
        const end = group.get('endDate')?.value;
        if (start && end && end <= start) {
          return { dateOrderInvalid: true };
        }
        return null;
      }
    }
  );

  ngOnInit(): void {
    this.loadAcademicYears();
  }

  loadAcademicYears(): void {
    this.ayService.getAll().subscribe({
      next: (ays) => {
        this.academicYears.set(ays);
        const current = ays.find((ay) => ay.isCurrent) || ays[0];
        if (current) {
          this.selectedAyId = current.id;
          this.loadTermsForSelectedAy();
        }
      }
    });
  }

  loadTermsForSelectedAy(): void {
    if (!this.selectedAyId) return;
    this.isLoading.set(true);
    this.termService.getByAcademicYear(this.selectedAyId).subscribe({
      next: (list) => {
        this.terms.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.terms.set([]);
        this.isLoading.set(false);
      }
    });
  }

  formatTermType(type: string): string {
    if (type === '1ST_SEM') return '1st Semester';
    if (type === '2ND_SEM') return '2nd Semester';
    if (type === 'SUMMER') return 'Summer Term';
    return type;
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.selectedTerm = null;
    this.termForm.reset({
      academicYearId: this.selectedAyId,
      termType: '1ST_SEM',
      startDate: '',
      endDate: ''
    });
    this.displayDialog = true;
  }

  openEditDialog(t: Term): void {
    this.isEditing = true;
    this.selectedTerm = t;
    this.termForm.patchValue({
      academicYearId: t.academicYearId,
      termType: t.termType,
      startDate: t.startDate,
      endDate: t.endDate
    });
    this.displayDialog = true;
  }

  saveTerm(): void {
    if (this.termForm.invalid) {
      this.termForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = this.termForm.getRawValue();

    if (this.isEditing && this.selectedTerm) {
      this.termService.updateSchedule(this.selectedTerm.id, {
        startDate: val.startDate,
        endDate: val.endDate
      }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Schedule Updated', detail: 'Term schedule adjusted.' });
          this.displayDialog = false;
          this.loadTermsForSelectedAy();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: err.error?.detail || 'Failed to update schedule.' });
        }
      });
    } else {
      this.termService.create({
        academicYearId: val.academicYearId!,
        termType: val.termType,
        startDate: val.startDate,
        endDate: val.endDate
      }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Term Created', detail: 'Academic term scheduled.' });
          this.displayDialog = false;
          this.loadTermsForSelectedAy();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Creation Failed', detail: err.error?.detail || 'Failed to schedule term.' });
        }
      });
    }
  }

  confirmActivate(t: Term): void {
    this.confirmationService.confirm({
      message: `Activate ${this.formatTermType(t.termType)} as the current operational term? This will deactivate any previously active term and promote its parent Academic Year.`,
      header: 'Confirm Term Activation',
      icon: 'pi pi-play',
      accept: () => {
        this.termService.activate(t.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Term Activated', detail: `${this.formatTermType(t.termType)} is now active.` });
            this.loadTermsForSelectedAy();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Activation Failed', detail: err.error?.detail || 'Failed to activate term.' });
          }
        });
      }
    });
  }

  confirmDelete(t: Term): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${this.formatTermType(t.termType)}?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.termService.delete(t.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Term removed.' });
            this.loadTermsForSelectedAy();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Deletion Guarded', detail: err.error?.detail || 'Cannot delete active operational term.' });
          }
        });
      }
    });
  }
}
