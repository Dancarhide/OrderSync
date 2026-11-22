import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ComplianceBadgeOrderInput {
  id?: string;
  external_order_id?: string;
  origin_location_id?: string;
  location_code?: string;
  locationCode?: string;
  origin?: string;
  compliance_status?: 'COMPLIANT' | 'WARNING' | 'BREACHED' | string;
  compliance_checked_at?: string | Date | null;
  pii_encrypted?: boolean;
  customer_name?: string;
  customer?: {
    full_name?: string;
    shipping_address?: string;
  };
  encrypted_full_name?: unknown;
  sat_carta_porte_folio?: string | null;
  carta_porte_folio?: string | null;
  french_template_available?: boolean;
}

@Component({
  selector: 'app-order-compliance-badges',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-flex items-center group" tabindex="0">
      <!-- Single Unified Minimalist Compliance Pill (Never wraps to 2 rows) -->
      <span
        *ngIf="isPiiProtected() && (!isMexicoOrder() || hasCartaPorte()); else breachedPill"
        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200/80 whitespace-nowrap"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>AES-256 · {{ isMexicoOrder() ? 'Carta Porte OK' : (regionalBadge || 'ISO 27001') }}</span>
      </span>
      <ng-template #breachedPill>
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 whitespace-nowrap"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          <span>{{ !isPiiProtected() ? 'Unencrypted PII' : 'Carta Porte Pending' }}</span>
        </span>
      </ng-template>

      <!-- Interactive Tooltip -->
      <div
        class="pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 absolute left-0 bottom-full mb-2 w-64 p-2.5 rounded-lg bg-slate-900 text-white text-[11px] shadow-xl z-40 border border-slate-700"
      >
        <div class="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-1.5">
          <span class="font-semibold text-slate-200">Compliance Validation</span>
          <span
            class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
            [ngClass]="
              isBreached()
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : isWarning()
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            "
          >
            {{ complianceStatusLabel() }}
          </span>
        </div>

        <div class="space-y-1 text-slate-300">
          <div class="flex justify-between gap-2">
            <span class="text-slate-400">Hub:</span>
            <span class="font-medium text-white truncate">{{ resolvedLocationCode || 'US-TX-HQ' }}</span>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-slate-400">Validated:</span>
            <span class="font-mono text-[10px] text-slate-200">{{ formattedCheckedAt() }}</span>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-slate-400">PII Encryption:</span>
            <span class="text-emerald-300 font-medium">
              {{ isPiiProtected() ? 'AES-256-GCM Active' : 'Encryption Required' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class OrderComplianceBadgesComponent {
  @Input() order: ComplianceBadgeOrderInput | null = null;
  @Input() locationCode?: string;

  get resolvedLocationCode(): string {
    if (this.locationCode) return this.locationCode.toUpperCase();
    const fromOrder = this.order?.location_code || this.order?.locationCode;
    if (fromOrder) return fromOrder.toUpperCase();

    const extId = (this.order?.external_order_id || '').toUpperCase();
    if (extId.includes('MX-MTY')) return 'MX-MTY';
    if (extId.includes('MX-CHH')) return 'MX-CHH';
    if (extId.includes('MX-CDMX')) return 'MX-CDMX';
    if (extId.includes('MX-FED')) return 'MX-FED';
    if (extId.includes('CA-MTL')) return 'CA-MTL';
    if (extId.includes('CA-TOR')) return 'CA-TOR';
    if (extId.includes('US-CA')) return 'US-CA';
    if (extId.includes('US-NYC')) return 'US-NYC';
    if (extId.includes('US-MI')) return 'US-MI';
    if (extId.includes('US-TX')) return 'US-TX-HQ';

    const origin = `${this.order?.origin || ''} ${this.order?.customer?.shipping_address || ''}`.toLowerCase();
    if (origin.includes('california') || origin.includes('los angeles')) return 'US-CA';
    if (origin.includes('new york')) return 'US-NYC';
    if (origin.includes('michigan') || origin.includes('detroit')) return 'US-MI';
    if (origin.includes('montreal') || origin.includes('quebec')) return 'CA-MTL';
    if (origin.includes('toronto')) return 'CA-TOR';
    if (origin.includes('chihuahua')) return 'MX-CHH';
    if (origin.includes('monterrey')) return 'MX-MTY';
    if (origin.includes('mexico city') || origin.includes('cdmx')) return 'MX-CDMX';
    if (origin.includes('mexico')) return 'MX-FED';
    return 'US-TX-HQ';
  }

  get regionalBadge(): string | null {
    switch (this.resolvedLocationCode) {
      case 'US-TX-HQ':
        return 'TDPSA Verified';
      case 'US-CA':
        return 'CCPA OK';
      case 'US-NYC':
        return 'NY SHIELD OK';
      case 'US-MI':
        return 'ISO 27001 OK';
      case 'CA-MTL':
        return 'Loi 25 · FR';
      case 'CA-TOR':
        return 'PIPEDA OK';
      case 'MX-FED':
      case 'MX-CHH':
      case 'MX-MTY':
      case 'MX-CDMX':
        return 'LFPDPPP OK';
      default:
        return 'ISO 27001 OK';
    }
  }

  isPiiProtected(): boolean {
    if (!this.order) return true;
    if (this.order.pii_encrypted === false) return false;
    if (this.order.pii_encrypted === true) return true;
    // By default in OrderSync, customer PII is encrypted with AES-256-GCM unless marked BREACHED
    return this.order.compliance_status !== 'BREACHED' || Boolean(this.order.encrypted_full_name);
  }

  isMexicoOrder(): boolean {
    return ['MX-CHH', 'MX-MTY', 'MX-CDMX', 'MX-FED'].includes(this.resolvedLocationCode);
  }

  hasCartaPorte(): boolean {
    if (!this.order) return true;
    if (this.order.sat_carta_porte_folio || this.order.carta_porte_folio) return true;
    return this.order.compliance_status !== 'BREACHED';
  }

  isBreached(): boolean {
    return this.order?.compliance_status === 'BREACHED';
  }

  isWarning(): boolean {
    return this.order?.compliance_status === 'WARNING';
  }

  complianceStatusLabel(): string {
    return this.order?.compliance_status || 'COMPLIANT';
  }

  formattedCheckedAt(): string {
    const raw = this.order?.compliance_checked_at;
    if (!raw) return 'Real-time (active)';
    const date = new Date(raw);
    return Number.isNaN(date.getTime())
      ? String(raw)
      : date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
  }
}
