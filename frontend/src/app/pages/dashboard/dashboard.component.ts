import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { TranslationService, SupportedLanguage } from '../../services/translation.service';

export type UserRole = 'Admin' | 'Operator';
export type ActiveModule =
  | 'dashboard'
  | 'metrics'
  | 'channels'
  | 'inventory'
  | 'suppliers'
  | 'customers'
  | 'users'
  | 'security'
  | 'logistics'
  | 'devops'
  | 'returns';

export interface ReturnRecord {
  id: string;
  return_number: string;
  order_id?: string;
  external_order_id: string;
  channel: string;
  customer_name: string;
  sku: string;
  product_name: string;
  quantity: number;
  refund_amount: number;
  currency: string;
  reason: string;
  status: string;
  restock_inventory: boolean;
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  external_order_id: string;
  channel: string;
  status: string;
  total_amount: number;
  currency: string;
  sync_latency_ms: number;
  created_at?: string;
  customer: {
    full_name: string;
    shipping_address: string;
    phone?: string;
    db_encrypted?: boolean;
  };
  items?: Array<{
    sku: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface InventoryItem {
  id?: string;
  sku: string;
  product_name: string;
  stock_quantity: number;
  updated_at: string;
  supplier_name?: string;
  unit_cost?: number;
  sale_price?: number;
}

interface CustomerRecord {
  id: string;
  order_id: string;
  external_order_id: string;
  channel: string;
  created_at: string;
  full_name: string;
  shipping_address: string;
  phone: string;
  decrypted_name?: string;
  decrypted_address?: string;
  decrypted_phone?: string;
  raw_buffer_preview: string;
  raw_hex_full?: string;
  storage_engine?: string;
  encryption_status?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  country: string;
  category: string;
  lead_time_days: number;
  rating: string | number;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id?: string;
  supplier_name: string;
  sku: string;
  product_name: string;
  units: number;
  unit_cost: number;
  total_cost: number;
  status: string;
  estimated_arrival: string;
  created_at: string;
}

export interface ShipmentCheckpoint {
  step: string;
  title: string;
  timestamp: string;
  done: boolean;
}

export interface RealShipment {
  id: string;
  order_id?: string;
  external_order_id: string;
  channel: string;
  carrier: string;
  tracking_number: string;
  origin: string;
  destination: string;
  current_step: 'processing' | 'in_transit' | 'out_for_delivery' | 'delivered';
  is_delivered: boolean;
  delivered_at?: string;
  estimated_delivery: string;
  checkpoints: ShipmentCheckpoint[];
  created_at: string;
}

export interface ExecutiveMetrics {
  sales: {
    totalRevenue: number;
    shopifyRevenue: number;
    amazonRevenue: number;
    totalOrders: number;
    shopifyOrders: number;
    amazonOrders: number;
    averageOrderValue: number;
  };
  financials: {
    cogs: number;
    grossProfit: number;
    grossMarginPercent: number;
    marginPerOrder: number;
    revenuePerChannel: {
      shopify: number;
      amazon: number;
    };
  };
  logistics: {
    totalShipments: number;
    deliveredCount: number;
    inTransitCount: number;
    deliveryRatePercent: number;
    onTimeRatePercent: number;
    avgLeadTimeHours: number;
    returnRatePercent: number;
    carrierBreakdown?: { [carrier: string]: number };
  };
  customers: {
    totalCustomers: number;
    repeatCustomerRate: number;
    clvEstimated: number;
    regionalHubs: Array<{ hub: string; share: number }>;
  };
  inventory: {
    totalSkus: number;
    totalUnits: number;
    inventoryValuation: number;
    lowStockCount: number;
    stockoutRiskPercent: number;
    daysOfInventoryRemaining: number;
    turnoverRatio: number;
    bestSellers?: any[];
  };
  returns?: {
    totalReturns: number;
    activeReturns: number;
    restockedCount: number;
    totalRefundedAmount: number;
    restockedInventoryValue: number;
    returnRatePercent: number;
    avgResolutionHours: number;
    restockSuccessRatePercent: number;
    reasonsBreakdown: Array<{
      reason: string;
      label: string;
      count: number;
      percentage: number;
    }>;
    channelComparison: {
      shopifyRate: number;
      amazonRate: number;
    };
  };
  performance: {
    avgLatencyMs: number;
    p95LatencyMs: number;
    slaPercent: number;
    webhookUptimePercent: number;
    requestsPerMinute: number;
  };
}

interface Toast {
  id: number;
  message: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private socket!: Socket;

  // Active module in sidebar
  activeModule: ActiveModule = 'dashboard';
  sidebarCollapsed = false;

  // Orders data
  orders: Order[] = [];
  toasts: Toast[] = [];
  toastId = 0;

  totalOrders = 0;
  shopifyOrders = 0;
  amazonOrders = 0;
  averageLatency = 0;

  // Search & Filters
  searchTerm = '';
  selectedChannel = 'ALL';
  selectedStatus = 'ALL';
  selectedLatency = 'ALL';

  // Pagination (10 en 10)
  currentPage = 1;
  pageSize = 10;

  // Module: Inventory Data
  inventoryItems: InventoryItem[] = [];
  inventoryLoading = false;

  // Module: Customers Data
  customers: CustomerRecord[] = [];
  customersLoading = false;
  revealCustomerPii = true;
  selectedAuditCustomer: CustomerRecord | null = null;

  // Module: Metrics & BI
  metrics: ExecutiveMetrics | null = null;
  metricsLoading = false;
  metricsCategory: 'financial' | 'logistics' | 'customers' | 'inventory' | 'telemetry' | 'channels' | 'returns' = 'financial';

  get returnReasons(): Array<{ reason: string; label: string; count: number; percentage: number; color: string }> {
    const list = this.metrics?.returns?.reasonsBreakdown;
    if (list && list.length > 0) {
      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];
      return list.map((item, idx) => ({
        ...item,
        color: colors[idx % colors.length]
      }));
    }
    return [
      { reason: 'DEFECTIVE', label: 'Defecto / Falla Técnica', count: 1, percentage: 20, color: '#ef4444' },
      { reason: 'SIZE_FIT', label: 'Talla / Dimensiones Incompatibles', count: 1, percentage: 20, color: '#f59e0b' },
      { reason: 'NOT_AS_DESCRIBED', label: 'Discrepancia con Descripción Web', count: 1, percentage: 20, color: '#3b82f6' },
      { reason: 'WRONG_ITEM', label: 'Artículo o Variante Equivocada', count: 1, percentage: 20, color: '#8b5cf6' },
      { reason: 'CUSTOMER_MIND', label: 'Cambio de Opinión / Desistimiento', count: 1, percentage: 20, color: '#64748b' }
    ];
  }

  get returnKpis() {
    return {
      totalReturns: this.metrics?.returns?.totalReturns || this.returns.length || 0,
      activeReturns: this.metrics?.returns?.activeReturns || this.returns.filter(r => r.status === 'requested' || r.status === 'approved').length || 0,
      restockedCount: this.metrics?.returns?.restockedCount || this.returns.filter(r => r.status === 'received_restocked').length || 0,
      totalRefunded: this.metrics?.returns?.totalRefundedAmount || this.returns.reduce((acc, r) => acc + Number(r.refund_amount || 0), 0),
      returnRate: this.metrics?.returns?.returnRatePercent || 2.1,
      restockSuccessRate: this.metrics?.returns?.restockSuccessRatePercent || 75,
      shopifyRate: this.metrics?.returns?.channelComparison?.shopifyRate || 1.8,
      amazonRate: this.metrics?.returns?.channelComparison?.amazonRate || 2.6
    };
  }

  get carrierList(): Array<{ carrier: string; count: number; percentage: number }> {
    if (!this.metrics?.logistics?.carrierBreakdown) return [];
    const total = this.metrics.logistics.totalShipments || 1;
    return Object.entries(this.metrics.logistics.carrierBreakdown).map(([carrier, count]) => ({
      carrier,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  }

  get shopifyProfit(): number {
    return (this.metrics?.sales?.shopifyRevenue || 0) * 0.58;
  }

  get amazonProfit(): number {
    return (this.metrics?.sales?.amazonRevenue || 0) * 0.58;
  }

  // Visual Charts State & Interactive SVG Helpers
  selectedChartMetric: 'revenue' | 'orders' = 'revenue';
  chartHoverIndex: number | null = null;
  readonly donutCircumference = 408.4;
  readonly slaCircumference = 339.29;

  get salesTrendData(): Array<{ date: string; shopify: number; amazon: number; total: number; orders: number }> {
    const totalRev = this.metrics?.sales?.totalRevenue || 12450;
    const shopifyRev = this.metrics?.sales?.shopifyRevenue || totalRev * 0.58;
    const amazonRev = this.metrics?.sales?.amazonRevenue || totalRev * 0.42;
    const totalOrders = this.metrics?.sales?.totalOrders || 48;

    const days = [
      { label: 'Lun', factor: 0.12, orderFactor: 0.11 },
      { label: 'Mar', factor: 0.14, orderFactor: 0.13 },
      { label: 'Mié', factor: 0.13, orderFactor: 0.15 },
      { label: 'Jue', factor: 0.16, orderFactor: 0.14 },
      { label: 'Vie', factor: 0.19, orderFactor: 0.20 },
      { label: 'Sáb', factor: 0.15, orderFactor: 0.16 },
      { label: 'Dom', factor: 0.11, orderFactor: 0.11 }
    ];

    return days.map(d => {
      const s = Math.round(shopifyRev * d.factor);
      const a = Math.round(amazonRev * d.factor);
      return {
        date: d.label,
        shopify: s,
        amazon: a,
        total: s + a,
        orders: Math.max(1, Math.round(totalOrders * d.orderFactor))
      };
    });
  }

  get trendSvgWidth(): number { return 620; }
  get trendSvgHeight(): number { return 220; }

  get trendPoints(): Array<{ x: number; yTotal: number; yShopify: number; yAmazon: number; item: any }> {
    const data = this.salesTrendData;
    const maxVal = Math.max(...data.map(d => this.selectedChartMetric === 'revenue' ? d.total : d.orders)) * 1.18 || 1000;
    const w = this.trendSvgWidth;
    const h = this.trendSvgHeight;
    const padX = 40;
    const padY = 30;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;

    return data.map((d, i) => {
      const x = padX + (i / (data.length - 1)) * usableW;
      const valTotal = this.selectedChartMetric === 'revenue' ? d.total : d.orders;
      const valShopify = this.selectedChartMetric === 'revenue' ? d.shopify : Math.round(d.orders * 0.6);
      const valAmazon = this.selectedChartMetric === 'revenue' ? d.amazon : Math.round(d.orders * 0.4);

      const yTotal = h - padY - (valTotal / maxVal) * usableH;
      const yShopify = h - padY - (valShopify / maxVal) * usableH;
      const yAmazon = h - padY - (valAmazon / maxVal) * usableH;

      return { x, yTotal, yShopify, yAmazon, item: d };
    });
  }

  get trendLinePathTotal(): string {
    const pts = this.trendPoints;
    if (pts.length === 0) return '';
    return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yTotal}` : `L ${p.x} ${p.yTotal}`)).join(' ');
  }

  get trendAreaPathTotal(): string {
    const pts = this.trendPoints;
    if (pts.length === 0) return '';
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    const bottomY = this.trendSvgHeight - 30;
    return `${this.trendLinePathTotal} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  get trendLinePathShopify(): string {
    const pts = this.trendPoints;
    if (pts.length === 0) return '';
    return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yShopify}` : `L ${p.x} ${p.yShopify}`)).join(' ');
  }

  get trendLinePathAmazon(): string {
    const pts = this.trendPoints;
    if (pts.length === 0) return '';
    return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.yAmazon}` : `L ${p.x} ${p.yAmazon}`)).join(' ');
  }

  get donutShopifyPercent(): number {
    const total = (this.metrics?.sales?.totalRevenue || 1);
    const shopify = (this.metrics?.sales?.shopifyRevenue || 0);
    return Math.round((shopify / (total || 1)) * 100) || 58;
  }

  get donutAmazonPercent(): number {
    return 100 - this.donutShopifyPercent;
  }

  get donutShopifyDash(): string {
    const val = (this.donutShopifyPercent / 100) * this.donutCircumference;
    return `${val} ${this.donutCircumference}`;
  }

  get donutAmazonDash(): string {
    const val = (this.donutAmazonPercent / 100) * this.donutCircumference;
    return `${val} ${this.donutCircumference}`;
  }

  get donutAmazonOffset(): number {
    return -((this.donutShopifyPercent / 100) * this.donutCircumference);
  }

  get slaScorePercent(): number {
    return this.metrics?.performance?.slaPercent || 99.8;
  }

  get slaDashArray(): string {
    const val = (this.slaScorePercent / 100) * this.slaCircumference;
    return `${val} ${this.slaCircumference}`;
  }

  get latencySparklinePoints(): Array<{ x: number; y: number; latency: number }> {
    const latencies = this.orders.slice(0, 10).map(o => o.sync_latency_ms).reverse();
    const fallback = [1250, 980, 1420, 1100, 890, 1650, 1020, 1180, 940, 1200];
    const data = latencies.length >= 5 ? latencies : fallback;
    const maxVal = 5000;
    const w = 340;
    const h = 80;

    return data.map((lat, i) => {
      const x = 15 + (i / (data.length - 1)) * (w - 30);
      const y = h - 15 - (Math.min(lat, maxVal) / maxVal) * (h - 30);
      return { x, y, latency: lat };
    });
  }

  get latencySparklinePath(): string {
    const pts = this.latencySparklinePoints;
    if (pts.length === 0) return '';
    return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }

  get inventoryChartItems(): Array<{ sku: string; name: string; stock: number; maxStock: number; isLow: boolean }> {
    const items = this.inventoryItems.slice(0, 6);
    if (items.length === 0) {
      return [
        { sku: 'APX-900', name: 'Industrial Hub Pro', stock: 45, maxStock: 60, isLow: false },
        { sku: 'APX-750', name: 'Smart Gateway v2', stock: 12, maxStock: 60, isLow: true },
        { sku: 'APX-420', name: 'Sensor Array IoT', stock: 38, maxStock: 60, isLow: false },
        { sku: 'APX-310', name: 'Telemetry Bridge', stock: 8, maxStock: 60, isLow: true },
        { sku: 'APX-105', name: 'Fiber Repeater 10G', stock: 52, maxStock: 60, isLow: false }
      ];
    }
    const max = Math.max(...items.map(i => i.stock_quantity), 60);
    return items.map(i => ({
      sku: i.sku,
      name: i.product_name,
      stock: i.stock_quantity,
      maxStock: max,
      isLow: i.stock_quantity < 15
    }));
  }

  // Module: Suppliers & Procurement
  suppliers: Supplier[] = [];
  suppliersLoading = false;
  purchaseOrders: PurchaseOrder[] = [];
  purchaseOrdersLoading = false;
  supplierSubTab: 'directory' | 'purchase_orders' | 'alerts' = 'directory';
  supplierSearch = '';

  // Interactive Restock Modal State
  showRestockModal = false;
  restockSupplier: Supplier | null = null;
  restockSelectedSku = '';
  restockUnits = 25;
  restockLoading = false;

  // Supplier Register / Edit Modal State
  showSupplierModal = false;
  editingSupplier: Supplier | null = null;
  supplierForm = {
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    country: 'USA',
    category: 'Hardware y Periféricos',
    lead_time_days: 3,
    rating: 4.8
  };
  supplierSaving = false;

  // Module: Logistics & Real Shipments (Rutas y ¿Ya llegó?)
  realShipments: RealShipment[] = [];
  shipmentsLoading = false;
  advancingShipmentId = '';

  // High-Volume Logistics Automation & Filtering
  autoDispatchActive = false;
  bulkDispatching = false;
  simulatingBatch = false;
  shipmentFilter = 'ALL';
  shipmentCarrierFilter = 'ALL';
  shipmentChannelFilter = 'ALL';
  shipmentArrivalFilter = 'ALL';
  shipmentSearch = '';
  shipmentCurrentPage = 1;
  shipmentPageSize = 10;
  shipmentPageSizeOptions = [2, 3, 5, 10, 25];

  // Mercado Libre Style Live Tracking Modal
  selectedTrackingShipment: RealShipment | null = null;
  showTrackingModal = false;
  trackingCopied = false;
  purgingRetention = false;

  // Module: Returns & RMA Data
  returns: ReturnRecord[] = [];
  returnsLoading = false;
  returnStatusFilter = 'ALL';
  returnReasonFilter = 'ALL';
  returnSearch = '';
  returnCurrentPage = 1;
  returnPageSize = 10;
  returnPageSizeOptions = [2, 3, 5, 10];

  onReturnPageSizeChange() {
    this.returnCurrentPage = 1;
  }
  showReturnModal = false;
  processingReturnId: string | null = null;

  // New Return Form
  newReturnOrderId = '';
  newReturnChannel = 'Shopify';
  newReturnCustomer = '';
  newReturnSku = '';
  newReturnProduct = '';
  newReturnQty = 1;
  newReturnAmount = 0;
  newReturnReason = 'DEFECTIVE';
  newReturnRestock = true;
  newReturnNotes = '';

  get filteredReturns(): ReturnRecord[] {
    let list = this.returns;
    if (this.returnStatusFilter !== 'ALL') {
      list = list.filter(r => r.status === this.returnStatusFilter);
    }
    if (this.returnReasonFilter !== 'ALL') {
      list = list.filter(r => r.reason === this.returnReasonFilter);
    }
    if (this.returnSearch.trim()) {
      const q = this.returnSearch.toLowerCase();
      list = list.filter(r =>
        (r.return_number && r.return_number.toLowerCase().includes(q)) ||
        (r.external_order_id && r.external_order_id.toLowerCase().includes(q)) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        (r.sku && r.sku.toLowerCase().includes(q)) ||
        (r.product_name && r.product_name.toLowerCase().includes(q))
      );
    }
    return list;
  }

  get paginatedReturns(): ReturnRecord[] {
    const start = (this.returnCurrentPage - 1) * this.returnPageSize;
    return this.filteredReturns.slice(start, start + this.returnPageSize);
  }

  get totalReturnPages(): number {
    return Math.max(1, Math.ceil(this.filteredReturns.length / this.returnPageSize));
  }

  // Module 7: DevOps health data
  systemUptime = 0;
  serverStatus = 'Online (Healthy)';
  isSimulating = false;

  // User & RBAC
  currentUserEmail = 'admin@ordersync.app';
  currentRole: UserRole = (localStorage.getItem('ordersync_role') as UserRole) || 'Admin';

  // Module: User Management (Admin-only creation)
  systemUsers: any[] = [];
  usersLoading = false;
  newEmail = '';
  newPassword = '';
  newRole: UserRole = 'Operator';
  userCreationError = '';

  // Module: Inventory Product Creation
  showProductForm = false;
  newProdSku = '';
  newProdName = '';
  newProdStock = 40;
  newProdSupplier = 'Apex Global Electronics';
  newProdCost = 50.00;
  newProdPrice = 119.99;

  constructor(
    private http: HttpClient,
    private router: Router,
    public translationService: TranslationService
  ) {}

  get t() {
    return this.translationService.t;
  }

  get currentLang(): SupportedLanguage {
    return this.translationService.currentLang;
  }

  get shopifyAov(): number {
    if (!this.metrics?.sales?.shopifyOrders) return 0;
    return (this.metrics.sales.shopifyRevenue || 0) / this.metrics.sales.shopifyOrders;
  }

  get amazonAov(): number {
    if (!this.metrics?.sales?.amazonOrders) return 0;
    return (this.metrics.sales.amazonRevenue || 0) / this.metrics.sales.amazonOrders;
  }

  ngOnInit() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.email) this.currentUserEmail = u.email;
        if (u.role) this.currentRole = u.role;
      } catch {}
    }

    this.loadInitialOrders();
    this.loadInventory();
    this.loadCustomers();
    this.loadUsers();
    this.loadMetrics();
    this.loadSuppliers();
    this.loadPurchaseOrders();
    this.loadShipments();
    this.loadReturns();
    this.loadHealth();

    this.http.get<any>('http://localhost:3000/api/shipments/auto-engine/status').subscribe({
      next: (res) => { this.autoDispatchActive = !!res.active; }
    });

    this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.serverStatus = 'Online (Healthy)';
    });

    this.socket.on('disconnect', () => {
      this.serverStatus = 'Disconnected / Reconnecting';
    });

    this.socket.on('AUTO_DISPATCH_STATUS', (data: any) => {
      this.autoDispatchActive = data.active;
    });

    this.socket.on('SHIPMENT_UPDATED', (updatedShipment: RealShipment) => {
      const idx = this.realShipments.findIndex(s => s.id === updatedShipment.id);
      if (idx !== -1) {
        this.realShipments[idx] = updatedShipment;
      } else {
        this.realShipments.unshift(updatedShipment);
      }
      if (this.selectedTrackingShipment && this.selectedTrackingShipment.id === updatedShipment.id) {
        this.selectedTrackingShipment = updatedShipment;
      }
      this.loadMetrics();
    });

    this.socket.on('SHIPMENTS_BATCH_UPDATED', () => {
      this.loadShipments();
      this.loadMetrics();
    });

    this.socket.on('SHIPMENTS_PURGED', () => {
      this.loadShipments();
      this.loadMetrics();
    });

    this.socket.on('SHIPMENTS_CLEARED', () => {
      this.realShipments = [];
      if (this.selectedTrackingShipment) {
        this.closeTrackingModal();
      }
      this.loadMetrics();
    });

    this.socket.on('PURCHASE_ORDER_CREATED', (newPo: PurchaseOrder) => {
      this.purchaseOrders.unshift(newPo);
      this.loadInventory();
      this.loadMetrics();
    });

    this.socket.on('BATCH_SYNC_COMPLETED', () => {
      this.loadInitialOrders();
      this.loadInventory();
      this.loadShipments();
      this.loadReturns();
      this.loadMetrics();
    });

    this.socket.on('RETURN_CREATED', (newRet: ReturnRecord) => {
      this.returns.unshift(newRet);
      this.loadMetrics();
      this.showToast(`Nueva Solicitud de Devolución ${newRet.return_number} registrada (${newRet.channel})`);
    });

    this.socket.on('RETURN_UPDATED', (upRet: ReturnRecord) => {
      const idx = this.returns.findIndex(r => r.id === upRet.id);
      if (idx !== -1) {
        this.returns[idx] = upRet;
      }
      this.loadMetrics();
      this.loadInventory();
    });

    this.socket.on('INVENTORY_UPDATED', () => {
      this.loadInventory();
      this.loadMetrics();
    });

    this.socket.on('ORDER_SYNCED', (order: Order) => {
      this.orders.unshift(order);
      this.recalculateKPIs();
      this.loadInventory();
      this.loadCustomers();
      this.loadShipments();
      this.loadMetrics();
      this.showToast(
        `New ${order.channel} Order Synced: ${order.external_order_id} in ${order.sync_latency_ms}ms`
      );
    });
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  setActiveModule(module: ActiveModule) {
    this.activeModule = module;
    if (module === 'metrics') this.loadMetrics();
    if (module === 'inventory') this.loadInventory();
    if (module === 'suppliers') {
      this.loadSuppliers();
      this.loadPurchaseOrders();
    }
    if (module === 'customers') this.loadCustomers();
    if (module === 'users') this.loadUsers();
    if (module === 'logistics') this.loadShipments();
    if (module === 'returns') this.loadReturns();
    if (module === 'devops') this.loadHealth();
  }

  loadReturns() {
    this.returnsLoading = true;
    this.http.get<ReturnRecord[]>('http://localhost:3000/api/returns').subscribe({
      next: (data) => {
        this.returns = data;
        this.returnsLoading = false;
      },
      error: (err) => {
        console.error('Error loading returns:', err);
        this.returnsLoading = false;
      }
    });
  }

  processReturn(ret: ReturnRecord, action: 'approve' | 'receive_restock' | 'decline') {
    this.processingReturnId = ret.id;
    this.http.post<any>(`http://localhost:3000/api/returns/${ret.id}/process`, {
      action,
      restock_inventory: ret.restock_inventory
    }).subscribe({
      next: (res) => {
        this.processingReturnId = null;
        if (res.return) {
          const idx = this.returns.findIndex(r => r.id === ret.id);
          if (idx !== -1) {
            this.returns[idx] = res.return;
          }
        }
        if (res.restocked) {
          this.showToast(`Producto reingresado a inventario: +${ret.quantity} unidades para ${ret.sku}`);
          this.loadInventory();
        } else if (action === 'approve') {
          this.showToast(`Devolución ${ret.return_number} aprobada. Guía en tránsito hacia almacén.`);
        } else if (action === 'decline') {
          this.showToast(`Devolución ${ret.return_number} rechazada.`);
        }
        this.loadMetrics();
      },
      error: (err) => {
        this.processingReturnId = null;
        console.error('Error processing return:', err);
        this.showToast('Error al procesar la devolución.');
      }
    });
  }

  get shopifyOrdersList(): Order[] {
    return this.orders.filter(o => o.channel === 'Shopify');
  }

  openReturnModal(prefillOrder?: Order) {
    const firstShopify = this.shopifyOrdersList[0];
    if (prefillOrder) {
      this.populateReturnFromOrder(prefillOrder);
    } else if (firstShopify) {
      this.populateReturnFromOrder(firstShopify);
    } else {
      this.newReturnOrderId = `#${Math.floor(1000 + Math.random() * 9000)}`;
      this.newReturnChannel = 'Shopify';
      this.newReturnCustomer = 'Carlos Mendoza';
      this.newReturnSku = this.inventoryItems[0]?.sku || 'SKU-4821';
      this.newReturnProduct = this.inventoryItems[0]?.product_name || 'Premium Widget';
      this.newReturnAmount = 199.99;
    }
    this.newReturnQty = 1;
    this.newReturnReason = 'DEFECTIVE';
    this.newReturnRestock = true;
    this.newReturnNotes = '';
    this.showReturnModal = true;
  }

  onSelectShopifyOrder(event: any) {
    const selectedExtId = event.target.value;
    const found = this.orders.find(o => o.external_order_id === selectedExtId);
    if (found) {
      this.populateReturnFromOrder(found);
    }
  }

  populateReturnFromOrder(order: Order) {
    this.newReturnOrderId = order.external_order_id;
    this.newReturnChannel = 'Shopify';
    this.newReturnCustomer = order.customer?.full_name || 'Carlos Mendoza';
    this.newReturnAmount = order.total_amount || 199.99;

    if (order.items && order.items.length > 0) {
      this.newReturnSku = order.items[0].sku;
      this.newReturnProduct = order.items[0].product_name;
    } else {
      const invMatch = this.inventoryItems.find(i => i.sku === 'SKU-4821') || this.inventoryItems[0];
      this.newReturnSku = invMatch?.sku || 'SKU-4821';
      this.newReturnProduct = invMatch?.product_name || 'Premium Widget';
    }
  }

  closeReturnModal() {
    this.showReturnModal = false;
  }

  onReturnSkuChange() {
    const found = this.inventoryItems.find(i => i.sku === this.newReturnSku);
    if (found) {
      this.newReturnProduct = found.product_name;
      this.newReturnAmount = Number(found.sale_price || 99.99) * this.newReturnQty;
    }
  }

  triggerSimulateShopifyRefund() {
    this.isSimulating = true;
    const shopifyOrders = this.orders.filter(o => o.channel === 'Shopify');
    const targetOrder = shopifyOrders.length > 0 ? shopifyOrders[0] : null;
    const rawOrderId = targetOrder ? targetOrder.external_order_id.replace(/[^0-9]/g, '') : '3238';

    const payload = {
      id: Math.floor(1000000000 + Math.random() * 9000000000),
      order_id: rawOrderId,
      refund_line_items: [
        {
          quantity: 1,
          subtotal: targetOrder?.total_amount ? String(targetOrder.total_amount) : '199.99',
          line_item: {
            title: targetOrder?.items?.[0]?.product_name || 'Premium Widget',
            sku: targetOrder?.items?.[0]?.sku || 'SKU-4821',
            price: targetOrder?.total_amount ? String(targetOrder.total_amount) : '199.99'
          }
        }
      ],
      customer: {
        first_name: targetOrder?.customer?.full_name?.split(' ')[0] || 'Carlos',
        last_name: targetOrder?.customer?.full_name?.split(' ').slice(1).join(' ') || 'Mendoza'
      }
    };

    this.http.post('http://localhost:3000/api/simulate/shopify-refund', payload).subscribe({
      next: (res: any) => {
        this.isSimulating = false;
        this.showToast(`Devolución Shopify procesada vía Webhook: ${res.return?.return_number}`);
        this.loadReturns();
        this.loadInventory();
        this.loadInitialOrders();
      },
      error: (err) => {
        this.isSimulating = false;
        console.error('Error simulating Shopify refund:', err);
        this.showToast('Error al simular devolución Shopify');
      }
    });
  }

  submitNewReturn() {
    if (!this.newReturnOrderId || !this.newReturnSku || !this.newReturnCustomer) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    const payload = {
      external_order_id: this.newReturnOrderId,
      channel: this.newReturnChannel,
      customer_name: this.newReturnCustomer,
      sku: this.newReturnSku,
      product_name: this.newReturnProduct,
      quantity: this.newReturnQty,
      refund_amount: this.newReturnAmount,
      currency: 'USD',
      reason: this.newReturnReason,
      restock_inventory: this.newReturnRestock,
      notes: this.newReturnNotes
    };

    this.http.post<ReturnRecord>('http://localhost:3000/api/returns', payload).subscribe({
      next: (created) => {
        this.closeReturnModal();
        this.showToast(`Devolución ${created.return_number} registrada formalmente.`);
        this.loadReturns();
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Error creating return:', err);
        alert('Error al registrar la devolución.');
      }
    });
  }

  loadMetrics() {
    this.metricsLoading = true;
    this.http.get<ExecutiveMetrics>('http://localhost:3000/api/metrics').subscribe({
      next: (data) => {
        this.metrics = data;
        this.metricsLoading = false;
      },
      error: (err) => {
        console.error('Error loading metrics:', err);
        this.metricsLoading = false;
      }
    });
  }

  loadSuppliers() {
    this.suppliersLoading = true;
    this.http.get<Supplier[]>('http://localhost:3000/api/suppliers').subscribe({
      next: (data) => {
        this.suppliers = data;
        this.suppliersLoading = false;
      },
      error: (err) => {
        console.error('Error loading suppliers:', err);
        this.suppliersLoading = false;
      }
    });
  }

  loadShipments() {
    this.shipmentsLoading = true;
    this.http.get<RealShipment[]>('http://localhost:3000/api/shipments').subscribe({
      next: (data) => {
        this.realShipments = data;
        this.shipmentsLoading = false;
      },
      error: (err) => {
        console.error('Error loading shipments:', err);
        this.shipmentsLoading = false;
      }
    });
  }

  advanceShipment(shipment: RealShipment) {
    this.advancingShipmentId = shipment.id;
    this.http.post<any>(`http://localhost:3000/api/shipments/${shipment.id}/advance`, {}).subscribe({
      next: (res) => {
        this.showToast(res.message || 'Ruta actualizada con éxito');
        this.advancingShipmentId = '';
        if (res.shipment) {
          const idx = this.realShipments.findIndex(s => s.id === res.shipment.id);
          if (idx !== -1) {
            this.realShipments[idx] = res.shipment;
          }
          if (this.selectedTrackingShipment && this.selectedTrackingShipment.id === res.shipment.id) {
            this.selectedTrackingShipment = res.shipment;
          }
        }
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Error advancing shipment:', err);
        this.advancingShipmentId = '';
        this.showToast('Error al actualizar la ruta del paquete');
      }
    });
  }

  toggleAutoDispatch() {
    this.http.post<any>('http://localhost:3000/api/shipments/auto-engine/toggle', {}).subscribe({
      next: (res) => {
        this.autoDispatchActive = res.active;
        this.showToast(res.message);
      },
      error: () => this.showToast('Error al alternar motor de despacho')
    });
  }

  bulkAdvanceShipments() {
    this.bulkDispatching = true;
    this.http.post<any>('http://localhost:3000/api/shipments/batch-advance', {}).subscribe({
      next: (res) => {
        this.bulkDispatching = false;
        this.showToast(res.message);
        this.loadShipments();
        this.loadMetrics();
      },
      error: () => {
        this.bulkDispatching = false;
        this.showToast('Error en sincronización masiva de transportistas');
      }
    });
  }

  simulateHighVolumeBatch(count: number = 20) {
    this.simulatingBatch = true;
    this.http.post<any>('http://localhost:3000/api/orders/simulate-batch', { count }).subscribe({
      next: (res) => {
        this.simulatingBatch = false;
        this.showToast(res.message);
        this.loadInitialOrders();
        this.loadInventory();
        this.loadShipments();
        this.loadMetrics();
      },
      error: () => {
        this.simulatingBatch = false;
        this.showToast('Error al simular lote masivo');
      }
    });
  }

  // Mercado Libre Style Tracking Handlers
  openTrackingModal(shipment: RealShipment) {
    this.selectedTrackingShipment = shipment;
    this.showTrackingModal = true;
    this.trackingCopied = false;
  }

  closeTrackingModal() {
    this.showTrackingModal = false;
    this.selectedTrackingShipment = null;
    this.trackingCopied = false;
  }

  copyTrackingNumber(tracking: string) {
    if (!tracking) return;
    navigator.clipboard.writeText(tracking).then(() => {
      this.trackingCopied = true;
      setTimeout(() => {
        this.trackingCopied = false;
      }, 2500);
    }).catch(() => {
      this.showToast(`Guía copiada: ${tracking}`);
    });
  }

  resetShipmentFilters() {
    this.shipmentFilter = 'ALL';
    this.shipmentCarrierFilter = 'ALL';
    this.shipmentChannelFilter = 'ALL';
    this.shipmentArrivalFilter = 'ALL';
    this.shipmentSearch = '';
    this.shipmentCurrentPage = 1;
    this.showToast('Filtros restablecidos');
  }

  onShipmentPageSizeChange() {
    this.shipmentCurrentPage = 1;
  }

  exportShipmentsCSV() {
    const list = this.filteredShipments.length > 0 ? this.filteredShipments : this.realShipments;
    if (list.length === 0) {
      this.showToast('No hay envíos disponibles para exportar');
      return;
    }

    const headers = [
      'ID Pedido',
      'Canal',
      'Transportista',
      'Numero de Guia',
      'Origen',
      'Destino',
      'Fase Actual',
      'Ya Llego (Entregado)',
      'Fecha Estimada',
      'Fecha Creacion'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = list.map(s => [
      escapeCsv(s.external_order_id),
      escapeCsv(s.channel),
      escapeCsv(s.carrier),
      escapeCsv(s.tracking_number),
      escapeCsv(s.origin || 'Houston Fulfillment Hub (TX)'),
      escapeCsv(s.destination),
      escapeCsv(s.current_step),
      escapeCsv(s.is_delivered ? 'SI' : 'NO'),
      escapeCsv(s.estimated_delivery),
      escapeCsv(s.created_at || new Date().toISOString())
    ].join(','));

    // UTF-8 BOM (\uFEFF) for immediate Latin/Spanish encoding in Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `OrderSync_Envios_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast(`Exportación lista: ${list.length} registros exportados a CSV`);
  }

  clearShipmentsTable() {
    if (!confirm('¿Confirmas que deseas limpiar todos los registros de la tabla de envíos y rutas?')) {
      return;
    }
    this.http.post<any>('http://localhost:3000/api/shipments/clear-all', {}).subscribe({
      next: (res) => {
        this.realShipments = [];
        this.showToast(res.message || 'Tabla de rutas limpiada con éxito');
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Error clearing shipments:', err);
        this.showToast('Error al limpiar la tabla de envíos');
      }
    });
  }

  purgeRetentionOldShipments(days: number = 60) {
    this.purgingRetention = true;
    this.http.post<any>('http://localhost:3000/api/shipments/retention/purge', { days }).subscribe({
      next: (res) => {
        this.purgingRetention = false;
        this.showToast(res.message);
        this.loadShipments();
        this.loadMetrics();
      },
      error: (err) => {
        this.purgingRetention = false;
        console.error('Error purging retention:', err);
        this.showToast('Error al ejecutar la política de retención');
      }
    });
  }

  get inTransitShipmentsCount(): number {
    return this.realShipments.filter(s => !s.is_delivered).length;
  }

  get deliveredShipmentsCount(): number {
    return this.realShipments.filter(s => s.is_delivered).length;
  }

  get filteredShipments(): RealShipment[] {
    return this.realShipments.filter((s) => {
      const term = this.shipmentSearch.trim().toLowerCase();
      const matchesSearch =
        !term ||
        (s.external_order_id && s.external_order_id.toLowerCase().includes(term)) ||
        (s.tracking_number && s.tracking_number.toLowerCase().includes(term)) ||
        (s.destination && s.destination.toLowerCase().includes(term)) ||
        (s.carrier && s.carrier.toLowerCase().includes(term));

      let matchesPhase = true;
      const f = this.shipmentFilter.toLowerCase();
      if (f !== 'all') {
        if (f === 'delivered') {
          matchesPhase = s.is_delivered || s.current_step === 'delivered';
        } else {
          matchesPhase = s.current_step === f;
        }
      }

      let matchesCarrier = true;
      if (this.shipmentCarrierFilter !== 'ALL') {
        matchesCarrier = s.carrier === this.shipmentCarrierFilter;
      }

      let matchesChannel = true;
      if (this.shipmentChannelFilter !== 'ALL') {
        matchesChannel = s.channel === this.shipmentChannelFilter;
      }

      let matchesArrival = true;
      if (this.shipmentArrivalFilter === 'delivered') {
        matchesArrival = s.is_delivered === true;
      } else if (this.shipmentArrivalFilter === 'pending') {
        matchesArrival = s.is_delivered === false;
      }

      return matchesSearch && matchesPhase && matchesCarrier && matchesChannel && matchesArrival;
    });
  }

  get paginatedShipments(): RealShipment[] {
    const start = (this.shipmentCurrentPage - 1) * this.shipmentPageSize;
    return this.filteredShipments.slice(start, start + this.shipmentPageSize);
  }

  get totalShipmentPages(): number {
    return Math.ceil(this.filteredShipments.length / this.shipmentPageSize) || 1;
  }

  setShipmentPage(page: number) {
    if (page >= 1 && page <= this.totalShipmentPages) {
      this.shipmentCurrentPage = page;
    }
  }

  // Getters for Suppliers & Procurement Module
  get filteredSuppliers(): Supplier[] {
    const q = this.supplierSearch.trim().toLowerCase();
    if (!q) return this.suppliers;
    return this.suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.country && s.country.toLowerCase().includes(q)) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(q))
    );
  }

  get lowStockInventoryItems(): InventoryItem[] {
    return this.inventoryItems.filter((item: InventoryItem) => (item.stock_quantity || 0) < 20);
  }

  get selectedRestockProduct(): InventoryItem | undefined {
    return this.inventoryItems.find((i: InventoryItem) => i.sku === this.restockSelectedSku);
  }

  get estimatedRestockCost(): number {
    const cost = this.selectedRestockProduct?.unit_cost || 45.00;
    return Number(((this.restockUnits || 0) * cost).toFixed(2));
  }

  get totalPoUnits(): number {
    return this.purchaseOrders.reduce((sum, po) => sum + (po.units || 0), 0);
  }

  get totalPoCost(): number {
    return this.purchaseOrders.reduce((sum, po) => sum + (Number(po.total_cost) || 0), 0);
  }

  loadPurchaseOrders() {
    this.purchaseOrdersLoading = true;
    this.http.get<PurchaseOrder[]>('http://localhost:3000/api/purchase-orders').subscribe({
      next: (data) => {
        this.purchaseOrders = data;
        this.purchaseOrdersLoading = false;
      },
      error: (err) => {
        console.error('Error loading purchase orders:', err);
        this.purchaseOrdersLoading = false;
      }
    });
  }

  openRestockModal(supplier?: Supplier, defaultSku?: string, units: number = 25) {
    if (this.suppliers.length === 0) {
      this.loadSuppliers();
    }

    if (supplier) {
      this.restockSupplier = supplier;
    } else if (defaultSku) {
      const prod = this.inventoryItems.find((i: InventoryItem) => i.sku === defaultSku);
      if (prod && prod.supplier_name) {
        const found = this.suppliers.find((s: Supplier) => s.name.toLowerCase() === prod.supplier_name?.toLowerCase());
        this.restockSupplier = found || (this.suppliers.length > 0 ? this.suppliers[0] : null);
      } else {
        this.restockSupplier = this.suppliers.length > 0 ? this.suppliers[0] : null;
      }
    } else {
      this.restockSupplier = this.suppliers.length > 0 ? this.suppliers[0] : null;
    }

    if (defaultSku) {
      this.restockSelectedSku = defaultSku;
    } else if (this.inventoryItems.length > 0) {
      this.restockSelectedSku = this.inventoryItems[0].sku;
    } else {
      this.restockSelectedSku = 'SKU-4821';
    }
    this.restockUnits = units;
    this.showRestockModal = true;
  }

  onRestockSkuChange(sku: string) {
    this.restockSelectedSku = sku;
    const prod = this.inventoryItems.find((i: InventoryItem) => i.sku === sku);
    if (prod && prod.supplier_name) {
      const found = this.suppliers.find((s: Supplier) => s.name.toLowerCase() === prod.supplier_name?.toLowerCase());
      if (found) {
        this.restockSupplier = found;
      }
    }
  }

  closeRestockModal() {
    this.showRestockModal = false;
  }

  confirmRestockOrder() {
    if (!this.restockSupplier) {
      this.showToast('Por favor seleccione un proveedor válido');
      return;
    }
    if (!this.restockSelectedSku) {
      this.showToast('Por favor seleccione un producto a surtir');
      return;
    }
    if (!this.restockUnits || this.restockUnits <= 0) {
      this.showToast('Ingrese una cantidad válida mayor a 0');
      return;
    }

    this.restockLoading = true;
    this.http.post<any>(`http://localhost:3000/api/suppliers/${this.restockSupplier.id}/order`, {
      sku: this.restockSelectedSku,
      units: this.restockUnits
    }).subscribe({
      next: (res) => {
        this.restockLoading = false;
        this.showRestockModal = false;
        this.showToast(res.message || 'Orden de surtido procesada exitosamente.');
        this.loadInventory();
        this.loadMetrics();
        this.loadPurchaseOrders();
      },
      error: (err) => {
        this.restockLoading = false;
        console.error('Error placing restock order:', err);
        this.showToast('Error al procesar la orden de surtido.');
      }
    });
  }

  openSupplierModal(supplier?: Supplier) {
    if (supplier) {
      this.editingSupplier = supplier;
      this.supplierForm = {
        name: supplier.name,
        contact_name: supplier.contact_name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        country: supplier.country || 'USA',
        category: supplier.category || 'Hardware y Periféricos',
        lead_time_days: supplier.lead_time_days || 3,
        rating: Number(supplier.rating) || 4.8
      };
    } else {
      this.editingSupplier = null;
      this.supplierForm = {
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        country: 'USA',
        category: 'Hardware y Periféricos',
        lead_time_days: 3,
        rating: 4.8
      };
    }
    this.showSupplierModal = true;
  }

  closeSupplierModal() {
    this.showSupplierModal = false;
    this.editingSupplier = null;
  }

  saveSupplier() {
    if (!this.supplierForm.name.trim()) {
      this.showToast('El nombre del proveedor es obligatorio');
      return;
    }

    this.supplierSaving = true;
    if (this.editingSupplier) {
      this.http.put<Supplier>(`http://localhost:3000/api/suppliers/${this.editingSupplier.id}`, this.supplierForm).subscribe({
        next: (updated) => {
          this.supplierSaving = false;
          this.closeSupplierModal();
          this.showToast(`Proveedor "${updated.name}" actualizado.`);
          this.loadSuppliers();
        },
        error: (err) => {
          this.supplierSaving = false;
          console.error('Error updating supplier:', err);
          this.showToast('Error al actualizar proveedor');
        }
      });
    } else {
      this.http.post<Supplier>('http://localhost:3000/api/suppliers', this.supplierForm).subscribe({
        next: (created) => {
          this.supplierSaving = false;
          this.closeSupplierModal();
          this.showToast(`Proveedor "${created.name}" registrado exitosamente.`);
          this.loadSuppliers();
        },
        error: (err) => {
          this.supplierSaving = false;
          console.error('Error creating supplier:', err);
          this.showToast('Error al registrar proveedor');
        }
      });
    }
  }

  deleteSupplier(supplier: Supplier) {
    if (!confirm(`¿Está seguro de eliminar al proveedor "${supplier.name}"?`)) return;
    this.http.delete<any>(`http://localhost:3000/api/suppliers/${supplier.id}`).subscribe({
      next: (res) => {
        this.showToast(res.message || 'Proveedor eliminado.');
        this.loadSuppliers();
      },
      error: (err) => {
        console.error('Error deleting supplier:', err);
        this.showToast('No se pudo eliminar el proveedor.');
      }
    });
  }

  loadUsers() {
    this.usersLoading = true;
    this.http.get<any[]>('http://localhost:3000/api/users').subscribe({
      next: (data) => {
        this.systemUsers = data;
        this.usersLoading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.usersLoading = false;
      }
    });
  }

  createUser() {
    this.userCreationError = '';
    if (!this.newEmail.trim() || !this.newPassword.trim()) {
      this.userCreationError = 'Email and password are required.';
      return;
    }

    if (this.currentRole !== 'Admin') {
      this.userCreationError = 'Access Denied: Only administrators have authority to create new users.';
      return;
    }

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    this.http.post<any>('http://localhost:3000/api/users', {
      email: this.newEmail.trim(),
      password: this.newPassword.trim(),
      role: this.newRole,
      requesterRole: this.currentRole
    }, { headers }).subscribe({
      next: (res) => {
        this.showToast(res.message || 'User registered successfully');
        this.newEmail = '';
        this.newPassword = '';
        this.newRole = 'Operator';
        this.loadUsers();
      },
      error: (err) => {
        this.userCreationError = err.error?.error || 'Failed to create user.';
      }
    });
  }

  loadInitialOrders() {
    this.http.get<any[]>('http://localhost:3000/api/orders').subscribe({
      next: (data) => {
        this.orders = data.map((o) => ({
          ...o,
          total_amount: parseFloat(o.total_amount),
          customer: o.customer || {
            full_name: 'Cliente General',
            shipping_address: 'Almacén Principal'
          }
        }));
        this.recalculateKPIs();
      },
      error: (err) => console.error('Error loading orders:', err)
    });
  }

  openAuditCustomerModal(c: CustomerRecord) {
    this.selectedAuditCustomer = c;
  }

  closeAuditCustomerModal() {
    this.selectedAuditCustomer = null;
  }

  loadInventory() {
    this.inventoryLoading = true;
    this.http.get<InventoryItem[]>('http://localhost:3000/api/inventory').subscribe({
      next: (items) => {
        this.inventoryItems = items;
        this.inventoryLoading = false;
      },
      error: () => {
        this.inventoryLoading = false;
      }
    });
  }

  restockProduct(sku: string, amount: number) {
    this.http.post('http://localhost:3000/api/inventory/restock', { sku, amount }).subscribe({
      next: () => {
        this.showToast(`Restocked ${amount} units for ${sku}`);
        this.loadInventory();
      },
      error: (err) => console.error('Error restocking:', err)
    });
  }

  loadCustomers() {
    this.customersLoading = true;
    this.http.get<CustomerRecord[]>('http://localhost:3000/api/customers').subscribe({
      next: (records) => {
        this.customers = records;
        this.customersLoading = false;
      },
      error: () => {
        this.customersLoading = false;
      }
    });
  }

  loadHealth() {
    this.http.get<any>('http://localhost:3000/health').subscribe({
      next: (res) => {
        this.systemUptime = Math.floor(res.uptime || 0);
      },
      error: () => {
        this.serverStatus = 'Offline';
      }
    });
  }

  createInventoryProduct() {
    if (!this.newProdSku.trim() || !this.newProdName.trim()) {
      this.showToast('SKU y Nombre de producto son requeridos');
      return;
    }

    this.http.post<any>('http://localhost:3000/api/inventory', {
      sku: this.newProdSku.trim().toUpperCase(),
      product_name: this.newProdName.trim(),
      stock_quantity: Number(this.newProdStock) || 0,
      supplier_name: this.newProdSupplier,
      unit_cost: Number(this.newProdCost) || 45.00,
      sale_price: Number(this.newProdPrice) || 89.99
    }).subscribe({
      next: (res) => {
        this.showToast(`Producto ${res.sku} creado con éxito en inventario`);
        this.newProdSku = '';
        this.newProdName = '';
        this.newProdStock = 40;
        this.showProductForm = false;
        this.loadInventory();
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Error creating product:', err);
        this.showToast('Error al registrar producto en inventario');
      }
    });
  }

  triggerSimulatedPurchase(channel: 'Shopify' | 'Amazon') {
    this.isSimulating = true;
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const endpoint = channel === 'Shopify'
      ? 'http://localhost:3000/api/v1/webhooks/shopify'
      : 'http://localhost:3000/api/v1/webhooks/amazon';

    // Pick an existing inventory product dynamically so stock is visibly deducted!
    const chosen = this.inventoryItems.length > 0
      ? this.inventoryItems[Math.floor(Math.random() * this.inventoryItems.length)]
      : { sku: 'LAPTOP-X1', product_name: 'Dell XPS Enterprise Laptop', sale_price: 299.99 };

    const price = Number(chosen.sale_price) || 199.99;

    const simulatedShopifyCustomers = [
      { name: 'Alejandro Morales', address1: '1240 Post Oak Blvd, Apt 4B', city: 'Houston', province: 'TX', zip: '77056', phone: '+1-713-555-0112' },
      { name: 'Sofía Navarro Vega', address1: '450 Lexington Ave, Suite 1200', city: 'New York', province: 'NY', zip: '10017', phone: '+1-212-555-0184' },
      { name: 'Valentina Cruz Méndez', address1: '800 Brickell Ave, Floor 9', city: 'Miami', province: 'FL', zip: '33131', phone: '+1-305-555-0199' },
      { name: 'Mateo Silva Castillo', address1: '200 S Wacker Dr, Suite 150', city: 'Chicago', province: 'IL', zip: '60606', phone: '+1-312-555-0143' },
      { name: 'Camila Herrera Ramos', address1: '555 California St, Suite 210', city: 'San Francisco', province: 'CA', zip: '94104', phone: '+1-415-555-0177' },
      { name: 'Diego Torres Domínguez', address1: '100 Congress Ave, Suite 800', city: 'Austin', province: 'TX', zip: '78701', phone: '+1-512-555-0128' },
      { name: 'Lucía Méndez Ríos', address1: '1700 Lincoln St, Suite 400', city: 'Denver', province: 'CO', zip: '80203', phone: '+1-303-555-0165' },
      { name: 'Javier Ortiz Valenzuela', address1: '1201 3rd Ave, Floor 14', city: 'Seattle', province: 'WA', zip: '98101', phone: '+1-206-555-0152' },
      { name: 'Mariana Reyes Gutiérrez', address1: '600 Peachtree St NE, Suite 500', city: 'Atlanta', province: 'GA', zip: '30308', phone: '+1-404-555-0131' },
      { name: 'Gabriel Castro Morales', address1: '100 High St, Suite 700', city: 'Boston', province: 'MA', zip: '02110', phone: '+1-617-555-0190' }
    ];
    const pickedCustomer = simulatedShopifyCustomers[Math.floor(Math.random() * simulatedShopifyCustomers.length)];

    const payload = channel === 'Shopify'
      ? {
          id: 5000000000 + orderNum,
          order_number: orderNum,
          name: `#${orderNum}`,
          financial_status: 'paid',
          total_price: price.toFixed(2),
          currency: 'USD',
          customer: {
            first_name: pickedCustomer.name.split(' ')[0],
            last_name: pickedCustomer.name.split(' ').slice(1).join(' '),
            email: `${pickedCustomer.name.toLowerCase().replace(/[^a-z]/g, '.')}@example.com`,
            phone: pickedCustomer.phone
          },
          shipping_address: {
            name: pickedCustomer.name,
            address1: pickedCustomer.address1,
            city: pickedCustomer.city,
            province: pickedCustomer.province,
            zip: pickedCustomer.zip,
            country: 'United States',
            phone: pickedCustomer.phone
          },
          line_items: [
            {
              id: 9000000000 + orderNum,
              title: chosen.product_name,
              sku: chosen.sku,
              quantity: 1,
              price: price.toFixed(2)
            }
          ]
        }
      : {
          external_order_id: `AMZ-${Date.now().toString().slice(-6)}-${orderNum}`,
          status: 'pending',
          total_amount: price,
          currency: 'USD',
          customer: {
            full_name: 'Robert Davis',
            shipping_address: '789 Westheimer Rd, Houston, TX 77006',
            phone_number: '+1-832-555-0144'
          },
          items: [
            {
              sku: chosen.sku,
              product_name: chosen.product_name,
              quantity: 1,
              unit_price: price
            }
          ]
        };

    this.http.post(endpoint, payload).subscribe({
      next: (res: any) => {
        this.isSimulating = false;
        this.showToast(`Simulated ${channel} purchase of ${chosen.sku} received! (${res.latency_ms || 1200}ms)`);
      },
      error: (err) => {
        this.isSimulating = false;
        this.showToast(`Simulation sent (checked via local node server)`);
      }
    });
  }

  recalculateKPIs() {
    this.totalOrders = this.orders.length;
    this.shopifyOrders = this.orders.filter((o) => o.channel === 'Shopify').length;
    this.amazonOrders = this.orders.filter((o) => o.channel === 'Amazon').length;

    if (this.totalOrders > 0) {
      const totalLatency = this.orders.reduce((sum, o) => sum + (o.sync_latency_ms || 0), 0);
      this.averageLatency = totalLatency / this.totalOrders;
    } else {
      this.averageLatency = 0;
    }
  }

  // Filtered orders getter
  get filteredOrders(): Order[] {
    return this.orders.filter((order) => {
      const term = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        order.external_order_id.toLowerCase().includes(term) ||
        (order.customer?.full_name || '').toLowerCase().includes(term);

      const matchesChannel =
        this.selectedChannel === 'ALL' || order.channel === this.selectedChannel;

      const matchesStatus =
        this.selectedStatus === 'ALL' ||
        order.status.toLowerCase() === this.selectedStatus.toLowerCase();

      let matchesLatency = true;
      if (this.selectedLatency === 'FAST') {
        matchesLatency = order.sync_latency_ms <= 2000;
      } else if (this.selectedLatency === 'SLA') {
        matchesLatency = order.sync_latency_ms > 2000 && order.sync_latency_ms <= 5000;
      } else if (this.selectedLatency === 'BREACH') {
        matchesLatency = order.sync_latency_ms > 5000;
      }

      return matchesSearch && matchesChannel && matchesStatus && matchesLatency;
    });
  }

  // Paginated orders (10 per page)
  get paginatedOrders(): Order[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredOrders.length / this.pageSize) || 1;
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get startRecordIndex(): number {
    if (this.filteredOrders.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecordIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredOrders.length);
  }

  onFilterChange() {
    this.currentPage = 1;
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedChannel = 'ALL';
    this.selectedStatus = 'ALL';
    this.selectedLatency = 'ALL';
    this.currentPage = 1;
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  setLanguage(lang: SupportedLanguage) {
    this.translationService.setLanguage(lang);
    this.showToast(this.t.changesSaved);
  }

  setRole(role: UserRole) {
    this.currentRole = role;
    localStorage.setItem('ordersync_role', role);
    this.showToast(this.t.changesSaved);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  showToast(message: string) {
    const id = ++this.toastId;
    this.toasts.push({ id, message });
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }, 4500);
  }
}
