import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { TranslationService, SupportedLanguage } from '../../services/translation.service';

export type UserRole = string;

export interface AppRole {
  name: string;
  description: string;
  color?: string;
  isSystem?: boolean;
  allowedModules: ActiveModule[];
}

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
  image_url?: string;
  shopify_product_id?: string;
  channel?: string;
  product_type?: string;
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
  timeline?: Array<{
    date: string;
    shopify: number;
    amazon: number;
    total: number;
    orders: number;
  }>;
  availableMonths?: Array<{
    key: string;
    name: string;
  }>;
  selectedMonth?: string;
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

  // Module: Inventory Data & Controls
  inventoryItems: InventoryItem[] = [];
  inventoryLoading = false;
  inventoryViewMode: 'table' | 'cards' = 'table';
  inventoryPageSize: number = 10;
  inventoryCurrentPage: number = 1;
  inventorySearch: string = '';
  inventoryStockFilter: 'all' | 'low' | 'out' | 'in' = 'all';
  inventoryTypeFilter: string = 'all';
  productTypes: string[] = [
    'Electronics',
    'Audio & Headsets',
    'Displays & Monitors',
    'Accessories',
    'Computers & Laptops',
    'Gaming Gear',
    'Office & Ergonomics'
  ];
  showCreateTypeModal: boolean = false;
  newTypeName: string = '';
  creatingType: boolean = false;

  // Module: Customers Data & Filtering Controls
  customers: CustomerRecord[] = [];
  customersLoading = false;
  customerSearch: string = '';
  customerChannelFilter: string = 'all';
  customerSortBy: 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'order' = 'newest';
  customerPageSize: number = 10;
  customerCurrentPage: number = 1;
  revealCustomerPii = true;
  selectedAuditCustomer: CustomerRecord | null = null;

  // Module: Metrics & BI
  metrics: ExecutiveMetrics | null = null;
  metricsLoading = false;
  metricsCategory: 'financial' | 'logistics' | 'customers' | 'inventory' | 'telemetry' | 'channels' | 'returns' = 'financial';

  get returnReasons(): Array<{ reason: string; label: string; count: number; percentage: number; color: string }> {
    const list = this.metrics?.returns?.reasonsBreakdown;
    const getReasonLabel = (reason: string): string => {
      switch (reason) {
        case 'DEFECTIVE': return this.t.retReasonDefective;
        case 'SIZE_FIT': return this.t.retReasonSizeFit;
        case 'NOT_AS_DESCRIBED': return this.t.retReasonNotAsDescribed;
        case 'WRONG_ITEM': return this.t.retReasonWrongItem;
        case 'CUSTOMER_MIND': return this.t.retReasonCustomerMind;
        default: return reason;
      }
    };

    if (list && list.length > 0) {
      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];
      return list.map((item, idx) => ({
        ...item,
        label: getReasonLabel(item.reason) || item.label,
        color: colors[idx % colors.length]
      }));
    }
    return [
      { reason: 'DEFECTIVE', label: this.t.retReasonDefective, count: 1, percentage: 20, color: '#ef4444' },
      { reason: 'SIZE_FIT', label: this.t.retReasonSizeFit, count: 1, percentage: 20, color: '#f59e0b' },
      { reason: 'NOT_AS_DESCRIBED', label: this.t.retReasonNotAsDescribed, count: 1, percentage: 20, color: '#3b82f6' },
      { reason: 'WRONG_ITEM', label: this.t.retReasonWrongItem, count: 1, percentage: 20, color: '#8b5cf6' },
      { reason: 'CUSTOMER_MIND', label: this.t.retReasonCustomerMind, count: 1, percentage: 20, color: '#64748b' }
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

  selectedMetricsMonth: string = 'all';
  availableMetricsMonths: Array<{ key: string; name: string }> = [];

  get salesTrendData(): Array<{ date: string; shopify: number; amazon: number; total: number; orders: number }> {
    if (this.metrics?.timeline && this.metrics.timeline.length > 0) {
      return this.metrics.timeline;
    }
    return [];
  }

  get trendSvgWidth(): number { return 620; }
  get trendSvgHeight(): number { return 220; }

  get trendPoints(): Array<{ x: number; yTotal: number; yShopify: number; yAmazon: number; item: any }> {
    const data = this.salesTrendData;
    if (!data || data.length === 0) return [];
    const maxVal = Math.max(...data.map(d => this.selectedChartMetric === 'revenue' ? d.total : d.orders)) * 1.18 || 1000;
    const w = this.trendSvgWidth;
    const h = this.trendSvgHeight;
    const padX = 40;
    const padY = 30;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;

    return data.map((d, i) => {
      const x = data.length === 1 ? padX + usableW / 2 : padX + (i / (data.length - 1)) * usableW;
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
    const total = this.metrics?.sales?.totalRevenue || 0;
    if (total <= 0) return 0;
    const shopify = this.metrics?.sales?.shopifyRevenue || 0;
    return Math.min(100, Math.max(0, Math.round((shopify / total) * 100)));
  }

  get donutAmazonPercent(): number {
    const total = this.metrics?.sales?.totalRevenue || 0;
    if (total <= 0) return 0;
    const amazon = this.metrics?.sales?.amazonRevenue || 0;
    return Math.min(100, Math.max(0, Math.round((amazon / total) * 100)));
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
  syncingShipmentId = '';
  syncingWithShopify = false;

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
  devopsTelemetry: any = null;
  devopsLogs: any[] = [];
  devopsLogFilter: string = 'ALL';
  devopsPingLoading = false;
  devopsLoading = false;
  devopsActiveSubTab: 'overview' | 'containers' | 'cicd' | 'logs' | 'metrics' = 'overview';
  devopsPrometheusMetricsRaw = '';

  // User & RBAC
  currentUserEmail = 'admin@ordersync.app';
  currentRole: UserRole = (localStorage.getItem('ordersync_role') as UserRole) || 'Admin';

  // Module: User Management (Admin-only creation & RBAC administration)
  systemUsers: any[] = [];
  usersLoading = false;
  creatingUser = false;
  showCreateUserModal = false;
  newEmail = '';
  newPassword = '';
  newRole: UserRole = 'Operator';
  userCreationError = '';
  showNewPassword = false;

  // User Search, Filtering & Sorting
  userSearch = '';
  userRoleFilter: 'all' | 'Admin' | 'Operator' = 'all';
  userSortBy: 'newest' | 'oldest' | 'email-asc' = 'newest';

  // Edit / Password Reset Modal
  showResetPasswordModal = false;
  resetPasswordUser: any = null;
  resetNewPassword = '';
  resetPasswordError = '';
  savingNewPassword = false;
  showResetNewPassword = false;

  // Delete User Modal
  showDeleteUserModal = false;
  deletingUser: any = null;
  deletingUserLoading = false;

  // Dynamic Roles & Permissions Definition
  allNavModules: Array<{ key: ActiveModule; label: string; category: string; description: string }> = [
    { key: 'dashboard', label: 'Dashboard Overview', category: 'Core Platform', description: 'Real-time KPIs, channel breakdown and order stream' },
    { key: 'metrics', label: 'Business Metrics & BI', category: 'Core Platform', description: 'Executive sales analytics, financial margins and SLA' },
    { key: 'channels', label: 'Sales Channels (APIs)', category: 'Core Platform', description: 'Live connectivity for Shopify and Amazon SP-API' },
    { key: 'inventory', label: 'Inventory & Stock', category: 'Core Platform', description: 'Product catalog, real-time stock and sync engine' },
    { key: 'suppliers', label: 'Suppliers & Procurement', category: 'Core Platform', description: 'Supply chain partners and restock purchase orders' },
    { key: 'customers', label: 'Customer Directory', category: 'Core Platform', description: 'Centralized directory of client accounts and addresses' },
    { key: 'users', label: 'User Management', category: 'Core Platform', description: 'RBAC user accounts and navigation access control' },
    { key: 'logistics', label: 'Logistics & Route Tracking', category: 'Operations', description: 'Multi-carrier shipment tracking and live phases' },
    { key: 'returns', label: 'Returns & Refunds (RMA)', category: 'Operations', description: 'RMA returns workflow and inventory restock' },
    { key: 'devops', label: 'DevOps & Monitoring', category: 'Operations', description: 'System health, telemetry and database connection' }
  ];

  roles: AppRole[] = [
    {
      name: 'Admin',
      description: 'Full master access and control across the entire platform',
      color: 'purple',
      isSystem: true,
      allowedModules: ['dashboard', 'metrics', 'channels', 'inventory', 'suppliers', 'customers', 'users', 'logistics', 'returns', 'devops']
    },
    {
      name: 'Operator',
      description: 'Standard day-to-day operations for orders, inventory and logistics',
      color: 'blue',
      isSystem: true,
      allowedModules: ['dashboard', 'channels', 'inventory', 'logistics', 'returns']
    }
  ];

  // Role Management Modal State
  showRoleModal = false;
  showManageRolesModal = false;
  editingRoleName = '';
  roleFormName = '';
  roleFormDesc = '';
  roleFormColor = 'purple';
  roleFormModules: Record<string, boolean> = {};
  roleFormError = '';

  // Module: Inventory Product Creation & Multi-channel Sync Modal
  showProductForm = false;
  showRegisterProductModal = false;
  newProdChannel: 'Shopify' | 'Amazon' = 'Shopify';
  newProdSku = '';
  newProdName = '';
  newProdStock = 25;
  newProdSupplier = 'Apex Global Electronics';
  newProdCost = 35.00;
  newProdPrice = 79.99;
  newProdImageUrl = '';
  newProdImagePreview = '';
  newProdDescription = '';
  newProdType = 'Electronics';
  publishingProduct = false;

  // Module: Edit Product Modal State
  showEditProductModal = false;
  editingProduct: InventoryItem | null = null;
  editProdSku = '';
  editProdName = '';
  editProdStock = 0;
  editProdSupplier = 'Apex Global Electronics';
  editProdCost = 35.00;
  editProdPrice = 79.99;
  editProdImageUrl = '';
  editProdImagePreview = '';
  editProdDescription = '';
  editProdType = 'Electronics';
  editProdChannel = 'Shopify';
  savingEditedProduct = false;

  // Module: Delete Product Confirmation Modal State
  showDeleteProductModal = false;
  deletingProduct: InventoryItem | null = null;
  deletingProductLoading = false;

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
    this.loadRoles();
    this.loadMetrics();
    this.loadSuppliers();
    this.loadPurchaseOrders();
    this.loadShipments();
    this.loadReturns();
    this.loadHealth();
    this.loadShopifyStatus();
    this.loadProductTypes();

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
      this.showToast(`New Return Request ${newRet.return_number} registered (${newRet.channel})`);
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
    this.socket.on('inventory_updated', () => {
      this.loadInventory();
      this.loadMetrics();
    });
    this.socket.on('INVENTORY_DELETED', () => {
      this.loadInventory();
      this.loadMetrics();
    });
    this.socket.on('inventory_deleted', () => {
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
          this.showToast(`Product restocked into inventory: +${ret.quantity} units for ${ret.sku}`);
          this.loadInventory();
        } else if (action === 'approve') {
          this.showToast(`Return ${ret.return_number} approved. Return label in transit to warehouse.`);
        } else if (action === 'decline') {
          this.showToast(`Return ${ret.return_number} rejected.`);
        }
        this.loadMetrics();
      },
      error: (err) => {
        this.processingReturnId = null;
        console.error('Error processing return:', err);
        this.showToast('Error processing return.');
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
        this.showToast(`Shopify Return processed via Webhook: ${res.return?.return_number}`);
        this.loadReturns();
        this.loadInventory();
        this.loadInitialOrders();
      },
      error: (err) => {
        this.isSimulating = false;
        console.error('Error simulating Shopify refund:', err);
        this.showToast('Error simulating Shopify return');
      }
    });
  }

  submitNewReturn() {
    if (!this.newReturnOrderId || !this.newReturnSku || !this.newReturnCustomer) {
      alert('Please fill in required fields');
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
        this.showToast(`Return ${created.return_number} officially created.`);
        this.loadReturns();
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Error creating return:', err);
        alert('Error recording return.');
      }
    });
  }

  seedDemoReturns() {
    this.returnsLoading = true;
    this.http.post<any>('http://localhost:3000/api/returns/seed', {}).subscribe({
      next: (res) => {
        this.returns = res.returns || [];
        this.returnsLoading = false;
        this.showToast('Devoluciones de prueba generadas exitosamente.');
        this.loadMetrics();
        this.loadInventory();
      },
      error: (err) => {
        this.returnsLoading = false;
        console.error('Error seeding returns:', err);
        this.showToast('Error al cargar datos de prueba.');
      }
    });
  }

  deleteReturn(id: string) {
    if (!confirm('¿Eliminar este registro de devolución?')) return;
    this.http.delete(`http://localhost:3000/api/returns/${id}`).subscribe({
      next: () => {
        this.returns = this.returns.filter(r => r.id !== id);
        this.showToast('Registro de devolución eliminado.');
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Error deleting return:', err);
        this.showToast('Error al eliminar la devolución.');
      }
    });
  }

  loadMetrics(month?: string) {
    if (month !== undefined) {
      this.selectedMetricsMonth = month;
    }
    this.metricsLoading = true;
    const query = this.selectedMetricsMonth && this.selectedMetricsMonth !== 'all'
      ? `?month=${encodeURIComponent(this.selectedMetricsMonth)}`
      : '';
    this.http.get<ExecutiveMetrics>(`http://localhost:3000/api/metrics${query}`).subscribe({
      next: (data) => {
        this.metrics = data;
        if (data.availableMonths && data.availableMonths.length > 0) {
          this.availableMetricsMonths = data.availableMonths;
        }
        if (data.selectedMonth) {
          this.selectedMetricsMonth = data.selectedMonth;
        }
        this.metricsLoading = false;
      },
      error: (err) => {
        console.error('Error loading metrics:', err);
        this.metricsLoading = false;
      }
    });
  }

  onMetricsMonthChange() {
    this.loadMetrics(this.selectedMetricsMonth);
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
        this.showToast(res.message || 'Route updated successfully');
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
        this.showToast('Error updating package route');
      }
    });
  }

  syncShipmentWithShopify(shipment: RealShipment) {
    this.syncingShipmentId = shipment.id;
    this.http.post<any>(`http://localhost:3000/api/shipments/${shipment.id}/sync-shopify`, {}).subscribe({
      next: (res) => {
        this.syncingShipmentId = '';
        this.showToast(res.message || 'Synced with Shopify API');
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
        console.error('Error syncing with Shopify API:', err);
        this.syncingShipmentId = '';
        this.showToast('Error syncing with Shopify API');
      }
    });
  }

  syncAllWithShopify() {
    this.syncingWithShopify = true;
    this.http.post<any>('http://localhost:3000/api/shipments/sync-shopify-all', {}).subscribe({
      next: (res) => {
        this.syncingWithShopify = false;
        this.showToast(res.message || 'Shipments synced with Shopify API');
        this.loadShipments();
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Error in syncAllWithShopify:', err);
        this.syncingWithShopify = false;
        this.showToast('Error syncing batch with Shopify API');
      }
    });
  }

  toggleAutoDispatch() {
    this.http.post<any>('http://localhost:3000/api/shipments/auto-engine/toggle', {}).subscribe({
      next: (res) => {
        this.autoDispatchActive = res.active;
        this.showToast(res.message);
      },
      error: () => this.showToast('Error toggling auto-dispatch engine')
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
        this.showToast('Error in carrier batch synchronization');
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
        this.showToast('Error simulating high-volume batch');
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
      this.showToast(`Tracking number copied: ${tracking}`);
    });
  }

  resetShipmentFilters() {
    this.shipmentFilter = 'ALL';
    this.shipmentCarrierFilter = 'ALL';
    this.shipmentChannelFilter = 'ALL';
    this.shipmentArrivalFilter = 'ALL';
    this.shipmentSearch = '';
    this.shipmentCurrentPage = 1;
    this.showToast('Filters reset');
  }

  onShipmentPageSizeChange() {
    this.shipmentCurrentPage = 1;
  }

  exportShipmentsCSV() {
    const list = this.filteredShipments.length > 0 ? this.filteredShipments : this.realShipments;
    if (list.length === 0) {
      this.showToast('No shipments available to export');
      return;
    }

    const headers = [
      'Order ID',
      'Channel',
      'Carrier',
      'Tracking Number',
      'Origin',
      'Destination',
      'Current Step',
      'Delivered',
      'Estimated Delivery',
      'Created At'
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
      escapeCsv(s.is_delivered ? 'YES' : 'NO'),
      escapeCsv(s.estimated_delivery),
      escapeCsv(s.created_at || new Date().toISOString())
    ].join(','));

    // UTF-8 BOM (\uFEFF)
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `OrderSync_Shipments_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast(`Export complete: ${list.length} records exported to CSV`);
  }

  // Clear table with 2-step verification
  showClearStep1Modal: boolean = false;
  showClearStep2Modal: boolean = false;
  clearGeneratedCode: string = '';
  clearConfirmCodeInput: string = '';
  clearingTable: boolean = false;

  openClearTableModal() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.clearGeneratedCode = `OS-${randomNum}`;
    this.clearConfirmCodeInput = '';
    this.showClearStep1Modal = true;
    this.showClearStep2Modal = false;
  }

  copyClearCode() {
    if (this.clearGeneratedCode) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.clearGeneratedCode);
      }
      this.clearConfirmCodeInput = this.clearGeneratedCode;
      this.showToast(`Code copied: ${this.clearGeneratedCode}`);
    }
  }

  proceedToClearStep2() {
    if (this.clearConfirmCodeInput.trim().toUpperCase() !== this.clearGeneratedCode.toUpperCase()) {
      this.showToast('The entered code does not match the security code');
      return;
    }
    this.showClearStep1Modal = false;
    this.showClearStep2Modal = true;
  }

  closeClearModals() {
    this.showClearStep1Modal = false;
    this.showClearStep2Modal = false;
    this.clearConfirmCodeInput = '';
    this.clearGeneratedCode = '';
  }

  executeClearShipmentsTable() {
    this.clearingTable = true;
    this.http.post<any>('http://localhost:3000/api/shipments/clear-all', {}).subscribe({
      next: (res) => {
        this.clearingTable = false;
        this.realShipments = [];
        this.closeClearModals();
        this.showToast(res.message || 'Shipments table purged permanently');
        this.loadMetrics();
      },
      error: (err) => {
        this.clearingTable = false;
        console.error('Error clearing shipments:', err);
        this.showToast('Error purging shipments table');
      }
    });
  }

  clearShipmentsTable() {
    this.openClearTableModal();
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
        this.showToast('Error executing retention policy');
      }
    });
  }

  // ================= Shopify Official API Management =================
  shopifyAdminToken: string = '';
  shopifyStatus: any = null;
  syncingShopifyApi: boolean = false;
  testingShopifyApi: boolean = false;
  savingShopifyToken: boolean = false;

  loadShopifyStatus() {
    this.http.get<any>('http://localhost:3000/api/v1/shopify/status').subscribe({
      next: (res) => { this.shopifyStatus = res; },
      error: (err) => console.error('Error loading Shopify status:', err)
    });
  }

  saveShopifyAdminToken() {
    if (!this.shopifyAdminToken.trim()) {
      this.showToast('Please enter a valid Shopify access token');
      return;
    }
    this.savingShopifyToken = true;
    this.http.post<any>('http://localhost:3000/api/v1/shopify/configure', {
      accessToken: this.shopifyAdminToken.trim()
    }).subscribe({
      next: (res) => {
        this.savingShopifyToken = false;
        this.showToast(res.message || 'Token saved successfully');
        this.loadShopifyStatus();
      },
      error: (err) => {
        this.savingShopifyToken = false;
        this.showToast(err.error?.error || 'Error saving token');
      }
    });
  }

  testShopifyApiConnection() {
    this.testingShopifyApi = true;
    this.http.post<any>('http://localhost:3000/api/v1/shopify/test-connection', {}).subscribe({
      next: (res) => {
        this.testingShopifyApi = false;
        if (res.success) {
          this.showToast(`✅ Connected to store: ${res.data?.name || 'Shopify Store'} (${res.data?.currency || 'USD'})`);
        } else {
          this.showToast(`⚠️ ${res.error || 'Failed to connect to Shopify API'}`);
        }
      },
      error: (err) => {
        this.testingShopifyApi = false;
        this.showToast('Network error connecting to Shopify API');
      }
    });
  }

  syncShopifyOrdersNow() {
    this.syncingShopifyApi = true;
    this.http.post<any>('http://localhost:3000/api/v1/shopify/sync-now', {}).subscribe({
      next: (res) => {
        this.syncingShopifyApi = false;
        if (res.success) {
          this.showToast(res.message || 'Orders synced from Shopify');
          this.loadInitialOrders();
          this.loadShipments();
          this.loadMetrics();
        } else {
          this.showToast(res.error || 'Error syncing with Shopify');
        }
      },
      error: (err) => {
        this.syncingShopifyApi = false;
        const msg = err.error?.error || 'Error connecting to Shopify API';
        this.showToast(msg);
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
      this.showToast('Please select a valid supplier');
      return;
    }
    if (!this.restockSelectedSku) {
      this.showToast('Please select a product to restock');
      return;
    }
    if (!this.restockUnits || this.restockUnits <= 0) {
      this.showToast('Enter a valid quantity greater than 0');
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
        this.showToast(res.message || 'Restock order processed successfully.');
        this.loadInventory();
        this.loadMetrics();
        this.loadPurchaseOrders();
      },
      error: (err) => {
        this.restockLoading = false;
        console.error('Error placing restock order:', err);
        this.showToast('Error processing restock order.');
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
        category: supplier.category || 'Hardware & Peripherals',
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
        category: 'Hardware & Peripherals',
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
      this.showToast('Supplier name is required');
      return;
    }

    this.supplierSaving = true;
    if (this.editingSupplier) {
      this.http.put<Supplier>(`http://localhost:3000/api/suppliers/${this.editingSupplier.id}`, this.supplierForm).subscribe({
        next: (updated) => {
          this.supplierSaving = false;
          this.closeSupplierModal();
          this.showToast(`Supplier "${updated.name}" updated.`);
          this.loadSuppliers();
        },
        error: (err) => {
          this.supplierSaving = false;
          console.error('Error updating supplier:', err);
          this.showToast('Error updating supplier');
        }
      });
    } else {
      this.http.post<Supplier>('http://localhost:3000/api/suppliers', this.supplierForm).subscribe({
        next: (created) => {
          this.supplierSaving = false;
          this.closeSupplierModal();
          this.showToast(`Supplier "${created.name}" registered successfully.`);
          this.loadSuppliers();
        },
        error: (err) => {
          this.supplierSaving = false;
          console.error('Error creating supplier:', err);
          this.showToast('Error registering supplier');
        }
      });
    }
  }

  deleteSupplier(supplier: Supplier) {
    if (!confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) return;
    this.http.delete<any>(`http://localhost:3000/api/suppliers/${supplier.id}`).subscribe({
      next: (res) => {
        this.showToast(res.message || 'Supplier deleted.');
        this.loadSuppliers();
      },
      error: (err) => {
        console.error('Error deleting supplier:', err);
        this.showToast('Failed to delete supplier.');
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

  // User Management Getters & Helpers
  get totalAdminCount(): number {
    return this.systemUsers.filter(u => u.role === 'Admin').length;
  }

  get totalOperatorCount(): number {
    return this.systemUsers.filter(u => u.role === 'Operator').length;
  }

  get filteredSystemUsers(): any[] {
    let list = this.systemUsers.filter(u => {
      // 1. Search text filter
      if (this.userSearch && this.userSearch.trim()) {
        const q = this.userSearch.trim().toLowerCase();
        const email = (u.email || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        if (!email.includes(q) && !role.includes(q)) return false;
      }

      // 2. Role filter
      if (this.userRoleFilter !== 'all') {
        if (u.role !== this.userRoleFilter) return false;
      }

      return true;
    });

    // 3. Sorting
    return list.sort((a, b) => {
      if (this.userSortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (this.userSortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (this.userSortBy === 'email-asc') {
        return (a.email || '').localeCompare(b.email || '');
      }
      return 0;
    });
  }

  openCreateUserModal() {
    this.newEmail = '';
    this.newPassword = '';
    this.newRole = 'Operator';
    this.userCreationError = '';
    this.showNewPassword = false;
    this.showCreateUserModal = true;
  }

  closeCreateUserModal() {
    this.showCreateUserModal = false;
    this.userCreationError = '';
  }

  createUser() {
    this.userCreationError = '';
    if (!this.newEmail.trim() || !this.newPassword.trim()) {
      this.userCreationError = 'El correo electrónico y la contraseña son obligatorios.';
      return;
    }

    if (this.newPassword.trim().length < 6) {
      this.userCreationError = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.currentRole !== 'Admin') {
      this.userCreationError = 'Acceso Denegado: Solo administradores pueden registrar usuarios.';
      return;
    }

    this.creatingUser = true;
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    this.http.post<any>('http://localhost:3000/api/users', {
      email: this.newEmail.trim(),
      password: this.newPassword.trim(),
      role: this.newRole,
      requesterRole: this.currentRole
    }, { headers }).subscribe({
      next: (res) => {
        this.creatingUser = false;
        this.showToast(res.message || 'Usuario creado exitosamente');
        this.closeCreateUserModal();
        this.loadUsers();
      },
      error: (err) => {
        this.creatingUser = false;
        this.userCreationError = err.error?.error || 'Error al crear el usuario.';
      }
    });
  }

  changeUserRole(user: any, newRole: UserRole) {
    if (this.currentRole !== 'Admin') {
      this.showToast('Acceso Denegado: Solo administradores pueden cambiar roles.');
      return;
    }

    if (user.email === 'admin@ordersync.app' && newRole !== 'Admin') {
      this.showToast('No se puede revocar el rol de Administrador a la cuenta raíz.');
      return;
    }

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    this.http.put<any>(`http://localhost:3000/api/users/${user.id}`, {
      role: newRole,
      requesterRole: this.currentRole
    }, { headers }).subscribe({
      next: (res) => {
        this.showToast(res.message || `Rol actualizado a ${newRole}`);
        user.role = newRole;
      },
      error: (err) => {
        this.showToast(err.error?.error || 'Error al actualizar el rol');
      }
    });
  }

  // Reset Password Modal
  openResetPasswordModal(user: any) {
    this.resetPasswordUser = user;
    this.resetNewPassword = '';
    this.resetPasswordError = '';
    this.savingNewPassword = false;
    this.showResetNewPassword = false;
    this.showResetPasswordModal = true;
  }

  closeResetPasswordModal() {
    this.showResetPasswordModal = false;
    this.resetPasswordUser = null;
    this.resetNewPassword = '';
    this.resetPasswordError = '';
  }

  saveResetPassword() {
    if (!this.resetPasswordUser) return;
    if (!this.resetNewPassword || this.resetNewPassword.trim().length < 6) {
      this.resetPasswordError = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.savingNewPassword = true;
    this.resetPasswordError = '';
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    this.http.put<any>(`http://localhost:3000/api/users/${this.resetPasswordUser.id}`, {
      password: this.resetNewPassword.trim(),
      requesterRole: this.currentRole
    }, { headers }).subscribe({
      next: (res) => {
        this.savingNewPassword = false;
        this.showToast(res.message || 'Contraseña actualizada con éxito');
        this.closeResetPasswordModal();
      },
      error: (err) => {
        this.savingNewPassword = false;
        this.resetPasswordError = err.error?.error || 'Error al actualizar contraseña';
      }
    });
  }

  // Delete User Modal
  openDeleteUserModal(user: any) {
    if (user.email === 'admin@ordersync.app') {
      this.showToast('No se puede eliminar la cuenta de administrador raíz.');
      return;
    }
    if (user.email === this.currentUserEmail) {
      this.showToast('No puedes eliminar tu propia cuenta en la sesión actual.');
      return;
    }
    this.deletingUser = user;
    this.deletingUserLoading = false;
    this.showDeleteUserModal = true;
  }

  closeDeleteUserModal() {
    this.showDeleteUserModal = false;
    this.deletingUser = null;
    this.deletingUserLoading = false;
  }

  confirmDeleteUser() {
    if (!this.deletingUser) return;
    this.deletingUserLoading = true;
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    this.http.delete<any>(`http://localhost:3000/api/users/${this.deletingUser.id}`, {
      headers,
      body: { requesterRole: this.currentRole }
    }).subscribe({
      next: (res) => {
        this.deletingUserLoading = false;
        this.showToast(res.message || 'Usuario eliminado correctamente');
        this.systemUsers = this.systemUsers.filter(u => u.id !== this.deletingUser.id);
        this.closeDeleteUserModal();
      },
      error: (err) => {
        this.deletingUserLoading = false;
        this.showToast(err.error?.error || 'Error al eliminar usuario');
      }
    });
  }

  // Role Management & Navbar Access Permission Methods
  loadRoles() {
    const saved = localStorage.getItem('ordersync_roles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.roles = parsed;
        }
      } catch (e) {
        console.error('Error parsing custom roles:', e);
      }
    }
  }

  saveRolesToStorage() {
    localStorage.setItem('ordersync_roles', JSON.stringify(this.roles));
  }

  canAccessModule(moduleKey: ActiveModule): boolean {
    if (this.currentRole === 'Admin') return true;
    const currentRoleObj = this.roles.find(
      r => r.name.toLowerCase() === (this.currentRole || '').toLowerCase()
    );
    if (!currentRoleObj) return moduleKey === 'dashboard';
    return currentRoleObj.allowedModules.includes(moduleKey);
  }

  get hasOperationsAccess(): boolean {
    return this.canAccessModule('logistics') || this.canAccessModule('returns') || this.canAccessModule('devops');
  }

  openCreateRoleModal() {
    this.editingRoleName = '';
    this.roleFormName = '';
    this.roleFormDesc = '';
    this.roleFormColor = 'purple';
    this.roleFormError = '';
    this.roleFormModules = {
      dashboard: true,
      metrics: false,
      channels: false,
      inventory: true,
      suppliers: false,
      customers: false,
      users: false,
      logistics: true,
      returns: true,
      devops: false
    };
    this.showRoleModal = true;
  }

  openEditRoleModal(role: AppRole) {
    this.editingRoleName = role.name;
    this.roleFormName = role.name;
    this.roleFormDesc = role.description || '';
    this.roleFormColor = role.color || 'purple';
    this.roleFormError = '';
    this.roleFormModules = {};
    this.allNavModules.forEach(m => {
      this.roleFormModules[m.key] = role.allowedModules.includes(m.key);
    });
    this.showRoleModal = true;
  }

  openManageRolesModal() {
    this.showManageRolesModal = true;
  }

  closeManageRolesModal() {
    this.showManageRolesModal = false;
  }

  closeRoleModal() {
    this.showRoleModal = false;
    this.editingRoleName = '';
    this.roleFormError = '';
  }

  toggleSelectAllModules(select: boolean) {
    this.allNavModules.forEach(m => {
      this.roleFormModules[m.key] = select;
    });
  }

  saveRole() {
    const trimmed = this.roleFormName.trim();
    if (!trimmed) {
      this.roleFormError = 'Role name is required.';
      return;
    }

    const selectedMods = this.allNavModules
      .filter(m => !!this.roleFormModules[m.key])
      .map(m => m.key);

    if (selectedMods.length === 0) {
      this.roleFormError = 'You must enable at least one navbar module.';
      return;
    }

    if (!this.editingRoleName) {
      const exists = this.roles.some(r => r.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        this.roleFormError = `A role named "${trimmed}" already exists.`;
        return;
      }

      const newRoleObj: AppRole = {
        name: trimmed,
        description: this.roleFormDesc.trim() || `Custom role with ${selectedMods.length} module(s) enabled`,
        color: this.roleFormColor,
        isSystem: false,
        allowedModules: selectedMods
      };
      this.roles.push(newRoleObj);
      this.showToast(`Role "${trimmed}" created successfully with ${selectedMods.length} modules.`);
    } else {
      const idx = this.roles.findIndex(r => r.name.toLowerCase() === this.editingRoleName.toLowerCase());
      if (idx !== -1) {
        this.roles[idx].name = trimmed;
        this.roles[idx].description = this.roleFormDesc.trim();
        this.roles[idx].color = this.roleFormColor;
        this.roles[idx].allowedModules = selectedMods;
        this.showToast(`Role "${trimmed}" updated successfully.`);
      }
    }

    this.saveRolesToStorage();
    this.closeRoleModal();
  }

  deleteRole(role: AppRole) {
    if (role.isSystem || role.name === 'Admin' || role.name === 'Operator') {
      this.showToast('System base roles cannot be deleted.');
      return;
    }
    const inUse = this.systemUsers.some(u => u.role === role.name);
    if (inUse) {
      this.showToast(`Cannot delete role "${role.name}" because it is currently assigned to active users.`);
      return;
    }
    this.roles = this.roles.filter(r => r.name !== role.name);
    this.saveRolesToStorage();
    this.showToast(`Role "${role.name}" deleted successfully.`);
  }

  getRoleBadgeClass(roleName: string): string {
    const r = this.roles.find(x => x.name.toLowerCase() === (roleName || '').toLowerCase());
    const c = r?.color || (roleName === 'Admin' ? 'purple' : 'blue');
    switch (c) {
      case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'indigo': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  loadInitialOrders() {
    this.http.get<any[]>('http://localhost:3000/api/orders').subscribe({
      next: (data) => {
        this.orders = data.map((o) => ({
          ...o,
          total_amount: parseFloat(o.total_amount),
          customer: o.customer || {
            full_name: 'General Customer',
            shipping_address: 'Main Warehouse'
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

  // Customers Filtering & Pagination Getters
  get availableCustomerChannels(): string[] {
    const set = new Set<string>();
    this.customers.forEach(c => {
      if (c.channel) set.add(c.channel);
    });
    return Array.from(set);
  }

  get filteredCustomers(): CustomerRecord[] {
    let list = this.customers.filter(c => {
      // 1. Text Search Filter (Name, Order, Phone, Address, Channel, ID)
      if (this.customerSearch && this.customerSearch.trim()) {
        const q = this.customerSearch.trim().toLowerCase();
        const name = (c.full_name || c.decrypted_name || '').toLowerCase();
        const order = (c.external_order_id || '').toLowerCase();
        const phone = (c.phone || c.decrypted_phone || '').toLowerCase();
        const address = (c.shipping_address || c.decrypted_address || '').toLowerCase();
        const channel = (c.channel || '').toLowerCase();
        const id = (c.id || '').toLowerCase();
        if (!name.includes(q) && !order.includes(q) && !phone.includes(q) && !address.includes(q) && !channel.includes(q) && !id.includes(q)) {
          return false;
        }
      }

      // 2. Channel Filter
      if (this.customerChannelFilter && this.customerChannelFilter !== 'all') {
        if ((c.channel || '').toLowerCase() !== this.customerChannelFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    // 3. Sorting
    return list.sort((a, b) => {
      if (this.customerSortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (this.customerSortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (this.customerSortBy === 'name-asc') {
        const nameA = (a.full_name || a.decrypted_name || '').toLowerCase();
        const nameB = (b.full_name || b.decrypted_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (this.customerSortBy === 'name-desc') {
        const nameA = (a.full_name || a.decrypted_name || '').toLowerCase();
        const nameB = (b.full_name || b.decrypted_name || '').toLowerCase();
        return nameB.localeCompare(nameA);
      } else if (this.customerSortBy === 'order') {
        const ordA = (a.external_order_id || '').toLowerCase();
        const ordB = (b.external_order_id || '').toLowerCase();
        return ordA.localeCompare(ordB);
      }
      return 0;
    });
  }

  get paginatedCustomers(): CustomerRecord[] {
    const list = this.filteredCustomers;
    if (this.customerPageSize === -1) {
      return list;
    }
    const start = (this.customerCurrentPage - 1) * this.customerPageSize;
    return list.slice(start, start + this.customerPageSize);
  }

  get totalCustomerPages(): number {
    if (this.customerPageSize === -1) return 1;
    return Math.ceil(this.filteredCustomers.length / this.customerPageSize) || 1;
  }

  get customerPaginationStart(): number {
    if (this.filteredCustomers.length === 0) return 0;
    return (this.customerCurrentPage - 1) * this.customerPageSize + 1;
  }

  get customerPaginationEnd(): number {
    if (this.customerPageSize === -1) return this.filteredCustomers.length;
    return Math.min(this.customerCurrentPage * this.customerPageSize, this.filteredCustomers.length);
  }

  setCustomerPage(page: number) {
    if (page >= 1 && page <= this.totalCustomerPages) {
      this.customerCurrentPage = page;
    }
  }

  onCustomerFilterChange() {
    this.customerCurrentPage = 1;
  }

  onCustomerPageSizeChange() {
    this.customerCurrentPage = 1;
  }

  resetCustomerFilters() {
    this.customerSearch = '';
    this.customerChannelFilter = 'all';
    this.customerSortBy = 'newest';
    this.customerPageSize = 10;
    this.customerCurrentPage = 1;
  }

  getCustomerInitials(name?: string): string {
    if (!name || !name.trim()) return 'CU';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  copyCustomerData(text: string, label: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.showToast(`${label} copiado al portapapeles`);
    }
  }

  // Texas Data Privacy and Security Act (TDPSA) Handlers
  exportCustomerTdpsa(customer: any) {
    this.http.get(`http://localhost:3000/api/customers/${customer.id}/export`).subscribe({
      next: (data: any) => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TDPSA_Portability_Export_${customer.external_order_id || customer.id}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showToast('Certificado de portabilidad TDPSA descargado correctamente');
      },
      error: () => {
        this.showToast('Error al exportar datos del cliente bajo TDPSA');
      }
    });
  }

  anonymizeCustomerTdpsa(customer: any) {
    if (!confirm(`¿Ejercer Derecho al Olvido (TDPSA Sec. 541.051)? Se anonimizarán de forma permanente el nombre, dirección y teléfono de "${customer.full_name || customer.decrypted_name}".`)) {
      return;
    }
    this.http.post<any>(`http://localhost:3000/api/customers/${customer.id}/anonymize`, {
      actorEmail: this.currentUserEmail,
      reason: 'TDPSA Consumer Right to Erasure Request'
    }).subscribe({
      next: (res) => {
        this.showToast('Datos PII anonimizados exitosamente conforme a TDPSA (Texas)');
        customer.full_name = 'ANONYMIZED_TDPSA_CONSUMER';
        customer.decrypted_name = 'ANONYMIZED_TDPSA_CONSUMER';
        customer.shipping_address = 'REDACTED_PER_TEXAS_DATA_PRIVACY_ACT';
        customer.decrypted_address = 'REDACTED_PER_TEXAS_DATA_PRIVACY_ACT';
        customer.phone = '000-000-0000';
        customer.decrypted_phone = '000-000-0000';
      },
      error: (err) => {
        this.showToast(err.error?.error || 'Error al anonimizar cliente');
      }
    });
  }

  loadHealth() {
    this.devopsLoading = true;
    this.http.get<any>('http://localhost:3000/api/devops/telemetry').subscribe({
      next: (res) => {
        this.devopsTelemetry = res;
        this.systemUptime = Math.floor(res.system?.uptimeSeconds || 0);
        this.serverStatus = res.status === 'healthy' ? 'Online (Healthy)' : (res.status === 'degraded' ? 'Degraded Performance' : 'Offline');
        this.devopsLoading = false;
      },
      error: () => {
        this.serverStatus = 'Offline';
        this.devopsLoading = false;
      }
    });
    this.loadDevopsLogs();
    this.loadPrometheusMetrics();
  }

  loadDevopsLogs() {
    this.http.get<any[]>(`http://localhost:3000/api/devops/logs?level=${this.devopsLogFilter}`).subscribe({
      next: (logs) => {
        this.devopsLogs = logs;
      },
      error: (err) => console.error('Error fetching devops logs:', err)
    });
  }

  loadPrometheusMetrics() {
    this.http.get('http://localhost:3000/metrics', { responseType: 'text' }).subscribe({
      next: (metrics) => {
        this.devopsPrometheusMetricsRaw = metrics;
      },
      error: (err) => console.error('Error fetching metrics:', err)
    });
  }

  pingDatabaseNow() {
    this.devopsPingLoading = true;
    this.http.post<any>('http://localhost:3000/api/devops/ping-db', {}).subscribe({
      next: (res) => {
        this.devopsPingLoading = false;
        if (this.devopsTelemetry && this.devopsTelemetry.database) {
          this.devopsTelemetry.database.latencyMs = res.latencyMs;
          this.devopsTelemetry.database.status = res.status === 'ok' ? (res.latencyMs > 600 ? 'high_latency' : 'connected') : 'disconnected';
        }
        this.showToast(`Neon DB Ping: ${res.latencyMs} ms (${res.status.toUpperCase()})`);
        this.loadDevopsLogs();
      },
      error: (err) => {
        this.devopsPingLoading = false;
        this.showToast(`Error ping DB: ${err.message || 'Error'}`);
      }
    });
  }

  setDevopsLogFilter(filter: string) {
    this.devopsLogFilter = filter;
    this.loadDevopsLogs();
  }

  clearDevopsLogsView() {
    this.devopsLogs = [];
    this.showToast('Vista de registros limpiada.');
  }

  // Inventory Filtering & Pagination Getters
  get filteredInventoryItems(): InventoryItem[] {
    return this.inventoryItems.filter(item => {
      // 1. Text Search Filter (Name, SKU, Supplier, Type)
      if (this.inventorySearch && this.inventorySearch.trim()) {
        const q = this.inventorySearch.trim().toLowerCase();
        const matchName = (item.product_name || '').toLowerCase().includes(q);
        const matchSku = (item.sku || '').toLowerCase().includes(q);
        const matchSupplier = (item.supplier_name || '').toLowerCase().includes(q);
        const matchType = (item.product_type || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchSupplier && !matchType) return false;
      }

      // 2. Stock Health Filter (e.g. Almost out / low stock < 20)
      const stock = Number(item.stock_quantity) || 0;
      if (this.inventoryStockFilter === 'low') {
        if (stock <= 0 || stock >= 20) return false; // low: almost out (1 - 19)
      } else if (this.inventoryStockFilter === 'out') {
        if (stock > 0) return false; // completely out of stock (0)
      } else if (this.inventoryStockFilter === 'in') {
        if (stock < 20) return false; // healthy stock (20+)
      }

      // 3. Product Type / Category Filter
      if (this.inventoryTypeFilter && this.inventoryTypeFilter !== 'all') {
        const itemType = (item.product_type || 'Electronics').trim().toLowerCase();
        const selected = this.inventoryTypeFilter.trim().toLowerCase();
        if (itemType !== selected) return false;
      }

      return true;
    });
  }

  get paginatedInventoryItems(): InventoryItem[] {
    const list = this.filteredInventoryItems;
    if (this.inventoryPageSize === -1) {
      return list;
    }
    const start = (this.inventoryCurrentPage - 1) * this.inventoryPageSize;
    return list.slice(start, start + this.inventoryPageSize);
  }

  get totalInventoryPages(): number {
    if (this.inventoryPageSize === -1) return 1;
    return Math.ceil(this.filteredInventoryItems.length / this.inventoryPageSize) || 1;
  }

  setInventoryPage(page: number) {
    if (page >= 1 && page <= this.totalInventoryPages) {
      this.inventoryCurrentPage = page;
    }
  }

  onInventoryFilterChange() {
    this.inventoryCurrentPage = 1;
  }

  onInventoryPageSizeChange() {
    this.inventoryCurrentPage = 1;
  }

  loadProductTypes() {
    this.http.get<string[]>('http://localhost:3000/api/inventory/types').subscribe({
      next: (types) => {
        if (types && types.length > 0) {
          this.productTypes = types;
        }
      },
      error: (err) => console.error('Error loading product types:', err)
    });
  }

  openCreateTypeModal() {
    this.newTypeName = '';
    this.showCreateTypeModal = true;
  }

  closeCreateTypeModal() {
    this.showCreateTypeModal = false;
    this.newTypeName = '';
    this.creatingType = false;
  }

  submitCreateProductType() {
    if (!this.newTypeName.trim()) {
      this.showToast('Please enter a valid product type name');
      return;
    }
    this.creatingType = true;
    this.http.post<any>('http://localhost:3000/api/inventory/types', {
      name: this.newTypeName.trim()
    }).subscribe({
      next: (res) => {
        this.creatingType = false;
        if (res.types && res.types.length > 0) {
          this.productTypes = res.types;
        } else if (!this.productTypes.includes(res.created)) {
          this.productTypes.push(res.created);
        }
        this.newProdType = res.created || this.newTypeName.trim();
        this.closeCreateTypeModal();
        this.showToast(`Product type "${res.created}" registered successfully`);
      },
      error: (err) => {
        this.creatingType = false;
        console.error('Error creating product type:', err);
        this.showToast(err.error?.error || 'Failed to create product type');
      }
    });
  }

  openRegisterProductModal() {
    this.newProdChannel = 'Shopify';
    this.newProdSku = '';
    this.newProdName = '';
    this.newProdStock = 25;
    this.newProdCost = 35.00;
    this.newProdPrice = 79.99;
    this.newProdImageUrl = '';
    this.newProdImagePreview = '';
    this.newProdDescription = '';
    this.newProdType = this.productTypes[0] || 'Electronics';
    this.publishingProduct = false;
    this.showRegisterProductModal = true;
  }

  closeRegisterProductModal() {
    this.showRegisterProductModal = false;
    this.publishingProduct = false;
  }

  onProductImageSelected(event: any) {
    const file = event.target?.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('Image file too large (Max 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.newProdImageUrl = reader.result as string;
        this.newProdImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onProductImageUrlChange() {
    this.newProdImagePreview = this.newProdImageUrl ? this.newProdImageUrl.trim() : '';
  }

  clearProductImage() {
    this.newProdImageUrl = '';
    this.newProdImagePreview = '';
  }

  createInventoryProduct() {
    if (!this.newProdSku.trim() || !this.newProdName.trim()) {
      this.showToast('SKU and Product Name are required');
      return;
    }

    this.publishingProduct = true;
    const payload = {
      sku: this.newProdSku.trim().toUpperCase(),
      product_name: this.newProdName.trim(),
      stock_quantity: Number(this.newProdStock) || 0,
      supplier_name: this.newProdSupplier,
      unit_cost: Number(this.newProdCost) || 0,
      sale_price: Number(this.newProdPrice) || 0,
      image_url: this.newProdImageUrl ? this.newProdImageUrl.trim() : undefined,
      channel: this.newProdChannel,
      description: this.newProdDescription ? this.newProdDescription.trim() : undefined,
      product_type: this.newProdType || 'Electronics'
    };

    this.http.post<any>('http://localhost:3000/api/inventory', payload).subscribe({
      next: (res) => {
        this.publishingProduct = false;
        this.closeRegisterProductModal();
        if (res.shopify_product_id) {
          this.showToast(`✅ Product ${res.sku} published directly to Shopify Store (ID: ${res.shopify_product_id})!`);
        } else if (res.shopifySyncStatus === 'failed') {
          this.showToast(`⚠️ Saved to local inventory. Shopify: ${res.shopifyMessage}`);
        } else {
          this.showToast(`Product ${res.sku} registered in Central Inventory`);
        }
        this.loadInventory();
        this.loadMetrics();
      },
      error: (err) => {
        this.publishingProduct = false;
        console.error('Error creating product in inventory/Shopify:', err);
        const errMsg = err.error?.error || 'Failed to publish product to Shopify and inventory';
        this.showToast(errMsg);
      }
    });
  }

  // --- Inventory Edit Product Methods ---
  openEditProductModal(item: InventoryItem) {
    this.editingProduct = item;
    this.editProdSku = item.sku;
    this.editProdName = item.product_name;
    this.editProdStock = item.stock_quantity;
    this.editProdSupplier = item.supplier_name || 'Apex Global Electronics';
    this.editProdCost = item.unit_cost || 45.00;
    this.editProdPrice = item.sale_price || 89.99;
    this.editProdImageUrl = item.image_url || '';
    this.editProdImagePreview = item.image_url || '';
    this.editProdDescription = '';
    this.editProdType = item.product_type || this.productTypes[0] || 'Electronics';
    this.editProdChannel = item.channel || 'Shopify';
    this.savingEditedProduct = false;
    this.showEditProductModal = true;
  }

  closeEditProductModal() {
    this.showEditProductModal = false;
    this.editingProduct = null;
    this.savingEditedProduct = false;
  }

  onEditProductImageSelected(event: any) {
    const file = event.target?.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('Image file too large (Max 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.editProdImageUrl = reader.result as string;
        this.editProdImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onEditProductImageUrlChange() {
    this.editProdImagePreview = this.editProdImageUrl ? this.editProdImageUrl.trim() : '';
  }

  clearEditProductImage() {
    this.editProdImageUrl = '';
    this.editProdImagePreview = '';
  }

  saveEditedProduct() {
    if (!this.editProdName.trim()) {
      this.showToast('Product name is required');
      return;
    }

    this.savingEditedProduct = true;
    const payload = {
      product_name: this.editProdName.trim(),
      stock_quantity: Number(this.editProdStock) || 0,
      supplier_name: this.editProdSupplier,
      unit_cost: Number(this.editProdCost) || 0,
      sale_price: Number(this.editProdPrice) || 0,
      image_url: this.editProdImageUrl ? this.editProdImageUrl.trim() : undefined,
      channel: this.editProdChannel,
      description: this.editProdDescription ? this.editProdDescription.trim() : undefined,
      product_type: this.editProdType || 'Electronics'
    };

    this.http.put<any>(`http://localhost:3000/api/inventory/${encodeURIComponent(this.editProdSku)}`, payload).subscribe({
      next: (res) => {
        this.savingEditedProduct = false;
        this.closeEditProductModal();
        if (res.shopifySyncStatus === 'synced') {
          this.showToast(`✅ Product ${res.sku} updated and synced with Shopify!`);
        } else if (res.shopifySyncStatus === 'failed') {
          this.showToast(`⚠️ Updated locally. Shopify: ${res.shopifyMessage}`);
        } else {
          this.showToast(`Product ${res.sku} updated successfully`);
        }
        this.loadInventory();
        this.loadMetrics();
      },
      error: (err) => {
        this.savingEditedProduct = false;
        console.error('Error updating product in inventory:', err);
        const errMsg = err.error?.error || 'Failed to update product';
        this.showToast(errMsg);
      }
    });
  }

  // --- Inventory Delete Product Methods ---
  openDeleteProductModal(item: InventoryItem) {
    this.deletingProduct = item;
    this.deletingProductLoading = false;
    this.showDeleteProductModal = true;
  }

  closeDeleteProductModal() {
    this.showDeleteProductModal = false;
    this.deletingProduct = null;
    this.deletingProductLoading = false;
  }

  confirmDeleteProduct() {
    if (!this.deletingProduct) return;

    const sku = this.deletingProduct.sku;
    this.deletingProductLoading = true;

    this.http.delete<any>(`http://localhost:3000/api/inventory/${encodeURIComponent(sku)}`).subscribe({
      next: (res) => {
        this.deletingProductLoading = false;
        this.closeDeleteProductModal();
        if (res.shopifyDeleted) {
          this.showToast(`🗑️ Product ${sku} deleted from inventory & Shopify store`);
        } else if (res.shopifyError) {
          this.showToast(`🗑️ Deleted from local inventory. Shopify: ${res.shopifyError}`);
        } else {
          this.showToast(`Product ${sku} deleted successfully`);
        }
        this.loadInventory();
        this.loadMetrics();
      },
      error: (err) => {
        this.deletingProductLoading = false;
        console.error('Error deleting product from inventory:', err);
        const errMsg = err.error?.error || 'Failed to delete product';
        this.showToast(errMsg);
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
    if (!this.canAccessModule(this.activeModule)) {
      this.activeModule = 'dashboard';
    }
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
