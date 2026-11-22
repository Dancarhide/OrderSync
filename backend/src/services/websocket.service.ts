import { Namespace, Server } from 'socket.io';

export const SOCKET_EVENTS = {
  NEW_ORDER_SYNCED: 'NEW_ORDER_SYNCED',
  COMPLIANCE_ALERT_TRIGGERED: 'COMPLIANCE_ALERT_TRIGGERED',
  LOCATION_STATUS_CHANGED: 'LOCATION_STATUS_CHANGED',
  ALERT_RESOLVED: 'ALERT_RESOLVED',
} as const;

export interface ComplianceAlertSocketPayload {
  alertId: string;
  locationCode: string;
  locationName: string;
  ruleCode: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  timestamp: string;
  orderId?: string | null;
  locationId?: string;
}

export interface NewOrderSyncedPayload {
  orderId: string;
  externalOrderId?: string;
  channel?: string;
  locationCode?: string;
  complianceStatus?: 'COMPLIANT' | 'WARNING' | 'BREACHED';
  timestamp: string;
}

export interface LocationStatusChangedPayload {
  locationId: string;
  locationCode: string;
  locationName: string;
  healthStatus: 'verde' | 'amarillo' | 'rojo';
  openAlertsCount: number;
  timestamp: string;
}

export interface AlertResolvedPayload {
  alertId: string;
  locationId: string;
  locationCode?: string;
  ruleCode?: string;
  resolvedAt: string;
  timestamp: string;
}

/**
 * Centralized Socket.IO service for real-time order, location health, and compliance events.
 * Broadcasts to both the default namespace (`/`) and the dedicated `/compliance` namespace.
 */
class WebSocketService {
  private io: Server | null = null;
  private complianceNamespace: Namespace | null = null;

  init(io: Server): void {
    this.io = io;
    this.complianceNamespace = io.of('/compliance');

    this.complianceNamespace.on('connection', (socket) => {
      console.log(`[WebSocketService] Client connected to /compliance: ${socket.id}`);

      socket.on('subscribe:location', (locationCode: string) => {
        if (locationCode) {
          socket.join(`location:${locationCode}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`[WebSocketService] Client disconnected from /compliance: ${socket.id}`);
      });
    });
  }

  private broadcast(event: string, payload: unknown, locationCode?: string): void {
    if (!this.io) {
      console.warn(`[WebSocketService] Socket.IO not initialized; skipping event "${event}".`);
      return;
    }

    this.io.emit(event, payload);

    if (this.complianceNamespace) {
      this.complianceNamespace.emit(event, payload);
      if (locationCode) {
        this.complianceNamespace.to(`location:${locationCode}`).emit(event, payload);
      }
    }
  }

  emitNewOrderSynced(payload: Omit<NewOrderSyncedPayload, 'timestamp'> & { timestamp?: string }): void {
    const normalized: NewOrderSyncedPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    this.broadcast(SOCKET_EVENTS.NEW_ORDER_SYNCED, normalized, normalized.locationCode);
  }

  emitComplianceAlert(
    payload: Omit<ComplianceAlertSocketPayload, 'timestamp'> & { timestamp?: string }
  ): void {
    const normalized: ComplianceAlertSocketPayload = {
      alertId: payload.alertId,
      locationCode: payload.locationCode,
      locationName: payload.locationName,
      ruleCode: payload.ruleCode,
      severity: payload.severity,
      message: payload.message,
      timestamp: payload.timestamp || new Date().toISOString(),
      ...(payload.orderId !== undefined ? { orderId: payload.orderId } : {}),
      ...(payload.locationId !== undefined ? { locationId: payload.locationId } : {}),
    };
    this.broadcast(SOCKET_EVENTS.COMPLIANCE_ALERT_TRIGGERED, normalized, normalized.locationCode);
  }

  emitLocationStatusChanged(
    payload: Omit<LocationStatusChangedPayload, 'timestamp'> & { timestamp?: string }
  ): void {
    const normalized: LocationStatusChangedPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    this.broadcast(SOCKET_EVENTS.LOCATION_STATUS_CHANGED, normalized, normalized.locationCode);
  }

  emitAlertResolved(payload: Omit<AlertResolvedPayload, 'timestamp'> & { timestamp?: string }): void {
    const normalized: AlertResolvedPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    this.broadcast(SOCKET_EVENTS.ALERT_RESOLVED, normalized, normalized.locationCode);
  }
}

export const websocketService = new WebSocketService();
