---
sidebar_position: 2
title: Security & Compliance
---

# OrderSync — Security & Compliance

**Document Version:** 2.0.0  
**Classification:** Confidential  
**Last Updated:** October 2026  
**Primary Jurisdiction:** State of Texas, USA (Houston Headquarters)  
**Compliance Standards:** TDPSA | Texas Bus. & Com. Code Ch. 521 | ISO/IEC 27001:2022 | CCPA | FTC Safeguards

---

## 1. Overview

OrderSync is engineered from the ground up with a **security-by-design** architecture. With primary headquarters in **Houston, Texas**, the platform strictly complies with:

1. **TDPSA (Texas Data Privacy and Security Act)** — Effective July 1, 2024 (*Texas Business and Commerce Code § 541*).
2. **Texas Identity Theft Enforcement and Protection Act** (*Texas Business and Commerce Code Chapter 521*).
3. **ISO/IEC 27001:2022** — Information Security Management System (ISMS).
4. **Federal Trade Commission (FTC)** Safeguards Rule and interstate equivalents (e.g., California CCPA).

---

## 2. Data Classification

| Data Category | Examples | Classification | Protection Level | Legal Basis |
|---|---|---|---|---|
| **Consumer PII** | Full name, delivery address, phone | **Confidential** | Column-level AES-256-GCM + Random IV | TDPSA § 541.101 & Tex. Sec. 521.052 |
| **Financial Records** | Order total, currency, tax, payment status | **Internal** | ACID transaction integrity in Neon PostgreSQL | 7-Year Tax Retention (IRS & Texas Comptroller) |
| **Cryptographic Secrets** | 256-bit AES master key, JWT secret | **Restricted** | KMS / Environment secrets / Rotation audit | ISO 27001 Control A.8.24 |
| **Credentials & MFA** | Password hashes, TOTP Base32 secrets | **Restricted** | `crypt()` Blowfish (`bf`) / RFC 6238 TOTP | FTC Safeguards & Texas MFA Guidelines |
| **Webhook Payloads** | Shopify & Amazon raw payloads | **Internal** | HMAC-SHA256 signature verification | Replay Attack Prevention (Idempotency) |

---

## 3. Encryption & Key Management (KMS)

### 3.1 Data at Rest — Column-Level Encryption (AES-256-GCM)

All Personally Identifiable Information (PII) is encrypted at the application layer prior to database insertion:

```
Buffer: [IV: 16 bytes] + [Auth Tag: 16 bytes] + [Ciphertext]
```

* **Initialization Vector (IV):** 16 cryptographically random bytes generated per encryption call to prevent frequency analysis attacks.
* **Authentication Tag:** 16 Galois/Counter Mode bytes ensuring tamper-proof integrity.

### 3.2 KMS Key Health & Audit Telemetry

The [`KeyManagementService`](file:///d:/Proyectos/OrderSync/backend/src/services/kms.service.ts) provides real-time cryptographic status:

* **Endpoint:** `GET /api/security/key-status`
  * Validates 256-bit key entropy and algorithm health.
  * Generates masked SHA-256 fingerprint (`SHA256:...`) for traceability without secret exposure.
  * Assesses ISO 27001 Control **A.8.24** (*Use of Cryptography*).
* **Rotation Audit Endpoint:** `POST /api/security/rotate-keys`
  * Audits key rotation schedules every 90 days.

---

## 4. Texas Framework: Consumer Rights (TDPSA)

Under **Texas Business and Commerce Code § 541.051**, consumers possess enforceable data privacy rights. OrderSync supports automated **Data Subject Requests (DSR)**:

### 4.1 Right to Erasure / Anonymization

* **Endpoint:** `POST /api/customers/:id/anonymize`
* **Action:** Replaces encrypted customer PII with irreversible anonymized placeholders (`ANONYMIZED_TDPSA_CONSUMER`, `REDACTED_PER_TEXAS_DATA_PRIVACY_ACT`, `000-000-0000`).
* **Tax Exemption:** Conforme to TDPSA § 541.055, financial and accounting amounts remain intact disassociated from identity for Texas Comptroller compliance.
* **Audit Trail:** Injects an immutable `TDPSA_RIGHT_TO_ERASURE` event into `security_audit_logs`.

### 4.2 Right to Data Portability

* **Endpoint:** `GET /api/customers/:id/export`
* **Action:** Generates a structured, machine-readable JSON package containing:
  * Official Texas legal framework metadata.
  * Decrypted consumer profile for authorized delivery.
  * Transaction history across connected channels.
  * Digital signature and SHA-256 integrity checksum.

---

## 5. Texas Breach Notification Protocol (Sec. 521.053)

Under **Texas Business & Commerce Code § 521.053**:

* **Notice Deadline:** Mandatory notification to affected individuals as quickly as practicable and no later than **60 calendar days** following discovery of a security breach involving sensitive PII.
* **Attorney General Notice:** Mandatory notification to the **Texas Attorney General (OAG)** if a breach affects **500 or more Texas residents**.
* **Responsible Party:** Handled via designated Data Protection Officer (`privacy-officer@ordersync.app`).

---

## 6. Server Hardening (Helmet & Rate Limiting)

To mitigate OWASP Top 10 vulnerabilities and denial-of-service attempts:

### 6.1 Helmet Security Headers
* **HSTS:** Enforces HTTPS/TLS encrypted communication.
* **X-Content-Type-Options:** Prevents MIME-type sniffing (`nosniff`).
* **X-Frame-Options:** Prevents Clickjacking attacks (`SAMEORIGIN`).

### 6.2 Rate Limiting
* **Authentication Rate Limiting:**
  * Endpoint: `/api/login`
  * Threshold: Max 20 requests per IP per 15 minutes to defeat brute-force and credential stuffing attacks.
* **Global API Limiting:**
  * Endpoints: `/api/*`
  * Threshold: 600 requests per IP per 15 minutes.

---

## 7. Multi-Factor Authentication (MFA / 2FA)

Administrator accounts are secured with RFC 6238 Time-Based One-Time Password (**TOTP**) authentication:

* **Algorithm:** HMAC-SHA1 with 30-second time steps and ±1 step drift tolerance.
* **Key Format:** 160-bit Base32 secret compatible with standard authenticator applications.
* **Endpoints:**
  * `GET /api/auth/mfa/status`
  * `POST /api/auth/mfa/setup`
  * `POST /api/auth/mfa/verify`
  * `POST /api/auth/mfa/disable`

---

## 8. Security Audit Trail

All critical security operations are logged to the `security_audit_logs` table:

* **ISO 27001 Control:** **A.8.15 (Logging)**.
* **Events Recorded:**
  * `TDPSA_RIGHT_TO_ERASURE`
  * `TDPSA_DATA_PORTABILITY_EXPORT`
  * `KMS_KEY_ROTATION_AUDITED`
  * `MFA_ACTIVATED` / `MFA_DISABLED`
* **Operator Console:** Real-time visibility under **Settings > Texas Security & TDPSA**.
