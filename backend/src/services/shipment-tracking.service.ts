import { Pool } from 'pg';
import { EncryptionService } from './encryption.service';
import { Server } from 'socket.io';

export interface GeoPoint {
  code: string;
  name: string;
  city: string;
  country: 'US' | 'CA' | 'MX';
  lat: number;
  lng: number;
}

export interface TrackingMilestone {
  step: number;
  code: string;
  title: string;
  facility: string;
  city: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  timestamp: string | null;
  scanCode: string;
  complianceNote?: string;
}

export interface LiveTrackingTelemetry {
  source: 'SHIPPO_LIVE' | 'GPS_PING' | 'SIMULATION';
  shipmentId: string;
  orderId: string | null;
  externalOrderId: string;
  trackingNumber: string;
  carrier: string;
  serviceLevel: string;
  vehicleId: string;
  driverName: string;
  currentStep: string;
  progressPercent: number;
  isDelivered: boolean;
  origin: GeoPoint;
  waypoints: GeoPoint[];
  destination: GeoPoint;
  currentPosition: {
    lat: number;
    lng: number;
    speedKmh: number;
    headingDeg: number;
  };
  remainingDistanceKm: number;
  totalDistanceKm: number;
  etaIso: string;
  etaLabel: string;
  compliance: {
    piiEncrypted: boolean;
    locationCode: string;
    satCartaPorteFolio: string | null;
    customsCleared: boolean;
  };
  milestones: TrackingMilestone[];
  updatedAt: string;
}

export const HUB_COORDINATES: Record<string, GeoPoint> = {
  'US-TX-HQ': { code: 'US-TX-HQ', name: 'Houston Fulfillment HQ', city: 'Houston, TX', country: 'US', lat: 29.7604, lng: -95.3698 },
  'US-NYC':   { code: 'US-NYC',   name: 'New York Distribution Hub', city: 'New York, NY', country: 'US', lat: 40.7128, lng: -74.0060 },
  'US-MI':    { code: 'US-MI',    name: 'Michigan State Hub', city: 'Detroit, MI', country: 'US', lat: 42.3314, lng: -83.0458 },
  'US-CA':    { code: 'US-CA',    name: 'California West Hub', city: 'Los Angeles, CA', country: 'US', lat: 34.0522, lng: -118.2437 },
  'CA-TOR':   { code: 'CA-TOR',   name: 'Toronto Fulfillment Hub', city: 'Toronto, ON', country: 'CA', lat: 43.6532, lng: -79.3832 },
  'CA-MTL':   { code: 'CA-MTL',   name: 'Montreal Logistics Center', city: 'Montreal, QC', country: 'CA', lat: 45.5017, lng: -73.5673 },
  'MX-FED':   { code: 'MX-FED',   name: 'Querétaro National Hub', city: 'Querétaro, QRO', country: 'MX', lat: 20.5888, lng: -100.3899 },
  'MX-CHH':   { code: 'MX-CHH',   name: 'Chihuahua Border Hub', city: 'Chihuahua, CHH', country: 'MX', lat: 28.6330, lng: -106.0691 },
  'MX-MTY':   { code: 'MX-MTY',   name: 'Monterrey Industrial Hub', city: 'Monterrey, NL', country: 'MX', lat: 25.6866, lng: -100.3161 },
  'MX-CDMX':  { code: 'MX-CDMX',  name: 'Mexico City Metro Hub', city: 'CDMX, MX', country: 'MX', lat: 19.4326, lng: -99.1332 },
};

const REALISTIC_CORRIDORS: Array<{ from: string; to: string }> = [
  { from: 'US-TX-HQ', to: 'MX-MTY' },
  { from: 'CA-TOR',   to: 'CA-MTL' },
  { from: 'US-CA',    to: 'MX-CHH' },
  { from: 'US-MI',    to: 'CA-TOR' },
  { from: 'US-NYC',   to: 'US-TX-HQ' },
  { from: 'MX-MTY',   to: 'MX-CDMX' },
  { from: 'CA-MTL',   to: 'US-NYC' },
  { from: 'US-TX-HQ', to: 'US-CA' },
  { from: 'MX-CHH',   to: 'MX-FED' },
  { from: 'MX-FED',   to: 'MX-CDMX' },
];

