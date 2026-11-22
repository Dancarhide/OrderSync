import { Pool } from 'pg';
import { Server } from 'socket.io';
import { EncryptionService } from './encryption.service';
import { websocketService } from './websocket.service';

export type ComplianceStatus = 'COMPLIANT' | 'BREACHED';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface OrderComplianceInput {
  id?: string;
  externalOrderId?: string;
  // PII fields (plaintext, Buffer, or ENC[...] ciphertext)
  customerName?: string | Buffer;
  fullName?: string | Buffer;
  shippingAddress?: string | Buffer;
  address?: string | Buffer;
  phone?: string | Buffer;
  // Latency timestamps (ms epoch, ISO string, or Date) or precomputed latency
  t1?: number | string | Date;
  t2?: number | string | Date;
  syncLatencyMs?: number;
  // Logistics & Mexico SAT Carta Porte
  requiresLogisticsTransit?: boolean;
  satCartaPorteFolio?: string | null;
  cartaPorteFolio?: string | null;
  // Quebec / Montreal Loi 25 & Bill 96
  notificationTemplates?: {
    fr?: boolean | string;
    en?: boolean | string;
    es?: boolean | string;
  };
  notificationLanguages?: string[];
  frenchTemplateAvailable?: boolean;
  // Optional overrides for encrypted output
  encryptedPii?: {
    fullName?: string;
    shippingAddress?: string;
    phone?: string;
  };
}

export interface ComplianceAlertPayload {
  id?: string;
  orderId: string | null;
  locationId: string;
  locationCode?: string;
  locationName?: string;
  ruleCode: string;
  severity: AlertSeverity;
  message: string;
  isResolved: boolean;
  createdAt: string;
}

export interface ComplianceEvaluationResult {
  status: ComplianceStatus;
  locationId: string;
  latencyMs: number;
  alerts: ComplianceAlertPayload[];
  encryptedPii?: {
    fullName: string;
    shippingAddress: string;
    phone: string;
  };
}

interface LocationRecord {
  id: string;
  code: string;
  name: string;
  country: 'US' | 'CA' | 'MX';
  state: string | null;
  city: string | null;
  timezone: string;
  is_active: boolean;
}

interface LocationRuleRecord {
  code: string;
  standard_name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  requires_encryption: boolean;
  is_mandatory: boolean;
}

export { websocketService };

function toEpochMs(value: number | string | Date | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function isAlreadyEncrypted(value: unknown): boolean {
  if (Buffer.isBuffer(value) && value.length > 32) {
    return true;
  }
  if (typeof value === 'string') {
    return value.startsWith('ENC[') && value.endsWith(']') && value.length > 10;
  }
  return false;
}

function ensureEncryptedField(value: string | Buffer | undefined, fieldLabel: string): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (Buffer.isBuffer(value)) {
    return `ENC[${value.toString('base64')}]`;
  }
  if (isAlreadyEncrypted(value)) {
    return value;
  }
  const encrypted = EncryptionService.encryptString(value);
  if (!encrypted || !isAlreadyEncrypted(encrypted)) {
    throw new Error(`AES-256-GCM encryption failed for field: ${fieldLabel}`);
  }
  return encrypted;
}

export class ComplianceEngineService {
  private static pool: Pool | null = null;

  static init(pool: Pool, io?: Server): void {
    this.pool = pool;
    if (io) {
      websocketService.init(io);
    }
  }

  private static getPool(overridePool?: Pool): Pool {
    const activePool = overridePool || this.pool;
    if (!activePool) {
      throw new Error('ComplianceEngineService is not initialized with a PostgreSQL Pool.');
    }
    return activePool;
  }

  /**
   * Evaluates real-time regulatory & SLA compliance for an order at a given location.
   * Persists alerts in `compliance_alerts`, logs SLA breaches in `security_audit_logs`,
   * emits `COMPLIANCE_ALERT_TRIGGERED` via Socket.IO, and returns 'COMPLIANT' | 'BREACHED'.
   */
  static async evaluateOrderCompliance(
    orderData: OrderComplianceInput,
    locationId: string,
    overridePool?: Pool
  ): Promise<ComplianceStatus> {
    const result = await this.evaluateOrderComplianceDetailed(orderData, locationId, overridePool);
    return result.status;
  }

