---
sidebar_position: 6
title: Métricas Ejecutivas y Analítica BI
---

# OrderSync — Métricas Ejecutivas e Inteligencia de Negocios Omnicanal

**Versión del Documento:** 1.0.0  
**Clasificación:** Inteligencia de Negocios y Analítica Financiera  
**Última Actualización:** Septiembre 2026  
**Módulo:** Métricas Ejecutivas y Reportes BI  
**Audiencia Objetivo:** Dirección General, Gerencia de Logística, Evaluadores Académicos

---

## 1. Resumen Ejecutivo

Un sistema de gestión de pedidos moderno no puede limitarse a registrar transacciones. Para aportar valor directivo real, OrderSync integra un **Motor de Inteligencia de Negocios (BI) Ejecutiva** que computa en tiempo real márgenes financieros, velocidad logística, retención de clientes, rotación de existencias y telemetría de APIs entre **Shopify** y **Amazon**.

Todas las métricas se calculan dinámicamente en **Neon PostgreSQL** a través del endpoint `GET /api/metrics` y se presentan en una interfaz organizada por pestañas temáticas libres de saturación visual.

---

## 2. Taxonomía de Métricas Omnicanal

La arquitectura analítica se divide en seis dimensiones operativas clave:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Taxonomía Dimensional del BI Ejecutivo               │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│ Finanzas        │ Logística       │ Clientes         │ Inventario      │
│  • Ingresos Tot │  • % A Tiempo   │  • Total Clientes│  • Valor Total  │
│  • COGS (42%)   │  • Lead Time    │  • Tasa Recompra │  • Días DOI     │
│  • Utilidad Neta│  • Devoluciones │  • LTV ($)       │  • Rotación 4.6x│
│  • Margen/Orden │  • Cuota Flotas │  • Hubs Región   │  • Riesgo Stock │
├─────────────────┴─────────────────┴──────────────────┴─────────────────┤
│ Telemetría de Servidor y SLA      | Comparativa Head-to-Head           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificación Detallada por Pestaña

### 3.1 Finanzas y Rentabilidad
Permite supervisar la salud financiera y el margen de contribución unitario:
- **Ingresos Brutos Totales ($):** Volumen agregado facturado con barra comparativa de cuota de mercado (*Shopify vs Amazon*).
- **Costo de Ventas (COGS $):** Costo ponderado de adquisición y surtido de mercancía (modelado al 42% del valor de venta).
- **Beneficio Bruto Neto ($):** `Total Revenue - COGS`. Visibilidad inmediata del flujo operativo generado.
- **Margen Bruto Global (%):** Porcentaje de rentabilidad operativa global (estabilizado en ~58.0%).
- **Margen por Pedido ($):** Utilidad bruta media producida por cada paquete despachado.
- **Ticket Promedio por Canal (AOV $):** Comparativa del ticket de compra entre la tienda directa de Shopify y compradores Prime de Amazon.

### 3.2 Logística, Flotas y Tiempos de Entrega
Supervisión del cumplimiento de transportistas:
- **Tasa de Entrega Exitosa (%):** Porcentaje de paquetes con estatus de entrega confirmada.
- **Tasa de Entregas a Tiempo (%):** Despachos completados dentro del tiempo de SLA prometido (Objetivo: &ge; 95%; Actual: **97.4%**).
- **Tiempo Promedio de Cumplimiento (Lead Time):** Horas transcurridas desde el webhook inicial hasta el arribo al destino (**26.2 hrs**).
- **Tasa de Incidencias y Devoluciones (%):** Porcentaje de paquetes con anomalías o extravíos (mantenido en un óptimo **0.8%**, bajo el umbral del 1.5%).
- **Distribución de Flota por Transportista:** Cuota asignada entre DHL Express (45%), Amazon Logistics FBA (35%), FedEx Express (15%) y Flota Propia de Houston (5%).

### 3.3 Inteligencia de Clientes y Retención (LTV)
Análisis del comportamiento del consumidor y lealtad:
- **Clientes Únicos Registrados:** Número de perfiles protegidos en PostgreSQL bajo cifrado **AES-256-GCM**.
- **Tasa de Clientes Recurrentes (%):** Porcentaje de clientes con dos o más compras en el historial (**28.4%** vs 22.0% del estándar de la industria).
- **Customer Lifetime Value (LTV):** Ingreso financiero total acumulado proyectado por cliente (**$380.00**).
- **Concentración Regional de Pedidos:** Desglose territorial que destaca el Hub Central de Texas (44%), Costa Oeste (26%), Costa Este (20%) y Medio Oeste (10%).

### 3.4 Rotación y Salud de Inventario
Prevención de capital inmovilizado y rotura de stock:
- **Valoración Total en Almacén ($):** Capital monetario respaldado en existencias físicas (`SUM(stock_quantity * unit_cost)`).
- **Días de Inventario Restante (DOI):** Cobertura de existencias proyectada al ritmo de venta actual (**45 días**).
- **Ratio de Rotación de Inventario:** Frecuencia con la que se renueva el stock anualmente (**4.6x / año**).
- **Exposición a Rotura de Stock (%):** Porcentaje de SKUs en nivel de alerta crítica (&lt; 15 unidades).
- **Ranking de SKUs Más Demandados (Best Sellers):** Tabla de productos estrella con existencias, proveedor, costo de adquisición y precio al consumidor.

### 3.5 Telemetría de APIs y DevOps
Monitoreo de infraestructura y SLAs técnicos:
- **Latencia Media de Ingesta (ms):** Tiempo promedio requerido para recibir, verificar firma HMAC, cifrar y almacenar un pedido en base de datos.
- **Percentil p95 de Latencia (ms):** Garantía de baja dispersión de tiempos incluso durante ráfagas de alta demanda.
- **Disponibilidad de Webhooks (%):** Confiabilidad continua de servicio sin caídas de endpoints (**99.98%**).
- **Capacidad de Throughput (RPM):** Peticiones por minuto procesadas concurrentemente (**140 RPM**).

### 3.6 Comparativa de Canales (Shopify vs Amazon)
Análisis comparativo técnico y comercial:

| Criterio Comparativo | Shopify Online Store | Amazon Marketplace (SP-API) |
|---|---|---|
| **Modelo Logístico** | Despacho por Vendedor / DHL Express | Amazon FBA / Prioridad Prime |
| **Protocolo de Ingesta** | Webhooks (`X-Shopify-Hmac-Sha256`) | API REST (`SP-API Token / SQS`) |
| **SLA de Latencia** | &le; 1,500 ms (Rápido) | &le; 2,200 ms (En SLA) |
| **Margen Bruto Ponderado** | ~58.0% | ~58.0% |
| **Política de Privacidad** | Cifrado AES-256-GCM a nivel columna | Tokenización PII Restringida |
