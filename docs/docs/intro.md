---
sidebar_position: 1
title: Overview & Language Selection
slug: /
---

# OrderSync — Enterprise Documentation Portal

**System:** OrderSync Multi-Channel Enterprise Order & Inventory Management Suite  
**Compliance Standards:** ISO 27001:2022 / OWASP Top 10 / Role-Based Access Control (RBAC)  
**Classification:** Official Technical Documentation & Project Defense  
**Last Updated:** September 2026

---

## Language Selection / Selección de Idioma

Select your preferred language to explore the architecture, security policies, logistics engine, business intelligence metrics, API endpoints, and DevOps infrastructure:

<div style={{display: 'flex', gap: '20px', margin: '2rem 0', flexWrap: 'wrap'}}>
  <div style={{flex: '1', minWidth: '280px', padding: '1.5rem', border: '1px solid #30363d', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)'}}>
    <h3>English Documentation</h3>
    <p>Complete formal specifications, system architecture, AES-256-GCM encryption models, REST API reference, and CI/CD pipelines in English.</p>
    <a className="button button--primary button--md" href="/docs/en/architecture">
      Read in English &rarr;
    </a>
  </div>
  
  <div style={{flex: '1', minWidth: '280px', padding: '1.5rem', border: '1px solid #30363d', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)'}}>
    <h3>Documentación en Español</h3>
    <p>Especificación técnica completa, arquitectura del sistema, modelos criptográficos AES-256-GCM, referencia REST y despliegue en español.</p>
    <a className="button button--primary button--md" href="/docs/es/architecture">
      Ver en Español &rarr;
    </a>
  </div>
</div>

---

## Architectural Modules / Módulos de Arquitectura

The documentation is organized symmetrically into identical sections for both languages:

| Module / Módulo | English Section | Sección en Español | Scope / Alcance |
|---|---|---|---|
| **01. System Architecture** | [Architecture](/docs/en/architecture) | [Arquitectura](/docs/es/architecture) | Full-stack topology, Neon PostgreSQL, WebSocket & Angular |
| **02. Security & Compliance** | [Security](/docs/en/security) | [Seguridad](/docs/es/security) | ISO 27001, AES-256-GCM PII encryption, HMAC-SHA256 |
| **03. Enterprise Suite (ERP/OMS)** | [Management](/docs/en/management-modules) | [Gestión](/docs/es/management-modules) | Inventory deduction, suppliers, customers & RBAC |
| **04. Logistics & Fleet Engine** | [Logistics](/docs/en/logistics-engine) | [Logística](/docs/es/logistics-engine) | 4-stage state machine, background daemon & bulk dispatch |
| **05. Executive BI & Metrics** | [Business Intelligence](/docs/en/business-intelligence) | [BI Ejecutivo](/docs/es/business-intelligence) | 6 operational dimensions, unit margins & channel analytics |
| **06. API & Webhooks** | [API Reference](/docs/en/api) | [Referencia de API](/docs/es/api) | Ingestion endpoints, schemas, error codes & cURL |
| **07. DevOps & Infrastructure** | [DevOps](/docs/en/devops) | [DevOps](/docs/es/devops) | Docker Compose, GitHub Actions, CodeQL SAST |
