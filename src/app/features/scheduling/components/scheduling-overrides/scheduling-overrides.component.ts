import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { SchedulingApiService } from '../../../../core/service/scheduling/scheduling-api.service';
import { AuthService } from '../../../../core/service/authentication/auth-service';
import {
  SchedulingOverrideResponse,
  ApprovalStepResponse
} from '../../../../core/models/scheduling.model';

@Component({
  selector: 'app-scheduling-overrides',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    TextareaModule,
    TooltipModule,
    TagModule
  ],
  templateUrl: './scheduling-overrides.component.html',
  styleUrls: ['./scheduling-overrides.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchedulingOverridesComponent implements OnInit {
  private readonly schedulingApi = inject(SchedulingApiService);
  private readonly authService = inject(AuthService);

  readonly overrides = signal<SchedulingOverrideResponse[]>([]);
  readonly loading = signal<boolean>(false);
  readonly selectedRequest = signal<SchedulingOverrideResponse | null>(null);
  readonly actionDialogVisible = signal<boolean>(false);
  readonly submittingAction = signal<boolean>(false);

  decisionRemarks = '';

  ngOnInit(): void {
    this.loadOverrides();
  }

  loadOverrides(): void {
    this.loading.set(true);
    this.schedulingApi.getOverrideInbox().subscribe({
      next: (data) => {
        this.overrides.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  formatStepType(stepType: string): string {
    switch (stepType) {
      case 'CHAIRPERSON_APPROVAL':
        return 'Program Chairperson Approval';
      case 'DEAN_APPROVAL':
        return 'College Dean Approval';
      case 'FACULTY_ACCEPTANCE':
        return 'Faculty Member Acceptance';
      default:
        return stepType;
    }
  }

  canActOnRequest(req: SchedulingOverrideResponse): boolean {
    if (req.status !== 'PENDING_APPROVAL') return false;
    return this.pendingStepForMe(req) !== null;
  }

  pendingStepForMe(req: SchedulingOverrideResponse): ApprovalStepResponse | null {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return null;

    const currentUserId = currentUser.id;
    const currentRoles = (currentUser.roles || []).map(r => typeof r === 'string' ? r : (r as any).name);

    return req.approvals.find(a => {
      if (a.status !== 'PENDING') return false;
      if (a.assignedApproverUserId && a.assignedApproverUserId === currentUserId) return true;
      const roleMatches = currentRoles.some(r => r === a.requiredRole || r === a.requiredRole.replace('ROLE_', ''));
      return roleMatches;
    }) || null;
  }

  openDetail(req: SchedulingOverrideResponse): void {
    this.selectedRequest.set(req);
    this.decisionRemarks = '';
    this.actionDialogVisible.set(true);
  }

  openActionDialog(req: SchedulingOverrideResponse): void {
    this.openDetail(req);
  }

  submitDecision(req: SchedulingOverrideResponse, step: ApprovalStepResponse, isApprove: boolean): void {
    if (!this.decisionRemarks.trim()) return;

    this.submittingAction.set(true);
    const action$ = isApprove
      ? this.schedulingApi.approveOverrideStep(req.id, step.id, this.decisionRemarks)
      : this.schedulingApi.rejectOverrideStep(req.id, step.id, this.decisionRemarks);

    action$.subscribe({
      next: () => {
        this.submittingAction.set(false);
        this.actionDialogVisible.set(false);
        this.decisionRemarks = '';
        this.loadOverrides();
      },
      error: () => {
        this.submittingAction.set(false);
      }
    });
  }
}