  static async evaluateOrderComplianceDetailed(
    orderData: OrderComplianceInput,
    locationId: string,
    overridePool?: Pool
  ): Promise<ComplianceEvaluationResult> {
    const pool = this.getPool(overridePool);
    const pendingAlerts: Array<{
      ruleCode: string;
      severity: AlertSeverity;
      message: string;
    }> = [];

    // 1. Fetch location & applicable compliance rules
    const locationRes = await pool.query<LocationRecord>(
      `SELECT id, code, name, country, state, city, timezone, is_active
       FROM locations
       WHERE id = $1`,
      [locationId]
    );

    if (locationRes.rows.length === 0) {
      throw new Error(`Location not found: ${locationId}`);
    }

    const location = locationRes.rows[0];

    const rulesRes = await pool.query<LocationRuleRecord>(
      `SELECT cr.code, cr.standard_name, cr.severity, cr.requires_encryption, lcr.is_mandatory
       FROM location_compliance_rules lcr
       INNER JOIN compliance_rules cr ON cr.id = lcr.rule_id
       WHERE lcr.location_id = $1`,
      [locationId]
    );

    const rules = rulesRes.rows;
    const ruleCodes = new Set(rules.map((r) => r.code.toUpperCase()));

    // 2. RULE: ISO-27001 & US/CA/MX Privacy Laws (AES-256 PII Encryption)
    let encryptedPii: { fullName: string; shippingAddress: string; phone: string } | undefined;
    try {
      const rawName = orderData.fullName ?? orderData.customerName;
      const rawAddress = orderData.shippingAddress ?? orderData.address;
      const rawPhone = orderData.phone;

      const encryptedName = ensureEncryptedField(rawName, 'fullName');
      const encryptedAddress = ensureEncryptedField(rawAddress, 'shippingAddress');
      const encryptedPhone = ensureEncryptedField(rawPhone, 'phone');

      // Mutate orderData.encryptedPii so caller can persist ciphertext directly in PostgreSQL
      encryptedPii = {
        fullName: encryptedName,
        shippingAddress: encryptedAddress,
        phone: encryptedPhone,
      };
      orderData.encryptedPii = encryptedPii;
    } catch (err: any) {
      pendingAlerts.push({
        ruleCode: ruleCodes.has('ISO-27001') ? 'ISO-27001' : 'ISO-27001-PII',
        severity: 'CRITICAL',
        message: `PII AES-256 encryption failure at ${location.name} (${location.code}): ${err?.message || 'Unknown encryption error'}`
      });
    }

    // 3. RULE: SLA Latency (< 5000ms) -> Calculate (T2 - T1)
    const t1Ms = toEpochMs(orderData.t1);
    const t2Ms = toEpochMs(orderData.t2) ?? Date.now();
    const latencyMs =
      typeof orderData.syncLatencyMs === 'number' && Number.isFinite(orderData.syncLatencyMs)
        ? orderData.syncLatencyMs
        : t1Ms !== null
          ? Math.max(0, t2Ms - t1Ms)
          : 0;

    if (latencyMs >= 5000) {
      pendingAlerts.push({
        ruleCode: ruleCodes.has('SLA-LATENCY-5S') ? 'SLA-LATENCY-5S' : 'SLA-LATENCY',
        severity: 'CRITICAL',
        message: `SLA latency breach at ${location.name} (${location.code}): ${latencyMs}ms >= 5000ms threshold.`
      });

      await pool.query(
        `INSERT INTO security_audit_logs (event_type, actor_email, resource_type, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'SLA_LATENCY_BREACH',
          'compliance-engine@ordersync.app',
          'ORDER',
          JSON.stringify({
            orderId: orderData.id || null,
            externalOrderId: orderData.externalOrderId || null,
            locationId: location.id,
            locationCode: location.code,
            latencyMs,
            thresholdMs: 5000
          })
        ]
      );
    }

    // 4. RULE: MEXICO (Chihuahua / Monterrey / CDMX / México Federal) -> SAT Carta Porte
    const isMexicoTransitLocation =
      location.country === 'MX' ||
      ['MX-CHH', 'MX-MTY', 'MX-CDMX', 'MX-FED'].includes(location.code.toUpperCase());

    if (isMexicoTransitLocation) {
      const requiresTransit = orderData.requiresLogisticsTransit !== false;
      const cartaPorte = (orderData.satCartaPorteFolio ?? orderData.cartaPorteFolio ?? '').trim();

      if (requiresTransit && !cartaPorte) {
        pendingAlerts.push({
          ruleCode: 'SAT-CARTA-PORTE',
          severity: 'HIGH',
          message: `Missing mandatory SAT / Carta Porte folio for logistics transit order at ${location.name} (${location.code}).`
        });
      }
    }

    // 5. RULE: QUEBEC / MONTREAL (Loi 25 / Bill 96) -> French customer notification templates
    const isQuebecLocation =
      location.code.toUpperCase() === 'CA-MTL' ||
      (location.state ?? '').toLowerCase().includes('quebec') ||
      (location.city ?? '').toLowerCase().includes('montreal');

    if (isQuebecLocation) {
      const hasFrenchInArray = Array.isArray(orderData.notificationLanguages)
        ? orderData.notificationLanguages.some((lang) => lang.toLowerCase().startsWith('fr'))
        : false;
      const hasFrenchTemplateObj = Boolean(orderData.notificationTemplates?.fr);
      const hasFrenchFlag = orderData.frenchTemplateAvailable === true;

      if (!hasFrenchInArray && !hasFrenchTemplateObj && !hasFrenchFlag) {
        pendingAlerts.push({
          ruleCode: ruleCodes.has('LOI-25') ? 'LOI-25' : 'LOI-25-BILL-96',
          severity: 'HIGH',
          message: `Quebec Loi 25 / Bill 96 non-compliance at ${location.name} (${location.code}): customer notification templates are not available in French.`
        });
      }
    }

    // 6. Persist alerts & emit WebSocket events if non-compliance detected
    const emittedAlerts: ComplianceAlertPayload[] = [];
    const status: ComplianceStatus = pendingAlerts.length > 0 ? 'BREACHED' : 'COMPLIANT';

    for (const alert of pendingAlerts) {
      const insertRes = await pool.query<{ id: string; created_at: Date }>(
        `INSERT INTO compliance_alerts (order_id, location_id, rule_code, severity, message, is_resolved)
         VALUES ($1, $2, $3, $4, $5, FALSE)
         RETURNING id, created_at`,
        [orderData.id || null, location.id, alert.ruleCode, alert.severity, alert.message]
      );

      const inserted = insertRes.rows[0];
      const payload: ComplianceAlertPayload = {
        id: inserted.id,
        orderId: orderData.id || null,
        locationId: location.id,
        locationCode: location.code,
        locationName: location.name,
        ruleCode: alert.ruleCode,
        severity: alert.severity,
        message: alert.message,
        isResolved: false,
        createdAt: inserted.created_at.toISOString()
      };

      emittedAlerts.push(payload);
      websocketService.emitComplianceAlert({
        alertId: inserted.id,
        locationId: location.id,
        locationCode: location.code,
        locationName: location.name,
        ruleCode: alert.ruleCode,
        severity: alert.severity,
        message: alert.message,
        timestamp: inserted.created_at.toISOString(),
        orderId: orderData.id || null,
      });
    }

    // 7. Update order compliance status if order ID is already persisted
    if (orderData.id) {
      await pool.query(
        `UPDATE orders
         SET origin_location_id = COALESCE(origin_location_id, $2),
             compliance_status = $3,
             compliance_checked_at = NOW()
         WHERE id = $1`,
        [orderData.id, location.id, status]
      );
    }

    return {
      status,
      locationId: location.id,
      latencyMs,
      alerts: emittedAlerts,
      encryptedPii
    };
  }
}

export async function evaluateOrderCompliance(
  orderData: OrderComplianceInput,
  locationId: string,
  pool?: Pool
): Promise<ComplianceStatus> {
  return ComplianceEngineService.evaluateOrderCompliance(orderData, locationId, pool);
}
