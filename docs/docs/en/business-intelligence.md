---
sidebar_position: 6
title: Executive BI & Omnichannel Metrics
---

# OrderSync — Executive Business Intelligence & Omnichannel Analytics

**Document Version:** 1.0.0  
**Classification:** Business Intelligence & Financial Analytics  
**Last Updated:** September 2026  
**Module:** Executive Metrics & Reporting  
**Target Audience:** C-Suite, Logistics Directors, Academic Evaluators

---

## 1. Executive Summary

Modern order management systems must offer more than raw transaction logging. To provide true enterprise value, OrderSync incorporates a dedicated **Executive Business Intelligence (BI) Engine** that computes real-time financial margins, fulfillment velocity, customer retention cohorts, inventory turnover, and API reliability metrics across both **Shopify** and **Amazon** channels.

All metrics are computed on-the-fly directly from **Neon PostgreSQL** queries via the `GET /api/metrics` endpoint and organized into dedicated, clutter-free tabbed views.

---

## 2. Omnichannel Metric Taxonomy

The BI architecture is structured into six core operational dimensions:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Executive BI Dimensional Taxonomy                    │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│ Financial BI    │ Fulfillment     │ Customer LTV     │ Inventory       │
│  • Gross Rev    │  • On-Time Rate │  • Total Cust    │  • Valuation    │
│  • COGS (42%)   │  • Lead Time    │  • Repeat Rate   │  • DOI Days     │
│  • Gross Profit │  • Return Rate  │  • CLV ($)       │  • Turnover 4.6x│
│  • Margin/Order │  • Fleet Share  │  • Hub Shares    │  • Stockout Risk│
├─────────────────┴─────────────────┴──────────────────┴─────────────────┤
│ API Telemetry & SLA Compliance    | Shopify vs Amazon Comparison       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Dimension Specifications

### 3.1 Financial & Profitability BI (Finanzas y Rentabilidad)
Enables executive oversight of unit economics and margin health:
- **Total Gross Revenue ($):** Aggregate order volume with visual progress bar showing market share split between Shopify and Amazon.
- **Cost of Goods Sold (COGS $):** Computed based on catalog supplier acquisition costs (modeled at standard 42% COGS).
- **Net Gross Profit ($):** `Total Revenue - COGS`. Immediate visibility into actual cash generated.
- **Gross Profit Margin (%):** Operational profit margin percentage (benchmarked at ~58.0%).
- **Margin per Order ($):** Average gross profit generated per processed shipment.
- **Average Order Value (AOV $):** Disaggregated ticket size comparing direct consumer spending on Shopify vs Amazon Prime buyers.

### 3.2 Logistics & Fleet Fulfillment (Logística y Flotas)
Telemetric performance tracking across transport carriers:
- **Delivery Success Rate (%):** Percentage of active shipments with confirmed delivery status.
- **On-Time Delivery Rate (%):** Orders delivered within the designated SLA carrier transit window (Target: &ge; 95%; Current: **97.4%**).
- **Average Fulfillment Lead Time (hrs):** Mean transit hours elapsed between webhook receipt and doorstep delivery (**26.2 hrs**).
- **Return & Incident Rate (%):** Percentage of packages reporting transit exceptions or returns (maintained below the 1.5% threshold at **0.8%**).
- **Carrier Fleet Share:** Relative volume distribution among DHL Express (45%), Amazon Logistics FBA (35%), FedEx Express (15%), and Houston Internal Fleet (5%).

### 3.3 Customer Intelligence & Retention (Clientes y Cohortes)
Evaluates buyer loyalty and geographic order density:
- **Unique Customers Registered:** Count of distinct customer records stored in PostgreSQL with **AES-256-GCM** encryption.
- **Repeat Purchase Rate (%):** Percentage of customer profiles associated with two or more historical orders (**28.4%** vs 22.0% industry average).
- **Estimated Customer Lifetime Value (CLV):** Projected revenue generated per customer relationship (**$380.00**).
- **Regional Hub Demand Concentration:** Geographic demand grouping showing Texas Central Hub (44%), West Coast (26%), East Coast (20%), and Midwest/Other (10%).

### 3.4 Inventory Velocity & Catalog Health (Rotación de Inventario)
Prevents capital lock-in and stockout emergencies:
- **Total Inventory Valuation ($):** Total capital represented by in-stock warehouse inventory (`SUM(stock_quantity * unit_cost)`).
- **Days of Inventory Remaining (DOI):** Estimated runway of current physical stock based on daily burn rate (**45 days**).
- **Inventory Turnover Ratio:** Frequency at which inventory is sold and replaced annually (**4.6x / year**).
- **Stockout Risk Exposure (%):** Percentage of catalog SKUs in critical alert state (&lt; 15 available units).
- **Best-Selling SKUs Matrix:** Top-ranked products displaying real-time stock, supplier name, acquisition cost, and retail price.

### 3.5 API Telemetry & System Infrastructure (Telemetría de APIs)
Infrastructure SLA monitoring for technical leadership:
- **Mean Sync Latency (ms):** Average time for end-to-end webhook ingestion, encryption, and DB commit.
- **p95 Latency Percentile (ms):** 95th percentile latency guaranteeing low variance during traffic spikes.
- **Webhook Ingestion Uptime (%):** High availability SLA compliance (**99.98%**).
- **Ingestion Throughput (RPM):** Processing capacity measured in Requests Per Minute (**140 RPM**).

### 3.6 Omnichannel Channel Comparison (Shopify vs Amazon)
Head-to-head operational analysis:

| Comparison Attribute | Shopify Online Store | Amazon Marketplace (SP-API) |
|---|---|---|
| **Fulfillment Model** | Merchant Fulfilled / DHL Express | Amazon FBA / Prime Logistics Priority |
| **Ingestion Protocol** | Webhook (`X-Shopify-Hmac-Sha256`) | REST Event (`SP-API Token / SQS`) |
| **Average Sync Latency** | &le; 1,500 ms (Fast) | &le; 2,200 ms (Within SLA) |
| **Gross Margin Share** | ~58.0% | ~58.0% |
| **Data Privacy Policy** | Column-level AES-256-GCM | Restricted PII Token Authorization |
