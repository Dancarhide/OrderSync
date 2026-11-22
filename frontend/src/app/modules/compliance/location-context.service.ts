import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export type LocationHealthStatus = 'verde' | 'amarillo' | 'rojo';

export interface AppliedComplianceRule {
  code: string;
  standard_name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  is_mandatory: boolean;
}

export interface ComplianceLocation {
  id: string;
  code: string;
  name: string;
  country: 'US' | 'CA' | 'MX';
  state: string;
  city: string;
  timezone: string;
  is_active: boolean;
  health_status: LocationHealthStatus;
  open_alerts_count: number;
  critical_alerts_count?: number;
  high_alerts_count?: number;
  medium_alerts_count?: number;
  applied_rules?: AppliedComplianceRule[];
  primary_standard_label?: string;
}

const DEFAULT_LOCATIONS: ComplianceLocation[] = [
  { id: 'CA-TOR', code: 'CA-TOR', name: 'Toronto Fulfillment Hub', country: 'CA', state: 'Ontario', city: 'Toronto', timezone: 'America/Toronto', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'Toronto · PIPEDA / ISO 27001' },
  { id: 'CA-MTL', code: 'CA-MTL', name: 'Montreal Logistics Center', country: 'CA', state: 'Quebec', city: 'Montreal', timezone: 'America/Toronto', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'Montreal · Loi 25 / Bill 96' },
  { id: 'US-NYC', code: 'US-NYC', name: 'New York Distribution Hub', country: 'US', state: 'New York', city: 'New York', timezone: 'America/New_York', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'New York · NY SHIELD / ISO 27001' },
  { id: 'US-MI', code: 'US-MI', name: 'Michigan State Hub', country: 'US', state: 'Michigan', city: 'Detroit', timezone: 'America/Detroit', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'Michigan · ISO 27001 / SLA' },
  { id: 'US-TX-HQ', code: 'US-TX-HQ', name: 'Texas - Houston HQ', country: 'US', state: 'Texas', city: 'Houston', timezone: 'America/Chicago', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'Texas HQ · TDPSA / ISO 27001' },
  { id: 'US-CA', code: 'US-CA', name: 'California West Hub', country: 'US', state: 'California', city: 'Los Angeles', timezone: 'America/Los_Angeles', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'California · CCPA / CPRA' },
  { id: 'MX-FED', code: 'MX-FED', name: 'México Federal Hub', country: 'MX', state: 'Federal', city: 'Mexico City', timezone: 'America/Mexico_City', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'México Federal · LFPDPPP / SAT' },
  { id: 'MX-CHH', code: 'MX-CHH', name: 'Chihuahua Border Hub', country: 'MX', state: 'Chihuahua', city: 'Chihuahua', timezone: 'America/Chihuahua', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'Chihuahua · SAT Carta Porte' },
  { id: 'MX-MTY', code: 'MX-MTY', name: 'Monterrey Industrial Hub', country: 'MX', state: 'Nuevo León', city: 'Monterrey', timezone: 'America/Monterrey', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'Monterrey · SAT Carta Porte' },
  { id: 'MX-CDMX', code: 'MX-CDMX', name: 'Mexico City Metro Hub', country: 'MX', state: 'CDMX', city: 'Mexico City', timezone: 'America/Mexico_City', is_active: true, health_status: 'verde', open_alerts_count: 0, primary_standard_label: 'CDMX · SAT Carta Porte / LFPDPPP' }
];

const STANDARD_BADGE_BY_CODE: Record<string, string> = {
  'US-TX-HQ': 'Texas HQ · TDPSA / ISO 27001',
  'US-CA': 'California · CCPA / CPRA',
  'US-NYC': 'New York · NY SHIELD / ISO 27001',
  'US-MI': 'Michigan · ISO 27001 / SLA',
  'CA-MTL': 'Montreal · Loi 25 / Bill 96',
  'CA-TOR': 'Toronto · PIPEDA / ISO 27001',
  'MX-FED': 'México Federal · LFPDPPP / SAT',
  'MX-CHH': 'Chihuahua · SAT Carta Porte',
  'MX-MTY': 'Monterrey · SAT Carta Porte',
  'MX-CDMX': 'CDMX · SAT Carta Porte / LFPDPPP'
};

@Injectable({ providedIn: 'root' })
export class LocationContextService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/compliance`;
  private socket: Socket | null = null;

  readonly locations = signal<ComplianceLocation[]>(DEFAULT_LOCATIONS);
  readonly selectedLocationId = signal<string>('ALL');
  readonly loading = signal<boolean>(false);

  readonly selectedLocation = computed<ComplianceLocation | null>(() => {
    const selectedId = this.selectedLocationId();
    if (!selectedId || selectedId === 'ALL') return null;
    return (
      this.locations().find((loc) => loc.id === selectedId || loc.code === selectedId) || null
    );
  });

  readonly activeStandardBadge = computed<string>(() => {
    const loc = this.selectedLocation();
    if (!loc) {
      return 'All Hubs (10) · ISO 27001';
    }
    if (loc.primary_standard_label) {
      return loc.primary_standard_label;
    }
    if (STANDARD_BADGE_BY_CODE[loc.code]) {
      return STANDARD_BADGE_BY_CODE[loc.code];
    }
    const topRule = loc.applied_rules?.[0]?.standard_name || 'ISO 27001';
    return `${loc.city || loc.name} · ${topRule}`;
  });

  readonly totalOpenAlerts = computed<number>(() =>
    this.locations().reduce((acc, loc) => acc + (loc.open_alerts_count || 0), 0)
  );

  constructor(private http: HttpClient) {
    this.refreshLocations();
    this.connectSocket();
  }

  selectLocation(locationIdOrAll: string): void {
    this.selectedLocationId.set(locationIdOrAll || 'ALL');
  }

  getStandardLabel(loc: ComplianceLocation): string {
    return (
      loc.primary_standard_label ||
      STANDARD_BADGE_BY_CODE[loc.code] ||
      `${loc.city || loc.name} · ${loc.applied_rules?.[0]?.standard_name || 'ISO 27001'}`
    );
  }

  refreshLocations(): void {
    this.loading.set(true);
    this.http.get<ComplianceLocation[]>(`${this.apiUrl}/locations`).subscribe({
      next: (rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          this.locations.set(
            rows.map((loc) => ({
              ...loc,
              primary_standard_label: this.getStandardLabel(loc),
            }))
          );
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private connectSocket(): void {
    if (typeof window === 'undefined' || this.socket) return;

    this.socket = io(environment.apiUrl, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('LOCATION_STATUS_CHANGED', (payload: any) => {
      if (!payload?.locationCode && !payload?.locationId) return;
      this.locations.update((current) =>
        current.map((loc) =>
          loc.id === payload.locationId || loc.code === payload.locationCode
            ? {
                ...loc,
                health_status: payload.healthStatus || loc.health_status,
                open_alerts_count:
                  typeof payload.openAlertsCount === 'number'
                    ? payload.openAlertsCount
                    : loc.open_alerts_count,
              }
            : loc
        )
      );
    });

    this.socket.on('COMPLIANCE_ALERT_TRIGGERED', () => {
      this.refreshLocations();
    });

    this.socket.on('ALERT_RESOLVED', () => {
      this.refreshLocations();
    });
  }
}
