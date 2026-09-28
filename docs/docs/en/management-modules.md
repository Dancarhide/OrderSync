---
sidebar_position: 7
title: Enterprise Management Suite
---

# OrderSync — Enterprise Management Suite (ERP/OMS)

**Document Version:** 1.0.0  
**Classification:** Functional Architecture & Enterprise Workflows  
**Last Updated:** September 2026  
**Module:** Inventory, Suppliers, Customers & User Security (RBAC)  
**Compliance Standard:** ISO 27001:2022 / Role-Based Access Control

---

## 1. Executive Summary

To function as a true **Enterprise Order Management System (OMS)** and lightweight **Enterprise Resource Planning (ERP)** core, OrderSync provides integrated modules beyond basic order monitoring:
1. **Central Inventory:** Real-time multi-channel stock deduction and dynamic SKU registration.
2. **Supplier & Procurement Directory:** Strategic vendor tracking with lead-time telemetry and replenishment purchase orders.
3. **Encrypted Customer Registry:** ISO 27001 compliant column storage with role-based data obfuscation.
4. **User Management & Security (RBAC):** Strict administrative delegation ensuring only authorized Administrators can register system accounts.

---

## 2. Inventory Central (Inventario Central)

OrderSync maintains a single authoritative inventory catalog synchronized across all sales channels:

### 2.1 Atomic Stock Deduction
When a webhook arrives from Shopify or Amazon, the backend executes an atomic SQL deduction:
```sql
UPDATE inventory 
SET stock_quantity = GREATEST(0, stock_quantity - $1),
    updated_at = CURRENT_TIMESTAMP
WHERE sku = $2
RETURNING *;
```
This guarantees no race conditions can create negative stock levels even under simultaneous multi-channel checkout bursts.

### 2.2 Dynamic SKU & Product Registration (`POST /api/inventory`)
Allows operators to register new SKUs directly from the dashboard:
- **Attributes:** SKU Code, Product Name, Initial Stock Units, Assigned Supplier, Unit Cost ($), and Sale Price ($).
- **Validation:** Automatic SKU capitalization and duplicate SKU prevention.
- **Immediate Ingestion:** Newly created products are instantly eligible for simulated Shopify and Amazon purchase events.

---

## 3. Suppliers & Procurement (Proveedores y Surtido)

The Supplier Directory manages supply-chain partners responsible for replenishing inventory:

| Supplier Name | Primary Category | Headquarter Country | Lead Time | Reliability Rating | Action |
|---|---|---|---|---|---|
| **Apex Global Electronics** | Computing & Peripherals | USA (Texas) | 3 days | 4.8 / 5.0 | Restock (+25 Units) |
| **Shenzhen Acoustic Labs** | Audio & Wireless Gear | China | 7 days | 4.6 / 5.0 | Restock (+25 Units) |
| **Nordic Ergonomic Gear** | Workspace Furniture | Sweden | 5 days | 4.9 / 5.0 | Restock (+25 Units) |
| **Pacific Rim Componentes** | Power & Accessories | Taiwan | 4 days | 4.7 / 5.0 | Restock (+25 Units) |

Operators can trigger instant digital purchase orders that restock the central inventory and record vendor transaction history.

---

## 4. Customer Directory & ISO 27001 Data Privacy

Customer Personally Identifiable Information (PII) is strictly managed according to privacy regulations (CCPA / GDPR standards):

### 4.1 Storage Security
- **Encryption Algorithm:** Application-level **AES-256-GCM** using an initialization vector (IV) and authentication tag.
- **Database Storage:** Customer names, street addresses, and phone numbers are persisted as raw binary (`BYTEA`) buffers.

### 4.2 Role-Based Data Masking
- **Operators:** View customer identities masked by default (`C*** M*** [Encrypted]`, `*** Houston, TX ***`, `+1-***-***-****`).
- **Administrators:** Granted an authorized "Decrypt Authorized View" button that allows temporary decryption of PII fields for audit and customer resolution purposes.

---

## 5. User Management & Role-Based Access Control (RBAC)

OrderSync enforces a strict administrative hierarchy:

```
┌────────────────────────────────────────────────────────┐
│              Role-Based Access Control                 │
├──────────────────────────┬─────────────────────────────┤
│        Admin Role        │       Operator Role         │
├──────────────────────────┼─────────────────────────────┤
│ • Full platform access   │ • Real-time order tracking  │
│ • Create system accounts │ • Inventory view & restock  │
│ • Assign user roles      │ • Carrier dispatch views    │
│ • Decrypt customer PII   │ • Obfuscated customer view  │
│ • Manage webhook secrets │ • User creation RESTRICTED  │
└──────────────────────────┴─────────────────────────────┘
```

Only authenticated **Administrators** have permission to access the user registration form and call `POST /api/users`. Standard operators attempting to call administrative endpoints are blocked with `403 Forbidden` responses.
