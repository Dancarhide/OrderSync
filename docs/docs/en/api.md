---
sidebar_position: 3
title: API & Webhooks
---

# OrderSync — API & Webhooks Reference

**Document Version:** 1.2.0  
**Classification:** Internal / Developer-Facing  
**Last Updated:** September 2026  
**Base URL (Local):** `http://localhost:3000`  
**Base URL (Production):** `https://api.ordersync.io` *(to be configured)*

---

## 1. Overview

The OrderSync backend exposes a RESTful API for webhook ingestion, enterprise logistics dispatch, catalog inventory management, and real-time business intelligence. A centralized WebSocket interface broadcasts atomic state mutations to connected dashboards instantaneously.

---

## 2. Authentication & Security

### 2.1 Webhook Signature Verification
All external webhook endpoints require an `x-webhook-signature` HTTP header containing the **HMAC-SHA256 hex digest** of the raw request body, signed with the shared `WEBHOOK_SECRET`.

```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(rawBodyBuffer)
  .digest('hex');
```

### 2.2 Role-Based Access Control (RBAC)
Endpoints creating new administrative accounts (`POST /api/users`) require an authenticated session token verifying `role === 'Admin'`.

---

## 3. Core Ingestion Endpoints

### 3.1 POST `/api/v1/webhooks/shopify`
Ingests an order creation event from the Shopify platform. Deduplicates via `external_order_id`, encrypts customer PII with AES-256-GCM, deducts inventory atomically, and creates an initial shipment route record.

### 3.2 POST `/api/v1/webhooks/amazon`
Ingests an order event from Amazon Marketplace. Identical payload schema and processing pipeline, automatically tagged with `channel: "Amazon"`.

### 3.3 POST `/api/orders/simulate-batch`
Simulates a burst of concurrent orders (10 to 50 orders) distributed across Shopify and Amazon to test high-throughput resilience.

**Request:**
```json
{
  "count": 20
}
```

**Response (`200 OK`):**
```json
{
  "message": "Lote de 20 pedidos de alta demanda procesado con éxito (Shopify & Amazon).",
  "count": 20,
  "orders": ["#SHPF-84920", "AMZ-938201-48201", "..."]
}
```

---

## 4. Autonomous Logistics & Route APIs

### 4.1 POST `/api/shipments/batch-advance`
Advances up to 100 active shipments to their subsequent transport milestone in a single atomic database query.

**Response (`200 OK`):**
```json
{
  "message": "Sincronización masiva completada: 20 guías avanzadas exitosamente.",
  "updatedCount": 20
}
```

### 4.2 POST `/api/shipments/auto-engine/toggle`
Enables or pauses the automated 5-second background fleet dispatch daemon.

**Response (`200 OK`):**
```json
{
  "active": true,
  "message": "Motor autónomo de despacho ACTIVADO."
}
```

### 4.3 GET `/api/shipments`
Retrieves live shipment records with current step, checkpoints, carrier, and destination.

---

## 5. Enterprise Management & BI Endpoints

### 5.1 GET `/api/metrics`
Returns real-time executive analytics across financial margins, fulfillment rates, customer retention, inventory velocity, and API telemetry.

**Sample Response:**
```json
{
  "sales": {
    "totalRevenue": 24590.50,
    "shopifyRevenue": 14200.00,
    "amazonRevenue": 10390.50,
    "totalOrders": 128,
    "averageOrderValue": 192.11
  },
  "financials": {
    "cogs": 10328.01,
    "grossProfit": 14262.49,
    "grossMarginPercent": 58.0,
    "marginPerOrder": 111.43
  },
  "logistics": {
    "totalShipments": 128,
    "deliveredCount": 94,
    "inTransitCount": 34,
    "deliveryRatePercent": 73.4,
    "onTimeRatePercent": 97.4,
    "avgLeadTimeHours": 26.2
  },
  "customers": {
    "totalCustomers": 112,
    "repeatCustomerRate": 28.4,
    "clvEstimated": 380
  },
  "inventory": {
    "totalSkus": 8,
    "totalUnits": 380,
    "inventoryValuation": 28400.00,
    "daysOfInventoryRemaining": 45,
    "turnoverRatio": 4.6
  },
  "performance": {
    "avgLatencyMs": 1140,
    "p95LatencyMs": 1820,
    "slaPercent": 99.4,
    "webhookUptimePercent": 99.98
  }
}
```

### 5.2 POST `/api/inventory`
Dynamically registers a new product/SKU in the central catalog.

**Request:**
```json
{
  "sku": "MONITOR-4K",
  "product_name": "UltraSharp 32-inch 4K Monitor",
  "stock_quantity": 40,
  "supplier_name": "Apex Global Electronics",
  "unit_cost": 210.00,
  "sale_price": 449.99
}
```

### 5.3 POST `/api/inventory/restock`
Adds units to an existing SKU following a replenishment purchase order.

### 5.4 GET `/api/suppliers`
Returns strategic vendor directory with lead times, reliability ratings, and contact info.

### 5.5 GET `/api/users` & POST `/api/users`
Admin-only user registry for managing operator and administrator accounts.

---

## 6. Real-Time WebSocket Events

| Event Name | Direction | Description |
|---|---|---|
| `ORDER_SYNCED` | Server → Client | Emitted when a single order is ingested from Shopify or Amazon. |
| `BATCH_SYNC_COMPLETED` | Server → Client | Emitted when a multi-order simulation burst finishes processing. |
| `SHIPMENT_UPDATED` | Server → Client | Emitted when an individual shipment advances its transit phase. |
| `SHIPMENTS_BATCH_UPDATED` | Server → Client | Emitted when a bulk batch synchronization occurs. |
| `AUTO_DISPATCH_STATUS` | Server → Client | Broadcasts changes to the autonomous daemon state (active/paused). |
