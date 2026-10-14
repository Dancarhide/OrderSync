---
sidebar_position: 4
title: DevOps & Deployment
---

# OrderSync — DevOps & Deployment Guide

**Document Version:** 1.0.0  
**Classification:** Internal  
**Last Updated:** September 2026  
**Target Environment:** Linux/Windows containers via Docker

---

## 1. Overview

OrderSync is delivered as a fully containerized application using **Docker** and **Docker Compose**. The CI/CD pipeline is managed through **GitHub Actions** and includes automated build verification, end-to-end webhook latency assertions, and Static Application Security Testing (SAST) via **CodeQL**.

---

## 2. Prerequisites

Before deploying OrderSync, ensure the following tools are installed on the host machine:

| Tool | Minimum Version | Purpose |
|---|---|---|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.0+ (V2 plugin) | Multi-container orchestration |
| Node.js | 20 LTS | Local development only |
| Git | 2.40+ | Source control |

---

## 3. Environment Variables

All secrets and configuration values are injected through environment variables. **Never commit these values to version control.**

Create a `.env` file at the project root for local development:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_password_here
POSTGRES_DB=ordersync

# Backend
DATABASE_URL=postgres://postgres:your_strong_password_here@postgres:5432/ordersync
NODE_ENV=development
PORT=3000
WEBHOOK_SECRET=your_hmac_secret_here

# Encryption — must be exactly 64 hex characters (32 bytes = 256-bit key)
ENCRYPTION_KEY=your_256bit_hex_key_here
```

> **Security Note:** In production, use a dedicated secrets manager (AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault) and inject variables at runtime. Do not use `.env` files in production.

---

## 4. Running Locally with Docker Compose

### 4.1 Build and Start All Services

```bash
docker-compose up -d --build
```

This command will:
1. Pull the `postgres:15-alpine` base image.
2. Build the backend Node.js image from `backend/Dockerfile`.
3. Build the frontend Angular image from `frontend/Dockerfile`.
4. Start all three containers with proper health checks and dependency ordering.

### 4.2 Verify Services Are Running

```bash
docker-compose ps
```

Expected output:

| NAME | STATUS | PORTS |
|---|---|---|
| `ordersync-postgres` | running (healthy) | 0.0.0.0:5432->5432/tcp |
| `ordersync-backend` | running | 0.0.0.0:3000->3000/tcp |
| `ordersync-frontend` | running | 0.0.0.0:4200->4200/tcp |

### 4.3 Access the Application

| Service | URL |
|---|---|
| **Angular Dashboard** | http://localhost:4200 |
| **Backend API** | http://localhost:3000 |
| **Health Check** | http://localhost:3000/health |

### 4.4 Stop All Services

```bash
docker-compose down
```

To also remove the persistent PostgreSQL data volume:
```bash
docker-compose down -v
```

---

## 5. CI/CD Pipeline (GitHub Actions)

The pipeline at `.github/workflows/ci-cd-pipeline.yml` runs automatically on every **Pull Request** and **Push to `main`**.

### 5.1 Pipeline Stages

```
PR / Push to main
       │
       ├─── 1. build-and-test ──► Build Backend (tsc) + Build Frontend (ng build)
       │
       ├─── 2. sast-scan ────────► CodeQL Analysis (JavaScript/TypeScript)
       │
       └─── 3. webhook-latency ──► Start Backend + Run Simulator + Assert Response
