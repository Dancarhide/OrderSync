---
sidebar_position: 3
title: API y Webhooks
---

# OrderSync — Referencia Técnica de API y Webhooks

**Versión del Documento:** 1.2.0  
**Clasificación:** Interno / Orientado a Desarrolladores  
**Última Actualización:** Septiembre 2026  
**URL Base (Local):** `http://localhost:3000`  
**URL Base (Producción):** `https://api.ordersync.io` *(a configurar)*

---

## 1. Descripción General

El backend de OrderSync expone una API RESTful para la ingestión de webhooks, despacho logístico empresarial, gestión de inventario y cómputo de métricas ejecutivas en tiempo real. Un servidor WebSocket centralizado difunde mutaciones de estado atómicas a todos los paneles conectados de forma instantánea.

---

## 2. Autenticación y Seguridad

### 2.1 Verificación de Firma de Webhooks
Todos los endpoints de webhooks externos exigen la cabecera HTTP `x-webhook-signature` con el **hash HMAC-SHA256 en formato hexadecimal** calculado sobre el cuerpo bruto de la solicitud usando la clave secreta compartida `WEBHOOK_SECRET`.

```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(rawBodyBuffer)
  .digest('hex');
```

### 2.2 Control de Acceso Basado en Roles (RBAC)
Los endpoints administrativos (como `POST /api/users`) exigen que la sesión activa posea el rol `Admin`.

---

## 3. Endpoints de Ingestión

### 3.1 POST `/api/v1/webhooks/shopify`
Procesa eventos de compra procedentes de Shopify. Deduplica mediante `external_order_id`, cifra datos personales con AES-256-GCM, descuenta existencias de inventario de forma atómica y genera la guía de ruta de entrega.

### 3.2 POST `/api/v1/webhooks/amazon`
Procesa compras generadas en Amazon Marketplace. Comparte esquema y flujo de validación, registrando automáticamente el canal como `"Amazon"`.

### 3.3 POST `/api/orders/simulate-batch`
Genera ráfagas masivas concurrentes (de 10 a 50 órdenes) alternadas entre Shopify y Amazon para comprobar la resistencia del sistema bajo alta demanda.

**Cuerpo de la Petición:**
```json
{
  "count": 20
}
```

**Respuesta (`200 OK`):**
```json
{
  "message": "Lote de 20 pedidos de alta demanda procesado con éxito (Shopify & Amazon).",
  "count": 20,
  "orders": ["#SHPF-84920", "AMZ-938201-48201", "..."]
}
```

---

## 4. Endpoints de Logística y Rutas

### 4.1 POST `/api/shipments/batch-advance`
Avanza hasta 100 envíos activos a su siguiente fase de ruta en una sola transacción SQL atómica.

**Respuesta (`200 OK`):**
```json
{
  "message": "Sincronización masiva completada: 20 guías avanzadas exitosamente.",
  "updatedCount": 20
}
```

### 4.2 POST `/api/shipments/auto-engine/toggle`
Activa o pausa el daemon en segundo plano que avanza automáticamente las rutas cada 5 segundos.

**Respuesta (`200 OK`):**
```json
{
  "active": true,
  "message": "Motor autónomo de despacho ACTIVADO."
}
```

### 4.3 GET `/api/shipments`
Retorna el listado completo de rutas de entrega con fases, hitos completados y transportista.

---

## 5. Módulos de Gestión y Métricas

### 5.1 GET `/api/metrics`
Calcula y retorna analíticas ejecutivas en tiempo real: márgenes financieros, tasa de entrega, retención de clientes, rotación de catálogo y telemetría de servidores.

### 5.2 POST `/api/inventory`
Registra un nuevo producto/SKU en el inventario central unificado.

**Cuerpo de la Petición:**
```json
{
  "sku": "MONITOR-4K",
  "product_name": "Monitor UltraSharp 32 Pulgadas 4K",
  "stock_quantity": 40,
  "supplier_name": "Apex Global Electronics",
  "unit_cost": 210.00,
  "sale_price": 449.99
}
```

### 5.3 POST `/api/inventory/restock`
Suma existencias a un SKU existente mediante orden de reabastecimiento.

### 5.4 GET `/api/suppliers`
Directorio de proveedores oficiales con tiempos de entrega (lead times) y calificaciones.

### 5.5 GET `/api/users` & POST `/api/users`
Directorio y registro de cuentas de usuario del sistema (solo accesible por Administradores).

---

## 6. Eventos WebSocket en Tiempo Real

| Evento | Sentido | Descripción |
|---|---|---|
| `ORDER_SYNCED` | Servidor → Cliente | Notifica la sincronización exitosa de una orden individual. |
| `BATCH_SYNC_COMPLETED` | Servidor → Cliente | Notifica que una ráfaga masiva de pedidos ha sido procesada. |
| `SHIPMENT_UPDATED` | Servidor → Cliente | Notifica el avance de estado de una guía de transporte. |
| `SHIPMENTS_BATCH_UPDATED` | Servidor → Cliente | Notifica la actualización masiva de un lote completo de guías. |
| `AUTO_DISPATCH_STATUS` | Servidor → Cliente | Informa cambios en el estado del motor autónomo de despacho. |
