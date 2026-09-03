import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { FinancialService } from '../../../../core/services/institution.service';
import {
  FeeCatalog,
  FeeCategory,
  PaymentTermTemplate,
  ScholarshipDiscount
} from '../../../../core/models/institution.model';
import { AuthService } from '../../../../core/service/authentication/auth-service';

@Component({
  selector: 'app-financial-foundations',
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
    SelectModule,
    TagModule,
    SelectButtonModule,
    CheckboxModule,
    ConfirmDialogModule
  ],
  template: `
    <div class="institution-sub-card">
      <div class="card-header-row">
        <div>
          <h2 class="card-section-title">Institutional Billing & Financial Foundations</h2>
          <p class="card-section-subtitle">
            Manage tuition & fee catalogs, installment payment schedules, and institutional scholarship discount matrices.
          </p>
        </div>
      </div>

      <!-- Financial Sub-Tabs -->
      <div class="financial-tabs-bar">
        <p-selectbutton
          [options]="subTabs"
          [(ngModel)]="activeSubTab"
          optionLabel="label"
          optionValue="value"
          styleClass="p-buttonset-sm">
        </p-selectbutton>
      </div>

      <!-- SUB-TAB 1: FEE CATALOG & CATEGORIES -->
      @if (activeSubTab === 'fees') {
        <div class="section-container">
          <div class="section-actions-header">
            <div>
              <h3 class="subsection-title">Institutional Fee Schedule</h3>
              <p class="subsection-sub">CHED-sanctioned fees and Free Higher Education (FHE) billable components.</p>
            </div>
            <div class="btn-group">
              <p-button
                label="Add Category"
                icon="pi pi-folder-plus"
                size="small"
                [outlined]="true"
                severity="secondary"
                [disabled]="!canManage()"
                (onClick)="openCategoryDialog()">
              </p-button>
              <p-button
                label="Add Fee Item"
                icon="pi pi-plus"
                size="small"
                severity="primary"
                [disabled]="!canManage() || feeCategories().length === 0"
                (onClick)="openFeeDialog()">
              </p-button>
            </div>
          </div>

          <p-table [value]="feeCatalog()" [loading]="isLoadingFees" responsiveLayout="scroll" styleClass="p-datatable-sm p-datatable-gridlines">
            <ng-template #header>
              <tr>
                <th style="width: 140px">Fee Code</th>
                <th>Fee Name & Description</th>
                <th style="width: 150px">Category</th>
                <th style="width: 130px; text-align: right">Amount (PHP)</th>
                <th style="width: 100px; text-align: center">Rate Type</th>
                <th style="width: 140px; text-align: center">Classification</th>
                <th style="width: 90px; text-align: right">Action</th>
              </tr>
            </ng-template>
            <ng-template #body let-f>
              <tr>
                <td class="font-mono font-bold text-primary">{{ f.code }}</td>
                <td>{{ f.name }}</td>
                <td><span class="category-chip">{{ f.categoryCode || f.categoryName || 'GENERAL' }}</span></td>
                <td style="text-align: right; font-family: monospace; font-weight: 600">
                  ₱{{ f.defaultAmount | number:'1.2-2' }}
                </td>
                <td style="text-align: center">
                  <p-tag [value]="f.isPerUnit ? 'PER UNIT' : 'FIXED'" [severity]="f.isPerUnit ? 'info' : 'secondary'" styleClass="text-xs"></p-tag>
                </td>
                <td style="text-align: center">
                  <div class="inline-tag-group">
                    @if (f.isFheBillable) {
                      <p-tag value="FHE" severity="success" styleClass="text-xs"></p-tag>
                    }
                    @if (f.isChedSanctioned) {
                      <p-tag value="CHED" severity="warn" styleClass="text-xs"></p-tag>
                    }
                  </div>
                </td>
                <td style="text-align: right">
                  <p-button
                    icon="pi pi-trash"
                    size="small"
                    [text]="true"
                    severity="danger"
                    [disabled]="!canManage()"
                    title="Delete Fee Item"
                    (onClick)="confirmDeleteFee(f)">
                  </p-button>
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td colspan="7" class="empty-message-cell">No fee catalog items registered.</td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      }

      <!-- SUB-TAB 2: PAYMENT TERM TEMPLATES -->
      @if (activeSubTab === 'templates') {
        <div class="section-container">
          <div class="section-actions-header">
            <div>
              <h3 class="subsection-title">Installment Schedule Templates</h3>
              <p class="subsection-sub">Payment period distribution percentages (must sum strictly to 100.00%).</p>
            </div>
            <p-button
              label="New Installment Template"
              icon="pi pi-plus"
              size="small"
              severity="primary"
              [disabled]="!canManage()"
              (onClick)="openTemplateDialog()">
            </p-button>
          </div>

          <p-table [value]="templates()" [loading]="isLoadingTemplates" responsiveLayout="scroll" styleClass="p-datatable-sm p-datatable-gridlines">
            <ng-template #header>
              <tr>
                <th>Template Name</th>
                <th style="width: 110px; text-align: center">Downpayment</th>
                <th style="width: 100px; text-align: center">Prelim</th>
                <th style="width: 100px; text-align: center">Midterm</th>
                <th style="width: 100px; text-align: center">Semifinal</th>
                <th style="width: 100px; text-align: center">Final</th>
                <th style="width: 100px; text-align: center">Total</th>
                <th style="width: 80px; text-align: right">Action</th>
              </tr>
            </ng-template>
            <ng-template #body let-t>
              <tr>
                <td class="font-bold">{{ t.name }}</td>
                <td style="text-align: center">{{ t.downpaymentPercentage }}%</td>
                <td style="text-align: center">{{ t.prelimPercentage }}%</td>
                <td style="text-align: center">{{ t.midtermPercentage }}%</td>
                <td style="text-align: center">{{ t.semiFinalPercentage }}%</td>
                <td style="text-align: center">{{ t.finalPercentage }}%</td>
                <td style="text-align: center"><p-tag value="100%" severity="success" styleClass="text-xs"></p-tag></td>
                <td style="text-align: right">
                  <p-button
                    icon="pi pi-trash"
                    size="small"
                    [text]="true"
                    severity="danger"
                    [disabled]="!canManage()"
                    title="Delete Template"
                    (onClick)="confirmDeleteTemplate(t)">
                  </p-button>
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td colspan="8" class="empty-message-cell">No installment payment templates configured.</td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      }

      <!-- SUB-TAB 3: SCHOLARSHIP DISCOUNTS -->
      @if (activeSubTab === 'scholarships') {
        <div class="section-container">
          <div class="section-actions-header">
            <div>
              <h3 class="subsection-title">Scholarships & Institutional Grants</h3>
              <p class="subsection-sub">Tuition discounts and financial assistance matrices.</p>
            </div>
            <p-button
              label="Register Scholarship"
              icon="pi pi-plus"
              size="small"
              severity="primary"
              [disabled]="!canManage()"
              (onClick)="openScholarshipDialog()">
            </p-button>
          </div>

          <p-table [value]="scholarships()" [loading]="isLoadingScholarships" responsiveLayout="scroll" styleClass="p-datatable-sm p-datatable-gridlines">
            <ng-template #header>
              <tr>
                <th style="width: 160px">Grant Code</th>
                <th>Scholarship / Grant Title</th>
                <th style="width: 130px">Category</th>
                <th style="width: 130px; text-align: center">Benefit Value</th>
                <th style="width: 150px; text-align: center">Coverage</th>
                <th style="width: 80px; text-align: right">Action</th>
              </tr>
            </ng-template>
            <ng-template #body let-s>
              <tr>
                <td class="font-mono font-bold text-primary">{{ s.code }}</td>
                <td>
                  <div class="font-bold">{{ s.name }}</div>
                  @if (s.fundingSource) {
                    <div class="text-secondary text-xs">Fund: {{ s.fundingSource }}</div>
                  }
                </td>
                <td><p-tag [value]="s.category" severity="secondary" styleClass="text-xs"></p-tag></td>
                <td style="text-align: center; font-weight: 700">
                  @if (s.discountType === 'PERCENTAGE' || s.discountPercentage > 0) {
                    {{ s.discountPercentage }}%
                  } @else {
                    ₱{{ s.fixedAmount | number:'1.2-2' }}
                  }
                </td>
                <td style="text-align: center">
                  <div class="inline-tag-group">
                    @if (s.appliesToTuition) {
                      <p-tag value="Tuition" severity="info" styleClass="text-xs"></p-tag>
                    }
                    @if (s.appliesToMisc) {
                      <p-tag value="Misc" severity="warn" styleClass="text-xs"></p-tag>
                    }
                  </div>
                </td>
                <td style="text-align: right">
                  <p-button
                    icon="pi pi-trash"
                    size="small"
                    [text]="true"
                    severity="danger"
                    [disabled]="!canManage()"
                    title="Delete Scholarship"
                    (onClick)="confirmDeleteScholarship(s)">
                  </p-button>
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td colspan="6" class="empty-message-cell">No scholarships or discount grants registered.</td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      }

      <!-- Fee Category Dialog -->
      <p-dialog header="Create Fee Category" [(visible)]="displayCategoryDialog" [modal]="true" [style]="{ width: '400px' }">
        <div class="dialog-form">
          <div class="form-group">
            <label class="form-label">Category Code (Enum) *</label>
            <p-select [options]="categoryCodeOptions" [(ngModel)]="newCategoryCode" placeholder="Select Code" styleClass="w-full"></p-select>
          </div>
          <div class="form-group">
            <label class="form-label">Category Name *</label>
            <input pInputText [(ngModel)]="newCategoryName" placeholder="e.g. Tuition and Matriculation" class="form-input" />
          </div>
          <div class="dialog-actions">
            <p-button label="Cancel" size="small" [outlined]="true" severity="secondary" (onClick)="displayCategoryDialog = false"></p-button>
            <p-button label="Save Category" icon="pi pi-check" size="small" severity="primary" [disabled]="!newCategoryCode || !newCategoryName.trim()" (onClick)="saveCategory()"></p-button>
          </div>
        </div>
      </p-dialog>

      <!-- Fee Item Dialog -->
      <p-dialog header="Add Fee Catalog Item" [(visible)]="displayFeeDialog" [modal]="true" [style]="{ width: '460px' }">
        <div class="dialog-form">
          <div class="form-group">
            <label class="form-label">Category *</label>
            <p-select [options]="feeCategoryOptions()" [(ngModel)]="newFeeCategoryId" placeholder="Select Category" optionLabel="label" optionValue="value" styleClass="w-full"></p-select>
          </div>
          <div class="form-group">
            <label class="form-label">Fee Code *</label>
            <input pInputText [(ngModel)]="newFeeCode" placeholder="e.g. TUI-UG-LEC" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Fee Name *</label>
            <input pInputText [(ngModel)]="newFeeName" placeholder="e.g. Undergraduate Lecture Tuition per Unit" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Default Amount (PHP) *</label>
            <p-inputnumber [(ngModel)]="newFeeAmount" [min]="0" [minFractionDigits]="2" mode="decimal" prefix="₱ " styleClass="w-full"></p-inputnumber>
          </div>
          <div class="checkbox-row">
            <p-checkbox [(ngModel)]="newFeeIsPerUnit" [binary]="true" label="Per Unit Fee"></p-checkbox>
            <p-checkbox [(ngModel)]="newFeeIsChedSanctioned" [binary]="true" label="CHED Sanctioned"></p-checkbox>
            <p-checkbox [(ngModel)]="newFeeIsFheBillable" [binary]="true" label="FHE Billable"></p-checkbox>
          </div>
          <div class="dialog-actions">
            <p-button label="Cancel" size="small" [outlined]="true" severity="secondary" (onClick)="displayFeeDialog = false"></p-button>
            <p-button label="Add Fee" icon="pi pi-check" size="small" severity="primary" [disabled]="!newFeeCategoryId || !newFeeCode.trim() || !newFeeName.trim()" (onClick)="saveFee()"></p-button>
          </div>
        </div>
      </p-dialog>

      <!-- Payment Term Template Dialog -->
      <p-dialog header="New Installment Schedule Template" [(visible)]="displayTemplateDialog" [modal]="true" [style]="{ width: '460px' }">
        <div class="dialog-form">
          <div class="form-group">
            <label class="form-label">Template Name *</label>
            <input pInputText [(ngModel)]="tplName" placeholder="e.g. Standard 4-Term Installment" class="form-input" />
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Downpayment (%) *</label>
              <p-inputnumber [(ngModel)]="tplDown" [min]="0" [max]="100" styleClass="w-full"></p-inputnumber>
            </div>
            <div class="form-group">
              <label class="form-label">Prelim (%) *</label>
              <p-inputnumber [(ngModel)]="tplPrelim" [min]="0" [max]="100" styleClass="w-full"></p-inputnumber>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Midterm (%) *</label>
              <p-inputnumber [(ngModel)]="tplMidterm" [min]="0" [max]="100" styleClass="w-full"></p-inputnumber>
            </div>
            <div class="form-group">
              <label class="form-label">Semifinal (%)</label>
              <p-inputnumber [(ngModel)]="tplSemi" [min]="0" [max]="100" styleClass="w-full"></p-inputnumber>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Final (%) *</label>
            <p-inputnumber [(ngModel)]="tplFinal" [min]="0" [max]="100" styleClass="w-full"></p-inputnumber>
          </div>
          
          <div class="total-pct-box" [class.valid-sum]="templateTotalPct === 100" [class.invalid-sum]="templateTotalPct !== 100">
            Total Distribution: <strong>{{ templateTotalPct }}%</strong>
            @if (templateTotalPct !== 100) {
              <span> (Must equal 100.00%)</span>
            }
          </div>

          <div class="dialog-actions">
            <p-button label="Cancel" size="small" [outlined]="true" severity="secondary" (onClick)="displayTemplateDialog = false"></p-button>
            <p-button label="Save Template" icon="pi pi-check" size="small" severity="primary" [disabled]="!tplName.trim() || templateTotalPct !== 100" (onClick)="saveTemplate()"></p-button>
          </div>
        </div>
      </p-dialog>

      <!-- Scholarship Dialog -->
      <p-dialog header="Register Scholarship Discount" [(visible)]="displayScholarshipDialog" [modal]="true" [style]="{ width: '480px' }">
        <div class="dialog-form">
          <div class="form-group">
            <label class="form-label">Code *</label>
            <input pInputText [(ngModel)]="schCode" placeholder="e.g. SCHOLAR-HONOR-FULL" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Scholarship / Grant Title *</label>
            <input pInputText [(ngModel)]="schName" placeholder="e.g. Dean's Lister Full Scholarship" class="form-input" />
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Category *</label>
              <p-select [options]="scholarshipCategories" [(ngModel)]="schCategory" styleClass="w-full"></p-select>
            </div>
            <div class="form-group">
              <label class="form-label">Benefit Type *</label>
              <p-select [options]="scholarshipTypes" [(ngModel)]="schType" styleClass="w-full"></p-select>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Discount Percentage (%)</label>
              <p-inputnumber [(ngModel)]="schPercentage" [min]="0" [max]="100" styleClass="w-full"></p-inputnumber>
            </div>
            <div class="form-group">
              <label class="form-label">Fixed Amount (PHP)</label>
              <p-inputnumber [(ngModel)]="schFixedAmount" [min]="0" styleClass="w-full"></p-inputnumber>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Funding Source</label>
            <input pInputText [(ngModel)]="schFunding" placeholder="e.g. Institutional Endowment Fund" class="form-input" />
          </div>
          <div class="checkbox-row">
            <p-checkbox [(ngModel)]="schTuition" [binary]="true" label="Covers Tuition"></p-checkbox>
            <p-checkbox [(ngModel)]="schMisc" [binary]="true" label="Covers Miscellaneous"></p-checkbox>
          </div>
          <div class="dialog-actions">
            <p-button label="Cancel" size="small" [outlined]="true" severity="secondary" (onClick)="displayScholarshipDialog = false"></p-button>
            <p-button label="Register Scholarship" icon="pi pi-check" size="small" severity="primary" [disabled]="!schCode.trim() || !schName.trim()" (onClick)="saveScholarship()"></p-button>
          </div>
        </div>
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
      margin-bottom: 1.25rem;
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
    .financial-tabs-bar {
      margin-bottom: 1.25rem;
    }
    .section-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .section-actions-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .subsection-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .subsection-sub {
      font-size: 0.75rem;
      color: #64748b;
      margin: 0.15rem 0 0;
    }
    .btn-group {
      display: flex;
      gap: 0.5rem;
    }
    .category-chip {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #0369a1;
      background: #e0f2fe;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      border: 1px solid #bae6fd;
    }
    .inline-tag-group {
      display: inline-flex;
      gap: 0.25rem;
    }
    .total-pct-box {
      padding: 0.6rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      text-align: center;
    }
    .valid-sum {
      background: #ecfdf5;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .invalid-sum {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
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
    .checkbox-row {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 8px;
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
    .text-secondary { color: #64748b; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #116834; }
  `]
})
export class FinancialFoundationsComponent implements OnInit {
  private readonly financialService = inject(FinancialService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN', 'REGISTRAR', 'CHAIRPERSON']);

  activeSubTab = 'fees';
  readonly subTabs = [
    { label: 'Fee Schedule & Catalog', value: 'fees' },
    { label: 'Payment Term Templates', value: 'templates' },
    { label: 'Scholarships & Grants', value: 'scholarships' }
  ];

  readonly feeCategories = signal<FeeCategory[]>([]);
  readonly feeCatalog = signal<FeeCatalog[]>([]);
  readonly templates = signal<PaymentTermTemplate[]>([]);
  readonly scholarships = signal<ScholarshipDiscount[]>([]);

  isLoadingFees = false;
  isLoadingTemplates = false;
  isLoadingScholarships = false;

  // Dialogs
  displayCategoryDialog = false;
  newCategoryCode = 'TUITION';
  newCategoryName = '';
  readonly categoryCodeOptions = [
    { label: 'TUITION', value: 'TUITION' },
    { label: 'MISCELLANEOUS', value: 'MISCELLANEOUS' },
    { label: 'LABORATORY', value: 'LABORATORY' },
    { label: 'OTHER', value: 'OTHER' }
  ];

  displayFeeDialog = false;
  newFeeCategoryId: number | null = null;
  newFeeCode = '';
  newFeeName = '';
  newFeeAmount = 0;
  newFeeIsPerUnit = false;
  newFeeIsChedSanctioned = true;
  newFeeIsFheBillable = true;

  displayTemplateDialog = false;
  tplName = '';
  tplDown = 25;
  tplPrelim = 25;
  tplMidterm = 25;
  tplSemi = 0;
  tplFinal = 25;

  displayScholarshipDialog = false;
  schCode = '';
  schName = '';
  schCategory = 'INSTITUTIONAL';
  schType = 'PERCENTAGE';
  schPercentage = 100;
  schFixedAmount = 0;
  schFunding = '';
  schTuition = true;
  schMisc = true;

  readonly scholarshipCategories = [
    { label: 'CHED UNIFAST', value: 'CHED_UNIFAST' },
    { label: 'GOVERNMENT MANDATED', value: 'GOVERNMENT_MANDATED' },
    { label: 'INSTITUTIONAL', value: 'INSTITUTIONAL' },
    { label: 'PRIVATE', value: 'PRIVATE' }
  ];

  readonly scholarshipTypes = [
    { label: 'Full / Percentage', value: 'PERCENTAGE' },
    { label: 'Fixed Amount', value: 'FIXED_AMOUNT' }
  ];

  readonly feeCategoryOptions = computed(() =>
    this.feeCategories().map((c) => ({ label: `${c.code} - ${c.name}`, value: c.id }))
  );

  get templateTotalPct(): number {
    return (this.tplDown || 0) + (this.tplPrelim || 0) + (this.tplMidterm || 0) + (this.tplSemi || 0) + (this.tplFinal || 0);
  }

  ngOnInit(): void {
    this.loadFees();
    this.loadTemplates();
    this.loadScholarships();
  }

  loadFees(): void {
    this.isLoadingFees = true;
    this.financialService.getFeeCategories().subscribe({
      next: (cats) => {
        this.feeCategories.set(cats);
        this.financialService.getFeeCatalog().subscribe({
          next: (catalog) => {
            this.feeCatalog.set(catalog);
            this.isLoadingFees = false;
          },
          error: () => this.isLoadingFees = false
        });
      },
      error: () => this.isLoadingFees = false
    });
  }

  loadTemplates(): void {
    this.isLoadingTemplates = true;
    this.financialService.getPaymentTermTemplates().subscribe({
      next: (list) => {
        this.templates.set(list);
        this.isLoadingTemplates = false;
      },
      error: () => this.isLoadingTemplates = false
    });
  }

  loadScholarships(): void {
    this.isLoadingScholarships = true;
    this.financialService.getScholarships().subscribe({
      next: (list) => {
        this.scholarships.set(list);
        this.isLoadingScholarships = false;
      },
      error: () => this.isLoadingScholarships = false
    });
  }

  openCategoryDialog(): void {
    this.newCategoryCode = 'TUITION';
    this.newCategoryName = '';
    this.displayCategoryDialog = true;
  }

  saveCategory(): void {
    this.financialService.createFeeCategory({
      code: this.newCategoryCode,
      name: this.newCategoryName.trim()
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Category Created', detail: 'Fee category created.' });
        this.displayCategoryDialog = false;
        this.loadFees();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to create fee category.' });
      }
    });
  }

