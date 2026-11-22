import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceLocation, LocationContextService, LocationHealthStatus } from './location-context.service';

@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-flex items-center gap-2.5 flex-wrap">
      <!-- Dropdown Trigger -->
      <button
        type="button"
        (click)="toggleDropdown()"
        class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E7E4DD] hover:border-stone-400 text-xs font-medium text-[#141413] transition-colors focus:outline-none cursor-pointer"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="listbox"
      >
        <span
          class="w-2 h-2 rounded-full flex-shrink-0"
          [ngClass]="getStatusDotClass(currentHealthStatus())"
          [title]="getStatusTitle(currentHealthStatus())"
        ></span>

        <span class="truncate max-w-[180px] font-semibold text-[#141413]">
          {{ locationContext.selectedLocation()?.name || 'All Locations (10)' }}
        </span>

        <span
          *ngIf="currentOpenAlerts() > 0"
          class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200"
        >
          {{ currentOpenAlerts() }}
        </span>

        <svg
          class="w-3.5 h-3.5 text-stone-400 transition-transform duration-150"
          [class.rotate-180]="isOpen()"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Active Primary Standard Badge -->
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border"
        [ngClass]="
          currentHealthStatus() === 'rojo'
            ? 'bg-red-50 text-red-700 border-red-200'
            : currentHealthStatus() === 'amarillo'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        "
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
        <span>{{ locationContext.activeStandardBadge() }}</span>
      </span>

      <!-- Dropdown Panel -->
      <div
        *ngIf="isOpen()"
        role="listbox"
        class="absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden"
      >
        <div class="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Hubs &amp; Regulatory Compliance
          </span>
          <span class="text-[10px] font-medium text-slate-500">
            {{ locationContext.locations().length }} hubs
          </span>
        </div>

        <div class="max-h-80 overflow-y-auto divide-y divide-slate-100">
          <!-- Option: All Locations -->
          <div
            role="option"
            tabindex="0"
            (click)="select('ALL')"
            (keydown.enter)="select('ALL')"
            class="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            [ngClass]="locationContext.selectedLocationId() === 'ALL' ? 'bg-purple-50/60' : ''"
          >
            <span class="flex items-center gap-2.5 min-w-0">
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                [ngClass]="getStatusDotClass(overallHealthStatus())"
              ></span>
              <span class="block min-w-0">
                <span class="block text-xs font-semibold text-slate-900 truncate">
                  All Locations (Global View)
                </span>
                <span class="block text-[11px] text-slate-500 truncate">
                  US · CA · MX — Consolidated ISO 27001 Monitoring
                </span>
              </span>
            </span>
            <span
              *ngIf="locationContext.totalOpenAlerts() > 0"
              class="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700"
            >
              {{ locationContext.totalOpenAlerts() }}
            </span>
          </div>

          <!-- 10 Locations -->
          <div
            *ngFor="let loc of locationContext.locations()"
            role="option"
            tabindex="0"
            (click)="select(loc.id)"
            (keydown.enter)="select(loc.id)"
            class="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            [ngClass]="
              locationContext.selectedLocationId() === loc.id ||
              locationContext.selectedLocationId() === loc.code
                ? 'bg-purple-50/60'
                : ''
            "
          >
            <span class="flex items-center gap-2.5 min-w-0">
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                [ngClass]="getStatusDotClass(loc.health_status)"
                [title]="getStatusTitle(loc.health_status)"
              ></span>

              <span class="block min-w-0">
                <span class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {{ loc.country }}
                  </span>
                  <span class="block text-xs font-semibold text-slate-900 truncate">
                    {{ loc.name }}
                  </span>
                </span>
                <span class="block text-[11px] text-slate-500 truncate mt-0.5">
                  {{ locationContext.getStandardLabel(loc) }}
                </span>
              </span>
            </span>

            <span class="flex items-center gap-1.5 ml-2 flex-shrink-0">
              <span
                *ngIf="loc.open_alerts_count > 0; else compliantBadge"
                class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200"
              >
                {{ loc.open_alerts_count }} alert{{ loc.open_alerts_count === 1 ? '' : 's' }}
              </span>
              <ng-template #compliantBadge>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  100%
                </span>
              </ng-template>
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LocationSelectorComponent {
  readonly locationContext = inject(LocationContextService);
  private readonly elementRef = inject(ElementRef);
  readonly isOpen = signal<boolean>(false);

  toggleDropdown(): void {
    this.isOpen.update((v) => !v);
  }

  select(locationId: string): void {
    this.locationContext.selectLocation(locationId);
    this.isOpen.set(false);
  }

  currentHealthStatus(): LocationHealthStatus {
    const selected = this.locationContext.selectedLocation();
    return selected ? selected.health_status : this.overallHealthStatus();
  }

  overallHealthStatus(): LocationHealthStatus {
    const locs = this.locationContext.locations();
    if (locs.some((l) => l.health_status === 'rojo')) return 'rojo';
    if (locs.some((l) => l.health_status === 'amarillo')) return 'amarillo';
    return 'verde';
  }

  currentOpenAlerts(): number {
    const selected = this.locationContext.selectedLocation();
    return selected ? selected.open_alerts_count : this.locationContext.totalOpenAlerts();
  }

  getStatusDotClass(status: LocationHealthStatus): string {
    switch (status) {
      case 'rojo':
        return 'bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]';
      case 'amarillo':
        return 'bg-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.2)]';
      default:
        return 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]';
    }
  }

  getStatusTitle(status: LocationHealthStatus): string {
    switch (status) {
      case 'rojo':
        return 'Active critical alert';
      case 'amarillo':
        return 'Active regulatory warning';
      default:
        return '100% Compliant';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