// In-memory simulation progress & real GPS ping store keyed by shipmentId
const liveProgressStore = new Map<string, number>();
const liveGpsStore = new Map<
  string,
  { lat: number; lng: number; speedKmh: number; headingDeg: number; facility?: string; scanCode?: string; updatedAt: string }
>();

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function interpolateAlongPath(points: GeoPoint[], ratio: number): { lat: number; lng: number; headingDeg: number } {
  if (points.length === 0) return { lat: 29.7604, lng: -95.3698, headingDeg: 180 };
  if (points.length === 1 || ratio <= 0) {
    const next = points[1] || points[0];
    const heading = Math.round((Math.atan2(next.lng - points[0].lng, next.lat - points[0].lat) * 180) / Math.PI);
    return { lat: points[0].lat, lng: points[0].lng, headingDeg: heading };
  }
  if (ratio >= 1) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2] || last;
    const heading = Math.round((Math.atan2(last.lng - prev.lng, last.lat - prev.lat) * 180) / Math.PI);
    return { lat: last.lat, lng: last.lng, headingDeg: heading };
  }

  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.max(1, haversineKm(points[i], points[i + 1]));
    segLengths.push(d);
    totalLen += d;
  }

  const targetDist = totalLen * ratio;
  let accumulated = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (accumulated + segLen >= targetDist || i === segLengths.length - 1) {
      const localRatio = Math.max(0, Math.min(1, (targetDist - accumulated) / segLen));
      const a = points[i];
      const b = points[i + 1];
      const lat = Number((a.lat + (b.lat - a.lat) * localRatio).toFixed(4));
      const lng = Number((a.lng + (b.lng - a.lng) * localRatio).toFixed(4));
      const headingDeg = Math.round((Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI);
      return { lat, lng, headingDeg };
    }
    accumulated += segLen;
  }

  const last = points[points.length - 1];
  return { lat: last.lat, lng: last.lng, headingDeg: 180 };
}

export function inferHubFromText(text: string | null | undefined, fallbackCode: string): GeoPoint {
  const upper = (text || '').toUpperCase();
  for (const code of Object.keys(HUB_COORDINATES)) {
    if (upper.includes(code)) return HUB_COORDINATES[code];
  }
  const raw = (text || '').toLowerCase();
  if (raw.includes('montreal') || raw.includes('quebec') || raw.includes('qc')) return HUB_COORDINATES['CA-MTL'];
  if (raw.includes('toronto') || raw.includes('ontario')) return HUB_COORDINATES['CA-TOR'];
  if (raw.includes('new york') || raw.includes('nyc') || raw.includes('manhattan')) return HUB_COORDINATES['US-NYC'];
  if (raw.includes('michigan') || raw.includes('detroit')) return HUB_COORDINATES['US-MI'];
  if (raw.includes('california') || raw.includes('los angeles') || raw.includes('san diego')) return HUB_COORDINATES['US-CA'];
  if (raw.includes('chihuahua')) return HUB_COORDINATES['MX-CHH'];
  if (raw.includes('monterrey') || raw.includes('nuevo leon') || raw.includes('nuevo león') || raw.includes('san pedro')) return HUB_COORDINATES['MX-MTY'];
  if (raw.includes('queretaro') || raw.includes('querétaro') || raw.includes('zapopan') || raw.includes('guadalajara') || raw.includes('puebla')) return HUB_COORDINATES['MX-FED'];
  if (raw.includes('cdmx') || raw.includes('mexico city') || raw.includes('ciudad de méxico') || raw.includes('insurgentes') || raw.includes('reforma')) return HUB_COORDINATES['MX-CDMX'];
  if (raw.includes('houston') || raw.includes('richmond') || raw.includes('texas') || raw.includes('dallas') || raw.includes('austin')) return HUB_COORDINATES['US-TX-HQ'];
  return HUB_COORDINATES[fallbackCode] || HUB_COORDINATES['US-TX-HQ'];
}

function defaultProgressForStep(step: string): number {
  switch (step) {
    case 'delivered':
      return 100;
    case 'out_for_delivery':
      return 82;
    case 'in_transit':
      return 48;
    default:
      return 15;
  }
}