  openFeeDialog(): void {
    this.newFeeCategoryId = this.feeCategories().length > 0 ? this.feeCategories()[0].id : null;
    this.newFeeCode = '';
    this.newFeeName = '';
    this.newFeeAmount = 0;
    this.newFeeIsPerUnit = false;
    this.newFeeIsChedSanctioned = true;
    this.newFeeIsFheBillable = true;
    this.displayFeeDialog = true;
  }

  saveFee(): void {
    if (!this.newFeeCategoryId) return;
    this.financialService.createFeeCatalog({
      categoryId: this.newFeeCategoryId,
      code: this.newFeeCode.trim().toUpperCase(),
      name: this.newFeeName.trim(),
      defaultAmount: this.newFeeAmount,
      isPerUnit: this.newFeeIsPerUnit,
      isChedSanctioned: this.newFeeIsChedSanctioned,
      isFheBillable: this.newFeeIsFheBillable
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Fee Created', detail: 'Fee catalog item added.' });
        this.displayFeeDialog = false;
        this.loadFees();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to create fee item.' });
      }
    });
  }

  confirmDeleteFee(f: FeeCatalog): void {
    this.confirmationService.confirm({
      message: `Delete fee catalog item "${f.code} - ${f.name}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.financialService.deleteFeeCatalog(f.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Fee removed.' });
            this.loadFees();
          }
        });
      }
    });
  }

  openTemplateDialog(): void {
    this.tplName = '';
    this.tplDown = 25;
    this.tplPrelim = 25;
    this.tplMidterm = 25;
    this.tplSemi = 0;
    this.tplFinal = 25;
    this.displayTemplateDialog = true;
  }

  saveTemplate(): void {
    if (this.templateTotalPct !== 100) return;
    this.financialService.createPaymentTermTemplate({
      name: this.tplName.trim(),
      downpaymentPercentage: this.tplDown,
      prelimPercentage: this.tplPrelim,
      midtermPercentage: this.tplMidterm,
      semiFinalPercentage: this.tplSemi,
      finalPercentage: this.tplFinal
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Template Created', detail: 'Installment template created.' });
        this.displayTemplateDialog = false;
        this.loadTemplates();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to create template.' });
      }
    });
  }

  confirmDeleteTemplate(t: PaymentTermTemplate): void {
    this.confirmationService.confirm({
      message: `Delete template "${t.name}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.financialService.deletePaymentTermTemplate(t.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Template removed.' });
            this.loadTemplates();
          }
        });
      }
    });
  }

  openScholarshipDialog(): void {
    this.schCode = '';
    this.schName = '';
    this.schCategory = 'INSTITUTIONAL';
    this.schType = 'PERCENTAGE';
    this.schPercentage = 100;
    this.schFixedAmount = 0;
    this.schFunding = '';
    this.schTuition = true;
    this.schMisc = true;
    this.displayScholarshipDialog = true;
  }

  saveScholarship(): void {
    this.financialService.createScholarship({
      code: this.schCode.trim().toUpperCase(),
      name: this.schName.trim(),
      category: this.schCategory,
      discountType: this.schType,
      discountPercentage: this.schType === 'PERCENTAGE' ? this.schPercentage : 0,
      fixedAmount: this.schType === 'FIXED_AMOUNT' ? this.schFixedAmount : 0,
      fundingSource: this.schFunding.trim() || undefined,
      appliesToTuition: this.schTuition,
      appliesToMisc: this.schMisc
    }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Scholarship Created', detail: 'Scholarship registered.' });
        this.displayScholarshipDialog = false;
        this.loadScholarships();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to register scholarship.' });
      }
    });
  }

  confirmDeleteScholarship(s: ScholarshipDiscount): void {
    this.confirmationService.confirm({
      message: `Delete scholarship "${s.code} - ${s.name}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.financialService.deleteScholarship(s.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Scholarship removed.' });
            this.loadScholarships();
          }
        });
      }
    });
  }
}
