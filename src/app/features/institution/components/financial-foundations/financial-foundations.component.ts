import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
  templateUrl: './financial-foundations.component.html',
  styleUrl: './financial-foundations.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinancialFoundationsComponent implements OnInit {
  private readonly financialService = inject(FinancialService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasAnyRole(['ADMIN', 'DEAN']);
  readonly canDelete = () => this.authService.hasRole('ADMIN');

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
