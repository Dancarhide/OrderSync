import { Component, EventEmitter, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ComplianceAlertEvent, ComplianceWebSocketService } from '../compliance-websocket.service';

export interface ActiveComplianceToast extends ComplianceAlertEvent {
  resolving?: boolean;
}

@Component({
  selector: 'app-compliance-alert-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none"
      aria-live="assertive"
    >
      <div
        *ngFor="let toast of toasts()"
        class="pointer-events-auto rounded-xl border shadow-2xl p-4 transition-all duration-200 backdrop-blur-sm"
        [ngClass]="
          toast.severity === 'CRITICAL'
            ? 'bg-red-50/95 border-red-300 text-red-950'
            : 'bg-orange-50/95 border-orange-300 text-orange-950'
        "
      >
        <div class="flex items-start gap-3">
          <!-- Severity Icon -->
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            [ngClass]="
              toast.severity === 'CRITICAL'
                ? 'bg-red-600 text-white'
                : 'bg-orange-500 text-white'
            "
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                [ngClass]="
                  toast.severity === 'CRITICAL'
                    ? 'bg-red-200/80 text-red-900'
                    : 'bg-orange-200/80 text-orange-900'
                "
              >
                {{ toast.severity === 'CRITICAL' ? 'CRITICAL ALERT' : 'HIGH ALERT' }} · {{ toast.ruleCode }}
              </span>
              <button
                type="button"
                (click)="dismiss(toast.alertId)"
                class="text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                aria-label="Close notification"
              >
                ✕
              </button>
            </div>

            <p class="text-xs font-bold mt-1.5 truncate">
              {{ toast.locationName }} ({{ toast.locationCode }})
            </p>
            <p class="text-xs mt-0.5 leading-relaxed opacity-90">
              {{ toast.message }}
            </p>

            <!-- Action Buttons -->
            <div class="mt-3 flex items-center gap-2">
              <button
                *ngIf="toast.severity === 'CRITICAL'"
                type="button"
                (click)="onViewIncident(toast)"
                class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold shadow-xs transition-colors"
              >
                View Incident
              </button>

              <button
                *ngIf="toast.severity === 'HIGH'"
                type="button"
                [disabled]="toast.resolving"
                (click)="resolveFromToast(toast)"
                class="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-[11px] font-semibold shadow-xs transition-colors"
              >
                {{ toast.resolving ? 'Resolving...' : 'Resolve' }}
              </button>

              <button
                type="button"
                (click)="dismiss(toast.alertId)"
                class="px-2.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ComplianceAlertToastComponent implements OnInit, OnDestroy {
  private readonly websocketService = inject(ComplianceWebSocketService);
  private readonly http = inject(HttpClient);
  private sub: Subscription | null = null;

  @Output() viewIncident = new EventEmitter<ComplianceAlertEvent>();

  readonly toasts = signal<ActiveComplianceToast[]>([]);

  ngOnInit(): void {
    this.sub = this.websocketService.onComplianceAlert().subscribe((alert) => {
      if (alert.severity === 'CRITICAL') {
        this.playWarningSound();
      }
      this.toasts.update((list) => [
        alert,
        ...list.filter((item) => item.alertId !== alert.alertId).slice(0, 4),
      ]);
    });
  }

  onViewIncident(toast: ActiveComplianceToast): void {
    this.viewIncident.emit(toast);
    this.dismiss(toast.alertId);
  }

  resolveFromToast(toast: ActiveComplianceToast): void {
    this.toasts.update((list) =>
      list.map((item) => (item.alertId === toast.alertId ? { ...item, resolving: true } : item))
    );

    this.http
      .patch(`${environment.apiUrl}/api/v1/compliance/alerts/${toast.alertId}/resolve`, {})
      .subscribe({
        next: () => {
          this.dismiss(toast.alertId);
        },
        error: () => {
          this.toasts.update((list) =>
            list.map((item) =>
              item.alertId === toast.alertId ? { ...item, resolving: false } : item
            )
          );
        },
      });
  }

  dismiss(alertId: string): void {
    this.toasts.update((list) => list.filter((item) => item.alertId !== alertId));
  }

  private playWarningSound(): void {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.34);
    } catch {
      // Ignore autoplay restrictions if browser blocks audio before interaction
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
