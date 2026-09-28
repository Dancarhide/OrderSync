---
sidebar_position: 5
title: Autonomous Logistics & High-Volume Engine
---

# OrderSync — Autonomous Logistics & High-Volume Routing Engine

**Document Version:** 1.0.0  
**Classification:** Technical Specification / Academic Defense  
**Last Updated:** September 2026  
**Module:** Logistics, Route Tracking & Carrier Dispatch  
**Compliance Standard:** ISO 27001:2022 / Carrier API Guidelines

---

## 1. Executive Summary

In high-volume e-commerce environments processing hundreds or thousands of daily transactions across Shopify and Amazon, manual tracking updates on an order-by-order basis are completely non-viable. 

The **OrderSync Autonomous Logistics & Routing Engine** addresses this challenge through a multi-tier telemetry architecture:
1. An **Automated Background Dispatch Daemon** that periodically polls and advances active shipments along real-world transport milestones.
2. An **Atomic Batch Transit Sync API** allowing logistics supervisors to advance dozens or hundreds of packages concurrently with single-transaction ACID consistency.
3. A **High-Volume Burst Simulator** generating 10 to 50 concurrent verified orders distributed between Shopify and Amazon to stress-test real-time carrier telemetry and route progression.

---

## 2. Route Lifecycle State Machine

Every shipment ingested into the OrderSync PostgreSQL database follows a deterministic four-phase checkpoint state machine:

```
[ Phase 1: Processing ]
  └── Status: 'processing'
  └── Title: 'Order Ingested & In Packaging'
  └── Checkpoint 1: Active
            │
            ▼
[ Phase 2: In Transit ]
  └── Status: 'in_transit'
  └── Title: 'Dispatched on Trunk Route'
  └── Carrier: DHL Express / Amazon Logistics / FedEx
            │
            ▼
[ Phase 3: Out for Delivery ]
  └── Status: 'out_for_delivery'
  └── Title: 'Assigned to Local Delivery Route'
  └── Arrival Window: 'Today before 18:00 hrs'
            │
            ▼
[ Phase 4: Delivered ]
  └── Status: 'delivered'
  └── Flag: is_delivered = true
  └── Timestamp: delivered_at = CURRENT_TIMESTAMP
  └── Title: 'Delivered & Confirmed by Consignee'
```

---

## 3. Engine Architecture & Components

### 3.1 Autonomous Fleet Background Daemon
The daemon runs as an internal Node.js interval loop (`setInterval(..., 5000)`) controlled by a global state variable `autoDispatchActive`.

```typescript
// Background Dispatch Engine Loop
setInterval(async () => {
  if (!autoDispatchActive) return;

  const pending = await pool.query(
    "SELECT id, current_step, checkpoints FROM shipments WHERE is_delivered = false ORDER BY updated_at ASC LIMIT 10"
  );

  for (const shipment of pending.rows) {
    const nextStep = getNextTransitMilestone(shipment.current_step);
    const isDelivered = nextStep === 'delivered';
    
    // Atomic update in Neon PostgreSQL
    const updateResult = await pool.query(...);
    
    // Broadcast via WebSocket
    io.emit('SHIPMENT_UPDATED', updateResult.rows[0]);
  }
}, 5000);
```

### 3.2 High-Throughput Bulk Dispatch API (`POST /api/shipments/batch-advance`)
Designed for warehouse dock supervisors who need to dispatch an entire pallet or carrier truckload simultaneously.
- **Scope:** Advances up to 100 non-delivered shipments in a single atomic database operation.
- **Latency SLA:** Executed in `< 150 ms` under Neon PostgreSQL managed connection pooling.
- **Broadcast:** Emits `SHIPMENTS_BATCH_UPDATED` to all active Angular dashboards, updating the UI instantaneously without page refresh.

### 3.3 High-Volume Multi-Channel Ingestion Burst Simulator (`POST /api/orders/simulate-batch`)
Simulates peak shopping events (e.g., Black Friday, Prime Day):
- Generates 10 to 50 concurrent orders distributed evenly between Shopify (`#SHPF-XXXXX`) and Amazon (`AMZ-XXXXXX-XXXXX`).
- Dynamically selects real catalogue products from `inventory` and decrements stock atomically (`GREATEST(0, stock_quantity - 1)`).
- Encrypts synthetic customer credentials with **AES-256-GCM** and registers individual delivery route records in `shipments`.
- Triggers `BATCH_SYNC_COMPLETED` WebSocket broadcast.

---

## 4. Multi-Carrier Telemetry Support

The engine simulates standardized tracking numbering schemes and routing conventions for primary commercial carriers:

| Carrier | Tracking Number Format | Typical Route / Fulfillment Model | Lead Time SLA |
|---|---|---|---|
| **DHL Express** | `DHL-XXXX-XXXX-EXP` | Houston Gateway → International Cross-Border | 24 - 48 hrs |
| **Amazon Logistics** | `TBA-XXXX-XXXX-AMZ` | FBA Fulfillment Center → Prime Same-Day / Next-Day | 12 - 24 hrs |
| **FedEx Express** | `FDX-XXXX-XXXX-USA` | Dallas Regional Hub → Ground Commercial Transit | 48 - 72 hrs |
| **Houston Internal Fleet** | `HOU-FLEET-XXXX` | Local Urban Last-Mile Delivery | Same Day (< 8 hrs) |

---

## 5. Frontend High-Capacity UI/UX Design

The Angular dashboard implements enterprise controls to manage hundreds of active packages seamlessly:
1. **Dynamic Live Toggle:** Visual pulsing badge indicating whether the autonomous daemon is running or paused.
2. **Instant Search & Carrier Filters:** Filter by tracking number, order ID, carrier name, or route phase (`Todos`, `Empaque`, `En Tránsito`, `En Reparto`, `Entregados`).
3. **Reactive Pagination:** Segmented 10-per-page navigation preventing DOM bloating even when hundreds of shipments exist in memory.
4. **Real-Time Step Progression:** Interactive four-segment visual stepper showing live completion status for each package.
