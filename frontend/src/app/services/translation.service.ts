import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SupportedLanguage = 'en' | 'es';

export interface Translations {
  appName: string;
  brandTagline: string;
  settings: string;
  logout: string;
  save: string;
  close: string;
  backToDashboard: string;
  dashboardNav: string;
  activeRole: string;
  adminRole: string;
  operatorRole: string;

  // Sidebar Categories & Modules
  catPlatform: string;
  catOperations: string;
  modDashboard: string;
  modMetrics: string;
  modChannels: string;
  modInventory: string;
  modSuppliers: string;
  modCustomers: string;
  modUsers: string;
  modLogistics: string;
  modDevops: string;
  modReturns: string;

  // Metrics Module
  metricsTitle: string;
  metricsSubtitle: string;
  kpiRevenue: string;
  kpiShopifyShare: string;
  kpiAmazonShare: string;
  kpiDeliveryRate: string;
  kpiInventoryValuation: string;
  kpiLowStockAlert: string;
  kpiSlaCompliance: string;
  kpiAov: string;
  channelComparisonTitle: string;
  colChannelName: string;
  colChannelOrders: string;
  colChannelVolume: string;
  colChannelTicket: string;
  colChannelFulfillment: string;
  tabFinancialBI: string;
  tabLogisticsVelocity: string;
  tabCustomerRetention: string;
  tabInventoryHealth: string;
  tabApiTelemetry: string;
  metricCogs: string;
  metricGrossProfit: string;
  metricGrossMargin: string;
  metricMarginPerOrder: string;
  metricOnTimeRate: string;
  metricLeadTime: string;
  metricReturnRate: string;
  metricRepeatRate: string;
  metricClv: string;
  metricDoi: string;
  metricTurnover: string;
  metricStockRisk: string;
  metricP95Latency: string;
  metricUptime: string;
  metricRpm: string;
  bestSellersTitle: string;
  carrierShareTitle: string;
  regionalDemandTitle: string;
  tabShopifyVsAmazon: string;
  tabReturnsRma: string;
  financialDesc: string;
  marginLabel: string;
  cogsDesc: string;
  grossProfitDesc: string;
  salesTrendTitle: string;
  salesTrendDesc: string;
  btnChartRevenue: string;
  btnChartOrders: string;
  legendTotalRevenue: string;
  marketShareTitle: string;
  marketShareDesc: string;
  leaderLabel: string;
  tblChannelProfitTitle: string;
  colOrders: string;
  colGrossRev: string;
  colCogs: string;
  colGrossProfit: string;
  colMarginPct: string;
  logisticsDesc: string;
  deliveredCountLabel: string;
  inTransitCountLabel: string;
  onTimeTargetDesc: string;
  leadTimeDesc: string;
  incidentDesc: string;
  carrierShareSubtitle: string;
  overallOnTimeCompliance: string;
  shareLabel: string;
  fulfillmentFunnelTitle: string;
  activeShipmentsLabel: string;
  deliveredAndConfirmed: string;
  outForDeliveryRoute: string;
  customersDesc: string;
  uniqueCustomersTitle: string;
  protectedDbNotice: string;
  repeatRateDesc: string;
  clvDesc: string;
  inventoryDesc: string;
  unitsInSkus: string;
  skusLabel: string;
  daysUnit: string;
  doiDesc: string;
  timesPerYear: string;
  turnoverDesc: string;
  ofCatalog: string;
  lowStockDesc: string;
  visualStockTitle: string;
  visualStockSubtitle: string;
  optimalStock: string;
  reorderAlert: string;
  lowStockBadge: string;
  unitsAbbr: string;
  safetyThresholdDesc: string;
  colSku: string;
  colProduct: string;
  colSupplier: string;
  colCurrentStock: string;
  colCost: string;
  colPrice: string;
  telemetryDesc: string;
  avgLatencyTitle: string;
  withinSlaDesc: string;
  p95Desc: string;
  uptimeDesc: string;
  rpmDesc: string;
  slaGaugeTitle: string;
  slaGaugeDesc: string;
  inCompliance: string;
  targetSla: string;
  syncedOk: string;
  noFailures: string;
  sparklineTitle: string;
  sparklineDesc: string;
  realTimeBadge: string;
  slaLimitLabel: string;
  minLatency: string;
  avgLatency: string;
  channelComparisonDesc: string;
  revenueByChannel: string;
  orderVolumeByChannel: string;
  ordersCountUnit: string;
  aovByChannel: string;
  shopifyAdvantage: string;
  amazonAdvantage: string;
  slaFastBadge: string;
  slaNormalBadge: string;
  normalStatus: string;
  attentionStatus: string;
  registeredReturns: string;
  gatewayRefunds: string;
  recoveredBadge: string;
  unitsRecovered: string;
  restockedInventoryDesc: string;
  resolutionTimeTitle: string;
  resolutionTimeDesc: string;
  causalTitle: string;
  causalDesc: string;
  categoriesCount: string;
  casesLabel: string;
  channelIncidentTitle: string;
  channelIncidentDesc: string;
  dayPolicy: string;
  fbaManaged: string;
  recoveryTitle: string;
  recoveryDesc: string;
  savedValue: string;
  unitsRestocked: string;

  // Suppliers Module
  supTitle: string;
  supSubtitle: string;
  colSupName: string;
  colSupContact: string;
  colSupCategory: string;
  colSupLeadTime: string;
  colSupRating: string;
  colSupAction: string;
  btnOrderStock: string;
  leadDays: string;
  tabSuppliersDirectory: string;
  tabPurchaseOrders: string;
  tabRestockAlerts: string;
  btnNewSupplier: string;
  btnQuickRestock: string;
  searchSuppliersPlaceholder: string;

  // Route & Tracking
  routeTrackingTitle: string;
  routeTrackingSubtitle: string;
  colRouteCarrier: string;
  colRouteDestination: string;
  colRouteStatus: string;
  colHasArrived: string;
  colActionAdvance: string;
  arrivedYes: string;
  arrivedPending: string;
  btnAdvanceStep: string;
  btnTrackShipment: string;
  btnExportCsv: string;
  btnClearTable: string;
  btnClearFilters: string;
  btnPurgeRetention: string;
  retentionPolicyBadge: string;
  rowsPerPage: string;
  carrierFilterAll: string;
  channelFilterAll: string;
  arrivalFilterAll: string;
  trackingModalTitle: string;
  copyTracking: string;
  trackingCopied: string;

  // User Management Module
  userMgmtTitle: string;
  userMgmtSubtitle: string;
  addNewUser: string;
  colUserEmail: string;
  colUserRole: string;
  colUserCreated: string;
  userRoleAdmin: string;
  userRoleOperator: string;
  btnCreateUser: string;
  accessRestrictedTitle: string;
  accessRestrictedMsg: string;

  // Header & Status
  liveSyncStatus: string;

  // Search & Filters
  searchPlaceholder: string;
  allChannels: string;
  allStatuses: string;
  statusPaid: string;
  statusPending: string;
  statusRefunded: string;
  slaFilterTitle: string;
  slaFast: string;
  slaNormal: string;
  slaBreach: string;
  resetFilters: string;

  // Orders Table
  tableTitle: string;
  tableSubtitle: string;
  colOrderId: string;
  colChannel: string;
  colCustomer: string;
  colTotal: string;
  colLatency: string;
  colStatus: string;
  encryptedNotice: string;
  noOrdersTitle: string;
  noOrdersSubtitle: string;

  // Pagination
  showingRecords: string;
  pageOf: string;
  previous: string;
  next: string;

  // Channels Module
  topicLabel: string;
  authLabel: string;
  secretLabel: string;
  endpointLabel: string;
  dedupLabel: string;
  dbSyncLabel: string;
  statusConnected: string;
  statusReady: string;
  simulateShopifyBtn: string;
  simulateAmazonBtn: string;