function stepFromProgress(progress: number): { step: string; isDelivered: boolean; label: string } {
  if (progress >= 100) return { step: 'delivered', isDelivered: true, label: 'Delivered with Digital POD' };
  if (progress >= 75) return { step: 'out_for_delivery', isDelivered: false, label: 'Out for Last-Mile Delivery' };
  if (progress >= 30) return { step: 'in_transit', isDelivered: false, label: 'In Interstate / Regional Hub Transit' };
  return { step: 'processing', isDelivered: false, label: 'Packaging & Scan at Origin Hub' };
}

export class ShipmentTrackingService {
  private static pool: Pool | null = null;
  private static io: Server | null = null;

  static init(pool: Pool, io: Server): void {
    this.pool = pool;
    this.io = io;
  }

  static async getTrackingTelemetry(shipmentId: string): Promise<LiveTrackingTelemetry | null> {
    if (!this.pool) throw new Error('ShipmentTrackingService not initialized');

    const res = await this.pool.query(
      `SELECT s.*, o.external_order_id, o.compliance_status
       FROM shipments s
       LEFT JOIN orders o ON o.id = s.order_id
       WHERE s.id = $1`,
      [shipmentId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    // Attempt real Shippo Tracking API lookup when SHIPPO_API_KEY is configured
    const decryptedTracking = EncryptionService.decryptString(row.tracking_number);
    const shippoCarrier = this.mapCarrierToShippoToken(row.carrier, decryptedTracking);
    if (process.env.SHIPPO_API_KEY && decryptedTracking && shippoCarrier) {
      const shippoTelemetry = await this.fetchShippoTracking(shippoCarrier, decryptedTracking, row);
      if (shippoTelemetry) {
        return shippoTelemetry;
      }
    }

    return this.buildTelemetryFromRow(row);
  }

  private static mapCarrierToShippoToken(carrier?: string | null, trackingNumber?: string | null): string | null {
    if (trackingNumber && trackingNumber.toUpperCase().startsWith('SHIPPO_')) {
      return 'shippo';
    }
    const c = (carrier || '').toLowerCase();
    if (c.includes('fedex')) return 'fedex';
    if (c.includes('ups')) return 'ups';
    if (c.includes('dhl')) return 'dhl_express';
    if (c.includes('usps')) return 'usps';
    if (c.includes('estafeta')) return 'estafeta';
    if (c.includes('shippo')) return 'shippo';
    return null;
  }

  static async fetchShippoTracking(
    carrier: string,
    trackingNumber: string,
    dbRow?: any
  ): Promise<LiveTrackingTelemetry | null> {
    const apiKey = process.env.SHIPPO_API_KEY;
    if (!apiKey) return null;

    try {
      const url = `https://api.goshippo.com/tracks/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `ShippoToken ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();
      const statusCode: string = (data?.tracking_status?.status || 'UNKNOWN').toUpperCase();
      const isDelivered = statusCode === 'DELIVERED';
      const progressPercent =
        statusCode === 'DELIVERED'
          ? 100
          : statusCode === 'TRANSIT'
            ? 55
            : statusCode === 'PRE_TRANSIT'
              ? 15
              : statusCode === 'FAILURE' || statusCode === 'RETURNED'
                ? 70
                : 35;

      const originCity = data?.address_from?.city
        ? `${data.address_from.city}, ${data.address_from.state || data.address_from.country || ''}`
        : dbRow?.origin || 'Houston, TX';
      const destCity = data?.address_to?.city
        ? `${data.address_to.city}, ${data.address_to.state || data.address_to.country || ''}`
        : EncryptionService.decryptString(dbRow?.destination) || 'Monterrey, NL';

      const origin = inferHubFromText(originCity, 'US-TX-HQ');
      const destination = inferHubFromText(destCity, 'MX-MTY');
      const ratio = progressPercent / 100;

      const totalDistanceKm = Math.max(12, Math.round(haversineKm(origin, destination)));
      const remainingDistanceKm = Math.max(0, Math.round(totalDistanceKm * (1 - ratio)));
      const speedKmh = isDelivered ? 0 : 82;

      const history: any[] = Array.isArray(data?.tracking_history) ? data.tracking_history : [];
      const milestones: TrackingMilestone[] = history.length > 0
        ? history.map((evt, idx) => ({
            step: idx + 1,
            code: (evt.status || 'EVENT').toUpperCase(),
            title: evt.status_details || evt.status || 'Actualización de paquetería',
            facility: evt.location?.city
              ? `${evt.location.city}${evt.location.state ? ', ' + evt.location.state : ''}`
              : origin.name,
            city: evt.location?.country || origin.country,
            status: idx === history.length - 1 && !isDelivered ? 'IN_PROGRESS' : 'COMPLETED',
            timestamp: evt.status_date || new Date().toISOString(),
            scanCode: `SHP-${String(idx + 1).padStart(2, '0')}`,
            complianceNote: idx === 0 ? 'PII cifrada con AES-256-GCM' : undefined,
          }))
        : this.buildTelemetryFromRow(
            dbRow || { id: trackingNumber, current_step: isDelivered ? 'delivered' : 'in_transit' },
            progressPercent
          ).milestones;

      const etaIso = data?.eta || new Date(Date.now() + 3600 * 1000 * 6).toISOString();

      return {
        source: 'SHIPPO_LIVE',
        shipmentId: dbRow?.id || trackingNumber,
        orderId: dbRow?.order_id || null,
        externalOrderId: dbRow?.external_order_id || trackingNumber,
        trackingNumber,
        carrier: String(data?.carrier || carrier).toUpperCase(),
        serviceLevel: data?.servicelevel?.name || 'Shippo Tracked Service',
        vehicleId: `SHIPPO-${String(carrier).toUpperCase()}`,
        driverName: 'Red Oficial Transportista',
        currentStep: isDelivered ? 'delivered' : statusCode === 'PRE_TRANSIT' ? 'processing' : 'in_transit',
        progressPercent,
        isDelivered,
        origin,
        waypoints: origin.country !== destination.country ? [HUB_COORDINATES['MX-CHH']] : [],
        destination,
        currentPosition: {
          lat: Number((origin.lat + (destination.lat - origin.lat) * ratio).toFixed(4)),
          lng: Number((origin.lng + (destination.lng - origin.lng) * ratio).toFixed(4)),
          speedKmh,
          headingDeg: Math.round(
            (Math.atan2(destination.lng - origin.lng, destination.lat - origin.lat) * 180) / Math.PI
          ),
        },
        remainingDistanceKm,
        totalDistanceKm,
        etaIso,
        etaLabel: isDelivered ? 'Entregado (Confirmado por Shippo)' : `Estatus Shippo: ${statusCode}`,
        compliance: {
          piiEncrypted: true,
          locationCode: origin.code,
          satCartaPorteFolio: origin.country === 'MX' || destination.country === 'MX' ? `CP-SAT-${trackingNumber.slice(-6).toUpperCase()}` : null,
          customsCleared: progressPercent >= 45,
        },
        milestones,
        updatedAt: data?.tracking_status?.status_date || new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[ShipmentTrackingService] Shippo API fallback triggered:', err);
      return null;
    }
  }

  static async ingestGpsPing(
    shipmentId: string,
    ping: {
      lat: number;
      lng: number;
      speedKmh?: number;
      headingDeg?: number;
      currentStep?: 'processing' | 'in_transit' | 'out_for_delivery' | 'delivered';
      facility?: string;
      scanCode?: string;
    }
  ): Promise<LiveTrackingTelemetry | null> {
    if (!this.pool) throw new Error('ShipmentTrackingService not initialized');

    const res = await this.pool.query(
      `SELECT s.*, o.external_order_id, o.compliance_status
       FROM shipments s
       LEFT JOIN orders o ON o.id = s.order_id
       WHERE s.id = $1`,
      [shipmentId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    liveGpsStore.set(shipmentId, {
      lat: Number(ping.lat),
      lng: Number(ping.lng),
      speedKmh: typeof ping.speedKmh === 'number' ? ping.speedKmh : 65,
      headingDeg: typeof ping.headingDeg === 'number' ? ping.headingDeg : 180,
      facility: ping.facility,
      scanCode: ping.scanCode,
      updatedAt: new Date().toISOString(),
    });

    if (ping.currentStep) {
      const isDelivered = ping.currentStep === 'delivered';
      await this.pool.query(
        `UPDATE shipments
         SET current_step = $1,
             is_delivered = $2,
             current_lat = $3,
             current_lng = $4,
             speed_kmh = $5,
             delivered_at = CASE WHEN $2 = true THEN COALESCE(delivered_at, CURRENT_TIMESTAMP) ELSE delivered_at END
         WHERE id = $6`,
        [ping.currentStep, isDelivered, Number(ping.lat), Number(ping.lng), typeof ping.speedKmh === 'number' ? ping.speedKmh : 65, shipmentId]
      );
      row.current_step = ping.currentStep;
      row.is_delivered = isDelivered;
    } else {
      await this.pool.query(
        `UPDATE shipments SET current_lat = $1, current_lng = $2, speed_kmh = $3 WHERE id = $4`,
        [Number(ping.lat), Number(ping.lng), typeof ping.speedKmh === 'number' ? ping.speedKmh : 65, shipmentId]
      );
    }

    const telemetry = this.buildTelemetryFromRow(row);
    if (this.io) {
      this.io.emit('SHIPMENT_LOCATION_UPDATED', telemetry);
    }
    return telemetry;
  }

  static async simulateTrackingTick(shipmentId: string, stepIncrement = 18): Promise<LiveTrackingTelemetry | null> {
    if (!this.pool) throw new Error('ShipmentTrackingService not initialized');

    const res = await this.pool.query(
      `SELECT s.*, o.external_order_id, o.compliance_status
       FROM shipments s
       LEFT JOIN orders o ON o.id = s.order_id
       WHERE s.id = $1`,
      [shipmentId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    // Delivered shipments are permanently locked and cannot be reset
    if (row.is_delivered || row.current_step === 'delivered') {
      liveProgressStore.set(shipmentId, 100);
      return this.buildTelemetryFromRow(row, 100);
    }

    const currentProgress =
      liveProgressStore.get(shipmentId) ?? defaultProgressForStep(row.current_step);
    const nextProgress = Math.min(100, currentProgress + stepIncrement);
    liveProgressStore.set(shipmentId, nextProgress);

    const { step, isDelivered, label } = stepFromProgress(nextProgress);

    const stepOrder = ['processing', 'in_transit', 'out_for_delivery', 'delivered'];
    const targetIdx = stepOrder.indexOf(step);
    const titles: Record<string, string> = {
      processing: 'Orden Procesada y Empacada',
      in_transit: 'Despachado y en Tránsito',
      out_for_delivery: 'En Unidad de Reparto Local',
      delivered: '¡Ya llegó! Entregado y Confirmado',
    };
    const checkpoints = stepOrder.map((stepKey, idx) => ({
      step: stepKey,
      title: titles[stepKey],
      timestamp: idx <= targetIdx ? (idx === targetIdx ? 'Recién actualizado' : 'Completado') : 'Pendiente',
      done: idx <= targetIdx,
    }));

    await this.pool.query(
      `UPDATE shipments
       SET current_step = $1,
           is_delivered = $2,
           estimated_delivery = $3,
           checkpoints = $4,
           delivered_at = CASE WHEN $2 = true THEN COALESCE(delivered_at, CURRENT_TIMESTAMP) ELSE NULL END
       WHERE id = $5`,
      [step, isDelivered, label, JSON.stringify(checkpoints), shipmentId]
    );

    row.current_step = step;
    row.is_delivered = isDelivered;
    row.estimated_delivery = label;

    const telemetry = this.buildTelemetryFromRow(row, nextProgress);

    await this.pool.query(
      `UPDATE shipments SET current_lat = $1, current_lng = $2, speed_kmh = $3 WHERE id = $4`,
      [telemetry.currentPosition.lat, telemetry.currentPosition.lng, telemetry.currentPosition.speedKmh, shipmentId]
    );

    if (this.io) {
      this.io.emit('SHIPMENT_LOCATION_UPDATED', telemetry);
    }

    return telemetry;
  }

  private static buildTelemetryFromRow(row: any, overrideProgress?: number): LiveTrackingTelemetry {
    const decryptedDestination = EncryptionService.decryptString(row.destination) || 'Monterrey, NL';
    const decryptedTracking = EncryptionService.decryptString(row.tracking_number) || `OS-${String(row.id).slice(0, 8).toUpperCase()}`;

    // Deterministically assign a diverse 10-hub corridor when origin/destination aren't distinct hubs
    const hashNum = String(row.id || '')
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const fallbackCorridor = REALISTIC_CORRIDORS[hashNum % REALISTIC_CORRIDORS.length];

    let origin = inferHubFromText(row.origin, fallbackCorridor.from);
    let destination = inferHubFromText(decryptedDestination, fallbackCorridor.to);
    if (origin.code === destination.code) {
      origin = HUB_COORDINATES[fallbackCorridor.from];
      destination = HUB_COORDINATES[fallbackCorridor.to];
    }

    // Intermediate waypoint (Border / Customs hub for cross-border or long-haul routes)
    const waypoints: GeoPoint[] = [];
    if (origin.country !== destination.country) {
      const borderHub =
        origin.country === 'MX' || destination.country === 'MX'
          ? HUB_COORDINATES['MX-CHH']
          : HUB_COORDINATES['US-MI'];
      if (borderHub.code !== origin.code && borderHub.code !== destination.code) {
        waypoints.push(borderHub);
      }
    } else if (origin.country === 'MX' && origin.code !== 'MX-FED' && destination.code !== 'MX-FED') {
      waypoints.push(HUB_COORDINATES['MX-FED']);
    }

    const progressPercent = row.is_delivered
      ? 100
      : (overrideProgress ??
        liveProgressStore.get(row.id) ??
        defaultProgressForStep(row.current_step));
    liveProgressStore.set(row.id, progressPercent);

    const gpsOverride = liveGpsStore.get(row.id);

    // Piecewise interpolation along [origin, ...waypoints, destination] so vehicle follows the exact corridor
    const ratio = Math.max(0, Math.min(1, progressPercent / 100));
    const pathPoints: GeoPoint[] = [origin, ...waypoints, destination];
    const interp = interpolateAlongPath(pathPoints, ratio);
    const currentLat = gpsOverride ? Number(gpsOverride.lat.toFixed(4)) : interp.lat;
    const currentLng = gpsOverride ? Number(gpsOverride.lng.toFixed(4)) : interp.lng;

    let totalDistanceKm = 0;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      totalDistanceKm += haversineKm(pathPoints[i], pathPoints[i + 1]);
    }
    totalDistanceKm = Math.max(12, Math.round(totalDistanceKm));
    const remainingDistanceKm = gpsOverride
      ? Math.max(0, Math.round(haversineKm({ lat: currentLat, lng: currentLng }, destination)))
      : Math.max(0, Math.round(totalDistanceKm * (1 - ratio)));
    const speedKmh = gpsOverride
      ? gpsOverride.speedKmh
      : progressPercent >= 100
        ? 0
        : progressPercent >= 75
          ? 42
          : 88;

    const etaMinutes = speedKmh > 0 ? Math.round((remainingDistanceKm / speedKmh) * 60) : 0;
    const etaDate = new Date(Date.now() + etaMinutes * 60 * 1000);
    const etaLabel =
      progressPercent >= 100
        ? 'Delivered'
        : etaMinutes < 60
          ? `${etaMinutes}m remaining`
          : `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m remaining`;

    const isMexico = origin.country === 'MX' || destination.country === 'MX';
    const satCartaPorteFolio = isMexico
      ? `CP-SAT-${String(row.id).slice(0, 6).toUpperCase()}`
      : null;

    const now = new Date();
    const milestones: TrackingMilestone[] = [
      {
        step: 1,
        code: 'ORDER_CONFIRMED',
        title: 'ISO-27001 Packaging & Sealing',
        facility: origin.name,
        city: origin.city,
        status: progressPercent >= 10 ? 'COMPLETED' : 'IN_PROGRESS',
        timestamp: new Date(now.getTime() - 1000 * 60 * 180).toISOString(),
        scanCode: `PKG-${decryptedTracking.slice(-5)}`,
        complianceNote: 'AES-256-GCM Encrypted PII',
      },
      {
        step: 2,
        code: 'CARRIER_PICKUP',
        title: 'Carrier Pickup & Manifest Scan',
        facility: origin.name,
        city: origin.city,
        status: progressPercent >= 25 ? 'COMPLETED' : progressPercent >= 10 ? 'IN_PROGRESS' : 'PENDING',
        timestamp: progressPercent >= 25 ? new Date(now.getTime() - 1000 * 60 * 140).toISOString() : null,
        scanCode: `PKP-${decryptedTracking.slice(-5)}`,
      },
      {
        step: 3,
        code: 'REGIONAL_HUB_TRANSIT',
        title: isMexico ? 'Interstate Transit / SAT Validation' : 'Interstate Transit / Customs Clearance',
        facility: waypoints[0]?.name || 'North America Logistics Corridor',
        city: waypoints[0]?.city || 'In Transit',
        status: progressPercent >= 60 ? 'COMPLETED' : progressPercent >= 25 ? 'IN_PROGRESS' : 'PENDING',
        timestamp: progressPercent >= 60 ? new Date(now.getTime() - 1000 * 60 * 75).toISOString() : null,
        scanCode: `HUB-${decryptedTracking.slice(-5)}`,
        complianceNote: satCartaPorteFolio ? `Carta Porte ${satCartaPorteFolio}` : 'USMCA Customs Cleared',
      },
      {
        step: 4,
        code: 'DESTINATION_FACILITY',
        title: 'Destination Distribution Hub',
        facility: destination.name,
        city: destination.city,
        status: progressPercent >= 75 ? 'COMPLETED' : progressPercent >= 60 ? 'IN_PROGRESS' : 'PENDING',
        timestamp: progressPercent >= 75 ? new Date(now.getTime() - 1000 * 60 * 35).toISOString() : null,
        scanCode: `DST-${decryptedTracking.slice(-5)}`,
      },
      {
        step: 5,
        code: 'OUT_FOR_DELIVERY',
        title: 'Out for Last-Mile Delivery',
        facility: `Local Fleet · ${destination.city}`,
        city: destination.city,
        status: progressPercent >= 100 ? 'COMPLETED' : progressPercent >= 75 ? 'IN_PROGRESS' : 'PENDING',
        timestamp: progressPercent >= 75 ? new Date(now.getTime() - 1000 * 60 * 15).toISOString() : null,
        scanCode: `VAN-${decryptedTracking.slice(-4)}`,
      },
      {
        step: 6,
        code: 'DELIVERED',
        title: 'Delivery Confirmed (Digital POD)',
        facility: decryptedDestination,
        city: destination.city,
        status: progressPercent >= 100 ? 'COMPLETED' : 'PENDING',
        timestamp: progressPercent >= 100 ? now.toISOString() : null,
        scanCode: `POD-${decryptedTracking.slice(-5)}`,
      },
    ];

    return {
      source: gpsOverride ? 'GPS_PING' : 'SIMULATION',
      shipmentId: row.id,
      orderId: row.order_id || null,
      externalOrderId: row.external_order_id || `ORD-${String(row.id).slice(0, 6).toUpperCase()}`,
      trackingNumber: decryptedTracking,
      carrier: row.carrier || 'OrderSync Express',
      serviceLevel: 'Priority Air/Ground',
      vehicleId: `OS-UNIT-${String(row.id).slice(0, 4).toUpperCase()}`,
      driverName: isMexico ? 'Carlos Mendoza' : 'Alex Rivera',
      currentStep: row.current_step,
      progressPercent,
      isDelivered: progressPercent >= 100,
      origin,
      waypoints,
      destination,
      currentPosition: {
        lat: currentLat,
        lng: currentLng,
        speedKmh,
        headingDeg: Math.round(
          (Math.atan2(destination.lng - origin.lng, destination.lat - origin.lat) * 180) / Math.PI
        ),
      },
      remainingDistanceKm,
      totalDistanceKm,
      etaIso: etaDate.toISOString(),
      etaLabel,
      compliance: {
        piiEncrypted: true,
        locationCode: origin.code,
        satCartaPorteFolio,
        customsCleared: progressPercent >= 45,
      },
      milestones,
      updatedAt: now.toISOString(),
    };
  }
}
