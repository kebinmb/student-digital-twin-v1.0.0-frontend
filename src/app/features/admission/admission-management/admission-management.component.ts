import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { AdmissionApiService } from '../../../core/service/admission/admission-api.service';
import { AuthService } from '../../../core/service/authentication/auth-service';
import {
  AdmissionApplicationResponse,
  AdmissionConfigDto,
  CreateExamSlotRequest,
  EntranceExamSlotResponse,
  PublicProgramDto,
  PublicTermDto
} from '../../../core/models/admission.model';

@Component({
  selector: 'app-admission-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TableModule,
    TagModule,
    DialogModule,
    ToastModule,
    MessageModule,
    TabsModule,
    TooltipModule,
    IconField,
    InputIcon
  ],
  providers: [MessageService],
  templateUrl: './admission-management.component.html',
  styleUrl: './admission-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdmissionManagementComponent implements OnInit {
  private readonly admissionApi = inject(AdmissionApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  // Role Checks
  readonly isAdminOrGuidance = computed(() => this.authService.hasAnyRole(['ADMIN', 'REGISTRAR', 'GUIDANCE']));
  readonly isProgramChair = computed(() => this.authService.hasAnyRole(['ADMIN', 'CHAIRPERSON', 'DEAN', 'REGISTRAR']));

  activeTab = signal<string>('config');
  loading = signal<boolean>(false);

  // Configuration State
  admissionConfig = signal<AdmissionConfigDto | null>(null);
  publicTerms = signal<PublicTermDto[]>([]);
  publicPrograms = signal<PublicProgramDto[]>([]);
  selectedTermId = signal<number | null>(null);

  // Applications Lists & Modal States
  allApplications = signal<AdmissionApplicationResponse[]>([]);
  adminExamSlots = signal<EntranceExamSlotResponse[]>([]);
  selectedProgramId = signal<number | null>(null);
  isExamModalVisible = signal<boolean>(false);
  isInterviewModalVisible = signal<boolean>(false);
  isCreateSlotModalVisible = signal<boolean>(false);
  selectedApp = signal<AdmissionApplicationResponse | null>(null);

  // Program Chair Interview Queue Filters & Statutory Equity State
  interviewSearchQuery = signal<string>('');
  interviewEquityFilter = signal<string>('ALL');
  interviewPriorityFilter = signal<string>('ALL');
  selectedDossierApp = signal<AdmissionApplicationResponse | null>(null);
  isDossierModalVisible = signal<boolean>(false);

  readonly queueEquityFilterOptions = [
    { label: 'All Equity Declarations', value: 'ALL' },
    { label: 'Any Statutory Target Group', value: 'ANY_EQUITY' },
    { label: '4Ps Beneficiaries (RA 10931)', value: '4PS' },
    { label: 'Indigenous Peoples (RA 8371)', value: 'IP' },
    { label: 'Persons with Disabilities (RA 7277)', value: 'PWD' },
    { label: 'Solo Parents / Dependents (RA 11861)', value: 'SOLO_PARENT' },
    { label: 'Orphans (DSWD Certified)', value: 'ORPHAN' },
    { label: 'Agrarian / Fisherfolk (RA 8435 RSBSA)', value: 'AGRI' },
    { label: 'Bottom 40% Low-Income Bracket', value: 'BOTTOM_40' },
    { label: 'First-Gen College Student', value: 'FIRST_GEN' },
    { label: 'GIDA Barangay Residents', value: 'GIDA' }
  ];

  readonly queuePriorityFilterOptions = [
    { label: 'All Priority Levels', value: 'ALL' },
    { label: 'High Priority (Risk ≥ 60)', value: 'HIGH' },
    { label: 'Moderate Priority (Risk 30 - 59)', value: 'MODERATE' },
    { label: 'Standard Baseline (Risk < 30)', value: 'BASELINE' }
  ];

  configForm: FormGroup = this.fb.group({
    termId: [null, Validators.required],
    isActive: [true],
    dailySlotLimit: [1000, [Validators.required, Validators.min(1)]],
    totalOpenedSlots: [20000, [Validators.required, Validators.min(1)]],
    startDate: ['2026-10-01'],
    endDate: ['2026-10-21']
  });

  private readonly configFormValues = toSignal(this.configForm.valueChanges, {
    initialValue: this.configForm.value
  });

  // Computed Operational Days Window (Dynamically reacts to form changes)
  daysOpenCalculated = computed(() => {
    const val = this.configFormValues();
    const limit = Number(val?.dailySlotLimit) || 1000;
    const total = Number(val?.totalOpenedSlots) || 20000;
    return Math.ceil(total / Math.max(1, limit));
  });

  examForm: FormGroup = this.fb.group({
    examScore: [85, [Validators.required, Validators.min(0), Validators.max(100)]],
    examRemarks: ['Qualified for program chairperson interview evaluation.'],
    status: ['EXAM_PASSED', Validators.required]
  });

  interviewForm: FormGroup = this.fb.group({
    interviewScore: [90, [Validators.required, Validators.min(0), Validators.max(100)]],
    interviewRemarks: ['Applicant meets program prerequisites and interview rubrics.'],
    status: ['INTERVIEW_ACCEPTED', Validators.required]
  });

  createSlotForm: FormGroup = this.fb.group({
    termId: [null, Validators.required],
    examDate: ['2026-10-05', Validators.required],
    startTime: ['08:00 AM', Validators.required],
    endTime: ['11:00 AM', Validators.required],
    venueRoom: ['Testing Hall A - Room 101', Validators.required],
    maxCapacity: [50, [Validators.required, Validators.min(1)]]
  });

  termOptions = computed(() =>
    this.publicTerms().map(t => ({
      label: `${t.academicYearCode} - ${t.termType} ${t.isActive ? '(Active)' : ''}`,
      value: t.id
    }))
  );

  programOptions = computed(() => [
    { label: 'All Academic Programs', value: null },
    ...this.publicPrograms().map(p => ({ label: `${p.code} - ${p.name}`, value: p.id }))
  ]);

  // Real-time KPI Summary for Program Chair Interview Queue
  readonly interviewQueueSummary = computed(() => {
    const progId = this.selectedProgramId();
    const apps = this.allApplications().filter(a => {
      const matchesProg = !progId || a.targetProgramId === progId;
      return matchesProg && a.applicationStatus === 'EXAM_PASSED';
    });

    let count4ps = 0;
    let countBottom40 = 0;
    let countIp = 0;
    let countPwd = 0;
    let countSolo = 0;
    let countOrphan = 0;
    let countAgri = 0;
    let countFirstGen = 0;
    let countHighPriority = 0;

    for (const a of apps) {
      if (a.is4psBeneficiary) count4ps++;
      if (a.isBottom40IncomeBracket || a.monthlyHouseholdIncomeBracket === 'POOR_BELOW_10K') countBottom40++;
      if (a.isIndigenousPeople) countIp++;
      if (a.isPersonWithDisability) countPwd++;
      if (a.isSoloParent || a.isRaisedBySoloParent) countSolo++;
      if (a.isOrphan) countOrphan++;
      if (a.isFarmerFisherfolk) countAgri++;
      if (a.isFirstGenerationCollege) countFirstGen++;
      if (this.getRiskScore(a) >= 60) countHighPriority++;
    }

    return {
      totalCount: apps.length,
      count4ps,
      countBottom40,
      countIp,
      countPwd,
      countSolo,
      countOrphan,
      countAgri,
      countFirstGen,
      countHighPriority
    };
  });

  // Filtered Lists
  pendingExamApps = computed(() =>
    this.allApplications().filter(a => a.applicationStatus === 'SUBMITTED' || a.applicationStatus === 'UNDER_REVIEW')
  );

  chairInterviewApps = computed(() => {
    const progId = this.selectedProgramId();
    const search = this.interviewSearchQuery().toLowerCase().trim();
    const eqFilter = this.interviewEquityFilter();
    const priFilter = this.interviewPriorityFilter();

    return this.allApplications().filter(a => {
      const matchesProg = !progId || a.targetProgramId === progId;
      if (!matchesProg) return false;
      if (a.applicationStatus !== 'EXAM_PASSED') return false;

      if (search) {
        const nameMatch = a.fullName?.toLowerCase().includes(search);
        const numMatch = a.applicationNumber?.toLowerCase().includes(search);
        const emailMatch = a.email?.toLowerCase().includes(search);
        if (!nameMatch && !numMatch && !emailMatch) return false;
      }

      const score = this.getRiskScore(a);

      if (priFilter === 'HIGH' && score < 60) return false;
      if (priFilter === 'MODERATE' && (score < 30 || score >= 60)) return false;
      if (priFilter === 'BASELINE' && score >= 30) return false;

      if (eqFilter === '4PS' && !a.is4psBeneficiary) return false;
      if (eqFilter === 'IP' && !a.isIndigenousPeople) return false;
      if (eqFilter === 'PWD' && !a.isPersonWithDisability) return false;
      if (eqFilter === 'SOLO_PARENT' && (!a.isSoloParent && !a.isRaisedBySoloParent)) return false;
      if (eqFilter === 'ORPHAN' && !a.isOrphan) return false;
      if (eqFilter === 'AGRI' && !a.isFarmerFisherfolk) return false;
      if (eqFilter === 'BOTTOM_40' && !a.isBottom40IncomeBracket && a.monthlyHouseholdIncomeBracket !== 'POOR_BELOW_10K') return false;
      if (eqFilter === 'FIRST_GEN' && !a.isFirstGenerationCollege) return false;
      if (eqFilter === 'GIDA' && !a.isGidaResident) return false;
      if (eqFilter === 'ANY_EQUITY' && !(
        a.is4psBeneficiary || a.isIndigenousPeople || a.isPersonWithDisability ||
        a.isSoloParent || a.isRaisedBySoloParent || a.isOrphan || a.isFarmerFisherfolk ||
        a.isRebelReturneeFamily || a.isGidaResident || a.isBottom40IncomeBracket ||
        a.monthlyHouseholdIncomeBracket === 'POOR_BELOW_10K' ||
        a.isFirstGenerationCollege || a.isUnderprivilegedHomeless
      )) return false;

      return true;
    });
  });

  eligibleEnrollmentApps = computed(() =>
    this.allApplications().filter(a =>
      a.applicationStatus === 'INTERVIEW_ACCEPTED' ||
      a.applicationStatus === 'ELIGIBLE_FOR_ENROLLMENT' ||
      a.applicationStatus === 'ENROLLED'
    )
  );

  ngOnInit(): void {
    this.loadTermsAndPrograms();
  }

  private loadTermsAndPrograms(): void {
    this.admissionApi.getPublicTerms().subscribe({
      next: terms => {
        this.publicTerms.set(terms);
        const activeTerm = terms.find(t => t.isActive) || terms[0];
        if (activeTerm) {
          this.selectedTermId.set(activeTerm.id);
          this.configForm.patchValue({ termId: activeTerm.id });
          this.loadConfig(activeTerm.id);
          this.loadApplications(activeTerm.id);
          this.loadExamSlots(activeTerm.id);
        }
      }
    });

    this.admissionApi.getPublicPrograms().subscribe({
      next: progs => {
        this.publicPrograms.set(progs);
        if (progs.length > 0) {
          this.selectedProgramId.set(progs[0].id);
        }
      }
    });
  }

  refreshAllData(termId?: number): void {
    const id = termId || this.selectedTermId() || undefined;
    if (id) {
      this.selectedTermId.set(id);
      this.configForm.patchValue({ termId: id }, { emitEvent: false });
      this.loadConfig(id);
      this.loadApplications(id);
      this.loadExamSlots(id);
    } else {
      this.loadApplications();
      this.loadExamSlots();
    }
  }

  loadExamSlots(termId?: number): void {
    const id = termId || this.selectedTermId() || undefined;
    this.admissionApi.getAllAdminExamSlots(id).subscribe({
      next: slots => this.adminExamSlots.set(slots),
      error: err => console.warn('Failed to load admin exam slots', err)
    });
  }

  openCreateSlotModal(): void {
    const currentTermId = this.selectedTermId();
    this.createSlotForm.reset({
      termId: currentTermId,
      examDate: '2026-10-05',
      startTime: '08:00 AM',
      endTime: '11:00 AM',
      venueRoom: 'Testing Hall A - Room 101',
      maxCapacity: 50
    });
    this.isCreateSlotModalVisible.set(true);
  }

  closeCreateSlotModal(): void {
    this.isCreateSlotModalVisible.set(false);
  }

  submitCreateSlot(): void {
    if (this.createSlotForm.invalid) {
      this.createSlotForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill in all required exam schedule fields.' });
      return;
    }

    const req: CreateExamSlotRequest = this.createSlotForm.value;
    this.admissionApi.createExamSlot(req).subscribe({
      next: created => {
        this.messageService.add({
          severity: 'success',
          summary: 'Schedule Slot Created',
          detail: `Exam schedule slot created on ${created.examDate} @ ${created.venueRoom}`
        });
        this.closeCreateSlotModal();
        this.refreshAllData();
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Creation Failed', detail: err.error?.message || 'Failed to create exam schedule slot.' });
      }
    });
  }

  toggleExamSlotStatus(slot: EntranceExamSlotResponse): void {
    const targetStatus = slot.status === 'CANCELLED' ? 'OPEN' : 'CANCELLED';
    this.admissionApi.updateExamSlotStatus(slot.id, targetStatus).subscribe({
      next: updated => {
        this.messageService.add({
          severity: 'info',
          summary: 'Slot Status Updated',
          detail: `Slot on ${updated.examDate} status updated to ${updated.status}`
        });
        this.refreshAllData();
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: err.error?.message || 'Failed to update slot status.' });
      }
    });
  }

  deleteExamSlot(slotId: number): void {
    this.admissionApi.deleteExamSlot(slotId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Slot Removed', detail: 'Exam schedule slot deleted successfully.' });
        this.refreshAllData();
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Delete Failed', detail: err.error?.message || 'Cannot delete slot.' });
      }
    });
  }

  loadConfig(termId: number): void {
    this.admissionApi.getAdmissionConfig(termId).subscribe({
      next: cfg => {
        this.admissionConfig.set(cfg);
        this.configForm.patchValue({
          termId: cfg.termId,
          isActive: cfg.isActive,
          dailySlotLimit: cfg.dailySlotLimit,
          totalOpenedSlots: cfg.totalOpenedSlots,
          startDate: cfg.startDate || '2026-10-01',
          endDate: cfg.endDate || '2026-10-21'
        }, { emitEvent: true });
      }
    });
  }

  loadApplications(termId?: number): void {
    this.loading.set(true);
    const id = termId || this.selectedTermId() || undefined;
    this.admissionApi.getAllApplications(id).subscribe({
      next: apps => {
        this.allApplications.set(apps);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  saveConfig(): void {
    if (this.configForm.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill in all configuration parameters.' });
      return;
    }

    this.admissionApi.updateAdmissionConfig(this.configForm.value).subscribe({
      next: updated => {
        this.admissionConfig.set(updated);
        this.messageService.add({
          severity: 'success',
          summary: 'Configuration Saved',
          detail: `Admission period updated. Operational window set to ${updated.daysOpen} days (${updated.dailySlotLimit} slots/day).`
        });
        this.refreshAllData(updated.termId);
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Save Failed', detail: err.error?.message || 'Failed to update admission configuration.' });
      }
    });
  }

  openExamModal(app: AdmissionApplicationResponse): void {
    this.selectedApp.set(app);
    this.examForm.reset({
      examScore: 85,
      examRemarks: 'Applicant passed the Guidance entrance examination.',
      status: 'EXAM_PASSED'
    });
    this.isExamModalVisible.set(true);
  }

  closeExamModal(): void {
    this.isExamModalVisible.set(false);
    this.selectedApp.set(null);
  }

  submitExamEvaluation(): void {
    const app = this.selectedApp();
    if (!app || this.examForm.invalid) return;

    this.admissionApi.evaluateExam(app.id, this.examForm.value).subscribe({
      next: updated => {
        this.messageService.add({
          severity: 'success',
          summary: 'Exam Graded',
          detail: `Application ${updated.applicationNumber} updated to ${updated.applicationStatus}`
        });
        this.closeExamModal();
        this.refreshAllData();
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Grading Failed', detail: err.error?.message || 'Failed to submit exam grade.' });
      }
    });
  }

  openInterviewModal(app: AdmissionApplicationResponse): void {
    this.selectedApp.set(app);
    this.interviewForm.reset({
      interviewScore: 90,
      interviewRemarks: 'Program chairperson interview approved. Applicant qualified for enrollment.',
      status: 'INTERVIEW_ACCEPTED'
    });
    this.isInterviewModalVisible.set(true);
  }

  closeInterviewModal(): void {
    this.isInterviewModalVisible.set(false);
    this.selectedApp.set(null);
  }

  submitInterviewEvaluation(): void {
    const app = this.selectedApp();
    if (!app || this.interviewForm.invalid) return;

    this.admissionApi.evaluateInterview(app.id, this.interviewForm.value).subscribe({
      next: updated => {
        this.messageService.add({
          severity: 'success',
          summary: 'Interview Evaluated',
          detail: `Application ${updated.applicationNumber} promoted to ${updated.applicationStatus}`
        });
        this.closeInterviewModal();
        this.refreshAllData();
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Interview Evaluation Failed', detail: err.error?.message || 'Failed to record interview result.' });
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'EXAM_PASSED':
      case 'INTERVIEW_ACCEPTED':
      case 'ELIGIBLE_FOR_ENROLLMENT':
      case 'ENROLLED':
      case 'APPROVED':
        return 'success';
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return 'info';
      case 'EXAM_FAILED':
      case 'REJECTED':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getRiskScore(app: AdmissionApplicationResponse): number {
    if (app.socioeconomicRiskScore != null) return Number(app.socioeconomicRiskScore);
    let score = 10.0;
    if (app.highSchoolType?.toUpperCase() === 'PUBLIC') score += 10.0;
    if (app.isBottom40IncomeBracket || app.monthlyHouseholdIncomeBracket === 'POOR_BELOW_10K') score += 20.0;
    else if (app.monthlyHouseholdIncomeBracket === 'LOW_INCOME_10K_TO_20K') score += 10.0;
    if (app.is4psBeneficiary) score += 15.0;
    if (app.isPersonWithDisability) score += 15.0;
    if (app.isSoloParent || app.isRaisedBySoloParent) score += 10.0;
    if (app.isOrphan) score += 15.0;
    if (app.isGidaResident) score += 10.0;
    if (app.isFarmerFisherfolk) score += 10.0;
    if (app.isRebelReturneeFamily) score += 10.0;
    return Math.min(score, 100.0);
  }

  getVulnerabilitySeverity(score?: number): 'danger' | 'warn' | 'info' | 'secondary' {
    if (score === undefined || score === null) return 'secondary';
    if (score >= 60) return 'danger';
    if (score >= 30) return 'warn';
    return 'info';
  }

  getPriorityLabel(score?: number): string {
    if (score === undefined || score === null) return 'Standard Baseline';
    if (score >= 60) return 'High Affirmative Priority';
    if (score >= 30) return 'Moderate Priority';
    return 'Standard Baseline';
  }

  formatIncome(bracket?: string): string {
    switch (bracket) {
      case 'POOR_BELOW_10K': return 'Poor (< ₱10k)';
      case 'LOW_INCOME_10K_TO_20K': return 'Low Income (₱10k-20k)';
      case 'LOWER_MIDDLE_20K_TO_40K': return 'Lower Middle (₱20k-40k)';
      case 'MIDDLE_40K_TO_70K': return 'Middle (₱40k-70k)';
      case 'UPPER_70K_PLUS': return 'Upper (₱70k+)';
      default: return bracket || 'Unspecified';
    }
  }

  openDossierModal(app: AdmissionApplicationResponse): void {
    this.selectedDossierApp.set(app);
    this.isDossierModalVisible.set(true);
  }

  closeDossierModal(): void {
    this.isDossierModalVisible.set(false);
    this.selectedDossierApp.set(null);
  }
}