```

### 5.2 Stage Details

**Stage 1 — Build & Test:**
- Installs dependencies for both `backend/` and `frontend/`.
- Compiles the TypeScript backend (`npm run build`).
- Compiles the Angular frontend (`npm run build`).
- Fails the pipeline if either build produces errors.

**Stage 2 — SAST Security Scan:**
- Runs GitHub's **CodeQL** static analysis engine against all JavaScript and TypeScript source files.
- Detects vulnerabilities such as: SQL injection, insecure cryptography, prototype pollution, and path traversal.
- Results appear in the GitHub **Security > Code Scanning** tab of the repository.

**Stage 3 — Webhook Latency Assertion:**
- Spins up a real PostgreSQL instance as a GitHub Actions service container.
- Runs the database migration script (`001_initial_schema.sql`).
- Starts the backend server and runs the purchase simulator (`npm run simulate:purchase`).
- Asserts the webhook processes successfully, validating the full pipeline end-to-end.

---

## 6. Database Migrations

Database schema migrations are located in `database/migrations/`. They are executed automatically when the PostgreSQL Docker container starts for the first time (mounted via `/docker-entrypoint-initdb.d/`).

| File | Description |
|---|---|
| `001_initial_schema.sql` | Creates `orders`, `customers`, `order_items` tables and enables `pgcrypto`. |

For subsequent migrations, add new numbered SQL files (e.g., `002_add_index.sql`) and apply them manually or via a migration tool such as `Flyway` or `node-pg-migrate`.

---

## 7. Monitoring & Observability

OrderSync incorporates a production-grade observability and telemetry suite designed for Kubernetes, Prometheus, Datadog, and executive SRE monitoring:

### 7.1 Production Probes & Metrics Endpoints

| Endpoint | Protocol / Format | Purpose | Expected Status |
|---|---|---|---|
| `GET /health` | JSON | Comprehensive SLA, DB ping latency, process memory, and system uptime | `200 OK` (or `503 Service Unavailable`) |
| `GET /ready` | JSON | Kubernetes Readiness Probe (`SELECT 1;` DB validation) | `200 OK` |
| `GET /live` | JSON | Kubernetes Liveness Probe (Kernel responsiveness) | `200 OK` |
| `GET /metrics` | Prometheus (RFC 0.0.4) | Standard metric exposition for Prometheus / Grafana scraping | `200 OK` |
| `GET /api/devops/telemetry` | JSON | Full telemetry report consumed by the Angular Admin Console | `200 OK` |
| `POST /api/devops/ping-db` | JSON | On-demand roundtrip latency test against PostgreSQL | `200 OK` |
| `GET /api/devops/logs` | JSON | Live stream of recent runtime and security audit events | `200 OK` |

### 7.2 Prometheus Metrics Exposition (`GET /metrics`)

The following standard gauges and counters are exported at `/metrics`:
```promql
ordersync_uptime_seconds            # Total service uptime in seconds
ordersync_memory_rss_bytes          # Resident Set Size memory footprint
ordersync_memory_heap_used_bytes    # V8 Heap memory used
ordersync_database_ping_latency_ms  # PostgreSQL roundtrip query duration
ordersync_database_pool_total       # Total connections in connection pool
ordersync_database_pool_idle        # Idle connections ready for checkout
ordersync_webhook_requests_total    # Ingested webhook count
ordersync_webhook_avg_latency_ms    # Average end-to-end sync processing time
ordersync_websocket_clients_active  # Connected real-time Socket.io clients
ordersync_health_status             # Binary health state (1=healthy, 0=degraded/down)
```

### 7.3 Enterprise Monitoring Integrations

| Tool | Purpose |
|---|---|
| **Prometheus / Grafana** | Metrics scraping via `/metrics` and dashboard alerting |
| **Datadog / New Relic** | APM, distributed tracing, error rates |
| **PagerDuty** | Alerting when sync latency SLA exceeds 500 ms |
| **Sentry** | Real-time error tracking for unhandled backend exceptions |
| **AWS CloudWatch / GCP Monitoring** | Host and container-level metrics |

---

## 8. Technical Documentation Portal (Docusaurus)

OrderSync includes an integrated enterprise documentation site built with **Docusaurus v3**, featuring bilingual localization (English / Spanish) and PDF export capability:

### 8.1 Running Documentation Locally
```bash
# From workspace root
cd docs
npm start
```
The documentation portal will open at `http://localhost:3001` (or next available port).

### 8.2 Switching Languages in Docusaurus
- Default English locale: `http://localhost:3001/`
- Spanish Latin America locale: `http://localhost:3001/es/`
- Users can toggle dynamically using the navbar language dropdown selector.

### 8.3 Compiling Static Production Bundle
```bash
cd docs
npm run build
```
Generates a static HTML/JS distribution under `docs/build/` suitable for hosting on GitHub Pages, Cloudflare Pages, or AWS S3.
