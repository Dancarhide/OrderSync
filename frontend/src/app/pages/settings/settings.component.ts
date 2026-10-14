import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslationService, SupportedLanguage } from '../../services/translation.service';

export type UserRole = 'Admin' | 'Operator';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  activeTab: 'general' | 'roles' | 'channels' | 'security' = 'general';
  currentUserEmail = localStorage.getItem('ordersync_email') || 'admin@ordersync.app';
  currentRole: UserRole = (localStorage.getItem('ordersync_role') as UserRole) || 'Admin';

  savedNotification = false;
  private apiUrl = `${environment.apiUrl}/api`;

  // Security & Texas TDPSA State
  kmsStatus: any = null;
  kmsLoading = false;
  rotatingKeys = false;
  kmsMessage = '';

  mfaStatus = { enabled: false, email: 'admin@ordersync.app' };
  mfaSetupData: any = null;
  mfaCodeInput = '';
  mfaSuccessMsg = '';
  mfaErrorMsg = '';
  mfaLoading = false;

  auditLogs: any[] = [];
  auditLogsLoading = false;

  privacyNotice: any = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    public translationService: TranslationService
  ) {}

  ngOnInit() {
    this.currentUserEmail = localStorage.getItem('ordersync_email') || 'admin@ordersync.app';
    this.currentRole = (localStorage.getItem('ordersync_role') as UserRole) || 'Admin';
  }

  get t() {
    return this.translationService.t;
  }

  get currentLang(): SupportedLanguage {
    return this.translationService.currentLang;
  }

  setLanguage(_lang?: SupportedLanguage) {
    this.translationService.setLanguage('en');
    this.showSaveFeedback();
  }

  setRole(role: UserRole) {
    this.currentRole = role;
    localStorage.setItem('ordersync_role', role);
    this.showSaveFeedback();
  }

  showSaveFeedback() {
    this.savedNotification = true;
    setTimeout(() => {
      this.savedNotification = false;
    }, 2500);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  // ==========================================
  // TEXAS PRIVACY & SECURITY SUITE (TDPSA / KMS / MFA)
  // ==========================================

  loadSecurityData() {
    this.loadKmsStatus();
    this.loadMfaStatus();
    this.loadAuditLogs();
    this.loadPrivacyNotice();
  }

  loadKmsStatus() {
    this.kmsLoading = true;
    this.http.get(`${this.apiUrl}/security/key-status`).subscribe({
      next: (data) => {
        this.kmsStatus = data;
        this.kmsLoading = false;
      },
      error: () => {
        this.kmsLoading = false;
      }
    });
  }

  rotateKeys() {
    this.rotatingKeys = true;
    this.kmsMessage = '';
    this.http.post(`${this.apiUrl}/security/rotate-keys`, { actorEmail: this.currentUserEmail }).subscribe({
      next: (res: any) => {
        this.rotatingKeys = false;
        this.kmsMessage = res.message || 'Key audit rotation completed successfully.';
        this.loadKmsStatus();
        this.loadAuditLogs();
        setTimeout(() => this.kmsMessage = '', 4000);
      },
      error: () => {
        this.rotatingKeys = false;
        this.kmsMessage = 'Error running cryptographic key audit.';
      }
    });
  }

  loadMfaStatus() {
    this.http.get(`${this.apiUrl}/auth/mfa/status?email=${encodeURIComponent(this.currentUserEmail)}`).subscribe({
      next: (res: any) => {
        this.mfaStatus = res;
      },
      error: () => {}
    });
  }

  startMfaSetup() {
    this.mfaLoading = true;
    this.mfaErrorMsg = '';
    this.mfaSuccessMsg = '';
    this.http.post(`${this.apiUrl}/auth/mfa/setup`, { email: this.currentUserEmail }).subscribe({
      next: (res: any) => {
        this.mfaSetupData = res;
        this.mfaLoading = false;
      },
      error: () => {
        this.mfaErrorMsg = 'Failed to initiate MFA setup.';
        this.mfaLoading = false;
      }
    });
  }

  confirmMfa() {
    if (!this.mfaCodeInput) {
      this.mfaErrorMsg = 'Please enter 6-digit TOTP code.';
      return;
    }
    this.mfaLoading = true;
    this.mfaErrorMsg = '';
    this.http.post(`${this.apiUrl}/auth/mfa/verify`, {
      email: this.currentUserEmail,
      code: this.mfaCodeInput
    }).subscribe({
      next: (res: any) => {
        this.mfaLoading = false;
        this.mfaSuccessMsg = res.message || 'MFA activated successfully!';
        this.mfaStatus.enabled = true;
        this.mfaSetupData = null;
        this.mfaCodeInput = '';
        this.loadAuditLogs();
      },
      error: (err: any) => {
        this.mfaLoading = false;
        this.mfaErrorMsg = err.error?.error || 'Invalid MFA code. Try test code 123456.';
      }
    });
  }

  deactivateMfa() {
    this.mfaLoading = true;
    this.mfaErrorMsg = '';
    this.http.post(`${this.apiUrl}/auth/mfa/disable`, { email: this.currentUserEmail }).subscribe({
      next: (res: any) => {
        this.mfaLoading = false;
        this.mfaSuccessMsg = res.message || 'MFA disabled.';
        this.mfaStatus.enabled = false;
        this.mfaSetupData = null;
        this.loadAuditLogs();
        setTimeout(() => this.mfaSuccessMsg = '', 3500);
      },
      error: () => {
        this.mfaLoading = false;
        this.mfaErrorMsg = 'Failed to disable MFA.';
      }
    });
  }

  loadAuditLogs() {
    this.auditLogsLoading = true;
    this.http.get<any[]>(`${this.apiUrl}/security/audit-logs`).subscribe({
      next: (logs) => {
        this.auditLogs = logs;
        this.auditLogsLoading = false;
      },
      error: () => {
        this.auditLogsLoading = false;
      }
    });
  }

  loadPrivacyNotice() {
    this.http.get(`${this.apiUrl}/security/privacy-notice`).subscribe({
      next: (notice) => {
        this.privacyNotice = notice;
      },
      error: () => {}
    });
  }
}
