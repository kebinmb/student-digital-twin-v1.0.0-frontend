import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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

import { Drawer } from 'primeng/drawer';
import { Skeleton } from 'primeng/skeleton';

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
    MessageModule,
    Drawer,
    Skeleton
  ],
  templateUrl: './term-manager.component.html',
  styleUrl: './term-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TermManagerComponent implements OnInit {
  private readonly termService = inject(TermService);
  private readonly ayService = inject(AcademicYearService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON']);

  readonly selectedTermForDetail = signal<Term | null>(null);
  readonly isDetailDrawerOpen = signal<boolean>(false);

  openDetailDrawer(t: Term): void {
    this.selectedTermForDetail.set(t);
    this.isDetailDrawerOpen.set(true);
  }

  readonly academicYears = signal<AcademicYear[]>([]);
  readonly terms = signal<Term[]>([]);
  readonly isLoading = signal<boolean>(false);
  isSubmitting = false;

  selectedAyId: number | null = null;
  displayDialog = false;
  isEditing = false;
  selectedTerm: Term | null = null;

  readonly termTypeOptions: { label: string; value: TermType }[] = [
    { label: '1st Semester', value: 'FIRST_SEM' },
    { label: '2nd Semester', value: 'SECOND_SEM' },
    { label: 'Summer Term', value: 'SUMMER' }
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
      termType: new FormControl<TermType>('FIRST_SEM', { nonNullable: true, validators: [Validators.required] }),
      startDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
      endDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
    },
    {
      validators: (group) => {
        const ayId = group.get('academicYearId')?.value;
        const start = group.get('startDate')?.value;
        const end = group.get('endDate')?.value;

        if (start && end && end <= start) {
          return { dateOrderInvalid: true };
        }

        if (start && end && ayId) {
          const ay = this.academicYears().find((a) => a.id === ayId);
          if (ay && ay.startDate && start < ay.startDate) {
            return { ayStartOutOfBounds: true, ayStartDate: ay.startDate };
          }
          if (ay && ay.endDate && end > ay.endDate) {
            return { ayEndOutOfBounds: true, ayEndDate: ay.endDate };
          }

          const existingTerms = this.terms();
          for (const existing of existingTerms) {
            if (this.isEditing && this.selectedTerm && existing.id === this.selectedTerm.id) {
              continue;
            }
            if (existing.startDate && existing.endDate) {
              const overlaps =
                (start < existing.endDate && end > existing.startDate) ||
                start === existing.startDate ||
                end === existing.endDate;
              if (overlaps) {
                return { termOverlap: true, overlappingTerm: this.formatTermType(existing.termType) };
              }
            }
          }
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
        if (!this.selectedAyId) {
          const current = ays.find((ay) => ay.isCurrent) || ays[0];
          if (current) {
            this.selectedAyId = current.id;
          }
        }
        if (this.selectedAyId) {
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
    if (!type) return '';
    if (type === '1ST_SEM' || type === 'FIRST_SEM') return '1st Semester';
    if (type === '2ND_SEM' || type === 'SECOND_SEM') return '2nd Semester';
    if (type === 'SUMMER') return 'Summer Term';
    return type;
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.selectedTerm = null;
    this.termForm.reset({
      academicYearId: this.selectedAyId,
      termType: 'FIRST_SEM',
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
      this.termService
        .updateSchedule(this.selectedTerm.id, {
          startDate: val.startDate,
          endDate: val.endDate
        })
        .subscribe({
          next: () => {
            this.isSubmitting = false;
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
      this.termService
        .create({
          academicYearId: val.academicYearId!,
          termType: val.termType,
          startDate: val.startDate,
          endDate: val.endDate
        })
        .subscribe({
          next: () => {
            this.isSubmitting = false;
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
            this.loadAcademicYears();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Activation Failed', detail: err.error?.detail || 'Failed to activate term.' });
          }
        });
      }
    });
  }

  toggleEnrollmentWindow(t: Term): void {
    if (!t.isActive) {
      this.messageService.add({ severity: 'warn', summary: 'Action Blocked', detail: 'Operational windows can only be altered on an active term.' });
      return;
    }
    const targetState = !t.enrollmentOpen;
    this.termService.toggleEnrollmentWindow(t.id, targetState).subscribe({
      next: (updated) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Enrollment Window Updated',
          detail: `Enrollment window is now ${updated.enrollmentOpen ? 'OPEN' : 'CLOSED'}.`
        });
        this.loadTermsForSelectedAy();
        if (this.selectedTermForDetail()?.id === t.id) {
          this.selectedTermForDetail.set(updated);
        }
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Toggle Failed', detail: err.error?.detail || 'Failed to toggle enrollment window.' });
      }
    });
  }

  toggleGradingWindow(t: Term): void {
    if (!t.isActive) {
      this.messageService.add({ severity: 'warn', summary: 'Action Blocked', detail: 'Operational windows can only be altered on an active term.' });
      return;
    }
    const targetState = !t.gradingOpen;
    this.termService.toggleGradingWindow(t.id, targetState).subscribe({
      next: (updated) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Grading Window Updated',
          detail: `Grading window is now ${updated.gradingOpen ? 'OPEN' : 'CLOSED'}.`
        });
        this.loadTermsForSelectedAy();
        if (this.selectedTermForDetail()?.id === t.id) {
          this.selectedTermForDetail.set(updated);
        }
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Toggle Failed', detail: err.error?.detail || 'Failed to toggle grading window.' });
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
