---
sidebar_position: 1
title: Arquitectura del Sistema
---

# OrderSync — Arquitectura del Sistema

**Versión del Documento:** 1.0.0  
**Clasificación:** Interna / Para el Cliente  
**Última Actualización:** Septiembre 2026  
**Elaborado Por:** División de Ingeniería — Equipo del Proyecto OrderSync  
**Estándar de Cumplimiento:** ISO 27001:2022

---

## 1. Resumen Ejecutivo

OrderSync es un sistema centralizado de gestión de pedidos multicanal diseñado para agregar eventos de compra en tiempo real provenientes de plataformas externas de comercio electrónico — específicamente **Shopify** y **Amazon** — en un único repositorio de datos unificado y panel de control. El sistema está diseñado para atender a clientes de comercio electrónico con sede en Houston, Texas, EE. UU., y está construido para cumplir con estrictos Acuerdos de Nivel de Servicio (SLAs), las regulaciones de privacidad de los Estados Unidos y el estándar de gestión de seguridad de la información ISO/IEC 27001:2022.

---

## 2. Arquitectura General

La plataforma OrderSync está compuesta por tres niveles de aplicación principales y un nivel de datos:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Canales Externos                            │
│            Webhooks de Shopify | Webhooks de Amazon             │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS + Verificación HMAC-SHA256
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               Backend (Node.js / Express.js)                     │
│   Controlador de Webhooks │ Servicio de Cifrado │ Daemon Autónomo│
│   Inventario Central      │ Motor de Métricas BI│ WebSocket (WS) │
└──────────┬──────────────────────────────────────┬───────────────┘
           │ SQL / TLS (Neon PostgreSQL)          │ WebSocket (WS)
           ▼                                       ▼
┌──────────────────────┐              ┌────────────────────────────┐
│ Base de Datos         │              │  Panel Angular 17+         │
│ Neon PostgreSQL      │              │  (6 Módulos + Pestañas BI) │
└──────────────────────┘              └────────────────────────────┘
```

---

## 3. Especificaciones de Componentes

### 3.1 Servicio Backend

| Propiedad | Valor |
|---|---|
| **Entorno de Ejecución** | Node.js v20 LTS |
| **Framework** | Express.js con TypeScript |
| **Capa en Tiempo Real** | Socket.io (WebSockets) |
| **Puerto** | 3000 |
| **Autenticación** | HMAC-SHA256 por webhook entrante |

El servicio backend es responsable de:
- Recibir, validar y deduplicar los payloads de webhooks entrantes de Shopify y Amazon.
- Cifrar todos los campos de Información de Identificación Personal (PII) en la capa de aplicación antes de persistirlos en PostgreSQL.
- Calcular la latencia de sincronización de extremo a extremo (`T2 - T1`) y almacenarla junto con el registro del pedido.
- Transmitir eventos WebSocket `ORDER_SYNCED` en tiempo real a todos los clientes del panel conectados.

### 3.2 Base de Datos

| Propiedad | Valor |
|---|---|
| **Motor** | PostgreSQL 15 |
| **Extensión** | `pgcrypto` (compatible con AES-256) |
| **Cifrado** | AES-256-GCM a nivel de aplicación para columnas PII |
| **Puerto** | 5432 |

Se utilizan tres tablas principales: `orders` (pedidos), `customers` (clientes) y `order_items` (artículos del pedido). Los datos PII almacenados en la tabla `customers` se cifran antes de la inserción y se guardan como columnas `BYTEA`.

### 3.3 Panel de Control Frontend

| Propiedad | Valor |
|---|---|
| **Framework** | Angular 17+ (Componentes Independientes) |
| **Estilos** | TailwindCSS |
| **Tiempo Real** | Cliente Socket.io |
| **Puerto** | 4200 |

El panel muestra métricas KPI en vivo, pedidos entrantes y notificaciones emergentes en tiempo real. Todos los campos PII en la interfaz de usuario se enmascaran (p. ej., `J*** S*** [Cifrado]`) para proteger los datos del cliente de visualizaciones no autorizadas.

---

## 4. Acuerdos de Nivel de Servicio (SLAs)

| Métrica | Objetivo |
|---|---|
| **Latencia de Sincronización de Extremo a Extremo** | < 5,000 ms (5 segundos) |
| **Disponibilidad del Sistema** | ≥ 99.9% de tiempo de actividad |
| **Deduplicación de Webhooks** | 100% — Coincidencia de clave de idempotencia en `external_order_id` |

La latencia de sincronización se calcula como `T2 - T1`:
- **T1:** Marca de tiempo en el momento en que la solicitud HTTP del webhook es recibida por el backend.
- **T2:** Marca de tiempo en el momento en que el pedido ha sido confirmado en la base de datos PostgreSQL y el evento WebSocket `ORDER_SYNCED` ha sido emitido.

---

## 5. Flujo de Datos

1. Un cliente realiza un pedido en **Shopify** o **Amazon**.
2. La plataforma externa envía un webhook HTTP POST al endpoint del backend de OrderSync.
3. El backend verifica la firma HMAC-SHA256 y comprueba el `external_order_id` para evitar duplicados.
4. Los campos PII (nombre, dirección, teléfono) se cifran usando AES-256-GCM.
5. Una transacción de base de datos guarda los registros de `pedido`, `cliente` (cifrado) y `artículos del pedido` de forma atómica.
6. Se calcula y almacena la latencia de extremo a extremo.
7. Se emite un evento WebSocket `ORDER_SYNCED` a todos los clientes del panel Angular conectados.
8. La interfaz del panel se actualiza en tiempo real: conteos KPI, tabla de pedidos y una notificación emergente.

---

## 6. Infraestructura y Contenedorización

Todo el stack de aplicación está contenedorizado usando **Docker** y orquestado con **Docker Compose**. Cada servicio se ejecuta en un contenedor aislado con configuración impulsada por variables de entorno. No hay credenciales codificadas en el código fuente.

| Servicio | Imagen Docker | Puerto Expuesto |
|---|---|---|
| `postgres` | `postgres:15-alpine` | 5432 |
| `backend` | Imagen Node.js personalizada | 3000 |
| `frontend` | Imagen Angular personalizada | 4200 |
