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
  templateUrl: './term-manager.component.html',
  styleUrl: './term-manager.component.css'
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
