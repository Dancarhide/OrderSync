import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LocationContextService, ComplianceLocation } from '../location-context.service';
import { ComplianceWebSocketService } from '../compliance-websocket.service';

export interface ComplianceAlertRow {
  id: string;
  order_id: string | null;
  external_order_id?: string | null;
  location_id: string;
  location_code: string;
  location_name: string;
  location_country?: string;
  rule_code: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  resolving?: boolean;
}

@Component({
  selector: 'app-compliance-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <!-- Global Compliance Metric Bar -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 class="text-base font-bold text-slate-900">
              Multi-Location Compliance Center
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Real-time monitoring of ISO-27001, TDPSA, CCPA, PIPEDA, Loi 25 &amp; SAT Carta Porte
            </p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex items-center bg-slate-50 border border-slate-200 rounded-full pl-3 pr-1 py-1 gap-1.5">
              <select
                [(ngModel)]="selectedScenario"
                class="bg-transparent text-xs text-slate-700 font-medium pr-1 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="MX-MTY:breach">Monterrey (Missing Carta Porte)</option>
                <option value="US-TX-HQ:breach">Houston HQ (SLA &gt;5s Critical)</option>
                <option value="CA-MTL:breach">Montreal (Loi 25 French Missing)</option>
                <option value="US-CA:ok">California (100% Compliant CCPA)</option>
              </select>
              <button
                type="button"
                [disabled]="simulatingFlow()"
                (click)="runRealisticOrderFlow()"
                class="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {{ simulatingFlow() ? 'Syncing...' : 'Run Live Order Flow' }}
              </button>
            </div>

            <button
              type="button"
              (click)="refreshAll()"
              class="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full transition-all duration-500 rounded-full"
            [style.width.%]="globalCompliancePercent()"
            [ngClass]="
              globalCompliancePercent() >= 95
                ? 'bg-emerald-600'
                : globalCompliancePercent() >= 85
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            "
          ></div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-500">
          <div class="flex items-center gap-4">
            <span>
              Compliant hubs: <strong class="text-emerald-700">{{ compliantLocationsCount() }}/10</strong>
            </span>
            <span>
              Global score: <strong class="text-slate-800">{{ globalCompliancePercent() }}%</strong>
            </span>
          </div>
          <span>
            Active incidents:
            <strong [ngClass]="alerts().length > 0 ? 'text-red-600' : 'text-emerald-700'">{{ alerts().length }}</strong>
          </span>
        </div>
      </div>

      <!-- 10 Locations Metric Cards Grid -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-slate-900">
            Compliance Health Map by Hub (10 Locations)
          </h3>
          <button
            *ngIf="locationContext.selectedLocationId() !== 'ALL'"
            type="button"
            (click)="locationContext.selectLocation('ALL')"
            class="px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
          >
            View all hubs
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <button
            *ngFor="let loc of locationContext.locations()"
            type="button"
            (click)="toggleLocationFilter(loc)"
            class="text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-sm focus:outline-none cursor-pointer"
            [ngClass]="
              isSelectedLocation(loc)
                ? 'border-emerald-600 ring-2 ring-emerald-500/15 bg-emerald-50/20'
                : 'border-slate-200/80 hover:border-emerald-300'
            "
          >
            <div class="flex items-center justify-between gap-2 mb-2.5">
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                {{ loc.country }} · {{ loc.code }}
              </span>
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2"
                [ngClass]="
                  loc.health_status === 'rojo'
                    ? 'bg-red-500 ring-red-100'
                    : loc.health_status === 'amarillo'
                      ? 'bg-amber-400 ring-amber-100'
                      : 'bg-emerald-500 ring-emerald-100'
                "
              ></span>
            </div>

            <span class="block text-xs font-bold text-slate-900 truncate">{{ loc.name }}</span>
            <span class="block text-[11px] text-slate-500 truncate mt-0.5">
              {{ locationContext.getStandardLabel(loc) }}
            </span>

            <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span class="text-[10px] text-slate-500 font-medium">Open alerts</span>
              <span
                class="text-xs font-bold px-2.5 py-0.5 rounded-full"
                [ngClass]="
                  loc.open_alerts_count > 0
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                "
              >
                {{ loc.open_alerts_count }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Active Incidents Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Active Compliance Incidents</h3>
            <p class="text-xs text-slate-500">
              {{
                locationContext.selectedLocation()
                  ? 'Filtered by hub: ' + locationContext.selectedLocation()?.name
                  : 'Showing open incidents across all hubs'
              }}
            </p>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              *ngFor="let sev of ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM']"
              type="button"
              (click)="severityFilter.set(sev)"
              class="px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer"
              [ngClass]="
                severityFilter() === sev
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              "
            >
              {{ sev === 'ALL' ? 'All' : sev }}
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50/70">
              <tr>
                <th class="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Severity</th>
                <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Location</th>
                <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Rule / Standard</th>
                <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Incident Description</th>
                <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Timestamp</th>
                <th class="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr *ngIf="loadingAlerts()">
                <td colspan="6" class="px-5 py-8 text-center text-xs text-slate-500">
                  Loading compliance incidents...
                </td>
              </tr>

              <tr *ngIf="!loadingAlerts() && filteredAlerts().length === 0">
                <td colspan="6" class="px-5 py-8 text-center text-xs text-emerald-700 font-medium bg-emerald-50/40">
                  ✓ No active incidents for the selected filter. All regulatory standards are compliant.
                </td>
              </tr>

              <tr *ngFor="let alert of filteredAlerts()" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-5 py-3.5 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                    [ngClass]="
                      alert.severity === 'CRITICAL'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : alert.severity === 'HIGH'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    "
                  >
                    {{ alert.severity }}
                  </span>
                </td>

                <td class="px-4 py-3.5 whitespace-nowrap">
                  <div class="text-xs font-semibold text-slate-900">{{ alert.location_name }}</div>
                  <div class="text-[10px] text-slate-500 font-mono">{{ alert.location_code }}</div>
                </td>

                <td class="px-4 py-3.5 whitespace-nowrap">
                  <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-mono font-semibold">
                    {{ alert.rule_code }}
                  </span>
                </td>

                <td class="px-4 py-3.5 text-xs text-slate-700 max-w-md">
                  {{ alert.message }}
                </td>

                <td class="px-4 py-3.5 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                  {{ alert.created_at | date: 'short' }}
                </td>

                <td class="px-5 py-3.5 whitespace-nowrap text-right">
                  <button
                    type="button"
                    [disabled]="alert.resolving"
                    (click)="resolveAlert(alert)"
                    class="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {{ alert.resolving ? 'Resolving...' : 'Resolve' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class ComplianceDashboardPageComponent implements OnInit, OnDestroy {
  readonly locationContext = inject(LocationContextService);
  private readonly websocketService = inject(ComplianceWebSocketService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/compliance`;

  private subs: Subscription[] = [];

  readonly alerts = signal<ComplianceAlertRow[]>([]);
  readonly loadingAlerts = signal<boolean>(false);
  readonly simulatingFlow = signal<boolean>(false);
  readonly severityFilter = signal<string>('ALL');
  selectedScenario = 'MX-MTY:breach';

  readonly compliantLocationsCount = computed(
    () => this.locationContext.locations().filter((l) => l.health_status === 'verde').length
  );

  readonly globalCompliancePercent = computed(() => {
    const openCount = this.locationContext.totalOpenAlerts();
    if (openCount === 0) return 100.0;
    const score = Math.max(0, 100 - openCount * 0.6);
    return Number(score.toFixed(1));
  });

  readonly filteredAlerts = computed(() => {
    const selectedLoc = this.locationContext.selectedLocation();
    const sev = this.severityFilter();

    return this.alerts().filter((alert) => {
      if (alert.is_resolved) return false;
      if (
        selectedLoc &&
        alert.location_id !== selectedLoc.id &&
        alert.location_code !== selectedLoc.code
      ) {
        return false;
      }
      if (sev !== 'ALL' && alert.severity !== sev) {
        return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.loadAlerts();

    this.subs.push(
      this.websocketService.onComplianceAlert().subscribe(() => {
        this.loadAlerts();
        this.locationContext.refreshLocations();
      }),
      this.websocketService.onAlertResolved().subscribe((resolved) => {
        this.alerts.update((rows) => rows.filter((r) => r.id !== resolved.alertId));
        this.locationContext.refreshLocations();
      })
    );
  }

  refreshAll(): void {
    this.locationContext.refreshLocations();
    this.loadAlerts();
  }

  runRealisticOrderFlow(): void {
    const [locationCode, mode] = this.selectedScenario.split(':');
    this.simulatingFlow.set(true);
    this.http
      .post(`${this.apiUrl}/simulate-order-flow`, {
        locationCode,
        forceBreach: mode === 'breach',
      })
      .subscribe({
        next: () => {
          this.simulatingFlow.set(false);
          this.refreshAll();
        },
        error: () => {
          this.simulatingFlow.set(false);
        },
      });
  }

  simulateBreach(scenario: 'CARTA_PORTE_MISSING' | 'LATENCY_BREACH' | 'LOI_25_MISSING'): void {
    this.http.post(`${this.apiUrl}/simulate-breach`, { scenario }).subscribe({
      next: () => {
        this.refreshAll();
      },
    });
  }

  loadAlerts(): void {
    this.loadingAlerts.set(true);
    this.http.get<ComplianceAlertRow[]>(`${this.apiUrl}/alerts?is_resolved=false`).subscribe({
      next: (rows) => {
        this.alerts.set(Array.isArray(rows) ? rows : []);
        this.loadingAlerts.set(false);
      },
      error: () => {
        this.loadingAlerts.set(false);
      },
    });
  }

  toggleLocationFilter(loc: ComplianceLocation): void {
    if (this.isSelectedLocation(loc)) {
      this.locationContext.selectLocation('ALL');
    } else {
      this.locationContext.selectLocation(loc.id);
    }
  }

  isSelectedLocation(loc: ComplianceLocation): boolean {
    const current = this.locationContext.selectedLocationId();
    return current === loc.id || current === loc.code;
  }

  resolveAlert(alert: ComplianceAlertRow): void {
    this.alerts.update((rows) =>
      rows.map((r) => (r.id === alert.id ? { ...r, resolving: true } : r))
    );

    this.http.patch(`${this.apiUrl}/alerts/${alert.id}/resolve`, {}).subscribe({
      next: () => {
        this.alerts.update((rows) => rows.filter((r) => r.id !== alert.id));
        this.locationContext.refreshLocations();
      },
      error: () => {
        this.alerts.update((rows) =>
          rows.map((r) => (r.id === alert.id ? { ...r, resolving: false } : r))
        );
      },
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
