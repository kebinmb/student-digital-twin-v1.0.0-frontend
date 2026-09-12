import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { LmsApiService } from '../../../core/service/lms/lms-api.service';
import { LtiDeploymentResponse } from '../../../core/models/lms.model';

@Component({
  selector: 'app-lms-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TagModule,
    InputTextModule,
    ToastModule
  ],
  templateUrl: './lms-config.component.html',
  styleUrl: './lms-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LmsConfigComponent implements OnInit {
  private readonly lmsApi = inject(LmsApiService);
  private readonly messageService = inject(MessageService);

  readonly deployments = signal<LtiDeploymentResponse[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isDialogVisible = signal<boolean>(false);

  readonly lmsForm = new FormGroup({
    platformName: new FormControl<string>('CANVAS', { nonNullable: true, validators: [Validators.required] }),
    clientId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    deploymentId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    oidcAuthUrl: new FormControl<string>('https://canvas.instructure.com/api/lti/authorize_redirect', { nonNullable: true, validators: [Validators.required] }),
    accessTokenUrl: new FormControl<string>('https://canvas.instructure.com/login/oauth2/token', { nonNullable: true, validators: [Validators.required] }),
    jwksUrl: new FormControl<string>('https://canvas.instructure.com/api/lti/security/jwks', { nonNullable: true, validators: [Validators.required] })
  });

  ngOnInit(): void {
    this.loadDeployments();
  }

  loadDeployments(): void {
    this.isLoading.set(true);
    this.lmsApi.getDeployments().subscribe({
      next: (data) => {
        this.deployments.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Load Error', detail: 'Failed to retrieve LTI 1.3 deployments.' });
        this.isLoading.set(false);
      }
    });
  }

  openCreateDialog(): void {
    this.lmsForm.reset({
      platformName: 'CANVAS',
      clientId: '',
      deploymentId: '',
      oidcAuthUrl: 'https://canvas.instructure.com/api/lti/authorize_redirect',
      accessTokenUrl: 'https://canvas.instructure.com/login/oauth2/token',
      jwksUrl: 'https://canvas.instructure.com/api/lti/security/jwks'
    });
    this.isDialogVisible.set(true);
  }

  submitDeployment(): void {
    if (this.lmsForm.invalid) {
      this.lmsForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.lmsApi.createDeployment(this.lmsForm.getRawValue()).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'LTI Deployment Created', detail: `Registered ${res.platformName} deployment successfully.` });
        this.isDialogVisible.set(false);
        this.isSaving.set(false);
        this.loadDeployments();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Creation Failed', detail: err.error?.detail || 'Failed to register LTI deployment.' });
        this.isSaving.set(false);
      }
    });
  }

  syncSectionRoster(sectionId: number): void {
    this.lmsApi.syncRoster(sectionId).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'Roster Synced', detail: res.message });
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Sync Failed', detail: err.error?.detail || 'Failed to sync section roster to LMS.' });
      }
    });
  }
}
