import { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { websocketService } from '../services/websocket.service';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export type HealthStatus = 'verde' | 'amarillo' | 'rojo';

function computeHealthStatus(openAlertsCount: number, criticalAlertsCount: number): HealthStatus {
  if (criticalAlertsCount > 0) return 'rojo';
  if (openAlertsCount > 0) return 'amarillo';
  return 'verde';
}

/**
 * GET /api/v1/compliance/locations
 * Returns all configured locations with their compliance health status (verde/amarillo/rojo)
 * and open alert counts.
 */
export async function getComplianceLocations(_req: Request, res: Response): Promise<void> {
  try {
    const query = `
      SELECT
        l.id,
        l.code,
        l.name,
        l.country,
        l.state,
        l.city,
        l.timezone,
        l.is_active,
        l.created_at,
        COALESCE(COUNT(ca.id) FILTER (WHERE ca.is_resolved = FALSE), 0)::INT AS open_alerts_count,
        COALESCE(COUNT(ca.id) FILTER (WHERE ca.is_resolved = FALSE AND ca.severity = 'CRITICAL'), 0)::INT AS critical_alerts_count,
        COALESCE(COUNT(ca.id) FILTER (WHERE ca.is_resolved = FALSE AND ca.severity = 'HIGH'), 0)::INT AS high_alerts_count,
        COALESCE(COUNT(ca.id) FILTER (WHERE ca.is_resolved = FALSE AND ca.severity = 'MEDIUM'), 0)::INT AS medium_alerts_count,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'code', cr.code,
                'standard_name', cr.standard_name,
                'severity', cr.severity,
                'is_mandatory', lcr.is_mandatory
              )
              ORDER BY cr.code
            )
            FROM location_compliance_rules lcr
            INNER JOIN compliance_rules cr ON cr.id = lcr.rule_id
            WHERE lcr.location_id = l.id
          ),
          '[]'::json
        ) AS applied_rules
      FROM locations l
      LEFT JOIN compliance_alerts ca ON ca.location_id = l.id
      GROUP BY l.id
      ORDER BY l.country ASC, l.name ASC
    `;

    const result = await pool.query(query);

    const locations = result.rows.map((row) => ({
      ...row,
      health_status: computeHealthStatus(row.open_alerts_count, row.critical_alerts_count),
    }));

    res.json(locations);
  } catch (err: any) {
    console.error('[ComplianceController] Error fetching compliance locations:', err);
    res.status(500).json({ error: 'Failed to retrieve compliance locations' });
  }
}

/**
 * GET /api/v1/compliance/alerts
 * Lists compliance alerts with optional filters: location_id, severity, is_resolved.
 */
export async function getComplianceAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { location_id, severity, is_resolved } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (typeof location_id === 'string' && location_id.trim() !== '') {
      params.push(location_id.trim());
      conditions.push(`ca.location_id = $${params.length}`);
    }

    if (typeof severity === 'string' && severity.trim() !== '') {
      params.push(severity.trim().toUpperCase());
      conditions.push(`ca.severity = $${params.length}`);
    }

    if (typeof is_resolved === 'string' && is_resolved.trim() !== '') {
      const normalized = is_resolved.trim().toLowerCase();
      if (normalized === 'true' || normalized === 'false') {
        params.push(normalized === 'true');
        conditions.push(`ca.is_resolved = $${params.length}`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        ca.id,
        ca.order_id,
        o.external_order_id,
        ca.location_id,
        l.code AS location_code,
        l.name AS location_name,
        l.country AS location_country,
        ca.rule_code,
        ca.severity,
        ca.message,
        ca.is_resolved,
        ca.resolved_at,
        ca.created_at
      FROM compliance_alerts ca
      INNER JOIN locations l ON l.id = ca.location_id
      LEFT JOIN orders o ON o.id = ca.order_id
      ${whereClause}
      ORDER BY ca.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('[ComplianceController] Error fetching compliance alerts:', err);
    res.status(500).json({ error: 'Failed to retrieve compliance alerts' });
  }
}

/**
 * PATCH /api/v1/compliance/alerts/:id/resolve
 * Marks a compliance alert as resolved and emits 'ALERT_RESOLVED' (and 'LOCATION_STATUS_CHANGED') via Socket.IO.
 */
export async function resolveComplianceAlert(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const updateRes = await pool.query(
      `UPDATE compliance_alerts
       SET is_resolved = TRUE,
           resolved_at = COALESCE(resolved_at, NOW())
       WHERE id = $1
       RETURNING id, order_id, location_id, rule_code, severity, message, is_resolved, resolved_at, created_at`,
      [id]
    );

    if (updateRes.rows.length === 0) {
      res.status(404).json({ error: 'Compliance alert not found' });
      return;
    }

    const alert = updateRes.rows[0];

    // Fetch location details & recalculated open alert counts
    const locRes = await pool.query(
      `SELECT
         l.id,
         l.code,
         l.name,
         COALESCE(COUNT(ca.id) FILTER (WHERE ca.is_resolved = FALSE), 0)::INT AS open_alerts_count,
         COALESCE(COUNT(ca.id) FILTER (WHERE ca.is_resolved = FALSE AND ca.severity = 'CRITICAL'), 0)::INT AS critical_alerts_count
       FROM locations l
       LEFT JOIN compliance_alerts ca ON ca.location_id = l.id
       WHERE l.id = $1
       GROUP BY l.id`,
      [alert.location_id]
    );

    const loc = locRes.rows[0];
    const resolvedAtIso = alert.resolved_at ? new Date(alert.resolved_at).toISOString() : new Date().toISOString();

    websocketService.emitAlertResolved({
      alertId: alert.id,
      locationId: alert.location_id,
      locationCode: loc?.code,
      ruleCode: alert.rule_code,
      resolvedAt: resolvedAtIso,
    });

    if (loc) {
      const healthStatus = computeHealthStatus(loc.open_alerts_count, loc.critical_alerts_count);
      websocketService.emitLocationStatusChanged({
        locationId: loc.id,
        locationCode: loc.code,
        locationName: loc.name,
        healthStatus,
        openAlertsCount: loc.open_alerts_count,
      });
    }

    res.json({
      ...alert,
      location_code: loc?.code || null,
      location_name: loc?.name || null,
    });
  } catch (err: any) {
    console.error('[ComplianceController] Error resolving compliance alert:', err);
    res.status(500).json({ error: 'Failed to resolve compliance alert' });
  }
}
