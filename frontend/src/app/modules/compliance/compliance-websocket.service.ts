import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface ComplianceAlertEvent {
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

export interface AlertResolvedEvent {
  alertId: string;
  locationId: string;
  locationCode?: string;
  ruleCode?: string;
  resolvedAt: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ComplianceWebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private readonly complianceAlert$ = new Subject<ComplianceAlertEvent>();
  private readonly alertResolved$ = new Subject<AlertResolvedEvent>();

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (typeof window === 'undefined' || this.socket) return;

    this.socket = io(environment.apiUrl, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('COMPLIANCE_ALERT_TRIGGERED', (payload: ComplianceAlertEvent) => {
      this.complianceAlert$.next(payload);
    });

    this.socket.on('ALERT_RESOLVED', (payload: AlertResolvedEvent) => {
      this.alertResolved$.next(payload);
    });
  }

  onComplianceAlert(): Observable<ComplianceAlertEvent> {
    return this.complianceAlert$.asObservable();
  }

  onAlertResolved(): Observable<AlertResolvedEvent> {
    return this.alertResolved$.asObservable();
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
    this.complianceAlert$.complete();
    this.alertResolved$.complete();
  }
}
