---
sidebar_position: 1
title: System Architecture
---

# OrderSync — System Architecture

**Document Version:** 1.0.0  
**Classification:** Internal / Client-Facing  
**Last Updated:** September 2026  
**Prepared By:** Engineering Division — OrderSync Project Team  
**Compliance Standard:** ISO 27001:2022

---

## 1. Executive Summary

OrderSync is a centralized, multi-channel order management system designed to aggregate real-time purchase events from external e-commerce platforms — specifically **Shopify** and **Amazon** — into a single, unified data store and operator dashboard. The system is built to serve e-commerce clients headquartered in Houston, Texas, USA, and is engineered to meet strict Service Level Agreements (SLAs), U.S. privacy regulations, and the ISO 27001:2022 information security management standard.

---

## 2. High-Level Architecture

The OrderSync platform is composed of three primary application tiers and one data tier:

```
┌─────────────────────────────────────────────────────────────────┐
│                       External Channels                         │
│              Shopify Webhooks | Amazon Webhooks                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS + HMAC-SHA256 Verification
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend (Node.js / Express.js)                  │
│   Webhook Controller │ Encryption Service │ Autonomous Daemon   │
│   Inventory Service  │ BI Metrics Engine  │ WebSocket (Socket.io│
└──────────┬──────────────────────────────────────┬───────────────┘
           │ SQL / TLS (Neon PostgreSQL)          │ WebSocket (WS)
           ▼                                       ▼
┌──────────────────────┐              ┌────────────────────────────┐
│  Neon PostgreSQL DB   │              │   Angular 17+ Dashboard    │
│  (AES-256-GCM / ACID) │              │   (6 Modules + BI Tabs)    │
└──────────────────────┘              └────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 Backend Service

| Property | Value |
|---|---|
| **Runtime** | Node.js v20 LTS |
| **Framework** | Express.js with TypeScript |
| **Real-Time Layer** | Socket.io (WebSockets) |
| **Port** | 3000 |
| **Authentication** | HMAC-SHA256 per incoming webhook |

The backend service is responsible for:
- Receiving, validating, and deduplicating incoming webhook payloads from Shopify and Amazon.
- Encrypting all Personally Identifiable Information (PII) fields at the application layer before persisting them to PostgreSQL.
- Calculating end-to-end sync latency (`T2 - T1`) and storing it with the order record.
- Broadcasting real-time `ORDER_SYNCED` WebSocket events to all connected dashboard clients.

### 3.2 Database

| Property | Value |
|---|---|
| **Engine** | PostgreSQL 15 |
| **Extension** | `pgcrypto` (AES-256 capable) |
| **Encryption** | Application-level AES-256-GCM for PII columns |
| **Port** | 5432 |

Three core tables are used: `orders`, `customers`, and `order_items`. PII data stored in the `customers` table is encrypted before insertion and stored as `BYTEA` columns.

### 3.3 Frontend Dashboard

| Property | Value |
|---|---|
| **Framework** | Angular 17+ (Standalone Components) |
| **Styling** | TailwindCSS |
| **Real-Time** | Socket.io Client |
| **Port** | 4200 |

The dashboard displays live KPI metrics, incoming orders, and real-time toast notifications. All PII fields in the UI are obfuscated (e.g., `J*** S*** [Encrypted]`) to protect customer data from unauthorized viewing.

---

## 4. Service Level Agreements (SLAs)

| Metric | Target |
|---|---|
| **End-to-End Sync Latency** | < 5,000 ms (5 seconds) |
| **System Availability** | ≥ 99.9% Uptime |
| **Webhook Deduplication** | 100% — Idempotency key matching on `external_order_id` |

The sync latency is calculated as `T2 - T1`:
- **T1:** Timestamp at the moment the webhook HTTP request is received by the backend.
- **T2:** Timestamp at the moment the order has been committed to the PostgreSQL database and the `ORDER_SYNCED` WebSocket event has been emitted.

---

## 5. Data Flow

1. A customer places an order on **Shopify** or **Amazon**.
2. The external platform sends an HTTPS webhook POST to OrderSync's backend endpoint.
3. The backend verifies the HMAC-SHA256 signature and checks the `external_order_id` for duplicates.
4. PII fields (name, address, phone) are encrypted using AES-256-GCM.
5. A database transaction saves the `order`, `customer` (encrypted), and `order_items` records atomically.
6. End-to-end latency is calculated and stored.
7. A `ORDER_SYNCED` WebSocket event is emitted to all connected Angular dashboard clients.
8. The dashboard UI updates in real time: KPI counts, the orders table, and a toast notification.

---

## 6. Infrastructure & Containerization

The full application stack is containerized using **Docker** and orchestrated with **Docker Compose**. Each service runs in an isolated container with environment variable-driven configuration. No secrets are hardcoded anywhere in the source code.

| Service | Docker Image | Exposed Port |
|---|---|---|
| `postgres` | `postgres:15-alpine` | 5432 |
| `backend` | Custom Node.js image | 3000 |
| `frontend` | Custom Angular image | 4200 |
