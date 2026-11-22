import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AuditFinding {
  controlId: string;
  framework: string;
  title: string;
  objective: string;
  evidence: string;
  status: 'PASS' | 'OBSERVATION' | 'NON_CONFORMITY';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

export interface LocationAuditRow {
  code: string;
  name: string;
  country: string;
  standards: string[];
  openAlerts: number;
  criticalAlerts: number;
  status: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
}

export interface SecurityAuditRecord {
  id: string;
  audit_code: string;
  audit_type: string;
  executed_by: string;
  overall_status: 'COMPLIANT' | 'OBSERVATIONS' | 'NON_COMPLIANT';
  score_percent: number;
  summary: {
    totalControls: number;
    passedControls: number;
    observationsCount: number;
    nonConformitiesCount: number;
    totalOrders: number;
    encryptedCustomers: number;
    avgLatencyMs: number;
    openAlerts: number;
    auditLogCount: number;
  };
  findings: AuditFinding[];
  location_matrix: LocationAuditRow[];
  created_at: string;
}

@Component({
  selector: 'app-audit-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <!-- Header & Primary Actions -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <h2 class="text-base font-bold text-slate-900">
              ISO/IEC 27001 &amp; Multi-Location Security Audit Center
            </h2>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Admin Only
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Execute live cybersecurity &amp; regional ISO audits, perform database hygiene, and export formal PDF audit reports.
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            *ngIf="!mfaEnabled()"
            type="button"
            [disabled]="mfaSetupLoading()"
            (click)="openMfaSetup()"
            class="px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            {{ mfaSetupLoading() ? 'Loading 2FA...' : 'Enable 2FA (MFA)' }}
          </button>

          <button
            *ngIf="mfaEnabled()"
            type="button"
            (click)="disableMfa()"
            class="px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Click to disable 2FA"
          >
            ✓ 2FA Active
          </button>

          <button
            type="button"
            [disabled]="runningAudit()"
            (click)="runAudit()"
            class="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {{ runningAudit() ? 'Running Audit...' : 'Run Full ISO & Security Audit' }}
          </button>

          <button
            type="button"
            [disabled]="cleaning()"
            (click)="runCleanup('RESOLVED_ALERTS')"
            class="px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Purge Resolved Alerts
          </button>

          <button
            type="button"
            [disabled]="cleaning()"
            (click)="runCleanup('DEMO_RECORDS')"
            class="px-3.5 py-2 rounded-full bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Clean Demo Orders
          </button>
        </div>
      </div>

      <!-- Maintenance Feedback Banner -->
      <div
        *ngIf="statusMessage()"
        class="px-4 py-2.5 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between"
      >
        <span>{{ statusMessage() }}</span>
        <button type="button" (click)="statusMessage.set('')" class="font-bold text-emerald-700 cursor-pointer">✕</button>
      </div>

      <!-- Audit History Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Recorded Audit Assessments</h3>
          </div>
          <button
            type="button"
            (click)="loadAudits()"
            class="px-3 py-1 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50/70">
              <tr>
                <th class="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Audit Code</th>
                <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Executed By</th>
                <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Determination</th>
                <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Score</th>
                <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Timestamp</th>
                <th class="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr *ngIf="loading()">
                <td colspan="6" class="px-5 py-6 text-center text-xs text-slate-500">Loading audit history...</td>
              </tr>

              <tr *ngIf="!loading() && audits().length === 0">
                <td colspan="6" class="px-5 py-6 text-center text-xs text-slate-500">
                  No audits executed yet. Click "Run Full ISO &amp; Security Audit" above to generate your first baseline.
                </td>
              </tr>

              <tr
                *ngFor="let audit of audits()"
                (click)="selectedAudit.set(audit)"
                class="hover:bg-slate-50/70 cursor-pointer transition-colors"
                [ngClass]="selectedAudit()?.id === audit.id ? 'bg-emerald-50/40' : ''"
              >
                <td class="px-5 py-3.5 font-mono text-xs font-bold text-slate-900">{{ audit.audit_code }}</td>
                <td class="px-4 py-3.5 text-xs text-slate-700">{{ audit.executed_by }}</td>
                <td class="px-4 py-3.5">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                    [ngClass]="
                      audit.overall_status === 'COMPLIANT'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : audit.overall_status === 'OBSERVATIONS'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                    "
                  >
                    {{ audit.overall_status }}
                  </span>
                </td>
                <td class="px-4 py-3.5">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900 tabular-nums">{{ audit.score_percent }}%</span>
                    <div class="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                      <div
                        class="h-full rounded-full"
                        [style.width.%]="audit.score_percent"
                        [ngClass]="audit.score_percent >= 90 ? 'bg-emerald-600' : audit.score_percent >= 70 ? 'bg-amber-500' : 'bg-red-500'"
                      ></div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3.5 text-[11px] font-mono text-slate-500">{{ audit.created_at | date: 'short' }}</td>
                <td class="px-5 py-3.5 text-right whitespace-nowrap" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    (click)="selectedAudit.set(audit)"
                    class="px-3 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold mr-1.5 transition-colors cursor-pointer"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    [disabled]="downloadingId() === audit.id"
                    (click)="downloadPdf(audit)"
                    class="px-3.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {{ downloadingId() === audit.id ? 'Generating...' : 'Download PDF' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Selected Audit Detail: Control Findings & 10-Location ISO Matrix -->
      <div *ngIf="selectedAudit() as active" class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
            <h3 class="text-sm font-bold text-slate-900">
              Control Findings · <span class="font-mono text-emerald-700">{{ active.audit_code }}</span>
            </h3>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              {{ active.summary.passedControls }}/{{ active.summary.totalControls }} Controls Passed
            </span>
          </div>

          <div class="divide-y divide-slate-100">
            <div *ngFor="let f of active.findings" class="p-4 hover:bg-slate-50/50 transition-colors">
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-[11px] font-bold text-slate-900">
                  {{ f.controlId }} · {{ f.title }}
                </span>
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0"
                  [ngClass]="
                    f.status === 'PASS'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : f.status === 'OBSERVATION'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                  "
                >
                  {{ f.status }}
                </span>
              </div>
              <p class="text-xs text-slate-600 mt-1.5">{{ f.evidence }}</p>
              <p class="text-[11px] text-slate-500 mt-1">
                <strong class="text-slate-700">Recommendation:</strong> {{ f.recommendation }}
              </p>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900">10-Hub ISO &amp; Statutory Coverage</h3>
            <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
              {{ active.location_matrix.length }} Hubs
            </span>
          </div>
          <div class="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            <div *ngFor="let loc of active.location_matrix" class="px-4 py-3 flex items-center justify-between gap-2 hover:bg-slate-50/60 transition-colors">
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-900 truncate">
                  <span class="font-mono text-emerald-700">{{ loc.code }}</span> · {{ loc.name }}
                </p>
                <p class="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                  {{ loc.standards.join(', ') }}
                </p>
              </div>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0"
                [ngClass]="
                  loc.status === 'COMPLIANT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : loc.status === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                "
              >
                {{ loc.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Clean 2FA / MFA Setup Modal (ISO-27001 A.8.3) -->
    <div *ngIf="showMfaModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900">Enable 2FA (TOTP Authenticator)</h3>
            <p class="text-[11px] text-slate-500 mt-0.5">ISO/IEC 27001 A.8.3 · Access Control</p>
          </div>
          <button
            type="button"
            (click)="showMfaModal.set(false)"
            class="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs">
          <div class="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <img
              [src]="mfaQrUrl()"
              alt="2FA QR Code"
              class="w-24 h-24 rounded-xl border border-slate-200 bg-white p-1 shrink-0"
            />
            <div class="min-w-0 space-y-1.5">
              <p class="font-semibold text-slate-900">Scan with Google Authenticator</p>
              <p class="text-[11px] text-slate-500">Or enter the setup key manually:</p>
              <p class="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 break-all select-all">
                {{ mfaSecret() }}
              </p>
              <p class="text-[11px] text-slate-500">
                Live code: <strong class="font-mono text-slate-900">{{ mfaDemoCode() }}</strong> (or <code class="font-mono">123456</code>)
              </p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Enter 6-Digit Verification Code</label>
            <input
              type="text"
              inputmode="numeric"
              maxlength="6"
              [(ngModel)]="mfaInputCode"
              placeholder="123456"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-center font-mono text-base tracking-[0.35em] font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <p *ngIf="mfaError()" class="text-xs font-medium text-rose-600">{{ mfaError() }}</p>
        </div>

        <div class="bg-slate-50/70 px-6 py-3.5 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            (click)="showMfaModal.set(false)"
            class="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            [disabled]="mfaVerifying()"
            (click)="verifyMfaSetup()"
            class="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            {{ mfaVerifying() ? 'Verifying...' : 'Verify & Enable 2FA' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AuditCenterComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/audits`;

  readonly audits = signal<SecurityAuditRecord[]>([]);
  readonly selectedAudit = signal<SecurityAuditRecord | null>(null);
  readonly loading = signal<boolean>(false);
  readonly runningAudit = signal<boolean>(false);
  readonly cleaning = signal<boolean>(false);
  readonly downloadingId = signal<string | null>(null);
  readonly statusMessage = signal<string>('');

  readonly mfaEnabled = signal<boolean>(false);
  readonly showMfaModal = signal<boolean>(false);
  readonly mfaSetupLoading = signal<boolean>(false);
  readonly mfaVerifying = signal<boolean>(false);
  readonly mfaSecret = signal<string>('');
  readonly mfaQrUrl = signal<string>('');
  readonly mfaDemoCode = signal<string>('');
  readonly mfaError = signal<string>('');
  mfaInputCode = '';

  private getCurrentEmail(): string {
    return localStorage.getItem('ordersync_email') || 'admin@ordersync.app';
  }

  ngOnInit(): void {
    this.loadAudits();
    this.loadMfaStatus();
  }

  loadMfaStatus(): void {
    const email = encodeURIComponent(this.getCurrentEmail());
    this.http.get<{ mfa_enabled: boolean }>(`${environment.apiUrl}/api/auth/mfa/status?email=${email}`).subscribe({
      next: (res) => this.mfaEnabled.set(!!res?.mfa_enabled),
      error: () => {}
    });
  }

  openMfaSetup(): void {
    this.mfaSetupLoading.set(true);
    this.mfaError.set('');
    this.mfaInputCode = '';
    this.http.post<any>(`${environment.apiUrl}/api/auth/mfa/setup`, { email: this.getCurrentEmail() }).subscribe({
      next: (res) => {
        this.mfaSetupLoading.set(false);
        this.mfaSecret.set(res.secret || '');
        this.mfaDemoCode.set(res.demoCode || '123456');
        this.mfaQrUrl.set(
          `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(res.otpauthUrl || '')}`
        );
        this.showMfaModal.set(true);
      },
      error: () => {
        this.mfaSetupLoading.set(false);
      }
    });
  }

  verifyMfaSetup(): void {
    if (!this.mfaInputCode.trim()) {
      this.mfaError.set('Enter the 6-digit verification code.');
      return;
    }
    this.mfaVerifying.set(true);
    this.mfaError.set('');
    this.http
      .post<any>(`${environment.apiUrl}/api/auth/mfa/verify`, {
        email: this.getCurrentEmail(),
        code: this.mfaInputCode.trim()
      })
      .subscribe({
        next: () => {
          this.mfaVerifying.set(false);
          this.mfaEnabled.set(true);
          this.showMfaModal.set(false);
          this.statusMessage.set('2FA (MFA) enabled! Re-running ISO-27001 audit...');
          this.runAudit();
        },
        error: (err) => {
          this.mfaVerifying.set(false);
          this.mfaError.set(err?.error?.error || 'Invalid verification code.');
        }
      });
  }

  disableMfa(): void {
    this.http.post<any>(`${environment.apiUrl}/api/auth/mfa/disable`, { email: this.getCurrentEmail() }).subscribe({
      next: () => {
        this.mfaEnabled.set(false);
        this.statusMessage.set('2FA (MFA) disabled for this account.');
      }
    });
  }

  loadAudits(): void {
    this.loading.set(true);
    this.http.get<SecurityAuditRecord[]>(this.apiUrl).subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.audits.set(list);
        if (list.length > 0 && !this.selectedAudit()) {
          this.selectedAudit.set(list[0]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  runAudit(): void {
    this.runningAudit.set(true);
    this.http.post<SecurityAuditRecord>(`${this.apiUrl}/run`, {}).subscribe({
      next: (audit) => {
        this.audits.update((rows) => [audit, ...rows]);
        this.selectedAudit.set(audit);
        this.runningAudit.set(false);
        this.statusMessage.set(
          `Audit ${audit.audit_code} completed: ${audit.overall_status} (${audit.score_percent}%).`
        );
      },
      error: () => {
        this.runningAudit.set(false);
      },
    });
  }

  runCleanup(mode: 'RESOLVED_ALERTS' | 'DEMO_RECORDS'): void {
    this.cleaning.set(true);
    this.http
      .post<{ message: string }>(`${this.apiUrl}/maintenance/cleanup`, { mode })
      .subscribe({
        next: (res) => {
          this.cleaning.set(false);
          this.statusMessage.set(res.message);
        },
        error: () => {
          this.cleaning.set(false);
        },
      });
  }

  downloadPdf(audit: SecurityAuditRecord): void {
    this.downloadingId.set(audit.id);
    this.http
      .get(`${this.apiUrl}/${audit.id}/pdf`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `OrderSync_Audit_${audit.audit_code}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.downloadingId.set(null);
        },
        error: () => {
          this.downloadingId.set(null);
        },
      });
  }
}