  // Inventory Module
  invTitle: string;
  invSubtitle: string;
  invRefresh: string;
  invColSku: string;
  invColName: string;
  invColStock: string;
  invColStatus: string;
  invColSync: string;
  invColActions: string;
  invAvailable: string;
  invOutOfStock: string;
  invAddUnits: string;

  // Customers Module
  custTitle: string;
  custSubtitle: string;
  custDecryptBtn: string;
  custLockBtn: string;
  custMaskedNotice: string;
  custColOrder: string;
  custColChannel: string;
  custColName: string;
  custColAddress: string;
  custColPhone: string;
  custColBuffer: string;
  custEmpty: string;

  // Logistics Module
  logTitle: string;
  logSubtitle: string;
  logHubTag: string;
  logColShipment: string;
  logColOrder: string;
  logColCarrier: string;
  logColTracking: string;
  logColDestination: string;
  logColProgress: string;
  logColStatus: string;
  logStatusInTransit: string;
  logStatusOutForDelivery: string;
  logStatusDelivered: string;
  logStatusPending: string;
  logConnectorReady: string;
  logInternalDispatch: string;
  logAutoEngineTitle: string;
  logAutoEngineDesc: string;
  logBtnAutoOn: string;
  logBtnAutoOff: string;
  logBtnBulkAdvance: string;
  logBtnSimulateBatch: string;
  logFilterAll: string;
  logFilterProcessing: string;
  logFilterTransit: string;
  logFilterOutForDelivery: string;
  logFilterDelivered: string;
  logSearchPlaceholder: string;

  // DevOps Module
  devopsTitle: string;
  devopsSubtitle: string;
  telemetryUptimeTitle: string;
  telemetryUptimeDesc: string;
  telemetrySlaTitle: string;
  telemetrySlaTarget: string;
  telemetryDbTitle: string;
  telemetryDbDesc: string;
  langSettingTitle: string;
  langDefaultDesc: string;
  langTransDesc: string;
  devopsTabOverview: string;
  devopsTabContainers: string;
  devopsTabCicd: string;
  devopsTabLogs: string;
  devopsTabMetrics: string;
  devopsPingDb: string;
  devopsRefresh: string;
  devopsMemoryUsage: string;
  devopsConnectedSockets: string;
  devopsStatusOperational: string;
  devopsStatusDegraded: string;
  devopsLogsFilterAll: string;
  devopsClearLogs: string;

  // Settings View
  settingsTitle: string;
  settingsSubtitle: string;
  tabGeneral: string;
  tabRoles: string;
  tabChannels: string;
  languageSelectTitle: string;
  languageSelectDesc: string;
  langEn: string;
  langEs: string;
  rbacTitle: string;
  rbacDesc: string;
  activeUser: string;
  simulateRole: string;
  adminPerms: string;
  operatorPerms: string;
  adminBadge: string;
  operatorBadge: string;
  accountInfo: string;
  organization: string;
  securityCompliance: string;
  securityStandardDesc: string;
  storeIntegrations: string;
  shopifyStore: string;
  webhookStatus: string;
  webhookStatusDesc: string;
  changesSaved: string;

  // Returns & RMA Module
  retTitle: string;
  retSubtitle: string;
  retBtnRegister: string;
  retBtnSimulateRefund: string;
  retBtnSeedDemo: string;
  retOrderAction: string;
  retSearchPlaceholder: string;
  retFilterStatusAll: string;
  retFilterReasonAll: string;
  retColRma: string;
  retColOrder: string;
  retColCustomer: string;
  retColProduct: string;
  retColReason: string;
  retColRefund: string;
  retColStatus: string;
  retColRestock: string;
  retColActions: string;
  retStatusRequested: string;
  retStatusApproved: string;
  retStatusReceivedRestocked: string;
  retStatusDeclined: string;
  retReasonDefective: string;
  retReasonSizeFit: string;
  retReasonNotAsDescribed: string;
  retReasonWrongItem: string;
  retReasonCustomerMind: string;
  retBtnApprove: string;
  retBtnReceiveRestock: string;
  retBtnDecline: string;
  retRestockedBadge: string;
  retKpiTotal: string;
  retKpiActive: string;
  retKpiRestocked: string;
  retKpiRefunded: string;
  retKpiRate: string;
  retModalTitle: string;
  retModalDesc: string;
  retFormFieldOrder: string;
  retFormFieldCustomer: string;
  retFormFieldSku: string;
  retFormFieldProduct: string;
  retFormFieldQty: string;
  retFormFieldAmount: string;
  retFormFieldReason: string;
  retFormFieldRestock: string;
  retFormFieldNotes: string;
  retBtnSubmit: string;
  retRestockNotice: string;
  retMetricsTitle: string;
  retMetricsSubtitle: string;
}

