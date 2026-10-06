// File: src/app/features/public/public-certificate-verifier/public-certificate-verifier.component.ts

import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { CertificateVerification } from '../../../core/models/institution.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-public-certificate-verifier',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TagModule, SkeletonModule, CardModule],
  templateUrl: './public-certificate-verifier.component.html',
  styleUrl: './public-certificate-verifier.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicCertificateVerifierComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly certificate = signal<CertificateVerification | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const cert = this.route.snapshot.queryParamMap.get('cert');
    const hash = this.route.snapshot.queryParamMap.get('hash');

    if (!cert) {
      this.errorMessage.set('Missing certificate identifier in URL verification parameters.');
      this.isLoading.set(false);
      return;
    }

    const hashParam = hash ? `&hash=${encodeURIComponent(hash)}` : '';
    const url = `${environment.apiUrl}/v1/public/verify/honor-certificate?cert=${encodeURIComponent(cert)}${hashParam}`;

    this.http.get<CertificateVerification>(url).subscribe({
      next: (data) => {
        this.certificate.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || err.error?.message || 'Certificate verification failed or invalid credential signature.');
      }
    });
  }

  printCertificate(): void {
    window.print();
  }
}
