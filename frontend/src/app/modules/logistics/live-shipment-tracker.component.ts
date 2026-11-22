import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    L?: any;
  }
}

export interface TrackingGeoPoint {
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
  source?: 'SHIPPO_LIVE' | 'GPS_PING' | 'SIMULATION';
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
  origin: TrackingGeoPoint;
  waypoints: TrackingGeoPoint[];
  destination: TrackingGeoPoint;
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

function buildDemoTelemetry(progress = 48): LiveTrackingTelemetry {
  const origin: TrackingGeoPoint = {
    code: 'US-TX-HQ',
    name: 'Houston Fulfillment HQ',
    city: 'Houston, TX',
    country: 'US',
    lat: 29.7604,
    lng: -95.3698,
  };
  const border: TrackingGeoPoint = {
    code: 'MX-CHH',
    name: 'Chihuahua Border Hub',
    city: 'Chihuahua, CHH',
    country: 'MX',
    lat: 28.633,
    lng: -106.0691,
  };
  const destination: TrackingGeoPoint = {
    code: 'MX-MTY',
    name: 'Monterrey Industrial Hub',
    city: 'Monterrey, NL',
    country: 'MX',
    lat: 25.6866,
    lng: -100.3161,
  };

  const ratio = Math.max(0, Math.min(1, progress / 100));
  const totalDistanceKm = 845;
  const remainingDistanceKm = Math.max(0, Math.round(totalDistanceKm * (1 - ratio)));
  const speedKmh = progress >= 100 ? 0 : progress >= 75 ? 42 : 88;
  const etaMinutes = speedKmh > 0 ? Math.round((remainingDistanceKm / speedKmh) * 60) : 0;

  return {
    source: 'SIMULATION',
    shipmentId: 'demo-shipment-001',
    orderId: null,
    externalOrderId: 'ORD-TX-89421',
    trackingNumber: '1Z999AA10192837465',
    carrier: 'OrderSync Express',
    serviceLevel: 'Cross-Border Priority',
    vehicleId: 'OS-UNIT-774',
    driverName: 'Carlos Mendoza',
    currentStep: progress >= 100 ? 'delivered' : progress >= 75 ? 'out_for_delivery' : 'in_transit',
    progressPercent: progress,
    isDelivered: progress >= 100,
    origin,
    waypoints: [border],
    destination,
    currentPosition: {
      lat: Number((origin.lat + (destination.lat - origin.lat) * ratio).toFixed(4)),
      lng: Number((origin.lng + (destination.lng - origin.lng) * ratio).toFixed(4)),
      speedKmh,
      headingDeg: 215,
    },
    remainingDistanceKm,
    totalDistanceKm,
    etaIso: new Date(Date.now() + etaMinutes * 60000).toISOString(),
    etaLabel:
      progress >= 100
        ? 'Delivered'
        : `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m remaining`,
    compliance: {
      piiEncrypted: true,
      locationCode: 'US-TX-HQ',
      satCartaPorteFolio: 'CP-SAT-89421A',
      customsCleared: progress >= 45,
    },
    milestones: [
      {
        step: 1,
        code: 'ORDER_CONFIRMED',
        title: 'ISO-27001 Packaging & Sealing',
        facility: origin.name,
        city: origin.city,
        status: 'COMPLETED',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        scanCode: 'PKG-37465',
        complianceNote: 'PII encrypted with AES-256-GCM',
      },
      {
        step: 2,
        code: 'CARRIER_PICKUP',
        title: 'Carrier Pickup & Manifest Scan',
        facility: origin.name,
        city: origin.city,
        status: progress >= 25 ? 'COMPLETED' : 'IN_PROGRESS',
        timestamp: progress >= 25 ? new Date(Date.now() - 8400000).toISOString() : null,
        scanCode: 'PKP-37465',
      },
      {
        step: 3,
        code: 'REGIONAL_HUB_TRANSIT',
        title: 'Interstate Transit / Customs & SAT',
        facility: border.name,
        city: border.city,
        status: progress >= 60 ? 'COMPLETED' : progress >= 25 ? 'IN_PROGRESS' : 'PENDING',
        timestamp: progress >= 60 ? new Date(Date.now() - 4500000).toISOString() : null,
        scanCode: 'HUB-37465',
        complianceNote: 'Carta Porte CP-SAT-89421A',
      },
      {
        step: 4,
        code: 'DESTINATION_FACILITY',
        title: 'Destination Distribution Center',
        facility: destination.name,
        city: destination.city,
        status: progress >= 75 ? 'COMPLETED' : progress >= 60 ? 'IN_PROGRESS' : 'PENDING',
        timestamp: progress >= 75 ? new Date(Date.now() - 2100000).toISOString() : null,
        scanCode: 'DST-37465',
      },
      {
        step: 5,
        code: 'OUT_FOR_DELIVERY',
        title: 'Out for Last-Mile Delivery',
        facility: 'Local Fleet · Monterrey, NL',
        city: destination.city,
        status: progress >= 100 ? 'COMPLETED' : progress >= 75 ? 'IN_PROGRESS' : 'PENDING',
        timestamp: progress >= 75 ? new Date(Date.now() - 900000).toISOString() : null,
        scanCode: 'VAN-7465',
      },
      {
        step: 6,
        code: 'DELIVERED',
        title: 'Delivery Confirmed (Digital POD)',
        facility: 'Monterrey Industrial Hub',
        city: destination.city,
        status: progress >= 100 ? 'COMPLETED' : 'PENDING',
        timestamp: progress >= 100 ? new Date().toISOString() : null,
        scanCode: 'POD-37465',
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

@Component({
  selector: 'app-live-shipment-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden" *ngIf="telemetry() as t">
      <!-- Top Header: Active Corridor Route + Live GPS & Shippo Controls -->
      <div class="px-6 py-4 bg-white border-b border-slate-100 text-slate-900 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              [ngClass]="
                t.currentStep === 'customs_hold'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : t.isDelivered
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              "
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                [ngClass]="
                  t.currentStep === 'customs_hold'
                    ? 'bg-amber-500 animate-pulse'
                    : t.isDelivered
                      ? 'bg-emerald-600'
                      : 'bg-emerald-500 animate-pulse'
                "
              ></span>
              {{ t.currentStep === 'customs_hold' ? 'Customs Hold' : (t.isDelivered ? 'Delivered' : 'In Transit') }}
            </span>
            <span class="text-xs font-mono font-bold text-slate-800">{{ t.trackingNumber }}</span>
            <span class="text-xs text-slate-400">· {{ t.externalOrderId }}</span>
          </div>
          <h3 class="text-lg font-extrabold text-slate-900 tracking-tight mt-1">
            {{ t.origin.name }} <span class="text-emerald-600 font-normal">→</span> {{ t.destination.name }}
          </h3>
        </div>

        <!-- Clean, Scannable Action Pills -->
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            (click)="showDispatcher.set(!showDispatcher())"
            class="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
            [ngClass]="
              showDispatcher()
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            "
          >
            + Dispatch Route
          </button>

          <button
            type="button"
            (click)="showLabelModal.set(true)"
            class="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Label
          </button>

          <button
            *ngIf="!t.isDelivered && t.shipmentId !== 'demo-shipment-001'"
            type="button"
            (click)="toggleCustomsHold()"
            [disabled]="customsHoldLoading()"
            class="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
            [ngClass]="
              t.currentStep === 'customs_hold'
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200'
            "
          >
            {{ customsHoldLoading() ? 'Updating...' : (t.currentStep === 'customs_hold' ? 'Release Hold' : 'Customs Hold') }}
          </button>

          <button
            *ngIf="t.isDelivered"
            type="button"
            (click)="showEpodModal.set(true)"
            class="px-3.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            View ePOD
          </button>

          <button
            type="button"
            (click)="queryShippoLive()"
            [disabled]="loadingShippo()"
            class="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {{ loadingShippo() ? 'Syncing...' : 'Sync Shippo' }}
          </button>

          <button
            *ngIf="!t.isDelivered"
            type="button"
            (click)="toggleAutoPlay()"
            [disabled]="t.currentStep === 'customs_hold'"
            class="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50"
            [ngClass]="
              autoPlay()
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            "
          >
            {{ autoPlay() ? '⏸ Pause' : '▶ Live GPS' }}
          </button>

          <button
            *ngIf="!t.isDelivered"
            type="button"
            (click)="simulateTick()"
            [disabled]="simulating() || t.currentStep === 'customs_hold'"
            class="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Advance GPS
          </button>

          <span
            *ngIf="t.isDelivered"
            class="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold"
          >
            ✓ Completed &amp; Saved
          </span>
        </div>
      </div>

      <!-- Customs Hold Alert Strip -->
      <div *ngIf="t.currentStep === 'customs_hold'" class="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
        <span class="font-semibold">
          ⚠ Customs inspection hold active at {{ t.waypoints[0]?.code || 'MX-CHH' }}. Incident logged in Compliance &amp; Hubs.
        </span>
        <button
          type="button"
          (click)="toggleCustomsHold()"
          class="px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold cursor-pointer"
        >
          Release Hold
        </button>
      </div>

      <!-- Collapsible 10-Hub Corridor Dispatcher Strip -->
      <div *ngIf="showDispatcher()" class="px-6 py-3 bg-emerald-50/40 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span class="font-bold text-slate-800">New 10-Hub Dispatch:</span>

        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1">
            <span class="text-[10px] font-bold uppercase text-slate-400">Order</span>
            <select [(ngModel)]="dispatchOrderId" class="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[145px]">
              <option value="">Inter-Hub Transfer</option>
              <option *ngFor="let o of shopifyOrders()" [value]="o.id">
                {{ o.external_order_id }} ({{ o.total_amount | currency:'USD' }})
              </option>
            </select>
          </div>

          <div class="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1">
            <span class="text-[10px] font-bold uppercase text-slate-400">From</span>
            <select [(ngModel)]="dispatchOriginCode" class="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer">
              <option *ngFor="let h of allHubs" [value]="h.code">{{ h.code }} · {{ h.city }}</option>
            </select>
          </div>

          <span class="text-emerald-600 font-bold">→</span>

          <div class="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1">
            <span class="text-[10px] font-bold uppercase text-slate-400">To</span>
            <select [(ngModel)]="dispatchDestCode" class="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer">
              <option *ngFor="let h of allHubs" [value]="h.code">{{ h.code }} · {{ h.city }}</option>
            </select>
          </div>

          <div class="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1">
            <span class="text-[10px] font-bold uppercase text-slate-400">Carrier</span>
            <select [(ngModel)]="dispatchCarrier" class="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer">
              <option value="DHL Express">DHL Express</option>
              <option value="FedEx Express">FedEx Express</option>
              <option value="UPS Ground">UPS Ground</option>
            </select>
          </div>

          <button
            type="button"
            (click)="dispatchCorridorShipment()"
            [disabled]="dispatchingCorridor() || dispatchOriginCode === dispatchDestCode"
            class="px-4 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {{ dispatchingCorridor() ? 'Dispatching...' : 'Dispatch' }}
          </button>
        </div>
      </div>

      <!-- Clean 4-Column Telemetry KPI Strip -->
      <div class="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
        <div class="px-5 py-3.5">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrier &amp; Driver</p>
          <p class="text-xs font-bold text-slate-900 mt-0.5">{{ t.carrier }}</p>
          <p class="text-[11px] text-slate-500">{{ t.vehicleId }} · {{ t.driverName }}</p>
        </div>
        <div class="px-5 py-3.5">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Speed &amp; Progress</p>
          <p class="text-xs font-mono font-bold text-slate-900 mt-0.5">{{ t.currentPosition.speedKmh }} km/h</p>
          <p class="text-[11px] text-slate-500">{{ t.progressPercent }}% completed</p>
        </div>
        <div class="px-5 py-3.5">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Distance Left</p>
          <p class="text-xs font-mono font-bold text-slate-900 mt-0.5">{{ t.remainingDistanceKm }} km</p>
          <p class="text-[11px] text-slate-500">of {{ t.totalDistanceKm }} km total</p>
        </div>
        <div class="px-5 py-3.5">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estimated ETA</p>
          <p class="text-xs font-bold text-emerald-700 mt-0.5">{{ t.etaLabel }}</p>
          <p class="text-[11px] text-slate-500">{{ t.etaIso | date: 'shortTime' }}</p>
        </div>
      </div>

      <!-- Main Split: Real Interactive Map (with all 10 hubs) + 6-Step Logistics Timeline -->
      <div class="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        <!-- Interactive Map Container (OpenStreetMap) -->
        <div class="lg:col-span-7 p-5 bg-white text-slate-900 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              North America 10-Hub Geospatial Network (OpenStreetMap)
            </span>
            <div class="flex items-center gap-3 text-[11px] text-slate-500">
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-900"></span>Origin Hub</span>
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-600"></span>Active GPS Unit</span>
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-400"></span>10 Operating Hubs</span>
            </div>
          </div>

          <!-- Real Leaflet Map -->
          <div class="relative w-full h-80 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <div #leafletMap class="w-full h-full z-10" [class.hidden]="!leafletReady()"></div>
          </div>

          <!-- Clean Emerald Route Progress Bar -->
          <div class="mt-4">
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-slate-500 font-medium">
                Corridor: <strong class="text-slate-800">{{ t.origin.city }}</strong>
                <ng-container *ngIf="t.waypoints.length > 0"> → <strong class="text-slate-700">{{ t.waypoints[0].city }} (Customs/Hub)</strong></ng-container>
                → <strong class="text-slate-800">{{ t.destination.city }}</strong>
              </span>
              <span class="font-mono font-bold text-emerald-700">{{ t.progressPercent }}%</span>
            </div>
            <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-emerald-600 rounded-full transition-all duration-500"
                [style.width.%]="t.progressPercent"
              ></div>
            </div>
          </div>
        </div>

        <!-- 6-Step Logistics Timeline -->
        <div class="lg:col-span-5 p-5 bg-white max-h-[450px] overflow-y-auto">
          <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-700 block mb-4">
            Corridor Checkpoints &amp; Statutory Log
          </span>

          <ol class="relative border-l-2 border-slate-100 ml-2.5 space-y-5">
            <li *ngFor="let m of t.milestones" class="ml-5 relative">
              <span
                class="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center"
                [ngClass]="
                  m.status === 'COMPLETED'
                    ? 'bg-emerald-500'
                    : m.status === 'IN_PROGRESS'
                      ? 'bg-emerald-600 ring-4 ring-emerald-100'
                      : 'bg-slate-200'
                "
              ></span>

              <div class="flex items-start justify-between gap-2">
                <p
                  class="text-xs font-bold"
                  [ngClass]="m.status === 'PENDING' ? 'text-slate-400' : 'text-slate-900'"
                >
                  {{ m.title }}
                </p>
                <span class="text-[10px] font-mono text-slate-400 flex-shrink-0">
                  {{ m.scanCode }}
                </span>
              </div>

              <p class="text-[11px] text-slate-500 mt-0.5">
                {{ m.facility }} · {{ m.city }}
              </p>

              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span *ngIf="m.timestamp" class="text-[10px] text-slate-400 font-mono">
                  {{ m.timestamp | date: 'short' }}
                </span>
                <span
                  *ngIf="m.complianceNote"
                  class="px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold"
                >
                  {{ m.complianceNote }}
                </span>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Modal: Printable Shipping Label & SAT Carta Porte Waybill -->
    <div *ngIf="showLabelModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">Shipping Label &amp; Waybill</h3>
          <button
            type="button"
            (click)="showLabelModal.set(false)"
            class="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs" *ngIf="telemetry() as t">
          <div class="border-2 border-slate-900 rounded-xl p-4 space-y-3 bg-white">
            <div class="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
              <div>
                <p class="text-sm font-black uppercase tracking-wider text-slate-900">{{ t.carrier }}</p>
                <p class="text-[11px] font-mono text-slate-600">{{ t.serviceLevel }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-bold uppercase text-slate-500">Order Ref</p>
                <p class="text-xs font-mono font-bold text-slate-900">{{ t.externalOrderId }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 border-b border-slate-200 pb-3">
              <div>
                <p class="text-[10px] font-bold uppercase text-slate-400">From (Origin Hub)</p>
                <p class="font-bold text-slate-900">{{ t.origin.name }}</p>
                <p class="text-slate-600">{{ t.origin.city }} · {{ t.origin.code }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase text-slate-400">To (Destination)</p>
                <p class="font-bold text-slate-900">{{ t.destination.name }}</p>
                <p class="text-slate-600">{{ t.destination.city }} · {{ t.destination.code }}</p>
              </div>
            </div>

            <div class="flex items-center justify-between text-[11px] bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
              <span><strong>Customs / Gateway:</strong> {{ t.waypoints[0]?.code || 'DIRECT' }}</span>
              <span *ngIf="t.compliance.satCartaPorteFolio" class="font-mono font-bold text-emerald-700">
                Carta Porte: {{ t.compliance.satCartaPorteFolio }}
              </span>
            </div>

            <!-- Clean SVG Barcode -->
            <div class="pt-1 text-center">
              <div class="flex justify-center gap-[2px] h-10 items-stretch px-4">
                <span *ngFor="let w of [2,1,3,1,2,2,1,3,1,1,2,3,1,2,1,2,3,1,2,1,3,2,1,2,1,3,2]" [style.width.px]="w" class="bg-slate-900 inline-block"></span>
              </div>
              <p class="font-mono text-xs font-bold tracking-[0.2em] text-slate-900 mt-1.5">{{ t.trackingNumber }}</p>
            </div>
          </div>
        </div>

        <div class="bg-slate-50/70 px-6 py-3.5 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            (click)="showLabelModal.set(false)"
            class="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            (click)="printLabel()"
            class="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Electronic Proof of Delivery (ePOD) -->
    <div *ngIf="showEpodModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900">Electronic Proof of Delivery (ePOD)</h3>
            <p class="text-[11px] text-emerald-700 font-semibold mt-0.5">✓ Delivery Confirmed &amp; Signed</p>
          </div>
          <button
            type="button"
            (click)="showEpodModal.set(false)"
            class="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs" *ngIf="telemetry() as t">
          <div class="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div>
              <p class="text-[10px] font-bold uppercase text-slate-400">Tracking #</p>
              <p class="font-mono font-bold text-slate-900 mt-0.5">{{ t.trackingNumber }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase text-slate-400">POD Reference</p>
              <p class="font-mono font-bold text-emerald-700 mt-0.5">POD-{{ t.shipmentId.slice(0, 8).toUpperCase() }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase text-slate-400">Received At</p>
              <p class="font-semibold text-slate-900 mt-0.5">{{ t.destination.name }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase text-slate-400">GPS Coordinates</p>
              <p class="font-mono text-slate-700 mt-0.5">{{ t.destination.lat }}, {{ t.destination.lng }}</p>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 p-3.5 bg-white">
            <p class="text-[10px] font-bold uppercase text-slate-400 mb-2">Recipient Digital Signature</p>
            <svg viewBox="0 0 260 60" class="w-full h-14 text-slate-800" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M18,42 C28,12 40,12 36,40 C34,52 54,18 66,34 C74,45 84,22 96,35 C106,45 124,25 142,36 C165,48 195,28 238,34" />
            </svg>
            <div class="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-1">
              <span>Signed by: <strong class="text-slate-800">Hub Receiving Desk</strong></span>
              <span class="font-mono">{{ t.updatedAt | date: 'short' }}</span>
            </div>
          </div>
        </div>

        <div class="bg-slate-50/70 px-6 py-3.5 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            (click)="showEpodModal.set(false)"
            class="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LiveShipmentTrackerComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() shipmentId?: string;
  @ViewChild('leafletMap') mapContainer?: ElementRef<HTMLDivElement>;

  private readonly http = inject(HttpClient);
  private socket: Socket | null = null;
  private autoTimer: ReturnType<typeof setInterval> | null = null;
  private map: any = null;
  private routeLine: any = null;
  private completedLine: any = null;
  private truckMarker: any = null;
  private originMarker: any = null;
  private destMarker: any = null;
  private hubNetworkMarkers: any[] = [];

  shippoPreset = 'SHIPPO_TRANSIT';
  dispatchOrderId = '';
  dispatchOriginCode = 'US-TX-HQ';
  dispatchDestCode = 'MX-MTY';
  dispatchCarrier = 'DHL Express';
  readonly shopifyOrders = signal<any[]>([]);
  readonly dispatchingCorridor = signal<boolean>(false);
  readonly showDispatcher = signal<boolean>(false);
  readonly customsHoldLoading = signal<boolean>(false);
  readonly showLabelModal = signal<boolean>(false);
  readonly showEpodModal = signal<boolean>(false);

  readonly allHubs: TrackingGeoPoint[] = [
    { code: 'US-TX-HQ', name: 'Houston Fulfillment HQ', city: 'Houston, TX', country: 'US', lat: 29.7604, lng: -95.3698 },
    { code: 'US-NYC',   name: 'New York Distribution Hub', city: 'New York, NY', country: 'US', lat: 40.7128, lng: -74.0060 },
    { code: 'US-MI',    name: 'Michigan State Hub', city: 'Detroit, MI', country: 'US', lat: 42.3314, lng: -83.0458 },
    { code: 'US-CA',    name: 'California West Hub', city: 'Los Angeles, CA', country: 'US', lat: 34.0522, lng: -118.2437 },
    { code: 'CA-TOR',   name: 'Toronto Fulfillment Hub', city: 'Toronto, ON', country: 'CA', lat: 43.6532, lng: -79.3832 },
    { code: 'CA-MTL',   name: 'Montreal Logistics Center', city: 'Montreal, QC', country: 'CA', lat: 45.5017, lng: -73.5673 },
    { code: 'MX-CHH',   name: 'Chihuahua Border Hub', city: 'Chihuahua, CHH', country: 'MX', lat: 28.6330, lng: -106.0691 },
    { code: 'MX-MTY',   name: 'Monterrey Industrial Hub', city: 'Monterrey, NL', country: 'MX', lat: 25.6866, lng: -100.3161 },
    { code: 'MX-FED',   name: 'Querétaro National Hub', city: 'Querétaro, QRO', country: 'MX', lat: 20.5888, lng: -100.3899 },
    { code: 'MX-CDMX',  name: 'Mexico City Metro Hub', city: 'CDMX, MX', country: 'MX', lat: 19.4326, lng: -99.1332 },
  ];

  readonly telemetry = signal<LiveTrackingTelemetry>(buildDemoTelemetry(48));
  readonly simulating = signal<boolean>(false);
  readonly loadingShippo = signal<boolean>(false);
  readonly autoPlay = signal<boolean>(false);
  readonly leafletReady = signal<boolean>(false);

  readonly vehicleSvgX = computed(() => {
    const t = Math.max(0, Math.min(1, this.telemetry().progressPercent / 100));
    return Math.round((1 - t) * (1 - t) * 65 + 2 * (1 - t) * t * 300 + t * t * 535);
  });

  readonly vehicleSvgY = computed(() => {
    const t = Math.max(0, Math.min(1, this.telemetry().progressPercent / 100));
    return Math.round((1 - t) * (1 - t) * 155 + 2 * (1 - t) * t * 40 + t * t * 125);
  });

  ngOnInit(): void {
    this.connectSocket();
    this.loadShopifyOrders();
    if (this.shipmentId) {
      this.loadTracking(this.shipmentId);
    }
  }

  loadShopifyOrders(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/orders`).subscribe({
      next: (rows) => {
        this.shopifyOrders.set(Array.isArray(rows) ? rows.slice(0, 20) : []);
      },
      error: () => {}
    });
  }

  toggleCustomsHold(): void {
    const activeId = this.telemetry()?.shipmentId;
    if (!activeId || activeId === 'demo-shipment-001') return;
    const shouldHold = this.telemetry().currentStep !== 'customs_hold';
    this.customsHoldLoading.set(true);
    if (shouldHold) this.stopAutoPlay();

    this.http
      .post<{ hold: boolean; telemetry: LiveTrackingTelemetry }>(
        `${environment.apiUrl}/api/v1/shipments/${activeId}/customs-hold`,
        { hold: shouldHold }
      )
      .subscribe({
        next: (res) => {
          this.customsHoldLoading.set(false);
          if (res?.telemetry) {
            this.telemetry.set(res.telemetry);
            this.syncMapWithTelemetry();
          }
        },
        error: () => {
          this.customsHoldLoading.set(false);
        },
      });
  }

  printLabel(): void {
    window.print();
  }

  ngAfterViewInit(): void {
    this.initLeafletMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['shipmentId'] && this.shipmentId) {
      this.loadTracking(this.shipmentId);
    }
  }

  dispatchCorridorShipment(): void {
    if (this.dispatchOriginCode === this.dispatchDestCode) return;
    this.dispatchingCorridor.set(true);
    this.http
      .post<{ shipment: any; telemetry: LiveTrackingTelemetry }>(
        `${environment.apiUrl}/api/v1/shipments/dispatch-corridor`,
        {
          originCode: this.dispatchOriginCode,
          destinationCode: this.dispatchDestCode,
          carrier: this.dispatchCarrier,
          orderId: this.dispatchOrderId || null,
        }
      )
      .subscribe({
        next: (res) => {
          this.dispatchingCorridor.set(false);
          if (res?.telemetry) {
            this.shipmentId = res.telemetry.shipmentId;
            this.telemetry.set(res.telemetry);
            this.syncMapWithTelemetry();
          }
        },
        error: () => {
          this.dispatchingCorridor.set(false);
        },
      });
  }

  queryShippoLive(): void {
    this.loadingShippo.set(true);
    this.http
      .get<LiveTrackingTelemetry>(
        `${environment.apiUrl}/api/v1/shipments/shippo/shippo/${this.shippoPreset}`
      )
      .subscribe({
        next: (data) => {
          this.telemetry.set(data);
          this.loadingShippo.set(false);
          this.syncMapWithTelemetry();
        },
        error: () => {
          this.loadingShippo.set(false);
        },
      });
  }

  loadTracking(id: string): void {
    this.http.get<LiveTrackingTelemetry>(`${environment.apiUrl}/api/v1/shipments/${id}/tracking`).subscribe({
      next: (data) => {
        this.telemetry.set(data);
        this.syncMapWithTelemetry();
      },
      error: () => {
        this.telemetry.set(buildDemoTelemetry(48));
        this.syncMapWithTelemetry();
      },
    });
  }

  simulateTick(): void {
    if (this.telemetry()?.isDelivered) {
      this.stopAutoPlay();
      return;
    }
    const activeId = this.telemetry()?.shipmentId || this.shipmentId;
    if (activeId && activeId !== 'demo-shipment-001') {
      this.simulating.set(true);
      this.http
        .post<LiveTrackingTelemetry>(
          `${environment.apiUrl}/api/v1/shipments/${activeId}/tracking/simulate-tick`,
          { stepIncrement: 18 }
        )
        .subscribe({
          next: (data) => {
            this.telemetry.set(data);
            this.simulating.set(false);
            this.syncMapWithTelemetry();
            if (data.isDelivered) this.stopAutoPlay();
          },
          error: () => {
            this.simulating.set(false);
            this.advanceDemo();
          },
        });
    } else {
      this.advanceDemo();
    }
  }

  toggleAutoPlay(): void {
    if (this.autoPlay()) {
      this.stopAutoPlay();
      return;
    }
    this.autoPlay.set(true);
    this.autoTimer = setInterval(() => {
      if (this.telemetry().isDelivered) {
        this.stopAutoPlay();
        return;
      }
      this.simulateTick();
    }, 2500);
  }

  private stopAutoPlay(): void {
    this.autoPlay.set(false);
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  private advanceDemo(): void {
    const current = this.telemetry().progressPercent;
    const next = current >= 100 ? 15 : Math.min(100, current + 18);
    this.telemetry.set(buildDemoTelemetry(next));
    this.syncMapWithTelemetry();
    if (next >= 100) this.stopAutoPlay();
  }

  private connectSocket(): void {
    if (typeof window === 'undefined' || this.socket) return;
    this.socket = io(environment.apiUrl, { transports: ['websocket', 'polling'] });
    this.socket.on('SHIPMENT_LOCATION_UPDATED', (payload: LiveTrackingTelemetry) => {
      const activeId = this.telemetry()?.shipmentId || this.shipmentId;
      if (!activeId || payload.shipmentId === activeId) {
        this.telemetry.set(payload);
        this.syncMapWithTelemetry();
      }
    });
  }

  private async initLeafletMap(): Promise<void> {
    if (typeof window === 'undefined' || !this.mapContainer) return;

    try {
      await this.loadLeafletAssets();
      const L = window.L;
      if (!L || !this.mapContainer?.nativeElement) return;

      this.leafletReady.set(true);
      const t = this.telemetry();

      this.map = L.map(this.mapContainer.nativeElement, {
        zoomControl: true,
        attributionControl: false,
      }).setView([t.currentPosition.lat, t.currentPosition.lng], 4);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(this.map);

      this.syncMapWithTelemetry();
      setTimeout(() => this.map?.invalidateSize(), 150);
    } catch {
      this.leafletReady.set(false);
    }
  }

  private syncMapWithTelemetry(): void {
    const L = window.L;
    if (!this.map || !L) return;

    const t = this.telemetry();
    const originLatLng: [number, number] = [t.origin.lat, t.origin.lng];
    const destLatLng: [number, number] = [t.destination.lat, t.destination.lng];
    const currentLatLng: [number, number] = [t.currentPosition.lat, t.currentPosition.lng];
    const points: [number, number][] = [
      originLatLng,
      ...t.waypoints.map((w) => [w.lat, w.lng] as [number, number]),
      destLatLng,
    ];

    this.routeLine?.remove();
    this.completedLine?.remove();
    this.originMarker?.remove();
    this.destMarker?.remove();
    this.truckMarker?.remove();
    this.hubNetworkMarkers.forEach((m) => m.remove());
    this.hubNetworkMarkers = [];

    // 1. Plot all 10 North America Operating Hubs on the map
    for (const hub of this.allHubs) {
      const isEndpoint = hub.code === t.origin.code || hub.code === t.destination.code;
      const isWaypoint = t.waypoints.some((w) => w.code === hub.code);
      if (isEndpoint) continue;
      const marker = L.circleMarker([hub.lat, hub.lng], {
        radius: isWaypoint ? 6 : 4.5,
        color: '#ffffff',
        weight: 1.5,
        fillColor: isWaypoint ? '#059669' : '#64748b',
        fillOpacity: isWaypoint ? 0.95 : 0.65,
      })
        .bindPopup(`<b>${hub.code}</b> · ${hub.name}<br/><span style="font-size:11px;color:#64748b">${hub.city} (${hub.country})</span>`)
        .addTo(this.map);
      this.hubNetworkMarkers.push(marker);
    }

    // 2. Full Corridor Planned Polyline
    this.routeLine = L.polyline(points, {
      color: '#94a3b8',
      weight: 3,
      dashArray: '6, 8',
    }).addTo(this.map);

    // 3. Piecewise Completed Route Polyline (follows waypoints accurately!)
    const completedPts: [number, number][] = [originLatLng];
    if (t.waypoints.length > 0 && t.progressPercent > 50) {
      completedPts.push([t.waypoints[0].lat, t.waypoints[0].lng]);
    }
    completedPts.push(currentLatLng);

    const isHold = t.currentStep === 'customs_hold';
    this.completedLine = L.polyline(completedPts, {
      color: isHold ? '#d97706' : '#059669',
      weight: 4,
    }).addTo(this.map);

    this.originMarker = L.circleMarker(originLatLng, {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#0f172a',
      fillOpacity: 1,
    })
      .bindPopup(`<b>Origin Hub (${t.origin.code}):</b> ${t.origin.name}`)
      .addTo(this.map);

    this.destMarker = L.circleMarker(destLatLng, {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#059669',
      fillOpacity: 1,
    })
      .bindPopup(`<b>Destination Hub (${t.destination.code}):</b> ${t.destination.name}`)
      .addTo(this.map);

    const truckIcon = L.divIcon({
      className: 'ordersync-truck-pin',
      html: `<div style="width:18px;height:18px;border-radius:9999px;background:#10b981;border:3px solid #fff;box-shadow:0 0 0 6px rgba(16,185,129,0.3);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    this.truckMarker = L.marker(currentLatLng, { icon: truckIcon })
      .bindPopup(
        `<b>${t.vehicleId}</b><br/>${t.currentPosition.speedKmh} km/h · ${t.progressPercent}%`
      )
      .addTo(this.map);

    this.map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }

  private loadLeafletAssets(): Promise<void> {
    if (window.L) return Promise.resolve();

    return new Promise((resolve, reject) => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (document.getElementById('leaflet-js')) {
        const check = setInterval(() => {
          if (window.L) {
            clearInterval(check);
            resolve();
          }
        }, 50);
        return;
      }

      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Leaflet failed to load'));
      document.body.appendChild(script);
    });
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    this.map?.remove();
    this.socket?.disconnect();
  }
}