const DICTIONARY: Record<SupportedLanguage, Translations> = {
  en: {
    appName: 'OrderSync',
    brandTagline: 'Intelligent Real-Time Multi-Channel Order Engine',
    settings: 'Settings',
    logout: 'Sign Out',
    save: 'Save Changes',
    close: 'Close',
    backToDashboard: 'Back to Dashboard',
    dashboardNav: 'Dashboard',
    activeRole: 'Role',
    adminRole: 'Administrator',
    operatorRole: 'Operator',

    // Sidebar Categories & Modules
    catPlatform: 'Core Platform',
    catOperations: 'Operations & DevOps',
    modDashboard: 'Dashboard Overview',
    modMetrics: 'Business Metrics & BI',
    modChannels: 'Sales Channels (APIs)',
    modInventory: 'Inventory & Stock',
    modSuppliers: 'Suppliers & Procurement',
    modCustomers: 'Customers',
    modUsers: 'User Management',
    modLogistics: 'Logistics & Route Tracking',
    modDevops: 'DevOps & Monitoring',
    modReturns: 'Returns & Refunds',

    // Metrics Module
    metricsTitle: 'Executive Business Intelligence & Metrics',
    metricsSubtitle: 'Multi-channel analytics across Shopify and Amazon ecosystems',
    kpiRevenue: 'Total Gross Revenue',
    kpiShopifyShare: 'Shopify Share',
    kpiAmazonShare: 'Amazon Share',
    kpiDeliveryRate: 'Delivery Success Rate',
    kpiInventoryValuation: 'Total Inventory Valuation',
    kpiLowStockAlert: 'Critical Stock SKUs',
    kpiSlaCompliance: 'Ingestion SLA Compliance',
    kpiAov: 'Average Order Value (AOV)',
    channelComparisonTitle: 'Sales Channel Performance Breakdown',
    colChannelName: 'Sales Channel',
    colChannelOrders: 'Orders Count',
    colChannelVolume: 'Total Volume ($)',
    colChannelTicket: 'Avg Ticket',
    colChannelFulfillment: 'Fulfillment Model',
    tabFinancialBI: 'Financials & Margins',
    tabLogisticsVelocity: 'Logistics & Carriers',
    tabCustomerRetention: 'Customer Cohorts & LTV',
    tabInventoryHealth: 'Inventory Velocity',
    tabApiTelemetry: 'API Telemetry',
    metricCogs: 'Total COGS (Cost of Goods)',
    metricGrossProfit: 'Net Gross Profit',
    metricGrossMargin: 'Gross Profit Margin',
    metricMarginPerOrder: 'Margin per Order',
    metricOnTimeRate: 'On-Time Delivery Rate',
    metricLeadTime: 'Avg Fulfillment Time',
    metricReturnRate: 'Return & Incident Rate',
    metricRepeatRate: 'Repeat Purchase Rate',
    metricClv: 'Estimated Customer LTV',
    metricDoi: 'Days of Inventory (DOI)',
    metricTurnover: 'Inventory Turnover',
    metricStockRisk: 'Stockout Risk Exposure',
    metricP95Latency: 'p95 Ingestion Latency',
    metricUptime: 'Webhook Ingestion Uptime',
    metricRpm: 'Throughput (RPM)',
    bestSellersTitle: 'Top Performing SKUs by Demand',
    carrierShareTitle: 'Carrier Fleet Distribution',
    regionalDemandTitle: 'Top Regional Shipping Hubs',
    tabShopifyVsAmazon: 'Shopify vs Amazon',
    tabReturnsRma: 'Returns & RMA',
    financialDesc: 'Contribution margins, cost of goods sold, and omnichannel net profit.',
    marginLabel: 'Margin',
    cogsDesc: '42% Weighted catalog fulfillment & acquisition cost',
    grossProfitDesc: 'Cumulative net gross profit on realized sales',
    salesTrendTitle: 'Weekly Sales Trend & Projection',
    salesTrendDesc: 'Cumulative gross revenue and daily omnichannel behavior',
    btnChartRevenue: 'Revenue ($)',
    btnChartOrders: 'Volume (Orders)',
    legendTotalRevenue: 'Total Omnichannel Revenue',
    marketShareTitle: 'Channel Market Share',
    marketShareDesc: 'Revenue distribution and commercial channel dependency',
    leaderLabel: 'Leader',
    tblChannelProfitTitle: 'Profitability Statement by Sales Channel',
    colOrders: 'Orders',
    colGrossRev: 'Gross Revenue ($)',
    colCogs: 'COGS Cost ($)',
    colGrossProfit: 'Gross Profit ($)',
    colMarginPct: 'Margin %',
    logisticsDesc: 'Fulfillment lead times, carrier distribution, and delivery promise compliance.',
    deliveredCountLabel: 'delivered',
    inTransitCountLabel: 'in transit',
    onTimeTargetDesc: 'Carrier SLA Target: ≥ 95.0% (Met)',
    leadTimeDesc: 'Average duration from order receipt to dispatch assignment',
    incidentDesc: 'Loss and damage rate within benchmark (< 1.5%)',
    carrierShareSubtitle: 'Carrier fleet percentage breakdown and delivery velocity SLA',
    overallOnTimeCompliance: 'Overall Compliance: 97.4% On-Time',
    shareLabel: 'Share',
    fulfillmentFunnelTitle: 'Global Logistics Fulfillment Pipeline',
    activeShipmentsLabel: 'Active Shipments',
    deliveredAndConfirmed: 'Delivered & Confirmed',
    outForDeliveryRoute: 'Out for Delivery',
    customersDesc: 'Purchasing behavior, repeat order rates, and regional customer distribution.',
    uniqueCustomersTitle: 'Registered Unique Customers',
    protectedDbNotice: 'Identities protected & encrypted at rest in PostgreSQL',
    repeatRateDesc: 'Repeat customer re-order rate (+1 recorded order)',
    clvDesc: 'Estimated Customer Lifetime Value across channels',
    inventoryDesc: 'Stock valuation, turnover velocity, and stockout risk mitigation.',
    unitsInSkus: 'units across',
    skusLabel: 'SKUs',
    daysUnit: 'days',
    doiDesc: 'Stock coverage based on current sales velocity',
    timesPerYear: 'x / year',
    turnoverDesc: 'Annual catalog replacement and cycle frequency',
    ofCatalog: 'of catalog',
    lowStockDesc: 'Products with fewer than 15 available units',
    visualStockTitle: 'Visual Stock Monitoring by Product',
    visualStockSubtitle: 'Warehouse stock vs Critical Reorder Threshold (15 Units)',
    optimalStock: 'Optimal Stock',
    reorderAlert: 'Reorder Alert (< 15u)',
    lowStockBadge: 'Low Stock',
    unitsAbbr: 'units',
    safetyThresholdDesc: 'Dashed line marks the operational minimum safety threshold (15 units).',
    colSku: 'SKU',
    colProduct: 'Product',
    colSupplier: 'Supplier',
    colCurrentStock: 'Current Stock',
    colCost: 'Cost',
    colPrice: 'Price',
    telemetryDesc: 'Real-time webhook ingestion speed, cryptographic verification, and SLA adherence.',
    avgLatencyTitle: 'Average Latency (SLA)',
    withinSlaDesc: '✓ Within Target SLA (< 5,000 ms)',
    p95Desc: '95th percentile atomic write in PostgreSQL',
    uptimeDesc: 'Continuous availability without endpoint downtime',
    rpmDesc: 'Concurrent burst processing capacity',
    slaGaugeTitle: 'Service Guarantee (SLA Compliance)',
    slaGaugeDesc: 'Webhook ingestion completed in under 5,000 ms',
    inCompliance: 'In Compliance',
    targetSla: 'Target SLA:',
    syncedOk: 'Synced OK:',
    noFailures: '100% Zero Failures',
    sparklineTitle: 'Live Latency Curve (ms)',
    sparklineDesc: 'Most recent synchronization events',
    realTimeBadge: 'Real Time',
    slaLimitLabel: 'SLA Limit 5,000 ms',
    minLatency: 'Min Latency:',
    avgLatency: 'Avg Latency:',
    channelComparisonDesc: 'Technical, volume, and operational comparison between Shopify and Amazon SP-API.',
    revenueByChannel: 'Revenue by Channel',
    orderVolumeByChannel: 'Order Volume',
    ordersCountUnit: 'orders',
    aovByChannel: 'Average Order Value (AOV)',
    shopifyAdvantage: 'Higher Unit Margin',
    amazonAdvantage: 'Faster FBA Velocity',
    slaFastBadge: '≤ 1,500 ms (Fast)',
    slaNormalBadge: '≤ 2,200 ms (Within SLA)',
    normalStatus: 'Normal (< 3.5%)',
    attentionStatus: 'Attention Required',
    registeredReturns: 'returns registered in OrderSync',
    gatewayRefunds: 'Processed refunds across payment gateways',
    recoveredBadge: 'Recovered',
    unitsRecovered: 'units',
    restockedInventoryDesc: 'Items atomically re-entered into inventory',
    resolutionTimeTitle: 'RMA Resolution Time',
    resolutionTimeDesc: 'Average from ticket opened to inspection decision',
    causalTitle: 'Causal Distribution by Reason (RMA)',
    causalDesc: 'Defect monitoring and product description mismatches',
    categoriesCount: 'Categories',
    casesLabel: 'case(s)',
    channelIncidentTitle: 'Incidents by Sales Channel',
    channelIncidentDesc: 'Comparative return rates between Shopify and Amazon',
    dayPolicy: '30-Day policy active',
    fbaManaged: 'Automated FBA management',
    recoveryTitle: 'Financial Inventory Recovery',
    recoveryDesc: 'Monetary valuation restored to stock after technical RMA inspection',
    savedValue: 'Restored Inventory Value',
    unitsRestocked: 'Units Restocked',

    // Suppliers Module
    supTitle: 'Suppliers & Procurement Directory',
    supSubtitle: 'Official supply chain partners for multi-channel inventory restock',
    colSupName: 'Supplier Name',
    colSupContact: 'Primary Contact',
    colSupCategory: 'Category',
    colSupLeadTime: 'Lead Time',
    colSupRating: 'Reliability Rating',
    colSupAction: 'Purchase Order',
    btnOrderStock: 'Order Restock',
    leadDays: 'days',
    tabSuppliersDirectory: 'Suppliers Directory',
    tabPurchaseOrders: 'Purchase Orders & Restock History',
    tabRestockAlerts: 'Critical Restock Alerts',
    btnNewSupplier: 'Register Supplier',
    btnQuickRestock: 'New Restock Order',
    searchSuppliersPlaceholder: 'Search supplier, country, or category...',

    // Route & Tracking
    routeTrackingTitle: 'Real-Time Delivery Routes & Fulfillment',
    routeTrackingSubtitle: 'Live transit tracking across carriers: DHL Express, FedEx, and Amazon Logistics',
    colRouteCarrier: 'Carrier',
    colRouteDestination: 'Destination Route',
    colRouteStatus: 'Route Phase',
    colHasArrived: 'Has it arrived?',
    colActionAdvance: 'Advance Route',
    arrivedYes: 'YES, DELIVERED & CONFIRMED',
    arrivedPending: 'IN TRANSIT (PENDING ARRIVAL)',
    btnAdvanceStep: 'Advance Route Phase',
    btnTrackShipment: 'Track Order',
    btnExportCsv: 'Export to CSV',
    btnClearTable: 'Clear Shipments',
    btnClearFilters: 'Reset Filters',
    btnPurgeRetention: 'Purge Old (> 60 Days)',
    retentionPolicyBadge: 'Retention Policy: Shipments older than 60 days (2 months) are automatically purged for data compliance.',
    rowsPerPage: 'Per page:',
    carrierFilterAll: 'All Carriers',
    channelFilterAll: 'All Channels',
    arrivalFilterAll: 'All Delivery Statuses',
    trackingModalTitle: 'Mercado-Style Live Tracking',
    copyTracking: 'Copy Tracking ID',
    trackingCopied: 'Copied!',

    // User Management Module
    userMgmtTitle: 'System User Management & Access Roles',
    userMgmtSubtitle: 'Only Administrators have privileges to register new accounts and assign roles.',
    addNewUser: 'Register New User',
    colUserEmail: 'User Email',
    colUserRole: 'Assigned Role',
    colUserCreated: 'Registered Date',
    userRoleAdmin: 'Administrator (Full Access)',
    userRoleOperator: 'Operator (Standard User)',
    btnCreateUser: 'Create User',
    accessRestrictedTitle: 'Admin Authority Required',
    accessRestrictedMsg: 'You are currently viewing with Operator privileges. Only users with the Admin role can create new accounts or configure roles.',

    // Header & Status
    liveSyncStatus: 'Live Ingestion (< 5s SLA)',

    // Search & Filters
    searchPlaceholder: 'Search by Order ID or Customer name...',
    allChannels: 'All Channels',
    allStatuses: 'All Statuses',
    statusPaid: 'Paid',
    statusPending: 'Pending',
    statusRefunded: 'Refunded',
    slaFilterTitle: 'SLA Performance',
    slaFast: '≤ 2,000 ms (Fast)',
    slaNormal: '2,000 - 5,000 ms (Within SLA)',
    slaBreach: '> 5,000 ms (SLA Breach)',
    resetFilters: 'Reset',

    // Orders Table
    tableTitle: 'Real-Time Incoming Orders',
    tableSubtitle: 'Live ingestion via Shopify & Amazon Webhooks',
    colOrderId: 'Order ID',
    colChannel: 'Channel',
    colCustomer: 'Customer',
    colTotal: 'Total Amount',
    colLatency: 'Sync Latency',
    colStatus: 'Status',
    encryptedNotice: '(Encrypted)',
    noOrdersTitle: 'No orders found',
    noOrdersSubtitle: 'Try adjusting your filters or triggering a purchase simulation.',

    // Pagination
    showingRecords: 'Showing',
    pageOf: 'Page',
    previous: 'Previous',
    next: 'Next',

    // Channels Module
    topicLabel: 'Event Topic:',
    authLabel: 'Authentication:',
    secretLabel: 'Secret:',
    endpointLabel: 'Endpoint:',
    dedupLabel: 'Deduplication:',
    dbSyncLabel: 'Database Sync:',
    statusConnected: 'Connected',
    statusReady: 'Ready',
    simulateShopifyBtn: 'Simulate Shopify Ingestion',
    simulateAmazonBtn: 'Simulate Amazon Ingestion',

    // Inventory Module
    invTitle: 'Unified Product Inventory',
    invSubtitle: 'Real-time stock deduction across all sales channels.',
    invRefresh: 'Refresh',
    invColSku: 'SKU',
    invColName: 'Product Name',
    invColStock: 'Stock Quantity',
    invColStatus: 'Status',
    invColSync: 'Last Sync',
    invColActions: 'Actions',
    invAvailable: 'Available',
    invOutOfStock: 'Out of Stock',
    invAddUnits: '+20 Units',

    // Customers Module
    custTitle: 'Customer Directory',
    custSubtitle: 'Centralized directory of customer accounts, contact details, delivery addresses, and orders.',
    custDecryptBtn: 'Decrypt Authorized View',
    custLockBtn: 'Lock Data (Mask)',
    custMaskedNotice: 'Masked View (Standard Operator)',
    custColOrder: 'Order',
    custColChannel: 'Channel',
    custColName: 'Customer Name',
    custColAddress: 'Shipping Address',
    custColPhone: 'Phone Number',
    custColBuffer: 'Encrypted Buffer',
    custEmpty: 'No customer records found.',

    // Logistics Module
    logTitle: 'Logistics & Shipment Tracking',
    logSubtitle: 'Carrier dispatch status for Houston fulfillment hub.',
    logHubTag: 'Houston Hub',
    logColShipment: 'Shipment',
    logColOrder: 'Order',
    logColCarrier: 'Carrier',
    logColTracking: 'Tracking Number',
    logColDestination: 'Destination',
    logColProgress: 'Progress',
    logColStatus: 'Status',
    logStatusInTransit: 'In Transit',
    logStatusOutForDelivery: 'Out for Delivery',
    logStatusDelivered: 'Delivered',
    logStatusPending: 'Pending Dispatch',
    logConnectorReady: 'Connector Ready',
    logInternalDispatch: 'Internal Dispatch',
    logAutoEngineTitle: 'Autonomous Fleet Dispatch Engine',
    logAutoEngineDesc: 'Simulates continuous real-time carrier GPS & transit telemetry in the background',
    logBtnAutoOn: 'Auto-Dispatch: ACTIVE',
    logBtnAutoOff: 'Auto-Dispatch: PAUSED',
    logBtnBulkAdvance: 'Bulk Advance Active Batch',
    logBtnSimulateBatch: '+ High-Volume Burst (20 Orders)',
    logFilterAll: 'All Routes',
    logFilterProcessing: 'Packaging',
    logFilterTransit: 'In Transit',
    logFilterOutForDelivery: 'Out for Delivery',
    logFilterDelivered: 'Delivered',
    logSearchPlaceholder: 'Search tracking, order ID, or destination...',

    // DevOps Module
    devopsTitle: 'System Telemetry & DevOps Monitoring',
    devopsSubtitle: 'SLA performance and infrastructure uptime.',
    telemetryUptimeTitle: 'Service Availability',
    telemetryUptimeDesc: 'Uptime',
    telemetrySlaTitle: 'Sync Latency SLA',
    telemetrySlaTarget: 'Target: < 500 ms (Met)',
    telemetryDbTitle: 'Database Engine',
    telemetryDbDesc: 'Managed TLS Connection',
    langSettingTitle: 'System Operating Language',
    langDefaultDesc: 'Default language',
    langTransDesc: 'Latin America translation',
    devopsTabOverview: 'Live Vitals',
    devopsTabContainers: 'Containers & Docker',
    devopsTabCicd: 'CI/CD Pipeline',
    devopsTabLogs: 'Runtime Logs',
    devopsTabMetrics: 'Prometheus Metrics',
    devopsPingDb: 'Ping Database',
    devopsRefresh: 'Refresh Telemetry',
    devopsMemoryUsage: 'Memory (RSS / Heap)',
    devopsConnectedSockets: 'Live Telemetry Clients',
    devopsStatusOperational: 'Operational (Healthy)',
    devopsStatusDegraded: 'Degraded Performance',
    devopsLogsFilterAll: 'All Logs',
    devopsClearLogs: 'Clear View',

    // Settings View
    settingsTitle: 'Settings & Workspace Configuration',
    settingsSubtitle: 'Manage system localization, security roles (RBAC), and connected sales channels.',
    tabGeneral: 'Language & Locale',
    tabRoles: 'Account & Roles (RBAC)',
    tabChannels: 'Connected Channels',
    languageSelectTitle: 'System Language',
    languageSelectDesc: 'Select your preferred interface language. Defaults to English (US).',
    langEn: 'English (US) — Default',
    langEs: 'Español (Latinoamérica)',
    rbacTitle: 'Role-Based Access Control (RBAC)',
    rbacDesc: 'Manage access levels and operational privileges.',
    activeUser: 'Active Session Account',
    simulateRole: 'Assigned Security Role',
    adminPerms: 'Full administrative authority: customer data decryption, webhook secret setup, and stock configuration.',
    operatorPerms: 'Operational staff authority: live incoming order tracking, masked customer display, and standard inventory view.',
    adminBadge: 'Full Administrator',
    operatorBadge: 'Operator / Standard User',
    accountInfo: 'Account Information',
    organization: 'Organization Headquarters',
    securityCompliance: 'Security Compliance',
    securityStandardDesc: 'AES-256-GCM Column-Level Encryption Active',
    storeIntegrations: 'Store & Webhook Status',
    shopifyStore: 'Shopify Store Domain',
    webhookStatus: 'Shopify Webhook Ingestion',
    webhookStatusDesc: 'X-Shopify-Hmac-Sha256 verified in real-time',
    changesSaved: 'Settings saved successfully!',

    // Returns & RMA Module
    retTitle: 'Returns & RMA Management',
    retSubtitle: 'Omnichannel returns processing, item inspection, and automatic inventory restock engine',
    retBtnRegister: 'Register Return',
    retBtnSimulateRefund: 'Simulate Shopify Webhook',
    retBtnSeedDemo: 'Seed Demo RMA',
    retOrderAction: 'Return / RMA',
    retSearchPlaceholder: 'Search by RMA #, Order #, Customer or SKU...',
    retFilterStatusAll: 'All Statuses',
    retFilterReasonAll: 'All Reasons',
    retColRma: 'RMA / Order',
    retColOrder: 'Order & Channel',
    retColCustomer: 'Customer & Tracking',
    retColProduct: 'Item & SKU',
    retColReason: 'Reason & Refund',
    retColRefund: 'Refund Amount',
    retColStatus: 'Status',
    retColRestock: 'Restock Action',
    retColActions: 'Actions',
    retStatusRequested: 'Requested',
    retStatusApproved: 'Approved (In Transit)',
    retStatusReceivedRestocked: 'Received & Restocked',
    retStatusDeclined: 'Declined',
    retReasonDefective: 'Defective / Hardware Issue',
    retReasonSizeFit: 'Size / Dimensions Incompatible',
    retReasonNotAsDescribed: 'Item Not As Described',
    retReasonWrongItem: 'Wrong Variant / Item Shipped',
    retReasonCustomerMind: 'Customer Changed Mind',
    retBtnApprove: 'Approve Return',
    retBtnReceiveRestock: 'Receive & Restock Stock',
    retBtnDecline: 'Decline',
    retRestockedBadge: 'Restocked to Inventory',
    retKpiTotal: 'Total Returns',
    retKpiActive: 'Active In-Transit',
    retKpiRestocked: 'Restocked to Inventory',
    retKpiRefunded: 'Total Refunded',
    retKpiRate: 'Return Rate',
    retModalTitle: 'Register Omnichannel Return (RMA)',
    retModalDesc: 'Create a formal return ticket with automatic inventory re-entry upon warehouse receipt.',
    retFormFieldOrder: 'External Order ID',
    retFormFieldCustomer: 'Customer Full Name',
    retFormFieldSku: 'Product SKU',
    retFormFieldProduct: 'Product Name',
    retFormFieldQty: 'Quantity Returned',
    retFormFieldAmount: 'Refund Amount (USD)',
    retFormFieldReason: 'Return Reason',
    retFormFieldRestock: 'Automatically restock into inventory upon warehouse confirmation',
    retFormFieldNotes: 'Technical / Customer Notes',
    retBtnSubmit: 'Confirm & Register RMA',
    retRestockNotice: 'Inventory units will increment automatically upon warehouse inspection confirmation.',
    retMetricsTitle: 'Returns & RMA Analytics',
    retMetricsSubtitle: 'Incident rates, product defect monitoring, and inventory recovery metrics'
  },

  es: {
    appName: 'OrderSync',
    brandTagline: 'Motor Inteligente de Gestión de Pedidos Multicanal en Tiempo Real',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    save: 'Guardar Cambios',
    close: 'Cerrar',
    backToDashboard: 'Volver al Panel',
    dashboardNav: 'Panel de Control',
    activeRole: 'Rol',
    adminRole: 'Administrador',
    operatorRole: 'Operador',

    // Sidebar Categories & Modules
    catPlatform: 'Plataforma Principal',
    catOperations: 'Operaciones y DevOps',
    modDashboard: 'Dashboard General',
    modMetrics: 'Métricas y Analíticas',
    modChannels: 'Canales de Venta (APIs)',
    modInventory: 'Inventario Central',
    modSuppliers: 'Proveedores y Surtido',
    modCustomers: 'Clientes',
    modUsers: 'Gestión de Usuarios',
    modLogistics: 'Rutas y Envíos',
    modDevops: 'DevOps y Monitoreo',
    modReturns: 'Devoluciones y Reembolsos',

    // Metrics Module
    metricsTitle: 'Métricas Ejecutivas e Inteligencia de Negocios',
    metricsSubtitle: 'Analítica integral y comparativa de los ecosistemas Shopify y Amazon',
    kpiRevenue: 'Ingresos Brutos Totales',
    kpiShopifyShare: 'Ventas Shopify',
    kpiAmazonShare: 'Ventas Amazon',
    kpiDeliveryRate: 'Tasa de Entrega Exitosa',
    kpiInventoryValuation: 'Valoración Total en Almacén',
    kpiLowStockAlert: 'SKUs en Nivel Crítico',
    kpiSlaCompliance: 'Cumplimiento SLA de Ingesta',
    kpiAov: 'Ticket Promedio por Pedido',
    channelComparisonTitle: 'Desglose Comparativo de Desempeño por Canal',
    colChannelName: 'Canal de Venta',
    colChannelOrders: 'Total Pedidos',
    colChannelVolume: 'Volumen Total ($)',
    colChannelTicket: 'Ticket Promedio',
    colChannelFulfillment: 'Modelo Logístico',
    tabFinancialBI: 'Finanzas y Rentabilidad',
    tabLogisticsVelocity: 'Logística y Transportistas',
    tabCustomerRetention: 'Clientes y Retención (LTV)',
    tabInventoryHealth: 'Velocidad de Inventario',
    tabApiTelemetry: 'Telemetría de APIs',
    metricCogs: 'Costo Total de Ventas (COGS)',
    metricGrossProfit: 'Beneficio Bruto Neto',
    metricGrossMargin: 'Margen Bruto Global',
    metricMarginPerOrder: 'Margen por Pedido',
    metricOnTimeRate: 'Tasa de Entrega a Tiempo',
    metricLeadTime: 'Tiempo Promedio de Cumplimiento',
    metricReturnRate: 'Tasa de Devoluciones e Incidencias',
    metricRepeatRate: 'Tasa de Clientes Recurrentes',
    metricClv: 'Customer Lifetime Value (LTV)',
    metricDoi: 'Días de Inventario Restante (DOI)',
    metricTurnover: 'Rotación de Inventario',
    metricStockRisk: 'Riesgo de Rotura de Stock',
    metricP95Latency: 'Latencia Ingesta p95',
    metricUptime: 'Disponibilidad Webhooks',
    metricRpm: 'Rendimiento Ingesta (RPM)',
    bestSellersTitle: 'SKUs Más Demandados en el Catálogo',
    carrierShareTitle: 'Distribución de Flota por Transportista',
    regionalDemandTitle: 'Concentración Regional de Pedidos',
    tabShopifyVsAmazon: 'Shopify vs Amazon',
    tabReturnsRma: 'Devoluciones & RMA',
    financialDesc: 'Márgenes de contribución, costo de adquisición de mercancía y utilidad neta omnicanal.',
    marginLabel: 'Margen',
    cogsDesc: '42% Costo ponderado de surtido de catálogo',
    grossProfitDesc: 'Utilidad bruta neta acumulada en ventas',
    salesTrendTitle: 'Tendencia de Ventas y Proyección Semanal',
    salesTrendDesc: 'Ingresos acumulados y comportamiento omnicanal diario',
    btnChartRevenue: 'Facturación ($)',
    btnChartOrders: 'Volumen (Pedidos)',
    legendTotalRevenue: 'Facturación Total Omnicanal',
    marketShareTitle: 'Cuota de Mercado por Canal',
    marketShareDesc: 'Distribución de ingresos y dependencia comercial',
    leaderLabel: 'Líder',
    tblChannelProfitTitle: 'Estado de Rentabilidad por Canal de Venta',
    colOrders: 'Pedidos',
    colGrossRev: 'Ingresos Brutos ($)',
    colCogs: 'Costo COGS ($)',
    colGrossProfit: 'Utilidad Bruta ($)',
    colMarginPct: 'Margen %',
    logisticsDesc: 'Monitoreo de tiempos de entrega, cuota de transportistas y cumplimiento de promesas de entrega.',
    deliveredCountLabel: 'entregado(s)',
    inTransitCountLabel: 'en ruta',
    onTimeTargetDesc: 'Objetivo SLA de Transportistas: ≥ 95.0% (Cumplido)',
    leadTimeDesc: 'Tiempo promedio orden recibida → asignada a reparto',
    incidentDesc: 'Tasa de daño o extravío dentro del benchmark (< 1.5%)',
    carrierShareSubtitle: 'Distribución porcentual de paqueterías y SLA de velocidad',
    overallOnTimeCompliance: 'Cumplimiento General: 97.4% a Tiempo',
    shareLabel: 'Cuota',
    fulfillmentFunnelTitle: 'Pipeline de Cumplimiento Logístico Global',
    activeShipmentsLabel: 'Envíos Activos',
    deliveredAndConfirmed: 'Entregados y Confirmados',
    outForDeliveryRoute: 'En Ruta de Reparto',
    customersDesc: 'Comportamiento de compra, tasa de recompra y distribución geográfica de clientes.',
    uniqueCustomersTitle: 'Clientes Únicos Registrados',
    protectedDbNotice: 'Identidades protegidas y cifradas en base de datos',
    repeatRateDesc: 'Tasa de recompra recurrente (+1 orden registrada)',
    clvDesc: 'Valor estimado del ciclo de vida del cliente',
    inventoryDesc: 'Valoración de existencias, velocidad de rotación y mitigación de rotura de stock.',
    unitsInSkus: 'unidades en',
    skusLabel: 'SKUs',
    daysUnit: 'días',
    doiDesc: 'Cobertura de existencias con ritmo de venta actual',
    timesPerYear: 'x / año',
    turnoverDesc: 'Frecuencia anual de renovación de catálogo',
    ofCatalog: 'catálogo',
    lowStockDesc: 'Productos con menos de 15 unidades disponibles',
    visualStockTitle: 'Monitoreo Visual de Stock por Producto',
    visualStockSubtitle: 'Comparativa de existencias en almacén vs Punto Crítico de Reorden (15 Unidades)',
    optimalStock: 'Stock Óptimo',
    reorderAlert: 'Alerta de Reorden (< 15u)',
    lowStockBadge: 'Bajo Stock',
    unitsAbbr: 'uds',
    safetyThresholdDesc: 'Línea roja discontinua indica el umbral mínimo de seguridad operacional (15 unidades).',
    colSku: 'SKU',
    colProduct: 'Producto',
    colSupplier: 'Proveedor',
    colCurrentStock: 'Stock Actual',
    colCost: 'Costo',
    colPrice: 'Precio',
    telemetryDesc: 'Rendimiento en tiempo real de ingestión de webhooks, verificación criptográfica y SLA.',
    avgLatencyTitle: 'Latencia Media (SLA)',
    withinSlaDesc: '✓ Dentro del SLA objetivo (< 5,000 ms)',
    p95Desc: 'Percentil 95 de ingesta atómica en PostgreSQL',
    uptimeDesc: 'Disponibilidad continua sin caída de endpoints',
    rpmDesc: 'Capacidad de procesamiento concurrente en ráfagas',
    slaGaugeTitle: 'Garantía de Servicio (SLA Compliance)',
    slaGaugeDesc: 'Ingestión de webhooks procesada en menos de 5,000 ms',
    inCompliance: 'En Cumplimiento',
    targetSla: 'Objetivo SLA:',
    syncedOk: 'Sincronizaciones OK:',
    noFailures: '100% Sin Fallas',
    sparklineTitle: 'Curva de Latencia en Vivo (ms)',
    sparklineDesc: 'Últimos eventos de sincronización registrados',
    realTimeBadge: 'Tiempo Real',
    slaLimitLabel: 'Límite SLA 5,000 ms',
    minLatency: 'Latencia Mínima:',
    avgLatency: 'Latencia Media:',
    channelComparisonDesc: 'Comparativa técnica, de volumen y operativa entre Shopify Online Store y Amazon Marketplace (SP-API).',
    revenueByChannel: 'Facturación por Canal',
    orderVolumeByChannel: 'Volumen de Pedidos',
    ordersCountUnit: 'pedidos',
    aovByChannel: 'Ticket Promedio (AOV)',
    shopifyAdvantage: 'Mayor margen unitario',
    amazonAdvantage: 'Mayor rotación FBA',
    slaFastBadge: '≤ 1,500 ms (Rápido)',
    slaNormalBadge: '≤ 2,200 ms (En SLA)',
    normalStatus: 'Normal (< 3.5%)',
    attentionStatus: 'Atención Requerida',
    registeredReturns: 'devoluciones registradas en OrderSync',
    gatewayRefunds: 'Reembolsos procesados en pasarelas de pago',
    recoveredBadge: 'Rescatado',
    unitsRecovered: 'unidades',
    restockedInventoryDesc: 'Productos reincorporados atómicamente al inventario',
    resolutionTimeTitle: 'Tiempo de Resolución RMA',
    resolutionTimeDesc: 'Promedio desde apertura hasta dictamen e inspección',
    causalTitle: 'Distribución Causal por Motivo (RMA)',
    causalDesc: 'Identificación de fallas de producto o discrepancias comerciales',
    categoriesCount: 'Categorías',
    casesLabel: 'caso(s)',
    channelIncidentTitle: 'Incidencias por Canal de Venta',
    channelIncidentDesc: 'Comportamiento comparado de devolución Shopify vs Amazon',
    dayPolicy: 'Política de 30 días activada',
    fbaManaged: 'Gestión automática FBA',
    recoveryTitle: 'Recuperación Financiera de Inventario',
    recoveryDesc: 'Valor monetario reincorporado al stock tras inspección técnica de RMA',
    savedValue: 'Valor de Inventario Salvado',
    unitsRestocked: 'Unidades Reingresadas',

    // Suppliers Module
    supTitle: 'Directorio de Proveedores y Surtido',
    supSubtitle: 'Socios oficiales de cadena de suministro para reabastecimiento ágil de inventario',
    colSupName: 'Nombre del Proveedor',
    colSupContact: 'Contacto Principal',
    colSupCategory: 'Especialidad',
    colSupLeadTime: 'Tiempo de Entrega',
    colSupRating: 'Confiabilidad',
    colSupAction: 'Orden de Compra',
    btnOrderStock: 'Solicitar Surtido',
    leadDays: 'días',
    tabSuppliersDirectory: 'Directorio de Proveedores',
    tabPurchaseOrders: 'Historial de Surtidos & Órdenes de Compra',
    tabRestockAlerts: 'Alertas de Surtido Crítico',
    btnNewSupplier: 'Registrar Proveedor',
    btnQuickRestock: 'Nueva Orden de Surtido',
    searchSuppliersPlaceholder: 'Buscar proveedor por nombre, país o categoría...',

    // Route & Tracking
    routeTrackingTitle: 'Rutas de Entrega y Trazabilidad en Tiempo Real',
    routeTrackingSubtitle: 'Monitoreo de tránsito en vivo por transportistas: DHL Express, FedEx y Amazon Logistics',
    colRouteCarrier: 'Transportista',
    colRouteDestination: 'Ruta y Destino',
    colRouteStatus: 'Fase de la Ruta',
    colHasArrived: '¿Ya llegó el producto?',
    colActionAdvance: 'Avanzar Ruta',
    arrivedYes: 'SÍ, ENTREGADO Y CONFIRMADO',
    arrivedPending: 'EN RUTA (PENDIENTE DE LLEGADA)',
    btnAdvanceStep: 'Avanzar Fase de Ruta',
    btnTrackShipment: 'Rastrear Envío',
    btnExportCsv: 'Exportar a CSV',
    btnClearTable: 'Limpiar Tabla',
    btnClearFilters: 'Limpiar Filtros',
    btnPurgeRetention: 'Depurar Antiguos (> 60 Días)',
    retentionPolicyBadge: 'Política de Retención: Los envíos con más de 60 días (2 meses) se depuran automáticamente para mantener la base de datos optimizada.',
    rowsPerPage: 'Por página:',
    carrierFilterAll: 'Todos los Transportistas',
    channelFilterAll: 'Todos los Canales',
    arrivalFilterAll: 'Todos los Estados de Entrega',
    trackingModalTitle: 'Seguimiento en Vivo de Envío',
    copyTracking: 'Copiar Guía',
    trackingCopied: '¡Copiado!',

    // User Management Module
    userMgmtTitle: 'Gestión de Usuarios del Sistema y Roles de Acceso',
    userMgmtSubtitle: 'Solo los Administradores tienen privilegios para registrar nuevas cuentas y asignar roles.',
    addNewUser: 'Registrar Nuevo Usuario',
    colUserEmail: 'Correo Electrónico',
    colUserRole: 'Rol Asignado',
    colUserCreated: 'Fecha de Registro',
    userRoleAdmin: 'Administrador (Acceso Total)',
    userRoleOperator: 'Operador (Usuario Estándar)',
    btnCreateUser: 'Crear Usuario',
    accessRestrictedTitle: 'Se Requiere Autoridad de Administrador',
    accessRestrictedMsg: 'Actualmente estás con privilegios de Operador. Solo los usuarios con rol Administrador pueden crear nuevas cuentas o asignar roles.',

    // Header & Status
    liveSyncStatus: 'Ingesta en Vivo (< 5s SLA)',

    // Search & Filters
    searchPlaceholder: 'Buscar por ID de orden o cliente...',
    allChannels: 'Todos los Canales',
    allStatuses: 'Todos los Estados',
    statusPaid: 'Pagado',
    statusPending: 'Pendiente',
    statusRefunded: 'Reembolsado',
    slaFilterTitle: 'Rendimiento SLA',
    slaFast: '≤ 2,000 ms (Rápido)',
    slaNormal: '2,000 - 5,000 ms (En SLA)',
    slaBreach: '> 5,000 ms (Fuera de SLA)',
    resetFilters: 'Limpiar',

    // Orders Table
    tableTitle: 'Pedidos Entrantes en Tiempo Real',
    tableSubtitle: 'Ingesta en vivo vía Webhooks de Shopify y Amazon',
    colOrderId: 'ID de Orden',
    colChannel: 'Canal',
    colCustomer: 'Cliente',
    colTotal: 'Monto Total',
    colLatency: 'Latencia Sync',
    colStatus: 'Estado',
    encryptedNotice: '(Cifrado)',
    noOrdersTitle: 'No se encontraron pedidos',
    noOrdersSubtitle: 'Intenta cambiar los filtros o ejecutar una simulación de compra.',

    // Pagination
    showingRecords: 'Mostrando',
    pageOf: 'Página',
    previous: 'Anterior',
    next: 'Siguiente',

    // Channels Module
    topicLabel: 'Tópico de Evento:',
    authLabel: 'Autenticación:',
    secretLabel: 'Secreto:',
    endpointLabel: 'Punto de Enlace:',
    dedupLabel: 'Deduplicación:',
    dbSyncLabel: 'Sincronización DB:',
    statusConnected: 'Conectado',
    statusReady: 'Listo',
    simulateShopifyBtn: 'Simular Ingesta de Shopify',
    simulateAmazonBtn: 'Simular Ingesta de Amazon',

    // Inventory Module
    invTitle: 'Inventario Unificado de Productos',
    invSubtitle: 'Deducción de stock en tiempo real en todos los canales de venta.',
    invRefresh: 'Actualizar',
    invColSku: 'SKU',
    invColName: 'Nombre del Producto',
    invColStock: 'Cantidad en Stock',
    invColStatus: 'Estado',
    invColSync: 'Última Sincronización',
    invColActions: 'Acciones',
    invAvailable: 'Disponible',
    invOutOfStock: 'Agotado',
    invAddUnits: '+20 Unidades',

    // Customers Module
    custTitle: 'Directorio de Clientes',
    custSubtitle: 'Directorio centralizado de clientes, datos de contacto, direcciones de entrega e historial de pedidos.',
    custDecryptBtn: 'Descifrar Vista Autorizada',
    custLockBtn: 'Bloquear Datos (Enmascarar)',
    custMaskedNotice: 'Vista Enmascarada (Operador Estándar)',
    custColOrder: 'Pedido',
    custColChannel: 'Canal',
    custColName: 'Nombre del Cliente',
    custColAddress: 'Dirección de Envío',
    custColPhone: 'Teléfono',
    custColBuffer: 'Buffer Cifrado',
    custEmpty: 'No se encontraron registros de clientes.',

    // Logistics Module
    logTitle: 'Logística y Rastreo de Envíos',
    logSubtitle: 'Estado de despacho de transportistas para el centro de Houston.',
    logHubTag: 'Centro Houston',
    logColShipment: 'Envío',
    logColOrder: 'Pedido',
    logColCarrier: 'Transportista',
    logColTracking: 'Número de Rastreo',
    logColDestination: 'Destino',
    logColProgress: 'Progreso',
    logColStatus: 'Estado',
    logStatusInTransit: 'En Tránsito',
    logStatusOutForDelivery: 'En Reparto',
    logStatusDelivered: 'Entregado',
    logStatusPending: 'Pendiente de Despacho',
    logConnectorReady: 'Conector Listo',
    logInternalDispatch: 'Despacho Interno',
    logAutoEngineTitle: 'Motor Autónomo de Despacho Logístico',
    logAutoEngineDesc: 'Simula telemetría GPS continua de transportistas en segundo plano en tiempo real',
    logBtnAutoOn: 'Despacho Autónomo: ACTIVO',
    logBtnAutoOff: 'Despacho Autónomo: PAUSADO',
    logBtnBulkAdvance: 'Sincronizar y Avanzar Lote',
    logBtnSimulateBatch: '+ Lote Masivo (20 Pedidos)',
    logFilterAll: 'Todas las Rutas',
    logFilterProcessing: 'En Empaque',
    logFilterTransit: 'En Tránsito',
    logFilterOutForDelivery: 'En Reparto',
    logFilterDelivered: 'Entregados',
    logSearchPlaceholder: 'Buscar guía, ID de orden o destino...',

    // DevOps Module
    devopsTitle: 'Telemetría del Sistema y Monitoreo DevOps',
    devopsSubtitle: 'Rendimiento SLA y disponibilidad de infraestructura.',
    telemetryUptimeTitle: 'Disponibilidad del Servicio',
    telemetryUptimeDesc: 'Tiempo activo',
    telemetrySlaTitle: 'SLA de Latencia Sync',
    telemetrySlaTarget: 'Objetivo: < 500 ms (Cumplido)',
    telemetryDbTitle: 'Motor de Base de Datos',
    telemetryDbDesc: 'Conexión TLS Administrada',
    langSettingTitle: 'Idioma Operativo del Sistema',
    langDefaultDesc: 'Idioma predeterminado',
    langTransDesc: 'Traducción completa para Latinoamérica',
    devopsTabOverview: 'Métricas en Vivo',
    devopsTabContainers: 'Contenedores y Docker',
    devopsTabCicd: 'Pipeline CI/CD',
    devopsTabLogs: 'Registros de Ejecución',
    devopsTabMetrics: 'Métricas Prometheus',
    devopsPingDb: 'Probar Conexión DB',
    devopsRefresh: 'Actualizar Telemetría',
    devopsMemoryUsage: 'Memoria (RSS / Heap)',
    devopsConnectedSockets: 'Clientes de Telemetría Activos',
    devopsStatusOperational: 'Operativo (Saludable)',
    devopsStatusDegraded: 'Rendimiento Degradado',
    devopsLogsFilterAll: 'Todos los Registros',
    devopsClearLogs: 'Limpiar Vista',

    // Settings View
    settingsTitle: 'Configuración del Espacio de Trabajo',
    settingsSubtitle: 'Administra idioma del sistema, roles de seguridad (RBAC) y canales de venta conectados.',
    tabGeneral: 'Idioma y Región',
    tabRoles: 'Cuenta y Roles (RBAC)',
    tabChannels: 'Canales Conectados',
    languageSelectTitle: 'Idioma del Sistema',
    languageSelectDesc: 'Selecciona tu idioma preferido. Por defecto está en Inglés (EE. UU.).',
    langEn: 'Inglés (EE. UU.) — Predeterminado',
    langEs: 'Español (Latinoamérica)',
    rbacTitle: 'Control de Acceso Basado en Roles (RBAC)',
    rbacDesc: 'Administra niveles de acceso y privilegios operacionales.',
    activeUser: 'Cuenta de Sesión Activa',
    simulateRole: 'Rol de Seguridad Asignado',
    adminPerms: 'Autoridad administrativa completa: descifrado de datos de clientes, configuración de secretos y control de stock.',
    operatorPerms: 'Autoridad de personal operativo: seguimiento en vivo de pedidos, visualización enmascarada e inventario estándar.',
    adminBadge: 'Administrador Total',
    operatorBadge: 'Operador / Usuario Estándar',
    accountInfo: 'Información de la Cuenta',
    organization: 'Sede de la Organización',
    securityCompliance: 'Cumplimiento de Seguridad',
    securityStandardDesc: 'Cifrado a Nivel de Columna AES-256-GCM Activo',
    storeIntegrations: 'Integraciones de Tienda y Webhooks',
    shopifyStore: 'Dominio de Tienda Shopify',
    webhookStatus: 'Ingesta de Webhooks de Shopify',
    webhookStatusDesc: 'X-Shopify-Hmac-Sha256 verificado en tiempo real',
    changesSaved: '¡Configuración guardada exitosamente!',

    // Returns & RMA Module
    retTitle: 'Gestión de Devoluciones y RMA',
    retSubtitle: 'Procesamiento omnicanal de devoluciones, inspección de producto y reingreso automático al inventario',
    retBtnRegister: 'Registrar Devolución',
    retBtnSimulateRefund: 'Simular Webhook Shopify',
    retBtnSeedDemo: 'Cargar RMA de Prueba',
    retOrderAction: 'Devolución / RMA',
    retSearchPlaceholder: 'Buscar por RMA #, Pedido, Cliente o SKU...',
    retFilterStatusAll: 'Todos los Estatus',
    retFilterReasonAll: 'Todos los Motivos',
    retColRma: 'RMA / Pedido',
    retColOrder: 'Pedido y Canal',
    retColCustomer: 'Cliente & Rastreo',
    retColProduct: 'Artículo y SKU',
    retColReason: 'Motivo & Reembolso',
    retColRefund: 'Monto a Reembolsar',
    retColStatus: 'Estatus',
    retColRestock: 'Reingreso a Stock',
    retColActions: 'Acciones',
    retStatusRequested: 'Solicitado',
    retStatusApproved: 'Aprobado (En Ruta)',
    retStatusReceivedRestocked: 'Recibido y Reingresado',
    retStatusDeclined: 'Rechazado',
    retReasonDefective: 'Defecto / Falla Técnica',
    retReasonSizeFit: 'Talla / Dimensiones Incompatibles',
    retReasonNotAsDescribed: 'Discrepancia con Descripción Web',
    retReasonWrongItem: 'Artículo o Variante Equivocada',
    retReasonCustomerMind: 'Cambio de Opinión / Desistimiento',
    retBtnApprove: 'Aprobar Devolución',
    retBtnReceiveRestock: 'Recibir y Reingresar a Stock',
    retBtnDecline: 'Rechazar',
    retRestockedBadge: 'Reingresado a Almacén',
    retKpiTotal: 'Total Solicitudes RMA',
    retKpiActive: 'Activas en Tránsito',
    retKpiRestocked: 'Reingresadas a Stock',
    retKpiRefunded: 'Total Reembolsado',
    retKpiRate: 'Tasa de Devolución',
    retModalTitle: 'Registrar Devolución Omnicanal (RMA)',
    retModalDesc: 'Emita un ticket formal de devolución con reingreso atómico al inventario al confirmar recepción en almacén.',
    retFormFieldOrder: 'ID Externo de Pedido',
    retFormFieldCustomer: 'Nombre Completo del Cliente',
    retFormFieldSku: 'SKU del Producto',
    retFormFieldProduct: 'Nombre del Producto',
    retFormFieldQty: 'Cantidad a Devolver',
    retFormFieldAmount: 'Monto de Reembolso (USD)',
    retFormFieldReason: 'Motivo de Devolución',
    retFormFieldRestock: 'Reingresar automáticamente las unidades al stock al confirmar en almacén',
    retFormFieldNotes: 'Observaciones Técnicas / Motivo del Cliente',
    retBtnSubmit: 'Confirmar y Registrar RMA',
    retRestockNotice: 'Las unidades de stock se incrementarán atómicamente en PostgreSQL cuando la orden sea marcada como recibida.',
    retMetricsTitle: 'Métricas de Devoluciones e Incidencias (RMA)',
    retMetricsSubtitle: 'Monitoreo de tasa de defectos de producto, causas de devolución y recuperación de inventario'
  }
};

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguageSubject = new BehaviorSubject<SupportedLanguage>(this.getInitialLanguage());
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  private translationsSubject = new BehaviorSubject<Translations>(DICTIONARY[this.getInitialLanguage()]);
  public translations$ = this.translationsSubject.asObservable();

  constructor() {}

  private getInitialLanguage(): SupportedLanguage {
    localStorage.setItem('ordersync_lang', 'en');
    return 'en';
  }

  public get currentLanguage(): SupportedLanguage {
    return 'en';
  }

  public get currentLang(): SupportedLanguage {
    return 'en';
  }

  public get translations(): Translations {
    return DICTIONARY['en'];
  }

  public get t(): Translations {
    return DICTIONARY['en'];
  }

  public setLanguage(_lang: SupportedLanguage): void {
    localStorage.setItem('ordersync_lang', 'en');
    this.currentLanguageSubject.next('en');
    this.translationsSubject.next(DICTIONARY['en']);
  }
}
