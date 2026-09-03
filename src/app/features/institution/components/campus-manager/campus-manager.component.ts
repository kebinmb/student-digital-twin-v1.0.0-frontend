import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { CampusService } from '../../../../core/services/institution.service';
import { Campus, CreateCampusRequest, UpdateCampusRequest } from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

interface CampusForm {
  code: FormControl<string>;
  name: FormControl<string>;
  chedInstitutionalCode: FormControl<string>;
  address: FormControl<string>;
  region: FormControl<string>;
  contactNumber: FormControl<string>;
  email: FormControl<string>;
  isMain: FormControl<boolean>;
}

@Component({
  selector: 'app-campus-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TagModule,
    InputTextModule,
    ToggleSwitchModule,
    ConfirmDialogModule
  ],
  template: `
    <div class="institution-sub-card">
      <div class="card-header-row">
        <div>
          <h2 class="card-section-title">Institutional Campuses</h2>
          <p class="card-section-subtitle">
            Configure system campuses, CHED institutional codes, regional assignments, and main campus flag.
          </p>
        </div>
        @if (canManage()) {
          <p-button
            label="New Campus"
            icon="pi pi-plus"
            size="small"
            severity="primary"
            (onClick)="openCreateDialog()">
          </p-button>
        }
      </div>

      <p-table
        [value]="campuses()"
        [loading]="isLoading()"
        responsiveLayout="scroll"
        styleClass="p-datatable-sm institutional-table">
        <ng-template pTemplate="header">
          <tr>
            <th>Code</th>
            <th>Campus Name</th>
            <th>CHED Code</th>
            <th>Region</th>
            <th>Contact / Email</th>
            <th style="width: 120px;">Main Flag</th>
            <th style="width: 110px;">Status</th>
            @if (canManage()) {
              <th style="width: 160px; text-align: right;">Actions</th>
            }
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td>
              <span class="code-badge">{{ c.code }}</span>
            </td>
            <td>
              <div class="primary-text">{{ c.name }}</div>
              @if (c.address) {
                <div class="secondary-text">{{ c.address }}</div>
              }
            </td>
            <td>{{ c.chedInstitutionalCode || '—' }}</td>
            <td>{{ c.region || 'REGION VI' }}</td>
            <td>
              <div class="secondary-text">{{ c.contactNumber || '—' }}</div>
              <div class="secondary-text">{{ c.email || '—' }}</div>
            </td>
            <td>
              @if (c.isMain) {
                <p-tag severity="info" value="MAIN CAMPUS" icon="pi pi-star-fill"></p-tag>
              } @else {
                <span class="text-muted">Satellite</span>
              }
            </td>
            <td>
              @if (c.isActive) {
                <p-tag severity="success" value="ACTIVE"></p-tag>
              } @else {
                <p-tag severity="danger" value="INACTIVE"></p-tag>
              }
            </td>
            @if (canManage()) {
              <td style="text-align: right;">
                <div class="action-buttons-cell">
                  <p-button
                    [icon]="c.isActive ? 'pi pi-ban' : 'pi pi-check-circle'"
                    size="small"
                    [text]="true"
                    [severity]="c.isActive ? 'warn' : 'success'"
                    [title]="c.isActive ? 'Deactivate Campus' : 'Activate Campus'"
                    (onClick)="confirmToggleStatus(c)">
                  </p-button>
                  <p-button
                    icon="pi pi-pencil"
                    size="small"
                    [text]="true"
                    severity="secondary"
                    (onClick)="openEditDialog(c)">
                  </p-button>
                  <p-button
                    icon="pi pi-trash"
                    size="small"
                    [text]="true"
                    severity="danger"
                    (onClick)="confirmDelete(c)">
                  </p-button>
                </div>
              </td>
            }
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td [attr.colspan]="canManage() ? 8 : 7" class="empty-table-cell">
              <i class="pi pi-building empty-icon"></i>
              <p>No campuses registered yet. Create a Campus to begin configuring academic departments.</p>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Create / Edit Campus Dialog -->
      <p-dialog
        [header]="editingId() ? 'Edit Campus' : 'Register New Campus'"
        [(visible)]="isDialogVisible"
        [modal]="true"
        [style]="{ width: '520px', maxWidth: '95vw' }">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-form">
          <div class="form-row-2col">
            <div class="form-group">
              <label for="cCode" class="form-label">Campus Code *</label>
              <input
                id="cCode"
                pInputText
                type="text"
                formControlName="code"
                placeholder="e.g. TALISAY"
                class="form-control-input"
                [readOnly]="!!editingId()" />
              @if (form.controls.code.touched && form.controls.code.invalid) {
                <span class="error-hint">Code is required (max 20 chars).</span>
              }
            </div>

            <div class="form-group">
              <label for="cChed" class="form-label">CHED Code</label>
              <input
                id="cChed"
                pInputText
                type="text"
                formControlName="chedInstitutionalCode"
                placeholder="e.g. 06014"
                class="form-control-input" />
            </div>
          </div>

          <div class="form-group">
            <label for="cName" class="form-label">Campus Name *</label>
            <input
              id="cName"
              pInputText
              type="text"
              formControlName="name"
              placeholder="e.g. Carlos Hilado Memorial State University - Talisay Main"
              class="form-control-input" />
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <span class="error-hint">Campus name is required (max 100 chars).</span>
            }
          </div>

          <div class="form-group">
            <label for="cAddress" class="form-label">Physical Address</label>
            <input
              id="cAddress"
              pInputText
              type="text"
              formControlName="address"
              placeholder="e.g. Mabini St., Talisay City, Negros Occidental"
              class="form-control-input" />
          </div>

          <div class="form-row-2col">
            <div class="form-group">
              <label for="cContact" class="form-label">Contact Number</label>
              <input
                id="cContact"
                pInputText
                type="text"
                formControlName="contactNumber"
                placeholder="e.g. (034) 712-0003"
                class="form-control-input" />
            </div>

            <div class="form-group">
              <label for="cEmail" class="form-label">Email</label>
              <input
                id="cEmail"
                pInputText
                type="email"
                formControlName="email"
                placeholder="e.g. info@chmsu.edu.ph"
                class="form-control-input" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <span class="error-hint">Must be a valid email address.</span>
              }
            </div>
          </div>

          @if (!editingId()) {
            <div class="toggle-group-row">
              <div class="toggle-info">
                <span class="toggle-label">Designate as Main Campus</span>
                <span class="toggle-desc">Sets this campus as the primary administrative institutional campus.</span>
              </div>
              <p-toggleswitch formControlName="isMain"></p-toggleswitch>
            </div>
          }

          <div class="dialog-actions-footer">
            <p-button
              label="Cancel"
              size="small"
              severity="secondary"
              [outlined]="true"
              type="button"
              (onClick)="isDialogVisible.set(false)">
            </p-button>
            <p-button
              [label]="editingId() ? 'Update Campus' : 'Register Campus'"
              icon="pi pi-check"
              size="small"
              severity="primary"
              type="submit"
              [disabled]="form.invalid || isSaving()">
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
    .code-badge {
      font-family: monospace;
      font-weight: 600;
      background: #f1f5f9;
      color: #0f172a;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      font-size: 0.8125rem;
    }
    .primary-text {
      font-weight: 600;
      color: #0f172a;
      font-size: 0.875rem;
    }
    .secondary-text {
      font-size: 0.75rem;
      color: #64748b;
    }
    .text-muted {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .action-buttons-cell {
      display: flex;
      justify-content: flex-end;
      gap: 0.35rem;
      align-items: center;
    }
    .empty-table-cell {
      text-align: center;
      padding: 2.5rem 1rem !important;
      color: #94a3b8;
    }
    .empty-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      display: block;
      color: #cbd5e1;
    }
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-top: 0.5rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-row-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
    }
    .form-control-input {
      width: 100%;
      font-size: 0.8125rem;
    }
    .error-hint {
      font-size: 0.6875rem;
      color: #dc2626;
      font-weight: 500;
    }
    .toggle-group-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
    }
    .toggle-info {
      display: flex;
      flex-direction: column;
    }
    .toggle-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #1e293b;
    }
    .toggle-desc {
      font-size: 0.6875rem;
      color: #64748b;
    }
    .dialog-actions-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }
  `]
})
export class CampusManagerComponent implements OnInit {
  private readonly campusService = inject(CampusService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly campuses = signal<Campus[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);
  readonly editingId = signal<number | null>(null);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN']);

  readonly form = new FormGroup<CampusForm>({
    code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    chedInstitutionalCode: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(20)] }),
    address: new FormControl<string>('', { nonNullable: true }),
    region: new FormControl<string>('REGION VI', { nonNullable: true }),
    contactNumber: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(100)] }),
    isMain: new FormControl<boolean>(false, { nonNullable: true })
  });

  ngOnInit(): void {
    this.loadCampuses();
  }

  loadCampuses(): void {
    this.isLoading.set(true);
    this.campusService.getAll().subscribe({
      next: (list) => {
        this.campuses.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Load Failed', detail: err.error?.detail || 'Unable to load campuses.' });
      }
    });
  }

  openCreateDialog(): void {
    this.editingId.set(null);
    this.form.reset({
      code: '',
      name: '',
      chedInstitutionalCode: '',
      address: '',
      region: 'REGION VI',
      contactNumber: '',
      email: '',
      isMain: false
    });
    this.isDialogVisible.set(true);
  }

  openEditDialog(campus: Campus): void {
    this.editingId.set(campus.id);
    this.form.reset({
      code: campus.code,
      name: campus.name,
      chedInstitutionalCode: campus.chedInstitutionalCode || '',
      address: campus.address || '',
      region: campus.region || 'REGION VI',
      contactNumber: campus.contactNumber || '',
      email: campus.email || '',
      isMain: campus.isMain
    });
    this.isDialogVisible.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    this.isSaving.set(true);

    const editId = this.editingId();
    if (editId) {
      const req: UpdateCampusRequest = {
        name: val.name.trim(),
        chedInstitutionalCode: val.chedInstitutionalCode ? val.chedInstitutionalCode.trim() : undefined,
        address: val.address ? val.address.trim() : undefined,
        contactNumber: val.contactNumber ? val.contactNumber.trim() : undefined,
        email: val.email ? val.email.trim() : undefined
      };
      this.campusService.update(editId, req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Campus details updated.' });
          this.loadCampuses();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Update Error', detail: err.error?.detail || 'Update failed.' });
        }
      });
    } else {
      const req: CreateCampusRequest = {
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        chedInstitutionalCode: val.chedInstitutionalCode ? val.chedInstitutionalCode.trim() : undefined,
        address: val.address ? val.address.trim() : undefined,
        region: val.region ? val.region.trim() : 'REGION VI',
        contactNumber: val.contactNumber ? val.contactNumber.trim() : undefined,
        email: val.email ? val.email.trim() : undefined,
        isMain: val.isMain
      };
      this.campusService.create(req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Registered', detail: 'Campus successfully created.' });
          this.loadCampuses();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Creation Error', detail: err.error?.detail || 'Registration failed.' });
        }
      });
    }
  }

  confirmToggleStatus(campus: Campus): void {
    const nextStatus = !campus.isActive;
    const actionWord = nextStatus ? 'activate' : 'deactivate';
    this.confirmationService.confirm({
      message: `Are you sure you want to ${actionWord} "${campus.name}"?`,
      header: `${actionWord.toUpperCase()} Campus`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `Confirm ${actionWord}`,
      accept: () => {
        this.campusService.toggleStatus(campus.id, nextStatus).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Status Changed', detail: `${campus.code} is now ${nextStatus ? 'active' : 'inactive'}.` });
            this.loadCampuses();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Action Failed', detail: err.error?.detail || 'Failed to toggle status.' });
          }
        });
      }
    });
  }

  confirmDelete(campus: Campus): void {
    this.confirmationService.confirm({
      message: `Permanently delete campus "${campus.name}"? This operation will be rejected if existing departments belong to it.`,
      header: 'Delete Campus',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.campusService.delete(campus.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${campus.code} removed.` });
            this.loadCampuses();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Deletion Blocked', detail: err.error?.detail || 'Cannot delete campus with existing departments.' });
          }
        });
      }
    });
  }
}
