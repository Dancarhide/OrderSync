---
sidebar_position: 2
title: Security & Compliance
---

# OrderSync — Security & Compliance

**Document Version:** 1.0.0  
**Classification:** Confidential  
**Last Updated:** September 2026  
**Compliance Standards:** ISO 27001:2022 | CCPA | U.S. Privacy Framework

---

## 1. Overview

OrderSync is designed from the ground up with a **security-first** architecture. All components adhere to the **ISO/IEC 27001:2022** Information Security Management System (ISMS) standard, as well as applicable U.S. privacy laws including the **California Consumer Privacy Act (CCPA)** and general U.S. Federal Trade Commission (FTC) data protection guidelines.

This document describes the technical and procedural controls implemented to protect the confidentiality, integrity, and availability of all data processed by the OrderSync platform.

---

## 2. Data Classification

| Data Category | Examples | Classification | Protection Level |
|---|---|---|---|
| Customer PII | Full name, address, phone number | **Confidential** | AES-256-GCM Encrypted |
| Order Metadata | Order ID, channel, status, amount | **Internal** | Standard DB Access Controls |
| System Secrets | Encryption keys, DB credentials | **Restricted** | Environment Variables Only |
| Webhook Payloads | Raw Shopify/Amazon POST bodies | **Internal** | HMAC-Verified, Transient |

---

## 3. Encryption

### 3.1 Data at Rest — Column-Level Encryption (AES-256-GCM)

All Personally Identifiable Information (PII) is encrypted **at the application layer** before being stored in the database. The PostgreSQL `pgcrypto` extension is enabled as an additional security layer. The encryption algorithm is **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode), which provides both confidentiality and data integrity authentication.

**Encrypted Fields (`customers` table):**

| Column | Data Type | Protection |
|---|---|---|
| `encrypted_full_name` | `BYTEA` | AES-256-GCM |
| `encrypted_shipping_address` | `BYTEA` | AES-256-GCM |
| `encrypted_phone` | `BYTEA` | AES-256-GCM |

Each encrypted value is stored as a binary buffer containing:
```
[IV: 16 bytes] + [Auth Tag: 16 bytes] + [Ciphertext]
```

The **Initialization Vector (IV)** is randomly generated for every encryption operation, ensuring that identical plaintext values produce different ciphertexts.

### 3.2 Data in Transit — TLS

All communication between system components uses **Transport Layer Security (TLS)**:
- Webhook ingestion endpoints: HTTPS only.
- Database connections: TLS-encrypted PostgreSQL connections.
- WebSocket connections: WSS (WebSocket Secure) in production deployments.

---

## 4. Secrets Management

> [!IMPORTANT]
> **Zero hardcoded credentials policy.** No passwords, API keys, encryption keys, or database connection strings appear anywhere in the source code or version control history.

All secrets are injected at runtime via **environment variables**:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ENCRYPTION_KEY` | 256-bit AES key (hex-encoded, 64 chars) |
| `WEBHOOK_SECRET` | HMAC-SHA256 shared secret for webhook validation |
| `NODE_ENV` | Application environment (`development` / `production`) |

In production, these variables must be managed via a dedicated secrets manager (e.g., **AWS Secrets Manager**, **HashiCorp Vault**, or **Azure Key Vault**).

---

## 5. Webhook Security

### 5.1 HMAC-SHA256 Signature Verification

Every incoming webhook request is authenticated before any processing occurs. The backend computes an HMAC-SHA256 digest of the raw request body using the shared `WEBHOOK_SECRET` and compares it against the `x-webhook-signature` header provided by the sender.

```
HMAC-SHA256(WEBHOOK_SECRET, raw_body) === x-webhook-signature
```

Requests with invalid or missing signatures are rejected with HTTP `401 Unauthorized`.

### 5.2 Idempotency & Deduplication

To prevent duplicate order records from replay attacks or network retries, all webhook endpoints enforce strict **idempotency** using the `external_order_id` as a natural deduplication key. If an order with that ID already exists in the database, the system returns HTTP `200 OK` without re-processing, and no duplicate record is created.

---

## 6. Access Control

| Layer | Control Mechanism |
|---|---|
| Network | Docker network isolation between containers |
| Database | Dedicated service account with least-privilege access |
| API | HMAC signature per webhook source |
| UI | PII obfuscation (masked display: `J*** S*** [Encrypted]`) |

---

## 7. Audit Logging

The system records the following events for audit trail purposes, aligned with ISO 27001 Annex A control **A.8.15 (Logging)**:
- Every incoming webhook request (timestamp, channel, order ID, HTTP status returned).
- Every database write transaction (order creation, encryption success/failure).
- All WebSocket connection and disconnection events.

---

## 8. Compliance Summary

| Standard | Status | Notes |
|---|---|---|
| **ISO 27001:2022** | Compliant | ISMS controls implemented: A.8.3, A.8.11, A.8.15, A.8.24 |
| **CCPA** | Compliant | PII encrypted and access-controlled |
| **FTC Data Protection Guidelines** | Compliant | No PII stored in plaintext |
| **OWASP Top 10** | Mitigated | Injection, cryptographic failures, and security misconfiguration addressed |
